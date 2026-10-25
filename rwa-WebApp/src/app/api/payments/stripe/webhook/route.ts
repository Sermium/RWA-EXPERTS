// src/app/api/payments/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createWalletClient, createPublicClient, http, parseUnits, parseAbi, getAddress, isAddress } from 'viem';
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
// WHICH VAULT, WHICH PROJECT ID
// ============================================================================
//
// Launchpad projects each have their own escrow vault (escrow_vault_address
// on the project row); only older projects live on the chain's singleton
// RWAEscrowVault from DEPLOYMENTS. An off-chain investment must be booked on
// the vault that holds the project, under that vault's project id, or it
// credits the wrong project (or nobody). When that cannot be established the
// payment is kept for an admin instead of being booked anywhere.

/** Vault-side project id columns, most specific first. vault_project_id is being added by another PR. */
const VAULT_PROJECT_ID_COLUMNS = ['vault_project_id', 'escrow_project_id', 'onchain_project_id', 'project_nft_id'];

/**
 * Only the leading fields of the vault's Project struct (all static, so they
 * decode the same from every vault version).
 */
const VAULT_GET_PROJECT_ABI = parseAbi([
  'function getProject(uint256 _projectId) view returns (uint256 projectId, address projectOwner, address securityToken)',
]);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const usableAddress = (a: unknown): a is string => typeof a === 'string' && isAddress(a) && a.toLowerCase() !== ZERO_ADDRESS;

function vaultProjectIdOf(project: Record<string, any>): bigint | null {
  for (const column of VAULT_PROJECT_ID_COLUMNS) {
    const value = project[column];
    if (value === null || value === undefined || value === '') continue;
    try {
      const id = BigInt(value);
      if (id >= BigInt(0)) return id;
    } catch {
      // not an integer: try the next column
    }
  }
  return null;
}

const projectChainOf = (project: Record<string, any>) => Number(project.deployed_chain_id ?? project.chain_id) || null;

/**
 * The crowdfunding_applications row the payment is for. metadata.projectId is
 * the row's id, or (newer clients) the vault-side project id, which is
 * matched against the project rows on the payment's chain.
 */
async function findCrowdfundingProject(paymentIntent: Stripe.PaymentIntent): Promise<{ project: Record<string, any> | null; error?: string }> {
  const { projectId, chainId: chainIdStr } = paymentIntent.metadata;
  const supabase = getSupabaseAdmin();

  if (projectId && UUID_RE.test(projectId)) {
    const { data } = await supabase.from('crowdfunding_applications').select('*').eq('id', projectId).maybeSingle();
    return data ? { project: data } : { project: null, error: `Project ${projectId} not found` };
  }

  if (projectId && /^\d+$/.test(projectId)) {
    const chainId = chainIdStr ? parseInt(chainIdStr, 10) : getDefaultChain().id;
    const wanted = BigInt(projectId);
    const rows: Record<string, any>[] = [];
    for (const column of VAULT_PROJECT_ID_COLUMNS) {
      // A column this database lacks just returns an error: skip it.
      const { data, error } = await supabase.from('crowdfunding_applications').select('*').eq(column, projectId);
      if (!error && Array.isArray(data)) rows.push(...data);
    }
    const matches = Array.from(new Map(rows.map((r) => [r.id, r])).values()).filter(
      (r) => projectChainOf(r) === chainId && vaultProjectIdOf(r) === wanted,
    );
    if (matches.length > 1) return { project: null, error: `More than one project has vault project id ${projectId} on chain ${chainId}` };
    // No row: possibly a project that only exists on the platform vault.
    return { project: matches[0] ?? null };
  }

  return { project: null, error: `Missing or malformed projectId: ${projectId ?? 'none'}` };
}

type VaultTarget =
  | { ok: true; chainId: SupportedChainId; vault: `0x${string}`; vaultProjectId: bigint; source: 'project_vault' | 'platform_vault' }
  | { ok: false; reason: string };

/** Asks the vault whether it holds this project (and, when known, with this security token). */
async function vaultHoldsProject(chainId: SupportedChainId, vault: `0x${string}`, vaultProjectId: bigint, securityToken?: unknown): Promise<string | null> {
  try {
    const [id, owner, token] = await createChainPublicClient(chainId).readContract({
      address: vault,
      abi: VAULT_GET_PROJECT_ABI,
      functionName: 'getProject',
      args: [vaultProjectId],
    });
    if (id !== vaultProjectId || !usableAddress(owner)) return `vault ${vault} has no project ${vaultProjectId}`;
    if (usableAddress(securityToken) && (!usableAddress(token) || getAddress(token) !== getAddress(securityToken))) {
      return `project ${vaultProjectId} on vault ${vault} has a different security token`;
    }
    return null;
  } catch (err: any) {
    return `could not read project ${vaultProjectId} from vault ${vault}: ${err?.shortMessage || err?.message || err}`;
  }
}

