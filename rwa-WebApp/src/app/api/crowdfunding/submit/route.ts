// src/app/api/crowdfunding/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAddress } from 'viem';
import {
  checkPaymentIntent,
  fail,
  isPaymentIntentId,
  isTxHash,
  isUniqueViolation,
  platformFeeReceiver,
  retrievePaymentIntent,
  usdToCents,
  verifyStablecoinPayment,
  type Verified,
} from '@/lib/payment-verification';
import { DEFAULT_SUBMISSION_FEE_USD } from '@/lib/payment-records';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifySubmissionFee(paymentId: string, wallet: string, chainId: number): Promise<Verified<true>> {
  if (isPaymentIntentId(paymentId)) {
    const intent = await retrievePaymentIntent(paymentId);
    if (!intent.ok) return intent;
    const checked = checkPaymentIntent(intent.value, {
      amountCents: usdToCents(DEFAULT_SUBMISSION_FEE_USD),
      atLeast: true,
      metadata: { type: 'crowdfunding_submission_fee', walletAddress: wallet },
    });
    if (!checked.ok) return checked;
  } else if (isTxHash(paymentId)) {
    const verified = await verifyStablecoinPayment({
      chainId,
      txHash: paymentId,
      from: wallet,
      to: platformFeeReceiver(chainId),
      minUsd: DEFAULT_SUBMISSION_FEE_USD,
    });
    if (!verified.ok) return verified;
  } else {
    return fail(400, 'Unrecognised fee payment reference');
  }

  // Not already spent on another application.
  const variants = Array.from(new Set([paymentId, paymentId.toLowerCase()]));
  const [{ data: usedHere }, { data: usedThere }] = await Promise.all([
    supabase.from('crowdfunding_applications').select('id').in('fee_payment_id', variants).limit(1).maybeSingle(),
    supabase.from('tokenization_applications').select('id').in('payment_tx_hash', variants).limit(1).maybeSingle(),
  ]);
  if (usedHere || usedThere) return fail(409, 'This payment has already been used');
  return { ok: true, value: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, feePaymentId, ...projectData } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const normalizedAddress = getAddress(walletAddress).toLowerCase();

    // Validate required fields
    if (!projectData.name || !projectData.tokenName || !projectData.tokenSymbol || !projectData.fundingGoal) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // A fee payment counts only once verified: a succeeded Stripe PaymentIntent
    // for this wallet's submission fee, or a USDC/USDT transfer of at least
    // the fee from this wallet to the platform fee receiver -- and not one
    // already used by another application. Without one the application is a
    // draft awaiting payment.
    let feePaid = false;
    if (feePaymentId) {
      const fee = await verifySubmissionFee(String(feePaymentId), normalizedAddress, Number(body.chainId));
      if (!fee.ok) {
        return NextResponse.json({ error: fee.error }, { status: fee.status });
      }
      feePaid = true;
    }

    const { data, error } = await supabase
      .from('crowdfunding_applications')
      .insert({
        wallet_address: normalizedAddress,
        email: projectData.email,
        name: projectData.name,
        description: projectData.description,
        category: projectData.category,
        token_name: projectData.tokenName,
        token_symbol: projectData.tokenSymbol,
        funding_goal: projectData.fundingGoal,
        token_price: projectData.tokenPrice || 1.00,
        total_supply: projectData.totalSupply,
        deadline_days: projectData.deadlineDays || 90,
        investor_share_percent: projectData.investorSharePercent,
        projected_roi: projectData.projectedROI,
        roi_timeline_months: projectData.roiTimelineMonths,
        min_investment: projectData.minInvestment || 100,
        max_investment: projectData.maxInvestment,
        images: projectData.images || [],
        documents: projectData.documents || {},
        milestones: projectData.milestones || [],
        website: projectData.website,
        fee_paid: feePaid,
        fee_payment_id: feePaid ? (isTxHash(feePaymentId) ? feePaymentId.toLowerCase() : String(feePaymentId)) : null,
        fee_paid_at: feePaid ? new Date().toISOString() : null,
        status: feePaid ? 'pending_review' : 'draft',
        submission_count: feePaid ? 1 : 0,
        submitted_at: feePaid ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error && isUniqueViolation(error)) {
      return NextResponse.json({ error: 'This payment has already been used' }, { status: 409 });
    }
    if (error) throw error;

    return NextResponse.json({
      success: true,
      application: data,
      requiresPayment: !feePaid,
    });
  } catch (error: any) {
    console.error('Submit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}