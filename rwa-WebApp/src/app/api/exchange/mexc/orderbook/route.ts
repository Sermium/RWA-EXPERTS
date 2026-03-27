// src/app/api/exchange/mexc/orderbook/route.ts
// MEXC order book for crypto
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    const res = await fetch(`https://api.mexc.com/api/v3/depth?symbol=${symbol}&limit=20`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 5 }
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'MEXC API error' }, { status: res.status });
    }

    const data = await res.json();

    return NextResponse.json({
      bids: data.bids?.map(([price, amount]: [string, string]) => ({ price, amount })) || [],
      asks: data.asks?.map(([price, amount]: [string, string]) => ({ price, amount })) || [],
      timestamp: Date.now()
    });

  } catch (err) {
    console.error('MEXC orderbook error:', err);
    return NextResponse.json({ error: 'Failed to fetch orderbook' }, { status: 500 });
  }
}
