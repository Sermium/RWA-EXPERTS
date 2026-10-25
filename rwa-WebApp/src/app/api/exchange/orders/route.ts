// src/app/api/exchange/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWallet } from '@/lib/wallet-session';
import { createOrder, getUserOrders, cancelOrder } from '@/lib/exchange';

export async function GET(request: NextRequest) {
  try {
    const session = requireSessionWallet(request);
    if (!session.ok) return session.response;
    const walletAddress = session.wallet;
    const { searchParams } = new URL(request.url);
    const pairId = searchParams.get('pairId') || undefined;
    const status = searchParams.get('status') as 'open' | 'history' | undefined;
    
    const orders = await getUserOrders(walletAddress, pairId, status);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSessionWallet(request);
    if (!session.ok) return session.response;
    const walletAddress = session.wallet;
    
    const body = await request.json();
    const { pairId, side, orderType, price, quantity } = body;
    
    if (!pairId || !side || !orderType || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const result = await createOrder(walletAddress, {
      pairId,
      side,
      orderType,
      price: price ? parseFloat(price) : undefined,
      quantity: parseFloat(quantity),
    });
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ 
      order: result.order, 
      trades: result.trades,
      message: result.trades?.length ? `Order matched with ${result.trades.length} trade(s)` : 'Order placed'
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = requireSessionWallet(request);
    if (!session.ok) return session.response;
    const walletAddress = session.wallet;
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }
    
    const result = await cancelOrder(walletAddress, orderId);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'Order cancelled' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