async function resolveVaultTarget(paymentIntent: Stripe.PaymentIntent, project: Record<string, any> | null): Promise<VaultTarget> {
  const metaChain = paymentIntent.metadata.chainId ? parseInt(paymentIntent.metadata.chainId, 10) : null;

  let chainId: number | null;
  let vaultProjectId: bigint | null;
  let ownVault: string | null = null;
  if (project) {
    chainId = projectChainOf(project);
    if (!chainId) return { ok: false, reason: `project ${project.id} has no chain` };
    if (metaChain && metaChain !== chainId) {
      return { ok: false, reason: `payment is for chain ${metaChain} but project ${project.id} is on chain ${chainId}` };
    }
    vaultProjectId = vaultProjectIdOf(project);
    if (vaultProjectId === null) return { ok: false, reason: `project ${project.id} has no vault project id` };
    ownVault = [project.escrow_vault_address, project.escrow_address].find(usableAddress) ?? null;
  } else {
    // Vault-side id with no project row: only the platform vault can hold it.
    chainId = metaChain ?? getDefaultChain().id;
    vaultProjectId = BigInt(paymentIntent.metadata.projectId);
  }

  const chainInfo = getChainById(chainId);
  if (!chainInfo) return { ok: false, reason: `unsupported chain ${chainId}` };
  const supportedChainId = chainId as SupportedChainId;

  if (ownVault) {
    const vault = getAddress(ownVault);
    const problem = await vaultHoldsProject(supportedChainId, vault, vaultProjectId, project?.security_token_address);
    if (problem) return { ok: false, reason: problem };
    return { ok: true, chainId: supportedChainId, vault, vaultProjectId, source: 'project_vault' };
  }

  // No vault of its own: book it on the platform vault only if the project really is there.
  const singleton = DEPLOYMENTS[supportedChainId]?.contracts?.RWAEscrowVault;
  if (!usableAddress(singleton)) return { ok: false, reason: `no project vault and no platform vault on ${chainInfo.name}` };
  const vault = getAddress(singleton);
  const problem = await vaultHoldsProject(supportedChainId, vault, vaultProjectId, project?.security_token_address);
  if (problem) return { ok: false, reason: `no project vault, and ${problem}` };
  return { ok: true, chainId: supportedChainId, vault, vaultProjectId, source: 'platform_vault' };
}

// ============================================================================
// PAYMENT HANDLERS
// ============================================================================

async function handleCrowdfundingPayment(paymentIntent: Stripe.PaymentIntent) {
  const { projectId, investorAddress } = paymentIntent.metadata;

  if (!projectId || !investorAddress || !isAddress(investorAddress)) {
    console.error('[Stripe] Missing metadata in payment intent:', paymentIntent.id);
    await storeFailedPayment(paymentIntent, 'Needs admin attention: missing projectId or investorAddress in metadata');
    return;
  }

  const found = await findCrowdfundingProject(paymentIntent);
  if (found.project) await recordStripeCrowdfundingInvestment(paymentIntent, found.project);
  if (found.error) {
    await storeFailedPayment(paymentIntent, `Needs admin attention: ${found.error}`);
    return;
  }

  const target = await resolveVaultTarget(paymentIntent, found.project);
  if (!target.ok) {
    console.error(`[Stripe] Not booking ${paymentIntent.id} on chain: ${target.reason}`);
    await storeFailedPayment(paymentIntent, `Needs admin attention: ${target.reason}`);
    return;
  }

  const { chainId, vault: escrowAddress, vaultProjectId } = target;
  const chainInfo = getChainById(chainId)!;
  // What Stripe charged, in USDC units.
  const amountUSD = (paymentIntent.amount / 100).toFixed(2);

  console.log(`[Stripe] Processing crowdfunding payment on ${chainInfo.name}:`, {
    projectId,
    vault: escrowAddress,
    vaultSource: target.source,
    vaultProjectId: vaultProjectId.toString(),
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
      await storeSuccessfulPayment(paymentIntent, null, chainId);
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
        vaultProjectId,
        getAddress(investorAddress),
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
 * A card investment in a crowdfunding project is recorded in `investments`
 * exactly as investments/record would; the unique PaymentIntent index keeps
 * the two from recording it twice. Problems here are logged, not fatal: the
 * on-chain booking that follows decides the payment's processing status.
 */
async function recordStripeCrowdfundingInvestment(paymentIntent: Stripe.PaymentIntent, project: Record<string, any>) {
  const { projectId, investorAddress } = paymentIntent.metadata;
  if (!projectId || !investorAddress) return;
  const checked = checkCrowdfundingInvestmentIntent(paymentIntent, { projectId });
  if (!checked.ok) {
    console.error(`[Stripe] Not recording investment for ${paymentIntent.id}: ${checked.error}`);
    return;
  }
  const result = await recordCrowdfundingInvestment(getSupabaseAdmin(), {
    project_id: project.id,
    investor_address: investorAddress,
    amount_usd: paymentIntent.amount / 100,
    payment_method: 'stripe',
    payment_intent_id: paymentIntent.id,
    chain_id: Number(paymentIntent.metadata.chainId) || projectChainOf(project),
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
