// src/lib/payment-records.ts
/**
 * What happens once a payment is proven. The confirm routes and the Stripe
 * webhook both end here, so whichever arrives first records the payment and
 * the other finds it already done. Every write is conditional (or guarded by
 * a unique index, see database/2026-10-25-payment-verification.sql), so two
 * concurrent confirmations cannot both count the same money.
 */
import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkPaymentIntent, isUniqueViolation, usdToCents, type Verified } from './payment-verification';

// ============================================================================
// FUNDRAISING (platform token rounds) -- fundraising_investments
// ============================================================================

/** Card surcharge added on /raise (STRIPE_FEE_PERCENT there). */
export const FUNDRAISING_CARD_FEE_PERCENT = 4;

export const fundraisingCardChargeCents = (investmentAmountUsd: number) =>
  usdToCents(investmentAmountUsd * (1 + FUNDRAISING_CARD_FEE_PERCENT / 100));

export function checkFundraisingIntent(
  pi: Stripe.PaymentIntent,
  investment: { id: string; investment_amount_usd: number | string },
): Verified<Stripe.PaymentIntent> {
  return checkPaymentIntent(pi, {
    amountCents: fundraisingCardChargeCents(Number(investment.investment_amount_usd)),
    metadata: { type: 'fundraising_investment', investmentId: investment.id },
  });
}

export type ConfirmResult =
  | { status: 'confirmed'; record: any }
  | { status: 'already_confirmed' }
  | { status: 'reused' }
  | { status: 'error'; error: unknown };

/**
 * Marks a pending fundraising investment confirmed with its proof, then its
 * allocations, the round's raised amount and investor count. Only the call
 * that flips the status does the counting.
 *
 * `proof` is the PaymentIntent or tx hash (none for an admin attesting to an
 * off-platform payment). `options.extra` adds columns to the same update
 * (e.g. who reviewed it); `options.excludeStatuses` lists the statuses the
 * investment must not be in for the update to apply (default: confirmed).
 */
export async function confirmFundraisingInvestment(
  supabase: SupabaseClient,
  investment: { id: string; round_id: string | null; wallet_address: string; investment_amount_usd: number | string },
  proof: { stripe_payment_intent_id?: string; tx_hash?: string },
  options: { extra?: Record<string, unknown>; excludeStatuses?: string[] } = {},
): Promise<ConfirmResult> {
  const now = new Date().toISOString();
  let query = supabase
    .from('fundraising_investments')
    .update({
      ...(options.extra ?? {}),
      ...proof,
      status: 'confirmed',
      payment_confirmed_at: now,
      updated_at: now,
    })
    .eq('id', investment.id);
  for (const status of options.excludeStatuses ?? ['confirmed']) query = query.neq('status', status);
  const { data: updated, error } = await query.select().maybeSingle();

  if (error) return isUniqueViolation(error) ? { status: 'reused' } : { status: 'error', error };
  if (!updated) return { status: 'already_confirmed' };

  const { error: allocError } = await supabase
    .from('token_allocations')
    .update({ status: 'confirmed', updated_at: now })
    .eq('investment_id', investment.id);
  if (allocError) console.error('[payments] token allocation update failed:', allocError);

  if (investment.round_id) {
    const amount = Number(updated.investment_amount_usd ?? investment.investment_amount_usd);
    const { error: rpcError } = await supabase.rpc('increment_round_raised', {
      p_round_id: investment.round_id,
      p_amount: amount,
    });
    if (rpcError) {
      // No RPC in this database: fall back to read-then-write.
      const { data: round } = await supabase
        .from('fundraising_rounds')
        .select('raised_amount_usd')
        .eq('id', investment.round_id)
        .maybeSingle();
      if (round) {
        await supabase
          .from('fundraising_rounds')
          .update({ raised_amount_usd: Number(round.raised_amount_usd || 0) + amount, updated_at: now })
          .eq('id', investment.round_id);
      }
    }

    const { data: others, error: checkError } = await supabase
      .from('fundraising_investments')
      .select('id')
      .eq('round_id', investment.round_id)
      .eq('wallet_address', investment.wallet_address)
      .eq('status', 'confirmed')
      .neq('id', investment.id);
    if (!checkError && (!others || others.length === 0)) {
      await supabase.rpc('increment_round_investors', { p_round_id: investment.round_id });
    }
  }

  return { status: 'confirmed', record: updated };
}

// ============================================================================
// CROWDFUNDING SUBMISSION FEE -- tokenization_applications
// ============================================================================

