// src/app/api/exchange/mexc/pairs/route.ts
import { NextResponse } from 'next/server';
import { MEXC_CONFIG, PLATFORM_CONFIG } from '@/config/exchange';

export async function GET() {
  const pairs = MEXC_CONFIG.SUPPORTED_PAIRS.map(pair => ({
    ...pair,
    config: MEXC_CONFIG.PAIR_CONFIG[pair.symbol],
    markup: PLATFORM_CONFIG.MARKUP_PERCENT,
    platformFee: PLATFORM_CONFIG.PLATFORM_FEE_PERCENT,
  }));
  
  return NextResponse.json({ 
    pairs,
    markup: PLATFORM_CONFIG.MARKUP_PERCENT,
    platformFee: PLATFORM_CONFIG.PLATFORM_FEE_PERCENT,
    totalFee: PLATFORM_CONFIG.MARKUP_PERCENT + PLATFORM_CONFIG.PLATFORM_FEE_PERCENT,
  });
}
