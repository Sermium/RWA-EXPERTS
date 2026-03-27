// src/app/api/payments/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { CHAINS, getChainById, getSupportedChainIds, getDefaultChain, type SupportedChainId } from '@/config/chains';
import { DEPLOYMENTS } from '@/config/deployments';
import { RWAEscrowVaultABI } from '@/config/abis';

// ============================================================================
// HELPERS
// ============================================================================

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-01-28.clover",
  });
}

function getWebhookSecret() {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }
  return process.env.STRIPE_WEBHOOK_SECRET;
}

function createChainPublicClient(chainId: SupportedChainId) {
  const chainInfo = getChainById(chainId);
  if (!chainInfo) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return createPublicClient({
    chain: chainInfo.chain,
    transport: http(chainInfo.rpcUrl),
  });
}

function createChainWalletClient(chainId: SupportedChainId, privateKey: `0x${string}`) {
  const chainInfo = getChainById(chainId);
  if (!chainInfo) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: chainInfo.chain,
    transport: http(chainInfo.rpcUrl),
  });
}

// ============================================================================
// PAYMENT HANDLERS
// ============================================================================

async function handleCrowdfundingPayment(paymentIntent: Stripe.PaymentIntent) {
  const { projectId, investorAddress, amountUSD, chainId: chainIdStr } = paymentIntent.metadata;

  if (!projectId || !investorAddress || !amountUSD) {
    console.error('[Stripe] Missing metadata in payment intent:', paymentIntent.id);
    await storeFailedPayment(paymentIntent, 'Missing required metadata');
    return;
  }

  const defaultChain = getDefaultChain();
  const chainId = chainIdStr ? (parseInt(chainIdStr, 10) as SupportedChainId) : defaultChain.id;
  
  const chainInfo = getChainById(chainId);
  if (!chainInfo) {
    console.error(`[Stripe] Unsupported chain ID: ${chainId}`);
    await storeFailedPayment(paymentIntent, `Unsupported chain ID: ${chainId}`);
    return;
  }

  const deployment = DEPLOYMENTS[chainId];
  if (!deployment?.contracts?.RWAEscrowVault) {
    console.error(`[Stripe] RWAEscrowVault not deployed on ${chainInfo.name}`);
    await storeFailedPayment(paymentIntent, `EscrowVault not deployed on ${chainInfo.name}`);
    return;
  }

  const escrowAddress = deployment.contracts.RWAEscrowVault as `0x${string}`;

  console.log(`[Stripe] Processing crowdfunding payment on ${chainInfo.name}:`, {
    projectId,
    investor: investorAddress,
    amount: amountUSD,
    reference: paymentIntent.id,
  });

  try {
    const OPERATOR_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;
    
    if (!OPERATOR_PRIVATE_KEY) {
      throw new Error('VERIFIER_PRIVATE_KEY not configured');
    }

    const publicClient = createChainPublicClient(chainId);
    const walletClient = createChainWalletClient(chainId, OPERATOR_PRIVATE_KEY);
    const paymentReference = `STRIPE-${paymentIntent.id}`;

    // Check if payment reference already used (idempotency)
    let isUsed = false;
    try {
      isUsed = await publicClient.readContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'isPaymentReferenceUsed',
        args: [paymentReference],
      }) as boolean;
    } catch (e) {
      // Function might not exist in older contracts, continue
      console.log('[Stripe] isPaymentReferenceUsed not available, proceeding');
    }

    if (isUsed) {
      console.log(`[Stripe] Payment ${paymentIntent.id} already processed, skipping`);
      return;
    }

    // Convert amount to 6 decimals (USDC format)
    const amountInUSDC = parseUnits(amountUSD, 6);

    // Record the off-chain investment
    const hash = await walletClient.writeContract({
      address: escrowAddress,
      abi: RWAEscrowVaultABI,
      functionName: 'recordOffChainInvestment',
      args: [
        BigInt(projectId),
        investorAddress as `0x${string}`,
        amountInUSDC,
        paymentReference,
      ],
    });

    console.log(`[Stripe] Recorded off-chain investment on ${chainInfo.name}: ${hash}`);
    
    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log(`[Stripe] Successfully processed payment ${paymentIntent.id} for project ${projectId}`);
      await storeSuccessfulPayment(paymentIntent, hash, chainId);
    } else {
      throw new Error('Transaction reverted');
    }

  } catch (error: any) {
    console.error(`[Stripe] Failed to process payment on ${chainInfo.name}:`, error);
    await storeFailedPayment(paymentIntent, error.message || String(error));
  }
}

