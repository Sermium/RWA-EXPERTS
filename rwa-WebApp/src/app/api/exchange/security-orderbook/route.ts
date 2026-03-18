import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pairId = searchParams.get('pairId');
    const tokenAddress = searchParams.get('tokenAddress');

    // Find pair by ID or by token address
    let targetPairId = pairId;
    
    if (!targetPairId && tokenAddress) {
      // Find the trading pair for this token
      const { data: pair } = await supabase
        .from('trading_pairs')
        .select('id')
        .eq('base_token_address', tokenAddress)
        .eq('is_active', true)
        .single();
      
      if (pair) {
        targetPairId = pair.id;
      }
    }

    if (!targetPairId) {
      return NextResponse.json({ 
        bids: [], 
        asks: [], 
        spread: '0.00',
        spreadPercent: '0.00',
        bestBid: 0,
        bestAsk: 0 
      });
    }

    // Fetch open orders for this pair
    const { data: orders, error } = await supabase
      .from('exchange_orders')
      .select('*')
      .eq('pair_id', targetPairId)
      .eq('status', 'open')
      .order('price', { ascending: false });

    if (error) throw error;

    // Aggregate orders by price level
    const buyLevels: Record<string, { price: number; quantity: number; total: number; count: number }> = {};
    const sellLevels: Record<string, { price: number; quantity: number; total: number; count: number }> = {};

    orders?.forEach((order) => {
      const price = parseFloat(order.price);
      const priceKey = price.toFixed(4);
      const remaining = parseFloat(order.remaining_quantity) || parseFloat(order.quantity) - parseFloat(order.filled_quantity || '0');

      if (order.side === 'buy') {
        if (!buyLevels[priceKey]) {
          buyLevels[priceKey] = { price, quantity: 0, total: 0, count: 0 };
        }
        buyLevels[priceKey].quantity += remaining;
        buyLevels[priceKey].total += remaining * price;
        buyLevels[priceKey].count += 1;
      } else if (order.side === 'sell') {
        if (!sellLevels[priceKey]) {
          sellLevels[priceKey] = { price, quantity: 0, total: 0, count: 0 };
        }
        sellLevels[priceKey].quantity += remaining;
        sellLevels[priceKey].total += remaining * price;
        sellLevels[priceKey].count += 1;
      }
    });

    // Convert to sorted arrays
    const bids = Object.values(buyLevels)
      .sort((a, b) => b.price - a.price)
      .slice(0, 15);
    
    const asks = Object.values(sellLevels)
      .sort((a, b) => a.price - b.price)
      .slice(0, 15);

    // Calculate spread
    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
    const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;

    return NextResponse.json({
      bids,
      asks,
      spread: spread.toFixed(4),
      spreadPercent: spreadPercent.toFixed(2),
      bestBid,
      bestAsk,
      pairId: targetPairId,
    });
  } catch (error) {
    console.error('Error fetching security order book:', error);
    return NextResponse.json({ error: 'Failed to fetch order book' }, { status: 500 });
  }
}