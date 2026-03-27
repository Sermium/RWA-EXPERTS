// src/app/api/prices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getCryptoPrices,
  getNativeTokenPrice,
  getNativeSymbol,
  calculateDynamicFee,
  KYC_FEE_USD,
  CREATION_FEE_USD,
} from '@/lib/priceService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainIdParam = searchParams.get('chainId');

    // If chainId provided, return chain-specific fees with USD conversion
    if (chainIdParam) {
      const chainId = parseInt(chainIdParam, 10);

      if (isNaN(chainId)) {
        return NextResponse.json(
          { error: 'Invalid chainId' },
          { status: 400 }
        );
      }

      const [price, kycFee, creationFee] = await Promise.all([
        getNativeTokenPrice(chainId),
        calculateDynamicFee(chainId, KYC_FEE_USD),
        calculateDynamicFee(chainId, CREATION_FEE_USD),
      ]);

      const symbol = getNativeSymbol(chainId);

      return NextResponse.json({
        success: true,
        data: {
          chainId,
          symbol,
          price,
          fees: {
            kyc: {
              usd: KYC_FEE_USD,
              native: kycFee.nativeAmount.toString(),
              nativeFormatted: kycFee.nativeFormatted,
            },
            creation: {
              usd: CREATION_FEE_USD,
              native: creationFee.nativeAmount.toString(),
              nativeFormatted: creationFee.nativeFormatted,
            },
          },
        },
      });
    }

    // Return all prices
    const prices = await getCryptoPrices();

    return NextResponse.json({
      success: true,
      data: {
        prices,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
