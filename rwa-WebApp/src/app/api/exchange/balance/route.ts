// src/app/api/exchange/balance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWallet } from '@/lib/wallet-session';
import { getAllUserBalances } from '@/lib/exchange-service';

export async function GET(request: NextRequest) {
  try {
    const session = requireSessionWallet(request);
    if (!session.ok) return session.response;
    const walletAddress = session.wallet;
    
    const balances = await getAllUserBalances(walletAddress);
    
    return NextResponse.json({ balances });
  } catch (error: any) {
    console.error('Error fetching balances:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
