import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  isTxHash,
  platformFeeReceiver,
  retrievePaymentIntent,
  verifyStablecoinPayment,
  type Stablecoin,
} from '@/lib/payment-verification';
import { checkFundraisingIntent, confirmFundraisingInvestment } from '@/lib/payment-records';

/**
 * Confirms a pending fundraising investment once its payment is proven:
 *
 * - card: the Stripe PaymentIntent, retrieved here, has succeeded for this
 *   investment's amount plus the card surcharge, in USD, and its metadata
 *   names this investment;
 * - crypto: the transaction moved at least the investment amount of the
 *   chain's USDC/USDT from the investing wallet to the platform fee receiver
 *   (where /raise sends it), and has not confirmed anything before.
 *
 * Without proof nothing changes. The Stripe webhook confirms card payments
 * through the same code, so whichever arrives second finds it done.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const body = await request.json();
    const {
      investmentId,
      paymentIntentId,
      txHash,
      token,
      chainId
    } = body;

    if (!investmentId) {
      return NextResponse.json({ error: 'Missing investment ID' }, { status: 400 });
    }

    // Get the investment first
    const { data: existingInvestment, error: fetchError } = await supabase
      .from('fundraising_investments')
      .select('*')
      .eq('id', investmentId)
      .single();

    if (fetchError || !existingInvestment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }
    if (existingInvestment.status === 'confirmed') {
      return NextResponse.json({ error: 'Investment already confirmed' }, { status: 409 });
    }

    let proof: { stripe_payment_intent_id?: string; tx_hash?: string };

    if (paymentIntentId) {
      const retrieved = await retrievePaymentIntent(paymentIntentId);
      if (!retrieved.ok) return NextResponse.json({ error: retrieved.error }, { status: retrieved.status });
      const checked = checkFundraisingIntent(retrieved.value, existingInvestment);
      if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: checked.status });
      proof = { stripe_payment_intent_id: retrieved.value.id };
    } else if (txHash) {
      if (!isTxHash(txHash)) {
        return NextResponse.json({ error: 'Malformed transaction hash' }, { status: 400 });
      }
      const hash = txHash.toLowerCase();
      const paymentChainId = Number(existingInvestment.chain_id ?? chainId);
      const symbol = String(existingInvestment.payment_token ?? token ?? '').toUpperCase();
      if (symbol !== 'USDC' && symbol !== 'USDT') {
        return NextResponse.json({ error: 'Unsupported payment token' }, { status: 400 });
      }

      const { data: reused } = await supabase
        .from('fundraising_investments')
        .select('id')
        .eq('tx_hash', hash)
        .neq('id', investmentId)
        .limit(1)
        .maybeSingle();
      if (reused) {
        return NextResponse.json({ error: 'This transaction has already been used' }, { status: 409 });
      }

      const verified = await verifyStablecoinPayment({
        chainId: paymentChainId,
        txHash: hash,
        from: existingInvestment.wallet_address,
        to: platformFeeReceiver(paymentChainId),
        minUsd: Number(existingInvestment.investment_amount_usd),
        symbol: symbol as Stablecoin,
      });
      if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });
      proof = { tx_hash: hash };
    } else {
      return NextResponse.json({ error: 'Payment proof required (paymentIntentId or txHash)' }, { status: 402 });
    }

    const result = await confirmFundraisingInvestment(supabase, existingInvestment, proof);
    switch (result.status) {
      case 'confirmed':
        return NextResponse.json({ success: true, investment: result.record });
      case 'already_confirmed':
        return NextResponse.json({ error: 'Investment already confirmed' }, { status: 409 });
      case 'reused':
        return NextResponse.json({ error: 'This payment has already been used' }, { status: 409 });
      default:
        console.error('Investment update error:', result.error);
        return NextResponse.json({ error: 'Failed to confirm investment' }, { status: 500 });
    }

  } catch (error) {
    console.error('Confirm payment error:', error);
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 });
  }
}
