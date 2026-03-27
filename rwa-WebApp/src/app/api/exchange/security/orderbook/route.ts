// src/app/api/exchange/security/orderbook/route.ts
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
      // No trading pair yet = empty order book
      return NextResponse.json({
        bids: [],
        asks: [],
        spread: null,
      });
    }

    // Fetch bids (buy orders)
    const { data: bids, error: bidsError } = await supabase
      .from('exchange_orders')
      .select('price, quantity, filled_quantity, remaining_quantity')
      .eq('pair_id', tradingPair.id)
      .eq('side', 'buy')
      .in('status', ['open', 'partial'])
      .order('price', { ascending: false })
      .limit(20);

    if (bidsError) {
      console.error('Error fetching bids:', bidsError);
    }

    // Fetch asks (sell orders)
    const { data: asks, error: asksError } = await supabase
      .from('exchange_orders')
      .select('price, quantity, filled_quantity, remaining_quantity')
      .eq('pair_id', tradingPair.id)
      .eq('side', 'sell')
      .in('status', ['open', 'partial'])
      .order('price', { ascending: true })
      .limit(20);

    if (asksError) {
      console.error('Error fetching asks:', asksError);
    }

    // Aggregate orders at same price level
    const aggregateLevels = (orders: any[]) => {
      const levels: Record<string, { price: string; amount: number; total: number; orderCount: number }> = {};
      
      orders?.forEach(order => {
        const price = order.price?.toString() || '0';
        const remaining = parseFloat(order.remaining_quantity || order.quantity || '0');
        
        if (remaining > 0) {
          if (!levels[price]) {
            levels[price] = { price, amount: 0, total: 0, orderCount: 0 };
          }
          levels[price].amount += remaining;
          levels[price].total += remaining * parseFloat(price);
          levels[price].orderCount += 1;
        }
      });

      return Object.values(levels).map(level => ({
        price: level.price,
        amount: level.amount.toString(),
        total: level.total.toFixed(2),
        orderCount: level.orderCount,
      }));
    };

    const aggregatedBids = aggregateLevels(bids || []);
    const aggregatedAsks = aggregateLevels(asks || []);

    // Calculate spread
    let spread = null;
    if (aggregatedBids.length > 0 && aggregatedAsks.length > 0) {
      const bestBid = parseFloat(aggregatedBids[0].price);
      const bestAsk = parseFloat(aggregatedAsks[0].price);
      const spreadValue = bestAsk - bestBid;
      const spreadPercent = bestAsk > 0 ? ((spreadValue / bestAsk) * 100).toFixed(2) : '0';
      spread = {
        value: spreadValue.toFixed(4),
        percent: spreadPercent,
      };
    }

    return NextResponse.json({
      bids: aggregatedBids,
      asks: aggregatedAsks,
      spread,
    });

  } catch (err) {
    console.error('Order book error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