/** The fee /api/payments/stripe/submission-fee charges when the application has none set. */
export const DEFAULT_SUBMISSION_FEE_USD = 500;

export const submissionFeeUsd = (app: { fee_amount?: number | string | null }) =>
  Number(app.fee_amount) > 0 ? Number(app.fee_amount) : DEFAULT_SUBMISSION_FEE_USD;

export function checkSubmissionFeeIntent(
  pi: Stripe.PaymentIntent,
  app: { id: string; user_address: string; fee_amount?: number | string | null },
): Verified<Stripe.PaymentIntent> {
  return checkPaymentIntent(pi, {
    amountCents: usdToCents(submissionFeeUsd(app)),
    metadata: { type: 'crowdfunding_submission_fee', applicationId: app.id, walletAddress: app.user_address },
  });
}

/** Moves a draft application to review with the payment reference (PaymentIntent id or tx hash). */
export async function markSubmissionFeePaid(
  supabase: SupabaseClient,
  applicationId: string,
  reference: { payment_tx_hash: string; payment_token?: string | null },
): Promise<ConfirmResult> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('tokenization_applications')
    .update({
      status: 'pending_review',
      fee_paid_at: now,
      payment_confirmed_at: now,
      payment_tx_hash: reference.payment_tx_hash,
      payment_token: reference.payment_token ?? null,
      updated_at: now,
    })
    .eq('id', applicationId)
    .eq('status', 'draft')
    .select()
    .maybeSingle();
  if (error) return isUniqueViolation(error) ? { status: 'reused' } : { status: 'error', error };
  if (!data) return { status: 'already_confirmed' };
  return { status: 'confirmed', record: data };
}

// ============================================================================
// CROWDFUNDING INVESTMENTS -- investments + crowdfunding_applications.funded_amount
// ============================================================================

export function checkCrowdfundingInvestmentIntent(
  pi: Stripe.PaymentIntent,
  expect: { projectId: string; amountUsd?: number; investorAddress?: string | null },
): Verified<Stripe.PaymentIntent> {
  const amountCents = expect.amountUsd !== undefined ? usdToCents(expect.amountUsd) : pi.amount;
  return checkPaymentIntent(pi, {
    amountCents,
    metadata: {
      type: 'crowdfunding_investment',
      projectId: expect.projectId,
      investorAddress: expect.investorAddress ?? undefined,
    },
  });
}

/**
 * Inserts a verified investment and adds it to the project's funded amount.
 * A tx hash or PaymentIntent already recorded hits the unique index and is
 * reported as reused; funded_amount is only bumped by the insert that won.
 */
export async function recordCrowdfundingInvestment(
  supabase: SupabaseClient,
  row: {
    project_id: string;
    investor_address: string;
    investor_email?: string | null;
    amount_usd: number;
    amount_tokens?: number | null;
    payment_method: string;
    tx_hash?: string | null;
    payment_intent_id?: string | null;
    payment_reference?: string | null;
    chain_id: number | null;
    metadata?: Record<string, unknown>;
  },
): Promise<ConfirmResult> {
  const { data: investment, error } = await supabase
    .from('investments')
    .insert({
      project_id: row.project_id,
      investor_address: row.investor_address.toLowerCase(),
      investor_email: row.investor_email ?? null,
      amount_usd: row.amount_usd,
      amount_tokens: row.amount_tokens ?? null,
      payment_method: row.payment_method,
      tx_hash: row.tx_hash ?? null,
      payment_intent_id: row.payment_intent_id ?? null,
      payment_reference: row.payment_reference ?? null,
      chain_id: row.chain_id,
      status: 'completed',
      metadata: row.metadata ?? {},
    })
    .select()
    .single();

  if (error) return isUniqueViolation(error) ? { status: 'reused' } : { status: 'error', error };

  const { error: rpcError } = await supabase.rpc('increment_funded_amount', {
    p_project_id: row.project_id,
    p_amount: row.amount_usd,
  });
  if (rpcError) {
    const { data: project } = await supabase
      .from('crowdfunding_applications')
      .select('funded_amount')
      .eq('id', row.project_id)
      .maybeSingle();
    if (project) {
      await supabase
        .from('crowdfunding_applications')
        .update({ funded_amount: Number(project.funded_amount || 0) + row.amount_usd, updated_at: new Date().toISOString() })
        .eq('id', row.project_id);
    }
  }

  return { status: 'confirmed', record: investment };
}
