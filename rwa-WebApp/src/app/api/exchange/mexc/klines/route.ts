// src/app/api/exchange/mexc/klines/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const interval = searchParams.get('interval') || '1h';
  const limit = searchParams.get('limit') || '100';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  // MEXC uses different interval format
  // 1m, 5m, 15m, 30m, 60m (not 1h), 4h, 1d, 1M
  const intervalMap: Record<string, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '60m',
    '4h': '4h',
    '1d': '1d',
    '1w': '1W',
    '1M': '1M',
  };

  const mexcInterval = intervalMap[interval] || '60m';

  try {
    // Try MEXC v3 klines endpoint
    const url = `https://api.mexc.com/api/v3/klines?symbol=${symbol}&interval=${mexcInterval}&limit=${limit}`;
    
    console.log('[MEXC Klines] Fetching:', url);
    
    const res = await fetch(url, {
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      next: { revalidate: 30 }
    });

    const responseText = await res.text();
    
    if (!res.ok) {
      console.error('[MEXC Klines] Error response:', res.status, responseText);
      return NextResponse.json({ 
        error: 'MEXC API error', 
        status: res.status,
        details: responseText 
      }, { status: res.status });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[MEXC Klines] Failed to parse JSON:', responseText);
      return NextResponse.json({ error: 'Invalid response from MEXC' }, { status: 500 });
    }

    // Check if data is an array (klines format)
    if (!Array.isArray(data)) {
      console.error('[MEXC Klines] Unexpected response format:', data);
      return NextResponse.json({ error: 'Unexpected response format' }, { status: 500 });
    }

    // MEXC klines format: [openTime, open, high, low, close, volume, closeTime, quoteVolume]
    const klines = data.map((k: any[]) => ({
      time: Math.floor(k[0] / 1000), // Convert ms to seconds
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    console.log(`[MEXC Klines] Fetched ${klines.length} candles for ${symbol}`);

    return NextResponse.json({ 
      klines, 
      symbol, 
      interval: mexcInterval,
      count: klines.length 
    });
  } catch (error) {
    console.error('[MEXC Klines] Fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch klines',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
