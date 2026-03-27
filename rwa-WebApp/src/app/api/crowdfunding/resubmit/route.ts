// src/app/api/crowdfunding/resubmit/route.ts
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
    const { applicationId, walletAddress, updatedData } = body;

    if (!applicationId || !walletAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedAddress = getAddress(walletAddress).toLowerCase();

    // Fetch existing
    const { data: existing, error: fetchError } = await supabase
      .from('crowdfunding_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify ownership
    if (existing.wallet_address.toLowerCase() !== normalizedAddress) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Only rejected can be resubmitted
    if (existing.status !== 'rejected') {
      return NextResponse.json({ error: 'Only rejected applications can be resubmitted' }, { status: 400 });
    }

    // Must have paid fee
    if (!existing.fee_paid) {
      return NextResponse.json({ error: 'Fee not paid' }, { status: 400 });
    }

    // Update
    const { data, error } = await supabase
      .from('crowdfunding_applications')
      .update({
        name: updatedData.name ?? existing.name,
        description: updatedData.description ?? existing.description,
        category: updatedData.category ?? existing.category,
        token_name: updatedData.tokenName ?? existing.token_name,
        token_symbol: updatedData.tokenSymbol ?? existing.token_symbol,
        funding_goal: updatedData.fundingGoal ?? existing.funding_goal,
        token_price: updatedData.tokenPrice ?? existing.token_price,
        total_supply: updatedData.totalSupply ?? existing.total_supply,
        deadline_days: updatedData.deadlineDays ?? existing.deadline_days,
        investor_share_percent: updatedData.investorSharePercent ?? existing.investor_share_percent,
        projected_roi: updatedData.projectedROI ?? existing.projected_roi,
        roi_timeline_months: updatedData.roiTimelineMonths ?? existing.roi_timeline_months,
        milestones: updatedData.milestones ?? existing.milestones,
        documents: updatedData.documents ?? existing.documents,
        images: updatedData.images ?? existing.images,
        website: updatedData.website ?? existing.website,
        
        // Reset review
        status: 'pending_review',
        rejection_reason: null,
        rejected_at: null,
        reviewed_by: null,
        reviewed_at: null,
        
        // Track resubmission
        submission_count: (existing.submission_count || 1) + 1,
        resubmitted_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Resubmitted successfully. No additional fee charged.',
      application: data,
    });
  } catch (error: any) {
    console.error('Resubmit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}