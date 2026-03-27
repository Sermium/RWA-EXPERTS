import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { DEFAULT_PLATFORM_FEES, DEFAULT_CHAIN_FEES } from '@/lib/feesService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Fetch platform fees
    const { data: platformData } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('category', 'platform_fees')
      .single();

    // Fetch all chain fees
    const { data: chainData } = await supabase
      .from('platform_settings')
      .select('*')
      .like('category', 'chain_fees_%');

    const platformFees = {
      fees: platformData?.value || DEFAULT_PLATFORM_FEES,
      updatedAt: platformData?.updated_at,
      updatedBy: platformData?.updated_by,
    };

    const chainFees: Record<string, any> = {};
    for (const row of chainData || []) {
      const chainId = row.category.replace('chain_fees_', '');
      chainFees[chainId] = {
        fees: row.value || DEFAULT_CHAIN_FEES[parseInt(chainId)] || {},
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
      };
    }

    return NextResponse.json({
      success: true,
      platformFees,
      chainFees,
    });
  } catch (error) {
    console.error('[Fee Settings] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, chainId, fees, platformFees } = body;
    
    const supabase = getSupabaseAdmin();

    // Handle new structure (type-based)
    if (type === 'platform' && fees) {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          category: 'platform_fees',
          value: fees,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'category' });

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Platform fees updated' });
    }

    if (type === 'chain' && chainId && fees) {
      // Merge with existing values
      const { data: existing } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('category', `chain_fees_${chainId}`)
        .single();

      const mergedFees = {
        ...(existing?.value || {}),
        ...fees,
      };

      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          category: `chain_fees_${chainId}`,
          value: mergedFees,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'category' });

      if (error) throw error;
      return NextResponse.json({ success: true, message: `Chain ${chainId} fees updated` });
    }

    // Handle legacy structure (platformFees + chainFees in one call)
    if (platformFees) {
      await supabase
        .from('platform_settings')
        .upsert({
          category: 'platform_fees',
          value: platformFees,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'category' });
    }

    if (body.chainFees) {
      for (const [chainIdStr, chainFeesData] of Object.entries(body.chainFees)) {
        const { data: existing } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('category', `chain_fees_${chainIdStr}`)
          .single();

        const mergedFees = {
          ...(existing?.value || {}),
          ...(chainFeesData as any),
        };

        await supabase
          .from('platform_settings')
          .upsert({
            category: `chain_fees_${chainIdStr}`,
            value: mergedFees,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'category' });
      }
    }

    return NextResponse.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('[Fee Settings] PUT error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}
