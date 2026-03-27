// src/app/api/crowdfunding/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAddress } from 'viem';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TABLE_NAME = 'crowdfunding_applications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      walletAddress,
      chainId,
      projectName,
      category,
      description,
      website,
      companyName,
      registrationNumber,
      jurisdiction,
      fundingGoal,
      localCurrency,
      exchangeRate,
      investorSharePercentage,
      projectedROI,
      roiTimelineMonths,
      revenueModel,
      tokenName,
      tokenSymbol,
      totalSupply,
      tokenPrice,
      investorTokens,
      platformFeeTokens,
      platformFee,
      // ADD THESE:
      milestones,
      logoUrl,
      bannerUrl,
      pitchDeckUrl,
      images,
      videoUrl,
      legalDocuments,
      termsAccepted,
    } = body;

    if (!walletAddress || !chainId || !projectName || !tokenName || !tokenSymbol) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const normalizedWallet = getAddress(walletAddress).toLowerCase();

    // Check for existing draft/pending application
    const { data: existing } = await supabase
      .from(TABLE_NAME)
      .select('id, status')
      .eq('wallet_address', normalizedWallet)
      .eq('chain_id', chainId)
      .in('status', ['draft', 'pending_payment'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from(TABLE_NAME)
        .update({
          project_name: projectName,
          category,
          description,
          website,
          company_name: companyName,
          registration_number: registrationNumber,
          jurisdiction,
          funding_goal: fundingGoal,
          local_currency: localCurrency || 'USD',
          exchange_rate: exchangeRate || 1,
          investor_share_percentage: investorSharePercentage,
          projected_roi: projectedROI,
          roi_timeline_months: roiTimelineMonths || 12,
          revenue_model: revenueModel,
          token_name: tokenName,
          token_symbol: tokenSymbol,
          total_supply: totalSupply,
          token_price: tokenPrice,
          investor_tokens: investorTokens,
          platform_fee_tokens: platformFeeTokens,
          platform_fee: platformFee,
          // ADD THESE:
          milestones: milestones || [],
          logo_url: logoUrl,
          banner_url: bannerUrl,
          pitch_deck_url: pitchDeckUrl,
          images: images || [],
          video_url: videoUrl,
          legal_documents: legalDocuments || [],
          terms_accepted: termsAccepted || false,
          status: 'pending_payment',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return NextResponse.json({
        id: updated.id,
        status: updated.status,
        isExisting: true,
      });
    }

    // Create new
    const { data: newApp, error: insertError } = await supabase
      .from(TABLE_NAME)
      .insert({
        wallet_address: normalizedWallet,
        chain_id: chainId,
        project_name: projectName,
        category,
        description,
        website,
        company_name: companyName,
        registration_number: registrationNumber,
        jurisdiction,
        funding_goal: fundingGoal,
        local_currency: localCurrency || 'USD',
        exchange_rate: exchangeRate || 1,
        investor_share_percentage: investorSharePercentage || 80,
        projected_roi: projectedROI,
        roi_timeline_months: roiTimelineMonths || 12,
        revenue_model: revenueModel,
        token_name: tokenName,
        token_symbol: tokenSymbol,
        total_supply: totalSupply || 0,
        token_price: tokenPrice || 0,
        investor_tokens: investorTokens || 0,
        platform_fee_tokens: platformFeeTokens || 0,
        platform_fee: platformFee || 0,
        // ADD THESE:
        milestones: milestones || [],
        logo_url: logoUrl,
        banner_url: bannerUrl,
        pitch_deck_url: pitchDeckUrl,
        images: images || [],
        video_url: videoUrl,
        legal_documents: legalDocuments || [],
        terms_accepted: termsAccepted || false,
        status: 'pending_payment',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      id: newApp.id,
      status: newApp.status,
      isExisting: false,
    });

  } catch (error: unknown) {
    console.error('Create crowdfunding application error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create application' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const wallet = searchParams.get('wallet');

    if (!id && !wallet) {
      return NextResponse.json({ error: 'ID or wallet required' }, { status: 400 });
    }

    if (id) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }

      // Verify ownership if wallet provided
      if (wallet) {
        const normalizedWallet = getAddress(wallet).toLowerCase();
        if (data.wallet_address?.toLowerCase() !== normalizedWallet) {
          return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }
      }

      return NextResponse.json({ application: data });
    }

    // List by wallet
    const normalizedWallet = getAddress(wallet!).toLowerCase();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('wallet_address', normalizedWallet)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      applications: data || [],
      count: data?.length || 0,
    });

  } catch (error: unknown) {
    console.error('Fetch crowdfunding application error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Application ID required' }, { status: 400 });
    }

    const fieldMap: Record<string, string> = {
      // Basic Info
      projectName: 'project_name',
      description: 'description',
      category: 'category',
      website: 'website',
      
      // Company
      companyName: 'company_name',
      registrationNumber: 'registration_number',
      jurisdiction: 'jurisdiction',
      
      // Financial
      fundingGoal: 'funding_goal',
      localCurrency: 'local_currency',
      exchangeRate: 'exchange_rate', 
      investorSharePercentage: 'investor_share_percentage',
      projectedROI: 'projected_roi',
      roiTimelineMonths: 'roi_timeline_months',
      revenueModel: 'revenue_model',
      
      // Token
      tokenName: 'token_name',
      tokenSymbol: 'token_symbol',
      totalSupply: 'total_supply',
      tokenPrice: 'token_price',
      investorTokens: 'investor_tokens',
      platformFeeTokens: 'platform_fee_tokens',
      platformFee: 'platform_fee',
      
      // Media
      logoUrl: 'logo_url',
      bannerUrl: 'banner_url',
      pitchDeckUrl: 'pitch_deck_url',
      videoUrl: 'video_url',
      images: 'images', 
      
      // Documents
      legalDocuments: 'legal_documents',
      termsAccepted: 'terms_accepted',
      milestones: 'milestones', 
      
      // Status
      status: 'status', 
    };

    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const [key, value] of Object.entries(updates)) {
      dbUpdates[fieldMap[key] || key] = value;
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json(data);

  } catch (error: unknown) {
    console.error('Update crowdfunding application error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update' },
      { status: 500 }
    );
  }
}
