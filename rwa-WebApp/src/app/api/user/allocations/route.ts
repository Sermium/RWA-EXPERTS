import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet');
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const normalizedWallet = wallet.toLowerCase();

    // Get all allocations for this wallet
    const { data: allocations, error: allocError } = await supabase
      .from('token_allocations')
      .select(`
        *,
        fundraising_rounds:round_id (
          display_name,
          token_price_usd,
          vesting_months,
          status
        )
      `)
      .ilike('wallet_address', normalizedWallet)
      .order('created_at', { ascending: false });

    if (allocError) throw allocError;

    // Get summary stats
    const { data: summaryData, error: summaryError } = await supabase
      .from('token_allocations')
      .select('type, tokens_amount, tokens_usd_value, status')
      .ilike('wallet_address', normalizedWallet);

    if (summaryError) throw summaryError;

    // Calculate totals
    const summary = {
      totalTokens: 0,
      totalValue: 0,
      purchasedTokens: 0,
      bonusTokens: 0,
      pendingTokens: 0,
      confirmedTokens: 0,
      distributedTokens: 0,
    };

    summaryData?.forEach(alloc => {
      const tokens = parseFloat(alloc.tokens_amount) || 0;
      const value = parseFloat(alloc.tokens_usd_value) || 0;
      
      summary.totalTokens += tokens;
      summary.totalValue += value;
      
      if (alloc.type === 'purchase') {
        summary.purchasedTokens += tokens;
      } else if (alloc.type === 'referral_bonus') {
        summary.bonusTokens += tokens;
      }
      
      if (alloc.status === 'pending') {
        summary.pendingTokens += tokens;
      } else if (alloc.status === 'confirmed') {
        summary.confirmedTokens += tokens;
      } else if (alloc.status === 'distributed') {
        summary.distributedTokens += tokens;
      }
    });

    // Get vesting info (use the longest vesting period from confirmed allocations)
    const vestingMonths = allocations
      ?.filter(a => a.status === 'confirmed' && a.fundraising_rounds?.vesting_months)
      .reduce((max, a) => Math.max(max, a.fundraising_rounds.vesting_months), 0) || 0;

    // Calculate vesting schedule
    const vestingSchedule = [];
    if (vestingMonths > 0 && summary.confirmedTokens > 0) {
      const monthlyUnlock = summary.confirmedTokens / vestingMonths;
      const startDate = new Date(); // TGE date - update this when known
      
      for (let i = 1; i <= vestingMonths; i++) {
        const unlockDate = new Date(startDate);
        unlockDate.setMonth(unlockDate.getMonth() + i);
        vestingSchedule.push({
          month: i,
          date: unlockDate.toISOString(),
          tokens: monthlyUnlock,
          cumulative: monthlyUnlock * i,
          percentage: (i / vestingMonths) * 100
        });
      }
    }

    return NextResponse.json({
      allocations,
      summary,
      vestingMonths,
      vestingSchedule,
    });

  } catch (error: any) {
    console.error('Error fetching allocations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
