import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Statuses that admins should see (exclude draft and pending_payment)
const ADMIN_VISIBLE_STATUSES = ['pending_review', 'approved', 'rejected', 'deployed'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending_review';

    let query = supabase
      .from('crowdfunding_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (status === 'all') {
      // Show all admin-visible statuses, exclude drafts and pending_payment
      query = query.in('status', ADMIN_VISIBLE_STATUSES);
    } else {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    const applications = (data || []).map(app => ({
      id: app.id,
      walletAddress: app.wallet_address,
      chainId: app.chain_id,
      name: app.project_name,
      description: app.description,
      category: app.category,
      website: app.website,
      
      // Company Info
      companyName: app.company_name,
      registrationNumber: app.registration_number,
      jurisdiction: app.jurisdiction,
      
      // Token
      tokenName: app.token_name,
      tokenSymbol: app.token_symbol,
      totalSupply: app.total_supply,
      tokenPrice: parseFloat(app.token_price || 0),
      investorTokens: app.investor_tokens,
      platformFeeTokens: app.platform_fee_tokens,
      platformFee: app.platform_fee,
      
      // Funding
      fundingGoal: parseFloat(app.funding_goal || 0),
      localCurrency: app.local_currency,
      exchangeRate: parseFloat(app.exchange_rate || 1),
      investorSharePercent: parseFloat(app.investor_share_percentage || 80),
      projectedROI: parseFloat(app.projected_roi || 0),
      roiTimelineMonths: parseInt(app.roi_timeline_months || 12),
      revenueModel: app.revenue_model,
      deadlineDays: 90,
      
      // Milestones
      milestones: app.milestones || [],
      
      // Media
      logoUrl: app.logo_url,
      bannerUrl: app.banner_url,
      pitchDeckUrl: app.pitch_deck_url,
      videoUrl: app.video_url,
      images: app.images || [],
      
      // Legal Documents
      legalDocuments: app.legal_documents || [],
      documents: {
        pitchDeck: app.pitch_deck_url,
        legalDocs: app.legal_documents || [],
      },
      
      // Status
      status: app.status,
      rejectionReason: app.rejection_reason,
      reviewedBy: app.reviewed_by,
      reviewedAt: app.reviewed_at,
      
      // Payment
      paymentStatus: app.payment_status,
      paymentMethod: app.payment_method,
      paymentAmount: parseFloat(app.payment_amount || 0),
      paymentIntentId: app.payment_intent_id,
      paidAt: app.paid_at,
      feePaid: app.payment_status === 'paid',
      feeAmount: parseFloat(app.payment_amount || 500),
      
      // Timestamps
      submittedAt: app.created_at,
      updatedAt: app.updated_at,
      submissionCount: 1,
    }));

    return NextResponse.json({ applications });
  } catch (error: any) {
    console.error('List crowdfunding applications error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
