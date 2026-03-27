// src/app/api/tokenization/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Fetch user's tokenization applications
    const { data: applications, error } = await supabase
      .from('tokenization_applications')
      .select('*')
      .eq('user_address', wallet.toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Tokenization User API] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    // Get all project IDs for deployed projects
    const deployedProjectIds = applications
      ?.filter(app => ['deployed', 'completed', 'live'].includes(app.status))
      .map(app => app.id) || [];

    // Fetch listing status for all deployed projects
    let listingsMap: Record<string, { isListed: boolean; listingId: string; tradingPair?: string; status?: string }> = {};
    
    if (deployedProjectIds.length > 0) {
      const { data: listings, error: listingsError } = await supabase
        .from('exchange_listings')
        .select('id, project_id, token_address, status, trading_pair')
        .in('project_id', deployedProjectIds);

      if (!listingsError && listings) {
        listings.forEach(listing => {
          if (listing.project_id) {
            listingsMap[listing.project_id] = {
              isListed: listing.status === 'active' || listing.status === 'listed',
              listingId: listing.id,
              tradingPair: listing.trading_pair,
              status: listing.status,
            };
          }
        });
      }
    }

    // Map to frontend format
    const projects = applications?.map(app => {
      const listingInfo = listingsMap[app.id];

      return {
        id: app.id,
        name: app.asset_name,
        type: 'tokenize',
        status: app.status,
        tokenName: app.token_name,
        tokenSymbol: app.token_symbol,
        tokenAddress: app.token_address,
        escrowAddress: app.escrow_address,
        nftAddress: app.nft_address,
        category: app.asset_type,
        targetAmount: app.fundraising_goal || app.estimated_value,
        totalSupply: app.token_supply || app.desired_token_supply,
        tokenPrice: app.token_price_estimate,
        chainId: app.chain_id,
        createdAt: app.created_at,
        deployedAt: app.deployed_at,
        logoUrl: app.logo_url,
        website: app.website,
        description: app.asset_description,
        location: app.asset_location,
        country: app.asset_country,
        rejectionReason: app.rejection_reason,
        metadataUri: app.metadata_uri,
        // Exchange listing status
        isListed: listingInfo?.isListed || false,
        listingId: listingInfo?.listingId,
        tradingPair: listingInfo?.tradingPair,
        listingStatus: listingInfo?.status,
      };
    }) || [];

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('[Tokenization User API] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
