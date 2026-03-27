import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyMessage, getAddress } from 'viem';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tokenAddress,
      side, // 'buy' or 'sell'
      orderType, // 'limit' or 'market'
      price,
      amount,
      walletAddress,
      signature,
      timestamp,
    } = body;

    // Validate required fields
    if (!tokenAddress || !side || !orderType || !amount || !walletAddress || !signature || !timestamp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate timestamp
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Request expired' }, { status: 400 });
    }

    // Verify signature
    const message = `Place ${side} order on RWA Exchange\nToken: ${tokenAddress}\nAmount: ${amount}\nPrice: ${price || 'market'}\nTimestamp: ${timestamp}`;
    
    try {
      const isValid = await verifyMessage({
        address: getAddress(walletAddress),
        message,
        signature: signature as `0x${string}`,
      });
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }

    // Check if token is listed
    const { data: listing, error: listingError } = await supabase
      .from('exchange_listings')
      .select('id, status, min_order_size, max_order_size')
      .eq('token_address', tokenAddress.toLowerCase())
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Token not listed on exchange' }, { status: 400 });
    }

    if (listing.status !== 'active') {
      return NextResponse.json({ error: 'Trading is currently suspended for this token' }, { status: 400 });
    }

    // Validate order size
    const amountNum = parseFloat(amount);
    if (listing.min_order_size && amountNum < parseFloat(listing.min_order_size)) {
      return NextResponse.json({ 
        error: `Minimum order size is ${listing.min_order_size}` 
      }, { status: 400 });
    }
    if (listing.max_order_size && amountNum > parseFloat(listing.max_order_size)) {
      return NextResponse.json({ 
        error: `Maximum order size is ${listing.max_order_size}` 
      }, { status: 400 });
    }

    // Create order
    const orderId = crypto.randomUUID();
    const { data: order, error: orderError } = await supabase
      .from('exchange_orders')
      .insert({
        id: orderId,
        token_address: tokenAddress.toLowerCase(),
        listing_id: listing.id,
        wallet_address: walletAddress.toLowerCase(),
        side,
        order_type: orderType,
        price: orderType === 'limit' ? price : null,
        amount,
        filled_amount: '0',
        status: 'open',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error('[Exchange Order] Insert error:', orderError);
      return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
    }

    // Try to match order (simplified matching engine)
    const matchResult = await matchOrder(order);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: order.status,
      message: `${side.toUpperCase()} order placed successfully`,
      matched: matchResult,
    });
  } catch (error) {
    console.error('[Exchange Order] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

async function matchOrder(newOrder: any) {
  // Simple matching logic - in production this would be more sophisticated
  const oppositeSide = newOrder.side === 'buy' ? 'sell' : 'buy';
  const priceCondition = newOrder.side === 'buy' 
    ? newOrder.order_type === 'limit' ? `price <= ${newOrder.price}` : 'true'
    : newOrder.order_type === 'limit' ? `price >= ${newOrder.price}` : 'true';

  // Get matching orders
  let query = supabase
    .from('exchange_orders')
    .select('*')
    .eq('token_address', newOrder.token_address)
    .eq('side', oppositeSide)
    .eq('status', 'open')
    .neq('wallet_address', newOrder.wallet_address);

  if (newOrder.order_type === 'limit' && newOrder.price) {
    if (newOrder.side === 'buy') {
      query = query.lte('price', newOrder.price);
    } else {
      query = query.gte('price', newOrder.price);
    }
  }

  query = query.order('price', { ascending: newOrder.side === 'buy' });

  const { data: matchingOrders } = await query;

  if (!matchingOrders || matchingOrders.length === 0) {
    return { matched: false, fills: [] };
  }

  const fills: any[] = [];
  let remainingAmount = parseFloat(newOrder.amount);

  for (const matchOrder of matchingOrders) {
    if (remainingAmount <= 0) break;

    const availableAmount = parseFloat(matchOrder.amount) - parseFloat(matchOrder.filled_amount || '0');
    const fillAmount = Math.min(remainingAmount, availableAmount);
    const fillPrice = matchOrder.price || newOrder.price;

    if (fillAmount > 0) {
      // Update matched order
      const newFilledAmount = parseFloat(matchOrder.filled_amount || '0') + fillAmount;
      const matchStatus = newFilledAmount >= parseFloat(matchOrder.amount) ? 'filled' : 'partial';
      
      await supabase
        .from('exchange_orders')
        .update({ 
          filled_amount: newFilledAmount.toString(),
          status: matchStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchOrder.id);

      // Record trade
      await supabase
        .from('exchange_trades')
        .insert({
          token_address: newOrder.token_address,
          buy_order_id: newOrder.side === 'buy' ? newOrder.id : matchOrder.id,
          sell_order_id: newOrder.side === 'sell' ? newOrder.id : matchOrder.id,
          buyer_address: newOrder.side === 'buy' ? newOrder.wallet_address : matchOrder.wallet_address,
          seller_address: newOrder.side === 'sell' ? newOrder.wallet_address : matchOrder.wallet_address,
          price: fillPrice,
          amount: fillAmount.toString(),
          total: (fillAmount * parseFloat(fillPrice)).toString(),
          created_at: new Date().toISOString(),
        });

      fills.push({
        orderId: matchOrder.id,
        price: fillPrice,
        amount: fillAmount.toString(),
      });

      remainingAmount -= fillAmount;
    }
  }

  // Update new order status
  const newFilledAmount = parseFloat(newOrder.amount) - remainingAmount;
  const newStatus = remainingAmount <= 0 ? 'filled' : newFilledAmount > 0 ? 'partial' : 'open';
  
  await supabase
    .from('exchange_orders')
    .update({
      filled_amount: newFilledAmount.toString(),
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', newOrder.id);

  return { matched: fills.length > 0, fills };
}

// GET - Fetch user's orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const tokenAddress = searchParams.get('tokenAddress');
    const status = searchParams.get('status'); // 'open', 'filled', 'cancelled', or null for all

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    let query = supabase
      .from('exchange_orders')
      .select(`
        *,
        exchange_listings (
          token_symbol,
          token_name,
          trading_pair
        )
      `)
      .eq('wallet_address', walletAddress.toLowerCase())
      .order('created_at', { ascending: false });

    if (tokenAddress) {
      query = query.eq('token_address', tokenAddress.toLowerCase());
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('[Exchange Orders] DB error:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    return NextResponse.json({
      orders: orders || [],
      total: orders?.length || 0,
    });
  } catch (error) {
    console.error('[Exchange Orders] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Cancel order
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const walletAddress = searchParams.get('wallet');

    if (!orderId || !walletAddress) {
      return NextResponse.json({ error: 'Order ID and wallet address required' }, { status: 400 });
    }

    // Verify ownership and cancel
    const { data: order, error: fetchError } = await supabase
      .from('exchange_orders')
      .select('*')
      .eq('id', orderId)
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'filled' || order.status === 'cancelled') {
      return NextResponse.json({ error: 'Order cannot be cancelled' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('exchange_orders')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    console.error('[Exchange Cancel] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
