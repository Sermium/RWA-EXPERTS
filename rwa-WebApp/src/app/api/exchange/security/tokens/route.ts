// src/app/api/exchange/tokens/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId');

    // Fetch tokenization projects - use * to get all columns
    let query = supabase
      .from('tokenization_applications')
      .select('*')
      .in('status', ['completed', 'deployed'])
      .not('token_address', 'is', null);

    if (chainId) {
      query = query.eq('chain_id', parseInt(chainId));
    }

    const { data: projects, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching security tokens:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log first project to see available columns
    if (projects && projects.length > 0) {
      console.log('[Security Tokens] Available columns:', Object.keys(projects[0]));
    }

    // Map projects to token format - use safe access
    const tokens = projects?.map(project => {
      const priceNum = parseFloat(project.token_price_estimate || '0');
      const tokenSupply = parseFloat(project.token_supply || '0');
      const marketCap = priceNum * tokenSupply;
      
      // Format price
      let formattedPrice = '0.00';
      if (priceNum > 0) {
        if (priceNum < 0.0001) formattedPrice = priceNum.toFixed(8);
        else if (priceNum < 0.01) formattedPrice = priceNum.toFixed(6);
        else if (priceNum < 1) formattedPrice = priceNum.toFixed(4);
        else formattedPrice = priceNum.toFixed(2);
      }

      return {
        id: project.id,
        address: project.token_address,
        symbol: project.token_symbol,
        name: project.token_name || project.asset_name || 'Unknown',
        owner: project.user_address || project.wallet_address || '',
        chainId: project.chain_id,
        tradingPair: 'USDC',
        price: formattedPrice,
        marketCap: marketCap.toFixed(2),
        minOrder: '1',
        maxOrder: tokenSupply > 0 ? tokenSupply.toString() : '1000000',
        status: 'active',
        listedAt: project.deployed_at || project.updated_at || project.created_at,
        projectId: project.id,
        logoUrl: project.logo_url || project.logo_ipfs || null,
        totalSupply: tokenSupply.toString(),
        estimatedValue: project.estimated_value || '0',
      };
    }) || [];

    console.log(`[Security Tokens] Found ${tokens.length} tokens on chain ${chainId}`);

    return NextResponse.json({ 
      tokens,
      count: tokens.length,
      chainId: chainId ? parseInt(chainId) : null
    });

  } catch (err) {
    console.error('Security tokens error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}