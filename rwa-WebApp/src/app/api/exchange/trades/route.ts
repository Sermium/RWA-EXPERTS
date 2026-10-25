// src/app/api/exchange/trades/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRecentTrades, getUserTrades } from '@/lib/exchange';
import { requireSessionWallet } from '@/lib/wallet-session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pairId = searchParams.get('pairId');
    const userOnly = searchParams.get('userOnly') === 'true';
    
    // A wallet's own trades need its session; a pair's recent trades are public.
    if (userOnly) {
      const session = requireSessionWallet(request);
      if (!session.ok) return session.response;
      const trades = await getUserTrades(session.wallet);
      return NextResponse.json({ trades });
    }
    
    if (!pairId) {
      return NextResponse.json({ error: 'pairId is required' }, { status: 400 });
    }
    
    const trades = await getRecentTrades(pairId);
    return NextResponse.json({ trades });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
