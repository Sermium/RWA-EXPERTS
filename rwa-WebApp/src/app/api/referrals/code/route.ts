import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Tier level mapping (1=Bronze, 2=Silver, 3=Gold, 4=Diamond)
const TIER_NAMES: Record<number, string> = {
  1: 'Bronze',
  2: 'Silver', 
  3: 'Gold',
  4: 'Diamond'
};

// GET - Fetch existing referral code
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet');
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const normalizedWallet = wallet.toLowerCase();

    const { data: referralCode, error } = await supabase
      .from('referral_codes')
      .select('*')
      .ilike('wallet_address', normalizedWallet)
      .single();

    if (error || !referralCode) {
      return NextResponse.json({ error: 'No referral code found' }, { status: 404 });
    }

    return NextResponse.json({
      code: referralCode.code,
      total_referrals: referralCode.total_referrals || 0,
      total_investment_amount: referralCode.total_investment_amount || 0,
      total_bonus_tokens: referralCode.total_bonus_tokens || 0,
      is_active: referralCode.is_active
    });

  } catch (error) {
    console.error('Error fetching referral code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new referral code
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const wallet = body?.wallet;
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const normalizedWallet = wallet.toLowerCase();

    // Check if code already exists
    const { data: existing } = await supabase
      .from('referral_codes')
      .select('code')
      .ilike('wallet_address', normalizedWallet)
      .single();

    if (existing) {
      return NextResponse.json({ code: existing.code });
    }

    // Check KYC status from kyc_applications table
    const { data: kycData, error: kycError } = await supabase
      .from('kyc_applications')
      .select('current_level, status, wallet_address')
      .ilike('wallet_address', normalizedWallet)
      .single();
    
    console.log('KYC lookup for:', normalizedWallet);
    console.log('KYC data:', kycData, 'Error:', kycError);

    if (kycError || !kycData) {
      return NextResponse.json({ 
        error: 'No KYC application found for this wallet' 
      }, { status: 403 });
    }

    // Check if approved
    const isApproved = kycData.status?.toLowerCase() === 'approved';
    
    // Get tier name from level (3=Gold, 4=Diamond are eligible)
    const tierLevel = kycData.current_level || 0;
    const tierName = TIER_NAMES[tierLevel] || 'None';
    
    // Eligible tiers: Gold (3) or Diamond (4)
    const eligibleLevels = [3, 4];
    
    console.log('Tier level:', tierLevel, 'Tier name:', tierName, 'Approved:', isApproved);

    if (!isApproved) {
      return NextResponse.json({ 
        error: `KYC not approved. Current status: ${kycData.status}` 
      }, { status: 403 });
    }

    if (!eligibleLevels.includes(tierLevel)) {
      return NextResponse.json({ 
        error: `Only Gold and Diamond tier users can generate referral codes. Your tier: ${tierName} (level ${tierLevel})` 
      }, { status: 403 });
    }

    // Generate unique code
    const generateCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let code = '';
    let attempts = 0;

    while (attempts < 10) {
      code = generateCode();
      const { data: existingCode } = await supabase
        .from('referral_codes')
        .select('id')
        .eq('code', code)
        .single();
      
      if (!existingCode) break;
      attempts++;
    }

    // Insert new code - use the original wallet address from DB for consistency
    const { data: newCode, error: insertError } = await supabase
      .from('referral_codes')
      .insert({
        code,
        wallet_address: kycData.wallet_address, // Use DB's stored address
        is_active: true,
        total_referrals: 0,
        total_investment_amount: 0,
        total_bonus_tokens: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating referral code:', insertError);
      return NextResponse.json({ error: 'Failed to create referral code: ' + insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      code: newCode.code,
      total_referrals: 0,
      total_investment_amount: 0,
      total_bonus_tokens: 0
    });

  } catch (error) {
    console.error('Error creating referral code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}