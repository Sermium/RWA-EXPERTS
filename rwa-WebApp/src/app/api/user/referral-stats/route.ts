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

    // Get referral code for this wallet
    const { data: referralCode, error: codeError } = await supabase
      .from('referral_codes')
      .select('*')
      .ilike('wallet_address', normalizedWallet)
      .single();

    if (codeError && codeError.code !== 'PGRST116') {
      throw codeError;
    }

    if (!referralCode) {
      return NextResponse.json({
        hasCode: false,
        code: null,
        stats: null,
        referrals: []
      });
    }

    // Get all referral bonus allocations for this referrer
    const { data: referralAllocations, error: allocError } = await supabase
      .from('token_allocations')
      .select(`
        *,
        fundraising_rounds:round_id (
          display_name
        )
      `)
      .eq('referral_code', referralCode.code)
      .eq('type', 'referral_bonus')
      .order('created_at', { ascending: false });

    if (allocError) throw allocError;

    // Get referred investors (people who used the code)
    const { data: referredInvestments, error: refError } = await supabase
      .from('token_allocations')
      .select(`
        wallet_address,
        tokens_amount,
        tokens_usd_value,
        created_at,
        status,
        fundraising_rounds:round_id (
          display_name
        )
      `)
      .eq('referral_code', referralCode.code)
      .eq('type', 'purchase')
      .order('created_at', { ascending: false });

    if (refError) throw refError;

    // Calculate stats
    const stats = {
      totalReferrals: referralCode.total_referrals || 0,
      totalInvestmentAmount: parseFloat(referralCode.total_investment_amount) || 0,
      totalBonusTokens: parseFloat(referralCode.total_bonus_tokens) || 0,
      pendingBonusTokens: 0,
      confirmedBonusTokens: 0,
    };

    referralAllocations?.forEach(alloc => {
      const tokens = parseFloat(alloc.tokens_amount) || 0;
      if (alloc.status === 'pending') {
        stats.pendingBonusTokens += tokens;
      } else if (alloc.status === 'confirmed' || alloc.status === 'distributed') {
        stats.confirmedBonusTokens += tokens;
      }
    });

    // Group referrals by wallet (unique investors)
    const uniqueReferrals = new Map();
    referredInvestments?.forEach(inv => {
      const wallet = inv.wallet_address.toLowerCase();
      if (!uniqueReferrals.has(wallet)) {
        uniqueReferrals.set(wallet, {
          wallet_address: inv.wallet_address,
          total_invested: 0,
          total_tokens: 0,
          investments: [],
          first_investment: inv.created_at,
        });
      }
      const ref = uniqueReferrals.get(wallet);
      ref.total_invested += parseFloat(inv.tokens_usd_value) || 0;
      ref.total_tokens += parseFloat(inv.tokens_amount) || 0;
      ref.investments.push({
        round: inv.fundraising_rounds?.display_name,
        tokens: parseFloat(inv.tokens_amount),
        value: parseFloat(inv.tokens_usd_value),
        date: inv.created_at,
        status: inv.status
      });
    });

    return NextResponse.json({
      hasCode: true,
      code: referralCode.code,
      isActive: referralCode.is_active,
      createdAt: referralCode.created_at,
      stats,
      referrals: Array.from(uniqueReferrals.values()),
      bonusAllocations: referralAllocations
    });

  } catch (error: any) {
    console.error('Error fetching referral stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
