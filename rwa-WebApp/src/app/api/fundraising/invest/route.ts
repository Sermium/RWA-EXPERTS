import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    const body = await request.json();
    const {
      roundId,
      walletAddress,
      investmentAmountUsd,
      paymentMethod,
      token,
      chainId,
      referralCode,
      referrerAddress,
      bonusRecipient
    } = body;

    // Validate required fields
    if (!roundId || !walletAddress || !investmentAmountUsd) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedWallet = walletAddress.toLowerCase();

    // Get round details
    const { data: round, error: roundError } = await supabase
      .from('fundraising_rounds')
      .select('*')
      .eq('id', roundId)
      .single();

    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    if (round.status !== 'active') {
      return NextResponse.json({ error: 'Round is not active' }, { status: 400 });
    }

    // Validate investment amount
    if (investmentAmountUsd < round.min_investment_usd) {
      return NextResponse.json({ error: `Minimum investment is $${round.min_investment_usd}` }, { status: 400 });
    }

    if (investmentAmountUsd > round.max_investment_usd) {
      return NextResponse.json({ error: `Maximum investment is $${round.max_investment_usd}` }, { status: 400 });
    }

    // Check if user is trying to use their own referral code
    if (referralCode) {
      const { data: ownCode } = await supabase
        .from('referral_codes')
        .select('wallet_address')
        .eq('code', referralCode.toUpperCase())
        .single();

      // Check own code
      if (ownCode?.wallet_address?.toLowerCase() === normalizedWallet) {
        return NextResponse.json({ error: 'You cannot use your own referral code' }, { status: 400 });
      }

      // Check linked wallets - first get the user's wallet_hash
      const { data: userWallet } = await supabase
        .from('linked_wallets')
        .select('wallet_hash')
        .eq('wallet_address', normalizedWallet)
        .single();

      if (userWallet?.wallet_hash) {
        // Get all wallets with the same wallet_hash (linked wallets group)
        const { data: linkedWallets } = await supabase
          .from('linked_wallets')
          .select('wallet_address')
          .eq('wallet_hash', userWallet.wallet_hash);

        const linkedAddresses = linkedWallets?.map(w => w.wallet_address?.toLowerCase()).filter(Boolean) || [];

        if (ownCode && linkedAddresses.includes(ownCode.wallet_address?.toLowerCase())) {
          return NextResponse.json({ error: 'You cannot use a referral code from your linked wallets' }, { status: 400 });
        }
      }
    }

    // Calculate tokens
    const tokenPrice = parseFloat(round.token_price_usd);
    const purchasedTokens = investmentAmountUsd / tokenPrice;
    const bonusPercent = 5;
    const bonusTokens = purchasedTokens * (bonusPercent / 100);
    const totalTokens = purchasedTokens + bonusTokens;

    // Determine bonus recipient
    const finalBonusRecipient = referrerAddress?.toLowerCase() || bonusRecipient?.toLowerCase() || 'platform';
    const bonusType = referralCode ? 'referral' : 'platform';

    // Create investment record
    const { data: investment, error: investError } = await supabase
      .from('fundraising_investments')
      .insert({
        round_id: roundId,
        wallet_address: normalizedWallet,
        investment_amount_usd: investmentAmountUsd,
        token_price_usd: tokenPrice,
        tokens_purchased: purchasedTokens,
        bonus_tokens: bonusTokens,
        total_tokens: totalTokens,
        bonus_recipient: finalBonusRecipient,
        bonus_type: bonusType,
        referral_code: referralCode?.toUpperCase() || null,
        referrer_address: referrerAddress?.toLowerCase() || null,
        payment_method: paymentMethod,
        payment_token: token || null,
        chain_id: chainId || null,
        status: 'pending'
      })
      .select()
      .single();

    if (investError) {
      console.error('Investment creation error:', investError);
      return NextResponse.json({ error: 'Failed to create investment' }, { status: 500 });
    }

    // Create token allocation records
    const allocations = [];

    // 1. Purchase allocation for investor
    allocations.push({
      round_id: roundId,
      round_name: round.name,
      type: 'purchase',
      wallet_address: normalizedWallet,
      tokens_amount: purchasedTokens,
      tokens_usd_value: investmentAmountUsd,
      token_price_usd: tokenPrice,
      investment_id: investment.id,
      chain_id: chainId,
      payment_method: paymentMethod,
      status: 'pending'
    });

    // 2. Bonus allocation (to referrer or platform)
    if (referralCode && referrerAddress) {
      // Referral bonus - goes to referrer
      allocations.push({
        round_id: roundId,
        round_name: round.name,
        type: 'referral_bonus',
        wallet_address: referrerAddress.toLowerCase(),
        tokens_amount: bonusTokens,
        tokens_usd_value: bonusTokens * tokenPrice,
        token_price_usd: tokenPrice,
        investment_id: investment.id,
        referral_code: referralCode.toUpperCase(),
        referred_wallet: normalizedWallet,
        chain_id: chainId,
        payment_method: paymentMethod,
        status: 'pending',
        notes: `Referral bonus from ${walletAddress}`
      });
    } else {
      // Platform bonus - goes to fee receiver
      allocations.push({
        round_id: roundId,
        round_name: round.name,
        type: 'platform_bonus',
        wallet_address: finalBonusRecipient,
        tokens_amount: bonusTokens,
        tokens_usd_value: bonusTokens * tokenPrice,
        token_price_usd: tokenPrice,
        investment_id: investment.id,
        chain_id: chainId,
        payment_method: paymentMethod,
        status: 'pending',
        notes: `Platform bonus from investment by ${walletAddress}`
      });
    }

    // Insert all allocations
    const { error: allocError } = await supabase
      .from('token_allocations')
      .insert(allocations);

    if (allocError) {
      console.error('Token allocation error:', allocError);
      // Don't fail the investment, just log the error
    }

    // Update referral stats if applicable
    if (referralCode && referrerAddress) {
      const { error: refError } = await supabase
        .from('referral_codes')
        .update({
          total_referrals: supabase.rpc('increment', { x: 1 }),
          total_investment_amount: supabase.rpc('increment', { x: investmentAmountUsd }),
          total_bonus_tokens: supabase.rpc('increment', { x: bonusTokens }),
          updated_at: new Date().toISOString()
        })
        .eq('code', referralCode.toUpperCase());

      // Alternative: Use raw SQL increment
      if (refError) {
        await supabase.rpc('increment_referral_stats', {
          p_code: referralCode.toUpperCase(),
          p_investment_amount: investmentAmountUsd,
          p_bonus_tokens: bonusTokens
        });
      }
    }

    return NextResponse.json({
      success: true,
      investmentId: investment.id,
      tokensAllocated: purchasedTokens,
      bonusTokens: bonusTokens,
      bonusType: bonusType,
      bonusRecipient: finalBonusRecipient,
      totalTokens: totalTokens
    });

  } catch (error) {
    console.error('Investment error:', error);
    return NextResponse.json({ error: 'Investment failed' }, { status: 500 });
  }
}
