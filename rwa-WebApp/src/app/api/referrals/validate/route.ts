import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const investorWallet = searchParams.get('investor'); // Optional: to check if it's their own code

  if (!code) {
    return NextResponse.json({ valid: false, error: 'No code provided' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const normalizedCode = code.toUpperCase().trim();

    // Get referral code with user info
    const { data: referral, error } = await supabase
      .from('referral_codes')
      .select(`
        id,
        code,
        wallet_address,
        is_active,
        total_referrals,
        total_bonus_tokens
      `)
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .single();

    if (error || !referral) {
      return NextResponse.json({ valid: false, error: 'Invalid or inactive referral code' }, { status: 404 });
    }

    // Check if referrer has Gold or Diamond tier
    const { data: userData } = await supabase
      .from('users')
      .select('kyc_tier, kyc_status')
      .eq('wallet_address', referral.wallet_address.toLowerCase())
      .single();

    const tier = userData?.kyc_tier;
    if (!['Gold', 'Diamond'].includes(tier)) {
      return NextResponse.json({ valid: false, error: "Referrer can't refer themselves!" }, { status: 400 });
    }

    // If investor wallet provided, check it's not their own code
    if (investorWallet) {
    const normalizedInvestor = investorWallet.toLowerCase();
    
    if (referral.wallet_address.toLowerCase() === normalizedInvestor) {
        return NextResponse.json({ valid: false, error: 'You cannot use your own referral code' }, { status: 400 });
    }

    // Check linked wallets - first get the user's wallet_hash
      const { data: userWallet } = await supabase
        .from('linked_wallets')
        .select('wallet_hash')
        .eq('wallet_address', normalizedInvestor)
        .single();

      if (userWallet?.wallet_hash) {
        // Get all wallets with the same wallet_hash (linked wallets group)
        const { data: linkedWallets } = await supabase
        .from('linked_wallets')
        .select('wallet_address')
        .eq('wallet_hash', userWallet.wallet_hash);

        const linkedAddresses = linkedWallets?.map(w => w.wallet_address?.toLowerCase()).filter(Boolean) || [];

        if (linkedAddresses.includes(referral.wallet_address.toLowerCase())) {
        return NextResponse.json({ valid: false, error: 'You cannot use a referral code from your linked wallets' }, { status: 400 });
        }
      }
    }

    return NextResponse.json({
      valid: true,
      code: referral.code,
      referrerAddress: referral.wallet_address,
      referrerTier: tier,
      stats: {
        totalReferrals: referral.total_referrals || 0,
        totalBonusTokens: referral.total_bonus_tokens || 0
      }
    });

  } catch (error) {
    console.error('Referral validation error:', error);
    return NextResponse.json({ valid: false, error: 'Validation failed' }, { status: 500 });
  }
}