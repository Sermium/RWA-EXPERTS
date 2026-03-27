// src/app/api/crowdfunding/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAddress } from 'viem';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Verify fee payment with Stripe if provided
    let feePaid = false;
    if (feePaymentId) {
      // TODO: Verify payment with Stripe API
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
        fee_payment_id: feePaymentId,
        fee_paid_at: feePaid ? new Date().toISOString() : null,
        status: feePaid ? 'pending_review' : 'draft',
        submission_count: feePaid ? 1 : 0,
        submitted_at: feePaid ? new Date().toISOString() : null,
      })
      .select()
      .single();

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