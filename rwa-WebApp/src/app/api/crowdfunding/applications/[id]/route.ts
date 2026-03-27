import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAddress } from 'viem';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TABLE_NAME = 'crowdfunding_applications';
const PUBLIC_STATUSES = ['approved', 'active', 'funded', 'completed', 'in_progress'];

function parseJsonField(field: unknown): unknown[] {
  if (!field) return [];
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return [];
    }
  }
  return Array.isArray(field) ? field : [];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required' },
        { status: 400 }
      );
    }

    const { data: application, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[API] Error fetching application:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Application not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to fetch application' },
        { status: 500 }
      );
    }

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const walletParam = searchParams.get('wallet');

    let isOwner = false;
    if (walletParam) {
      try {
        const normalizedWallet = getAddress(walletParam).toLowerCase();
        isOwner = application.wallet_address?.toLowerCase() === normalizedWallet;
      } catch {
        // Invalid wallet address
      }
    }

    if (!isOwner && !PUBLIC_STATUSES.includes(application.status)) {
      return NextResponse.json(
        { success: false, error: 'Application not available' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      application: {
        ...application,
        milestones: parseJsonField(application.milestones),
        documents: parseJsonField(application.documents),
        legal_documents: parseJsonField(application.legal_documents),
        images: parseJsonField(application.images),
        team_members: parseJsonField(application.team_members),
        social_links: parseJsonField(application.social_links),
      },
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const wallet = body.wallet_address || body.walletAddress;
    
    delete body.wallet_address;
    delete body.walletAddress;

    if (!id || !wallet) {
      return NextResponse.json(
        { success: false, error: 'Application ID and wallet address are required' },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('wallet_address, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    const normalizedWallet = getAddress(wallet).toLowerCase();
    if (existing.wallet_address?.toLowerCase() !== normalizedWallet) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const editableStatuses = ['draft', 'rejected', 'pending_review', 'pending_payment'];
    if (!editableStatuses.includes(existing.status)) {
      return NextResponse.json(
        { success: false, error: 'Application cannot be modified in current status' },
        { status: 400 }
      );
    }

    const fieldMap: Record<string, string> = {
      projectName: 'project_name',
      description: 'description',
      category: 'category',
      website: 'website',
      companyName: 'company_name',
      registrationNumber: 'registration_number',
      jurisdiction: 'jurisdiction',
      fundingGoal: 'funding_goal',
      localCurrency: 'local_currency',
      exchangeRate: 'exchange_rate',
      investorSharePercentage: 'investor_share_percentage',
      projectedROI: 'projected_roi',
      roiTimelineMonths: 'roi_timeline_months',
      revenueModel: 'revenue_model',
      tokenName: 'token_name',
      tokenSymbol: 'token_symbol',
      totalSupply: 'total_supply',
      tokenPrice: 'token_price',
      investorTokens: 'investor_tokens',
      platformFeeTokens: 'platform_fee_tokens',
      platformFee: 'platform_fee',
      logoUrl: 'logo_url',
      bannerUrl: 'banner_url',
      pitchDeckUrl: 'pitch_deck_url',
      videoUrl: 'video_url',
      images: 'images',
      legalDocuments: 'legal_documents',
      termsAccepted: 'terms_accepted',
      milestones: 'milestones',
      status: 'status',
    };

    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const [key, value] of Object.entries(body)) {
      const dbKey = fieldMap[key] || key;
      dbUpdates[dbKey] = value;
    }

    const { data: updated, error: updateError } = await supabase
      .from(TABLE_NAME)
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error updating application:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update application' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      application: updated,
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!id || !wallet) {
      return NextResponse.json(
        { success: false, error: 'Application ID and wallet are required' },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('wallet_address, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    const normalizedWallet = getAddress(wallet).toLowerCase();
    if (existing.wallet_address?.toLowerCase() !== normalizedWallet) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (existing.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: 'Only draft applications can be deleted' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[API] Error deleting application:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete application' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Application deleted',
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
