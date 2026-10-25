// src/app/api/exchange/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWallet } from '@/lib/wallet-session';
import { getUserTrades, getUserTransactions } from '@/lib/exchange-service';

export async function GET(request: NextRequest) {
  try {
    const session = requireSessionWallet(request);
    if (!session.ok) return session.response;
    const walletAddress = session.wallet;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'trades'; // 'trades' or 'transactions'
    
    if (type === 'transactions') {
      const transactions = await getUserTransactions(walletAddress);
      return NextResponse.json({ transactions });
    }
    
    const trades = await getUserTrades(walletAddress);
    return NextResponse.json({ trades });
  } catch (error: any) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
