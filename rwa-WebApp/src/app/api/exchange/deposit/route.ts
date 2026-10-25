// src/app/api/exchange/deposit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { confirmDeposit, getPendingDeposit } from '@/lib/exchange-service';
import { EXCHANGE_CONFIG, type TokenSymbol } from '@/config/exchange';
import { isValidChainId } from '@/config/chains';

/**
 * Credits a deposit the chain shows arrived at the platform's deposit
 * address from the caller's wallet. Any `amount` in the body is ignored:
 * the amount credited is read from the transaction.
 */
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    const body = await request.json();
    const { tokenSymbol, txHash } = body;
    const chainId = Number(body.chainId ?? request.headers.get('x-chain-id'));

    if (!tokenSymbol || !txHash || !chainId) {
      return NextResponse.json({ error: 'Missing required fields (tokenSymbol, txHash, chainId)' }, { status: 400 });
    }

    // Validate token
    if (!EXCHANGE_CONFIG.TOKENS[tokenSymbol as TokenSymbol]) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }
    if (!isValidChainId(chainId)) {
      return NextResponse.json({ error: `Unsupported chain: ${chainId}` }, { status: 400 });
    }

    const result = await confirmDeposit(walletAddress, tokenSymbol, txHash, chainId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json({ message: 'Deposit confirmed', success: true, amount: result.amount });
  } catch (error: any) {
    console.error('Error confirming deposit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txHash = searchParams.get('txHash');

    if (!txHash) {
      return NextResponse.json({ error: 'txHash required' }, { status: 400 });
    }

    const deposit = await getPendingDeposit(txHash);

    return NextResponse.json({ deposit });
  } catch (error: any) {
    console.error('Error fetching deposit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
