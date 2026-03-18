// src/app/api/investments/user/route.ts
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
    // Try to fetch from investments table if exists
    const { data: investments, error } = await supabase
      .from('investments')
      .select(`
        *,
        projects (
          name,
          token_symbol,
          current_price,
          status
        )
      `)
      .eq('investor_address', wallet.toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      // Table might not exist yet - return empty
      console.log('Investments table not found or error:', error.message);
      return NextResponse.json({ 
        investments: [],
        pendingDividends: 0,
        pendingYield: 0
      });
    }

    // Transform
    const formattedInvestments = investments?.map(inv => ({
      projectId: inv.project_id,
      projectName: inv.projects?.name || 'Unknown Project',
      tokenSymbol: inv.projects?.token_symbol || 'TOKEN',
      tokenAddress: inv.token_address,
      amount: inv.amount_invested || 0,
      tokens: inv.tokens_received || 0,
      currentValue: (inv.tokens_received || 0) * (inv.projects?.current_price || inv.price_at_purchase || 0),
      purchaseDate: new Date(inv.created_at).toLocaleDateString(),
      priceAtPurchase: inv.price_at_purchase || 0,
      currentPrice: inv.projects?.current_price || inv.price_at_purchase || 0,
      roi: inv.price_at_purchase > 0 
        ? ((inv.projects?.current_price || inv.price_at_purchase) - inv.price_at_purchase) / inv.price_at_purchase * 100 
        : 0,
      status: inv.projects?.status === 'active' ? 'active' : 'completed',
    })) || [];

    // Calculate pending dividends (would need dividend_claims table)
    const pendingDividends = 0; // TODO: fetch from dividend claims
    const pendingYield = 0;

    return NextResponse.json({ 
      investments: formattedInvestments,
      pendingDividends,
      pendingYield
    });
  } catch (error) {
    console.error('Error fetching investments:', error);
    return NextResponse.json({ 
      investments: [],
      pendingDividends: 0,
      pendingYield: 0
    });
  }
}
