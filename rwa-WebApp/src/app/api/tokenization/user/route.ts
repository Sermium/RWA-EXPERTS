// src/app/api/tokenization/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet required' }, { status: 400 });
  }

  try {
    const walletLower = wallet.toLowerCase();

    // Fetch from tokenization_applications using correct column: user_address
    const { data: applications, error } = await supabase
      .from('tokenization_applications')
      .select('*')
      .ilike('user_address', walletLower)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] Supabase error:', error);
      throw error;
    }

    console.log('[API] Found applications:', applications?.length || 0);

    // Also fetch from projects table for deployed projects
    const { data: deployedProjects } = await supabase
      .from('projects')
      .select('*')
      .ilike('owner', walletLower);

    // Transform to frontend format
    const projects = applications?.map(app => {
      const deployed = deployedProjects?.find(p => p.application_id === app.id);
      const createdAt = new Date(app.created_at);
      const now = new Date();
      const age = deployed ? Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      return {
        id: app.id,
        name: app.asset_name || app.token_name || 'Unnamed Project',
        type: app.token_type || 'tokenize',
        status: app.status,
        submittedAt: createdAt.toLocaleDateString(),
        tokenSymbol: app.token_symbol,
        category: app.asset_type || 'other',
        totalRaised: deployed?.total_raised || 0,
        targetAmount: parseFloat(app.estimated_value) || parseFloat(app.fundraising_goal) || 0,
        totalSupply: parseFloat(app.token_supply) || parseFloat(app.desired_token_supply) || 0,
        tokensSold: deployed?.tokens_sold || 0,
        currentValue: deployed?.current_value || parseFloat(app.estimated_value) || 0,
        roi: deployed && parseFloat(app.estimated_value) > 0 
          ? ((deployed.current_value - parseFloat(app.estimated_value)) / parseFloat(app.estimated_value) * 100) 
          : 0,
        age,
        performanceScore: deployed?.performance_score || 50,
        dividendsDistributed: deployed?.dividends_distributed || 0,
        escrowBalance: deployed?.escrow_balance || 0,
        // Additional fields from your schema
        rejectionReason: app.rejection_reason,
        tokenAddress: app.token_address,
        escrowAddress: app.escrow_address,
        nftAddress: app.nft_address,
        logoUrl: app.logo_url || app.logo_ipfs,
        website: app.website,
        description: app.asset_description,
      };
    }) || [];

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching user projects:', error);
    return NextResponse.json({ projects: [], error: 'Failed to fetch projects' });
  }
}
