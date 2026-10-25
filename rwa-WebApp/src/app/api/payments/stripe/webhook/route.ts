// src/app/api/payments/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { CHAINS, getChainById, getSupportedChainIds, getDefaultChain, type SupportedChainId } from '@/config/chains';
import { DEPLOYMENTS } from '@/config/deployments';
import { RWAEscrowVaultABI } from '@/config/abis';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  checkCrowdfundingInvestmentIntent,
  checkFundraisingIntent,
  checkSubmissionFeeIntent,
  confirmFundraisingInvestment,
  markSubmissionFeePaid,
  recordCrowdfundingInvestment,
} from '@/lib/payment-records';

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

// ============================================================================
// PERSISTENCE -- payments table (database/2026-10-25-payment-verification.sql)
// ============================================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function paymentRow(paymentIntent: Stripe.PaymentIntent) {
  const m = paymentIntent.metadata || {};
  const chainId = m.chainId ? parseInt(m.chainId, 10) : NaN;
  return {
    stripe_payment_intent_id: paymentIntent.id,
    type: m.type || null,
    amount_cents: paymentIntent.amount,
    currency: paymentIntent.currency,
    wallet_address: (m.walletAddress || m.investorAddress || '').toLowerCase() || null,
    project_id: m.projectId || null,
    application_id: m.applicationId || null,
    investment_id: m.investmentId || null,
    chain_id: Number.isFinite(chainId) ? chainId : null,
    metadata: m,
  };
}

/** First sight of a PaymentIntent inserts its row; later events update it. */
async function recordPaymentEvent(paymentIntent: Stripe.PaymentIntent, status: 'succeeded' | 'failed', failureReason?: string | null) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('payments')
    .upsert(
      { ...paymentRow(paymentIntent), status, processing_status: 'pending' },
      { onConflict: 'stripe_payment_intent_id', ignoreDuplicates: true },
    );
  if (error) throw new Error(`Failed to store payment ${paymentIntent.id}: ${error.message}`);

  const { error: updateError } = await supabase
    .from('payments')
    .update({ status, failure_reason: failureReason ?? null, updated_at: new Date().toISOString() })
    .eq('stripe_payment_intent_id', paymentIntent.id);
  if (updateError) throw new Error(`Failed to update payment ${paymentIntent.id}: ${updateError.message}`);
}

