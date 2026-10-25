import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import {
  getStripe,
  isTxHash,
  platformFeeReceiver,
  retrievePaymentIntent,
  verifyStablecoinPayment,
  type Verified,
} from '@/lib/payment-verification';
import { checkSubmissionFeeIntent, markSubmissionFeePaid, submissionFeeUsd } from '@/lib/payment-records';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

type FeeApp = { id: string; status: string; fee_amount: number | null; user_address: string; chain_id: number | null };

/**
 * When the browser comes back from a Stripe redirect it sends only the
 * application id. Find the succeeded fee intent the webhook stored for it,
 * or ask Stripe directly; either way it is checked like any other.
 */
async function findFeeIntent(supabase: ReturnType<typeof getSupabase>, app: FeeApp): Promise<Verified<Stripe.PaymentIntent>> {
  const { data: stored } = await supabase
    .from('payments')
    .select('stripe_payment_intent_id')
    .eq('application_id', app.id)
    .eq('type', 'crowdfunding_submission_fee')
    .eq('status', 'succeeded')
    .limit(1)
    .maybeSingle();
  if (stored?.stripe_payment_intent_id) return retrievePaymentIntent(stored.stripe_payment_intent_id);

  try {
    const found = await getStripe().paymentIntents.search({
      query: `metadata['applicationId']:'${app.id.replace(/'/g, '')}' AND status:'succeeded'`,
      limit: 1,
    });
    if (found.data[0]) return { ok: true, value: found.data[0] };
  } catch (err) {
    console.error('[crowdfunding] PaymentIntent search failed:', err);
  }
  return { ok: false, status: 402, error: 'No payment found for this application' };
}

/**
 * Moves a draft application to review once its submission fee is proven:
 * a succeeded Stripe PaymentIntent for this application, its wallet and its
 * fee, or a USDC/USDT transfer of at least the fee from the applicant's
 * wallet to the platform fee receiver. A payment already used by another
 * application is refused.
 */
export async function POST(request: NextRequest) {
  try {
    const { applicationId, paymentIntentId, txHash, chainId } = await request.json();

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: app } = await supabase
      .from('tokenization_applications')
      .select('id, status, fee_amount, user_address, chain_id')
      .eq('id', applicationId)
      .maybeSingle();

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    if (app.status !== 'draft') {
      return NextResponse.json({ error: 'Application is not awaiting payment' }, { status: 409 });
    }

    let reference: { payment_tx_hash: string; payment_token?: string | null };

    if (txHash) {
      if (!isTxHash(txHash)) {
        return NextResponse.json({ error: 'Malformed transaction hash' }, { status: 400 });
      }
      const paymentChainId = Number(chainId ?? app.chain_id);
      const verified = await verifyStablecoinPayment({
        chainId: paymentChainId,
        txHash: txHash.toLowerCase(),
        from: app.user_address,
        to: platformFeeReceiver(paymentChainId),
        minUsd: submissionFeeUsd(app),
      });
      if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });
      reference = { payment_tx_hash: txHash.toLowerCase(), payment_token: verified.value.symbol };
    } else {
      const intent = paymentIntentId ? await retrievePaymentIntent(paymentIntentId) : await findFeeIntent(supabase, app);
      if (!intent.ok) return NextResponse.json({ error: intent.error }, { status: intent.status });
      const checked = checkSubmissionFeeIntent(intent.value, app);
      if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: checked.status });
      reference = { payment_tx_hash: intent.value.id, payment_token: 'USD' };
    }

    const { data: reused } = await supabase
      .from('tokenization_applications')
      .select('id')
      .eq('payment_tx_hash', reference.payment_tx_hash)
      .neq('id', applicationId)
      .limit(1)
      .maybeSingle();
    if (reused) {
      return NextResponse.json({ error: 'This payment has already been used' }, { status: 409 });
    }

    const result = await markSubmissionFeePaid(supabase, applicationId, reference);
    switch (result.status) {
      case 'confirmed':
        return NextResponse.json({ success: true });
      case 'already_confirmed':
        return NextResponse.json({ error: 'Application is not awaiting payment' }, { status: 409 });
      case 'reused':
        return NextResponse.json({ error: 'This payment has already been used' }, { status: 409 });
      default:
        console.error('Supabase error:', result.error);
        return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
