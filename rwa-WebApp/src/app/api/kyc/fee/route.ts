// src/app/api/kyc/fee/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  calculateNativeAmountForUSD,
  getNativeSymbol,
  KYC_FEE_USD,
} from '@/lib/priceService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainIdParam = searchParams.get('chainId');

    if (!chainIdParam) {
      return NextResponse.json(
        { error: 'chainId is required' },
        { status: 400 }
      );
    }

    const chainId = parseInt(chainIdParam, 10);

    if (isNaN(chainId)) {
      return NextResponse.json(
        { error: 'Invalid chainId' },
        { status: 400 }
      );
    }

    // Calculate native amount for the fixed USD fee
    const { native, nativeFormatted, price, symbol } =
      await calculateNativeAmountForUSD(chainId, KYC_FEE_USD);

    return NextResponse.json({
      success: true,
      data: {
        usd: KYC_FEE_USD,
        native: native.toString(),
        nativeFormatted,
        symbol,
        price,
        chainId,
      },
    });
  } catch (error) {
    console.error('Error calculating KYC fee:', error);
    return NextResponse.json(
      { error: 'Failed to calculate KYC fee' },
      { status: 500 }
    );
  }
}
