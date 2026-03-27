// src/app/api/exchange/security/pricehistory/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenAddress = searchParams.get('tokenAddress');
  const interval = searchParams.get('interval') || '1h';
  const limit = searchParams.get('limit') || '100';

  if (!tokenAddress) {
    return NextResponse.json({ error: 'Token address required' }, { status: 400 });
  }

  try {
    // Fetch from price_history table (we'll create this)
    const { data, error } = await supabase
      .from('token_price_history')
      .select('*')
      .eq('token_address', tokenAddress.toLowerCase())
      .order('timestamp', { ascending: true })
      .limit(parseInt(limit));

    if (error) {
      console.error('Price history error:', error);
      // Return empty data if table doesn't exist yet
      return NextResponse.json({ klines: [], symbol: '', interval });
    }

    const klines = data?.map((row: any) => ({
      time: Math.floor(new Date(row.timestamp).getTime() / 1000),
      open: parseFloat(row.open_price),
      high: parseFloat(row.high_price),
      low: parseFloat(row.low_price),
      close: parseFloat(row.close_price),
      volume: parseFloat(row.volume || 0),
    })) || [];

    return NextResponse.json({ klines, tokenAddress, interval });
  } catch (error) {
    console.error('Price history error:', error);
    return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 });
  }
}
