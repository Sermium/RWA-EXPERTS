// src/app/api/crowdfunding/application/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAddress } from 'viem';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const wallet = searchParams.get('wallet');

    if (!id) {
      return NextResponse.json({ error: 'Application ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tokenization_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify ownership if wallet provided
    if (wallet) {
      const normalizedWallet = getAddress(wallet).toLowerCase();
      if (data.user_address?.toLowerCase() !== normalizedWallet) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
    }

    return NextResponse.json({
      application: {
        id: data.id,
        walletAddress: data.user_address,
        name: data.asset_name,
        description: data.asset_description,
        category: data.asset_type,
        tokenName: data.token_name,
        tokenSymbol: data.token_symbol,
        fundingGoal: parseFloat(data.fundraising_goal || 0),
        tokenPrice: parseFloat(data.token_price_estimate || 1),
        deadlineDays: 90,
        investorSharePercent: parseFloat(data.investor_share_percent || 80),
        projectedROI: parseFloat(data.projected_roi || 0),
        roiTimelineMonths: parseInt(data.roi_timeline_months || 24),
        milestones: data.milestones || [],
        documents: data.documents || {},
        images: [data.logo_url, data.banner_url].filter(Boolean),
        website: data.website,
        status: data.status,
        rejectionReason: data.rejection_reason,
        submissionCount: data.submission_count || 1,
        feePaid: !!data.fee_paid_at,
        feeAmount: parseFloat(data.fee_amount || 500),
        submittedAt: data.created_at,
      },
    });
  } catch (error: any) {
    console.error('Fetch application error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
