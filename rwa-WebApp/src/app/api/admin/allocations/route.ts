import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET - Fetch all allocations with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const roundId = searchParams.get('roundId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('token_allocations')
      .select(`
        *,
        fundraising_rounds:round_id (
          id,
          display_name,
          round_name,
          token_price_usd
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    if (roundId && roundId !== 'all') {
      query = query.eq('round_id', roundId);
    }

    const { data: allocations, error, count } = await query;

    if (error) throw error;

    // Get summary stats
    const { data: statsData } = await supabase
      .from('token_allocations')
      .select('type, status, tokens_amount, tokens_usd_value');

    const stats = {
      totalAllocations: statsData?.length || 0,
      totalTokens: 0,
      totalValue: 0,
      byType: {
        purchase: { count: 0, tokens: 0 },
        referral_bonus: { count: 0, tokens: 0 },
        platform_bonus: { count: 0, tokens: 0 },
      },
      byStatus: {
        pending: { count: 0, tokens: 0 },
        confirmed: { count: 0, tokens: 0 },
        distributed: { count: 0, tokens: 0 },
        cancelled: { count: 0, tokens: 0 },
      },
    };

    statsData?.forEach(alloc => {
      const tokens = parseFloat(alloc.tokens_amount) || 0;
      const value = parseFloat(alloc.tokens_usd_value) || 0;
      
      stats.totalTokens += tokens;
      stats.totalValue += value;
      
      if (stats.byType[alloc.type as keyof typeof stats.byType]) {
        stats.byType[alloc.type as keyof typeof stats.byType].count++;
        stats.byType[alloc.type as keyof typeof stats.byType].tokens += tokens;
      }
      
      if (stats.byStatus[alloc.status as keyof typeof stats.byStatus]) {
        stats.byStatus[alloc.status as keyof typeof stats.byStatus].count++;
        stats.byStatus[alloc.status as keyof typeof stats.byStatus].tokens += tokens;
      }
    });

    return NextResponse.json({
      allocations,
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error: any) {
    console.error('Error fetching allocations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update allocation status (mark as distributed)
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { allocationIds, status, distributionTxHash, notes } = body;

    if (!allocationIds || !Array.isArray(allocationIds) || allocationIds.length === 0) {
      return NextResponse.json({ error: 'Allocation IDs required' }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: 'Status required' }, { status: 400 });
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (distributionTxHash) {
      updateData.distribution_tx_hash = distributionTxHash;
      updateData.distributed_at = new Date().toISOString();
    }

    if (notes) {
      updateData.notes = notes;
    }

    const { data, error } = await supabase
      .from('token_allocations')
      .update(updateData)
      .in('id', allocationIds)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
    });

  } catch (error: any) {
    console.error('Error updating allocations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}