async function handleLegacyPayment(paymentIntent: Stripe.PaymentIntent) {
  const { projectId, investorAddress, amountUSD, chainId: chainIdStr } = paymentIntent.metadata;
  const defaultChain = getDefaultChain();
  const chainId = chainIdStr ? parseInt(chainIdStr, 10) : defaultChain.id;
  const chainInfo = getChainById(chainId as SupportedChainId);
  
  console.log(`[Stripe] Legacy payment - manual processing required:`, {
    paymentIntentId: paymentIntent.id,
    chain: chainInfo?.name || `Chain ${chainId}`,
    projectId,
    investor: investorAddress,
    amount: amountUSD,
  });

  await storeFailedPayment(paymentIntent, 'Legacy payment - requires manual processing');
}

async function storeSuccessfulPayment(paymentIntent: Stripe.PaymentIntent, txHash: string, chainId: SupportedChainId) {
  const chainInfo = getChainById(chainId);
  // TODO: Store in database (Supabase)
  console.log('[Stripe] Payment recorded:', {
    paymentIntentId: paymentIntent.id,
    txHash,
    explorerUrl: chainInfo ? `${chainInfo.explorerUrl}/tx/${txHash}` : null,
    projectId: paymentIntent.metadata.projectId,
    investor: paymentIntent.metadata.investorAddress,
    amount: paymentIntent.metadata.amountUSD,
    chain: chainInfo?.name,
    chainId,
  });
}

async function storeFailedPayment(paymentIntent: Stripe.PaymentIntent, reason: string) {
  const chainIdStr = paymentIntent.metadata.chainId;
  const chainId = chainIdStr ? parseInt(chainIdStr, 10) : getDefaultChain().id;
  const chainInfo = getChainById(chainId as SupportedChainId);
  
  // TODO: Store in database for manual processing (Supabase)
  console.error('[Stripe] Failed payment - needs manual processing:', {
    paymentIntentId: paymentIntent.id,
    projectId: paymentIntent.metadata.projectId,
    investor: paymentIntent.metadata.investorAddress,
    amount: paymentIntent.metadata.amountUSD,
    chain: chainInfo?.name || `Chain ${chainId}`,
    chainId,
    reason,
  });
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    const webhookSecret = getWebhookSecret();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('[Stripe] Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      if (paymentIntent.metadata.type === 'crowdfunding_investment') {
        await handleCrowdfundingPayment(paymentIntent);
      } else if (paymentIntent.metadata.type === 'rwa_investment') {
        const defaultChain = getDefaultChain();
        const chainId = paymentIntent.metadata.chainId 
          ? (parseInt(paymentIntent.metadata.chainId, 10) as SupportedChainId)
          : defaultChain.id;
        const deployment = DEPLOYMENTS[chainId];
        
        if (deployment?.contracts?.RWAEscrowVault) {
          await handleCrowdfundingPayment(paymentIntent);
        } else {
          await handleLegacyPayment(paymentIntent);
        }
      } else {
        console.log(`[Stripe] Unknown payment type: ${paymentIntent.metadata.type}`);
      }
      break;

    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`[Stripe] Payment failed: ${failedIntent.id}`, {
        projectId: failedIntent.metadata.projectId,
        reason: failedIntent.last_payment_error?.message,
      });
      break;

    default:
      console.log(`[Stripe] Unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export async function GET() {
  const supportedChainIds = getSupportedChainIds();
  
  const supportedChains = supportedChainIds
    .filter(chainId => {
      const deployment = DEPLOYMENTS[chainId];
      return deployment?.contracts?.RWAEscrowVault;
    })
    .map(chainId => {
      const chainInfo = CHAINS[chainId];
      const deployment = DEPLOYMENTS[chainId];
      return {
        chainId,
        name: chainInfo.name,
        testnet: chainInfo.testnet,
        escrowVault: deployment.contracts?.RWAEscrowVault,
        explorerUrl: chainInfo.explorerUrl,
      };
    });

  const defaultChain = getDefaultChain();

  return NextResponse.json({
    status: 'ok',
    supportedChains,
    defaultChain: {
      id: defaultChain.id,
      name: defaultChain.name,
      testnet: defaultChain.testnet,
    },
    config: {
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
      operatorConfigured: !!process.env.VERIFIER_PRIVATE_KEY,
    },
  });
}
