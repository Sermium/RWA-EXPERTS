import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    
    const walletAddress = searchParams.get('wallet');
    const roundId = searchParams.get('round');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    let query = supabase
      .from('token_allocations')
      .select(`
        *,
        investment:fundraising_investments(
          id,
          investment_amount_usd,
          payment_method,
          status,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (walletAddress) {
      query = query.eq('wallet_address', walletAddress.toLowerCase());
    }

    if (roundId) {
      query = query.eq('round_id', roundId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: allocations, error } = await query;

    if (error) {
      console.error('Allocations fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch allocations' }, { status: 500 });
    }

    // Calculate totals by type
    const totals = {
      purchase: 0,
      referral_bonus: 0,
      platform_bonus: 0,
      total: 0,
      total_usd_value: 0
    };

    // Group by round
    const byRound: Record<string, {
      round_id: string;
      round_name: string;
      purchase: number;
      referral_bonus: number;
      platform_bonus: number;
      total: number;
    }> = {};

    allocations?.forEach(alloc => {
      if (alloc.status !== 'cancelled') {
        const amount = parseFloat(alloc.tokens_amount) || 0;
        const usdValue = parseFloat(alloc.tokens_usd_value) || 0;

        // Update totals
        if (alloc.type === 'purchase') totals.purchase += amount;
        else if (alloc.type === 'referral_bonus') totals.referral_bonus += amount;
        else if (alloc.type === 'platform_bonus') totals.platform_bonus += amount;
        
        totals.total += amount;
        totals.total_usd_value += usdValue;

        // Update by round
        if (!byRound[alloc.round_id]) {
          byRound[alloc.round_id] = {
            round_id: alloc.round_id,
            round_name: alloc.round_name,
            purchase: 0,
            referral_bonus: 0,
            platform_bonus: 0,
            total: 0
          };
        }

        byRound[alloc.round_id][alloc.type as 'purchase' | 'referral_bonus' | 'platform_bonus'] += amount;
        byRound[alloc.round_id].total += amount;
      }
    });

    return NextResponse.json({
      allocations,
      totals,
      byRound: Object.values(byRound)
    });

  } catch (error) {
    console.error('Allocations error:', error);
    return NextResponse.json({ error: 'Failed to fetch allocations' }, { status: 500 });
  }
}