async function storeSuccessfulPayment(paymentIntent: Stripe.PaymentIntent, txHash: string | null, chainId: number | null) {
  const chainInfo = chainId ? getChainById(chainId) : undefined;
  console.log('[Stripe] Payment recorded:', {
    paymentIntentId: paymentIntent.id,
    txHash,
    explorerUrl: chainInfo && txHash ? `${chainInfo.explorerUrl}/tx/${txHash}` : null,
    type: paymentIntent.metadata.type,
    chainId,
  });

  const { error } = await getSupabaseAdmin()
    .from('payments')
    .update({
      processing_status: 'processed',
      onchain_tx_hash: txHash,
      chain_id: chainId,
      failure_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);
  if (error) throw new Error(`Failed to update payment ${paymentIntent.id}: ${error.message}`);
}

/**
 * The money arrived (or the attempt failed) but what it pays for could not
 * be recorded automatically: keep it, with the reason, for manual processing.
 */
async function storeFailedPayment(paymentIntent: Stripe.PaymentIntent, reason: string) {
  const chainIdStr = paymentIntent.metadata.chainId;
  const chainId = chainIdStr ? parseInt(chainIdStr, 10) : getDefaultChain().id;
  const chainInfo = getChainById(chainId as SupportedChainId);

  console.error('[Stripe] Failed payment - needs manual processing:', {
    paymentIntentId: paymentIntent.id,
    type: paymentIntent.metadata.type,
    chain: chainInfo?.name || `Chain ${chainId}`,
    chainId,
    reason,
  });

  const { error } = await getSupabaseAdmin()
    .from('payments')
    .update({
      processing_status: paymentIntent.status === 'succeeded' ? 'needs_manual_processing' : 'failed',
      failure_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);
  if (error) throw new Error(`Failed to update payment ${paymentIntent.id}: ${error.message}`);
}

// ============================================================================
// MARK WHAT WAS PAID FOR -- the same code the confirm routes use
// ============================================================================

async function handleFundraisingPayment(paymentIntent: Stripe.PaymentIntent) {
  const supabase = getSupabaseAdmin();
  const { data: investment } = await supabase
    .from('fundraising_investments')
    .select('*')
    .eq('id', paymentIntent.metadata.investmentId)
    .maybeSingle();
  if (!investment) return storeFailedPayment(paymentIntent, 'Investment not found');

  const checked = checkFundraisingIntent(paymentIntent, investment);
  if (!checked.ok) return storeFailedPayment(paymentIntent, checked.error);

  const result = await confirmFundraisingInvestment(supabase, investment, { stripe_payment_intent_id: paymentIntent.id });
  if (result.status === 'confirmed') return storeSuccessfulPayment(paymentIntent, null, investment.chain_id ?? null);
  if (result.status === 'already_confirmed' && investment.stripe_payment_intent_id === paymentIntent.id) {
    // A retry of this event, or confirm-payment got there first.
    return storeSuccessfulPayment(paymentIntent, null, investment.chain_id ?? null);
  }
  return storeFailedPayment(
    paymentIntent,
    result.status === 'already_confirmed'
      ? 'Investment was already confirmed with another payment'
      : result.status === 'reused' ? 'Payment already used' : 'Failed to confirm investment',
  );
}

async function handleSubmissionFeePayment(paymentIntent: Stripe.PaymentIntent) {
  const supabase = getSupabaseAdmin();
  const { data: app } = await supabase
    .from('tokenization_applications')
    .select('id, status, fee_amount, user_address, chain_id, payment_tx_hash')
    .eq('id', paymentIntent.metadata.applicationId)
    .maybeSingle();
  if (!app) return storeFailedPayment(paymentIntent, 'Application not found');

  const checked = checkSubmissionFeeIntent(paymentIntent, app);
  if (!checked.ok) return storeFailedPayment(paymentIntent, checked.error);

  const result = await markSubmissionFeePaid(supabase, app.id, { payment_tx_hash: paymentIntent.id, payment_token: 'USD' });
  if (result.status === 'confirmed') return storeSuccessfulPayment(paymentIntent, null, null);
  if (result.status === 'already_confirmed' && app.payment_tx_hash === paymentIntent.id) {
    return storeSuccessfulPayment(paymentIntent, null, null);
  }
  return storeFailedPayment(
    paymentIntent,
    result.status === 'already_confirmed'
      ? `Fee paid for an application no longer awaiting payment (status ${app.status})`
      : result.status === 'reused' ? 'Payment already used' : 'Failed to mark fee paid',
  );
}

/**
 * A card investment in a crowdfunding project whose metadata names the
 * project by its database id is recorded in `investments` exactly as
 * investments/record would; the unique PaymentIntent index keeps the two
 * from recording it twice. Problems here are logged, not fatal: the on-chain
 * recording that follows decides the payment's processing status.
 */
async function recordStripeCrowdfundingInvestment(paymentIntent: Stripe.PaymentIntent) {
  const { projectId, investorAddress } = paymentIntent.metadata;
  if (!projectId || !UUID_RE.test(projectId) || !investorAddress) return;
  const supabase = getSupabaseAdmin();
  const { data: project } = await supabase
    .from('crowdfunding_applications')
    .select('id, chain_id, deployed_chain_id')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) return;
  const checked = checkCrowdfundingInvestmentIntent(paymentIntent, { projectId });
  if (!checked.ok) {
    console.error(`[Stripe] Not recording investment for ${paymentIntent.id}: ${checked.error}`);
    return;
  }
  const result = await recordCrowdfundingInvestment(supabase, {
    project_id: projectId,
    investor_address: investorAddress,
    amount_usd: paymentIntent.amount / 100,
    payment_method: 'stripe',
    payment_intent_id: paymentIntent.id,
    chain_id: Number(paymentIntent.metadata.chainId) || Number(project.deployed_chain_id ?? project.chain_id) || null,
    metadata: { source: 'stripe_webhook' },
  });
  if (result.status === 'error') console.error(`[Stripe] Failed to record investment for ${paymentIntent.id}:`, result.error);
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

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await recordPaymentEvent(paymentIntent, 'succeeded');
        const type = paymentIntent.metadata.type;

        if (type === 'fundraising_investment') {
          await handleFundraisingPayment(paymentIntent);
        } else if (type === 'crowdfunding_submission_fee') {
          await handleSubmissionFeePayment(paymentIntent);
        } else if (type === 'crowdfunding_investment') {
          await recordStripeCrowdfundingInvestment(paymentIntent);
          await handleCrowdfundingPayment(paymentIntent);
        } else if (type === 'rwa_investment') {
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
          console.log(`[Stripe] Unknown payment type: ${type}`);
          await storeFailedPayment(paymentIntent, `Unknown payment type: ${type ?? 'none'}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        const reason = failedIntent.last_payment_error?.message || 'Payment failed';
        console.log(`[Stripe] Payment failed: ${failedIntent.id}`, { type: failedIntent.metadata.type, reason });
        await recordPaymentEvent(failedIntent, 'failed', reason);
        await storeFailedPayment(failedIntent, reason);
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event: ${event.type}`);
    }
  } catch (err: any) {
    // Not stored: answer 500 so Stripe retries. Every step above is idempotent.
    console.error('[Stripe] Webhook processing failed:', err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
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
