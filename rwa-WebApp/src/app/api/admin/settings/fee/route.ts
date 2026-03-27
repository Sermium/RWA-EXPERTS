// src/app/api/admin/settings/fee/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { 
  DEFAULT_PLATFORM_FEES, 
  DEFAULT_CHAIN_FEES,
  setPlatformFees,
  setChainFees,
  type PlatformFees,
  type ChainFees
} from '@/config/deployments';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
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
    const chainFees: Record<string, ChainFees> = {};

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
    console.error('Failed to fetch fees:', error);
    return NextResponse.json({
      success: false,
      platformFees: DEFAULT_PLATFORM_FEES,
      chainFees: DEFAULT_CHAIN_FEES,
      source: 'error',
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { type, chainId, fees } = await request.json();

    if (type === 'platform') {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({ 
          category: 'platform_fees',  // Use 'category' not 'key'
          value: fees,
          updated_at: new Date().toISOString()
        }, { onConflict: 'category' });

      if (error) throw error;

      setPlatformFees(fees);

      return NextResponse.json({ success: true, message: 'Platform fees updated' });
    }

    if (type === 'chain' && chainId) {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({ 
          category: `chain_fees_${chainId}`,  // Use 'category' not 'key'
          value: fees,
          updated_at: new Date().toISOString()
        }, { onConflict: 'category' });

      if (error) throw error;

      setChainFees(chainId, fees);

      return NextResponse.json({ success: true, message: `Chain ${chainId} fees updated` });
    }

    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Failed to update fees:', error);
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}
