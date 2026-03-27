// src/app/api/config/fees/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { DEFAULT_PLATFORM_FEES, DEFAULT_CHAIN_FEES } from '@/lib/feesService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({
        success: true,
        platformFees: DEFAULT_PLATFORM_FEES,
        chainFees: DEFAULT_CHAIN_FEES,
        source: 'defaults',
      });
    }

    const { data, error } = await supabase
      .from('platform_settings')
      .select('category, value')
      .or('category.eq.platform_fees,category.like.chain_fees_%');

    if (error) {
      console.error('DB error:', error);
      return NextResponse.json({
        success: true,
        platformFees: DEFAULT_PLATFORM_FEES,
        chainFees: DEFAULT_CHAIN_FEES,
        source: 'defaults',
      });
    }

    let platformFees = { ...DEFAULT_PLATFORM_FEES };
    const chainFees: Record<string, any> = {};

    data?.forEach((row) => {
      if (row.category === 'platform_fees' && row.value) {
        platformFees = { ...platformFees, ...row.value };
      } else if (row.category?.startsWith('chain_fees_')) {
        const chainId = row.category.replace('chain_fees_', '');
        if (row.value) {
          chainFees[chainId] = row.value;
        }
      }
    });

    return NextResponse.json({
      success: true,
      platformFees,
      chainFees,
      source: Object.keys(chainFees).length > 0 ? 'database' : 'defaults',
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      success: true,
      platformFees: DEFAULT_PLATFORM_FEES,
      chainFees: DEFAULT_CHAIN_FEES,
      source: 'error',
    });
  }
}
