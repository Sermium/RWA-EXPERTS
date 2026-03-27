import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenAddress = searchParams.get('tokenAddress');
    const chainId = searchParams.get('chainId');

    if (!tokenAddress) {
      return NextResponse.json({ error: 'Token address required' }, { status: 400 });
    }

    // Check database for listing status
    const { data, error } = await supabase
      .from('exchange_listings')
      .select('*')
      .eq('token_address', tokenAddress.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[Exchange Check] DB error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        listed: false,
        tokenAddress,
      });
    }

    return NextResponse.json({
      listed: true,
      tokenAddress,
      listingId: data.id,
      listedAt: data.created_at,
      status: data.status, // 'pending', 'active', 'suspended'
      tradingPair: data.trading_pair,
      minOrderSize: data.min_order_size,
      maxOrderSize: data.max_order_size,
    });
  } catch (error) {
    console.error('[Exchange Check] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}