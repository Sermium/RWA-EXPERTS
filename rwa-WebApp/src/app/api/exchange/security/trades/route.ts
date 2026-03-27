// src/app/api/exchange/security/trades/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenAddress = searchParams.get('tokenAddress');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!tokenAddress) {
      return NextResponse.json({ error: 'Token address required' }, { status: 400 });
    }

    // Get trading pair for this token
    const { data: tradingPair } = await supabase
      .from('trading_pairs')
      .select('id')
      .ilike('base_token_address', tokenAddress)
      .single();

    if (!tradingPair) {
      return NextResponse.json({ trades: [] });
    }

    // Fetch trades
    const { data: trades, error } = await supabase
      .from('exchange_trades')
      .select('id, price, quantity, total, created_at, buyer_address, seller_address, side')
      .eq('pair_id', tradingPair.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching trades:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedTrades = trades?.map(trade => ({
      id: trade.id,
      price: trade.price?.toString() || '0',
      amount: trade.quantity?.toString() || '0',
      total: trade.total?.toString() || (parseFloat(trade.price || 0) * parseFloat(trade.quantity || 0)).toFixed(2),
      created_at: trade.created_at,
      buyer_address: trade.buyer_address,
      seller_address: trade.seller_address,
      side: trade.side,
    })) || [];

    return NextResponse.json({ trades: formattedTrades });

  } catch (err) {
    console.error('Trades error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
