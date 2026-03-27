// src/app/api/exchange/security/order/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyMessage } from 'viem';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// USDC addresses per chain
const USDC_ADDRESSES: Record<number, string> = {
  43113: '0x5425890298aed601595a70AB815c96711a31Bc65', // Avalanche Fuji USDC
  43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Avalanche Mainnet USDC
  80002: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // Polygon Amoy USDC
  137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',   // Polygon Mainnet USDC
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const { data: orders, error } = await supabase
      .from('exchange_orders')
      .select(`
        *,
        trading_pairs (
          symbol,
          base_token,
          quote_token,
          base_token_address
        )
      `)
      .eq('wallet_address', wallet.toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map to expected format
    const mappedOrders = orders?.map(order => ({
      ...order,
      amount: order.quantity,
      filled_amount: order.filled_quantity,
      token_address: order.trading_pairs?.base_token_address,
      exchange_listings: order.trading_pairs ? {
        token_symbol: order.trading_pairs.base_token,
        token_name: order.trading_pairs.base_token,
        trading_pair: order.trading_pairs.quote_token,
      } : null,
    })) || [];

    return NextResponse.json({ orders: mappedOrders });

  } catch (err) {
    console.error('Orders error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tokenAddress, chainId, side, orderType, price, amount, walletAddress, signature, timestamp } = body;

    console.log('[Order] Placing order:', { tokenAddress, chainId, side, orderType, price, amount });

    if (!tokenAddress || !side || !amount || !walletAddress || !signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify signature
    const message = `Place ${side} order on RWA Exchange\nToken: ${tokenAddress}\nAmount: ${amount}\nPrice: ${price || 'market'}\nTimestamp: ${timestamp}`;
    
    const isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Check if token exists in tokenization_applications
    const { data: project, error: projectError } = await supabase
      .from('tokenization_applications')
      .select('id, token_symbol, token_name, asset_name, user_address, chain_id')
      .ilike('token_address', tokenAddress)
      .in('status', ['completed', 'deployed'])
      .single();

    if (projectError || !project) {
      console.error('[Order] Token not found:', tokenAddress, projectError);
      return NextResponse.json({ error: 'Token not found or not deployed' }, { status: 400 });
    }

    console.log('[Order] Found project:', project);

    const effectiveChainId = chainId || project.chain_id;

    // Get or create trading pair
    let { data: tradingPair } = await supabase
      .from('trading_pairs')
      .select('id')
      .ilike('base_token_address', tokenAddress)
      .eq('chain_id', effectiveChainId)
      .single();

    if (!tradingPair) {
      console.log('[Order] Creating new trading pair for', project.token_symbol);
      
      const usdcAddress = USDC_ADDRESSES[effectiveChainId] || '0x0000000000000000000000000000000000000000';
      const pairSymbol = `${project.token_symbol}/USDC`;

      const { data: newPair, error: pairError } = await supabase
        .from('trading_pairs')
        .insert({
          symbol: pairSymbol,
          base_token: project.token_symbol,
          quote_token: 'USDC',
          base_token_address: tokenAddress.toLowerCase(),
          quote_token_address: usdcAddress,
          base_decimals: 18,
          quote_decimals: 6,
          min_order_size: 1,
          price_precision: 6,
          quantity_precision: 2,
          is_active: true,
          chain_id: effectiveChainId,
        })
        .select('id')
        .single();

      if (pairError) {
        console.error('[Order] Error creating trading pair:', pairError);
        return NextResponse.json({ error: 'Failed to create trading pair' }, { status: 500 });
      }

      tradingPair = newPair;
      console.log('[Order] Created trading pair:', tradingPair.id);
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('exchange_orders')
      .insert({
        pair_id: tradingPair.id,
        wallet_address: walletAddress.toLowerCase(),
        side,
        order_type: orderType,
        price: orderType === 'limit' ? parseFloat(price) : null,
        quantity: parseFloat(amount),
        filled_quantity: 0,
        remaining_quantity: parseFloat(amount),
        status: 'open',
      })
      .select()
      .single();

    if (orderError) {
      console.error('[Order] Error creating order:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    console.log('[Order] Order created:', order.id);

    return NextResponse.json({ 
      success: true, 
      order,
      message: 'Order placed successfully'
    });

  } catch (err) {
    console.error('Place order error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const wallet = searchParams.get('wallet');

    if (!orderId || !wallet) {
      return NextResponse.json({ error: 'Order ID and wallet required' }, { status: 400 });
    }

    const { data: order, error: fetchError } = await supabase
      .from('exchange_orders')
      .select('id, wallet_address, status')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.wallet_address.toLowerCase() !== wallet.toLowerCase()) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (order.status !== 'open' && order.status !== 'partial') {
      return NextResponse.json({ error: 'Order cannot be cancelled' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('exchange_orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Order cancelled' });

  } catch (err) {
    console.error('Cancel order error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
