// src/app/api/kyc/status/route.ts
import { NextRequest, NextResponse } from 'next/server';

// KYC expiry duration: 1 year in seconds
const KYC_EXPIRY_DURATION = 365 * 24 * 60 * 60;

// Helper to format limit
function formatLimit(value: number | null): string {
  if (value === null) return 'Unlimited';
  if (!isFinite(value)) return 'Unlimited';
  if (value === 0) return '$0';
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `$${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
  }
  return `$${value.toLocaleString()}`;
}

// Tier level to name mapping
const TIER_LEVEL_TO_NAME: Record<number, string> = {
  0: 'None',
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Diamond',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: true,
        status: {
          wallet: wallet.toLowerCase(),
          kycStatus: 'none',
          kycLevel: 0,
          tier: 'None',
          isVerified: false,
          canInvest: false,
          investmentLimit: 0,
          investmentLimitFormatted: '$0',
          submittedAt: null,
          verifiedAt: null,
          expiresAt: null,
          isExpired: false,
        },
        message: 'Database not configured'
      });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch tier limits from database
    const { data: tierLimitsData } = await supabase
      .from('kyc_tier_limits')
      .select('tier_name, tier_level, investment_limit');

    // Build limits map from DB
    const tierLimits: Record<number, number | null> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: null };
    if (tierLimitsData) {
      for (const row of tierLimitsData) {
        tierLimits[row.tier_level] = row.investment_limit;
      }
    }

    // Fetch KYC application
    const { data: kycData, error: kycError } = await supabase
      .from('kyc_applications')
      .select('*')
      .eq('wallet_address', wallet.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (kycError) {
      console.error('Supabase query error:', kycError);
      return NextResponse.json({
        success: true,
        status: {
          wallet: wallet.toLowerCase(),
          kycStatus: 'none',
          kycLevel: 0,
          tier: 'None',
          isVerified: false,
          canInvest: false,
          investmentLimit: 0,
          investmentLimitFormatted: '$0',
          submittedAt: null,
          verifiedAt: null,
          expiresAt: null,
          isExpired: false,
        },
        message: 'Error querying database'
      });
    }

    if (!kycData) {
      return NextResponse.json({
        success: true,
        status: {
          wallet: wallet.toLowerCase(),
          kycStatus: 'none',
          kycLevel: 0,
          tier: 'None',
          isVerified: false,
          canInvest: false,
          investmentLimit: 0,
          investmentLimitFormatted: '$0',
          submittedAt: null,
          verifiedAt: null,
          expiresAt: null,
          isExpired: false,
        }
      });
    }

    const expiresAt = kycData.verified_at 
      ? new Date(new Date(kycData.verified_at).getTime() + KYC_EXPIRY_DURATION * 1000)
      : null;
    const isExpired = expiresAt ? new Date() > expiresAt : false;

    const kycLevel = kycData.kyc_level || 0;
    const tierName = TIER_LEVEL_TO_NAME[kycLevel] || 'None';
    const investmentLimit = tierLimits[kycLevel] ?? 0;
    const effectiveLimit = isExpired ? 0 : investmentLimit;

    return NextResponse.json({
      success: true,
      status: {
        wallet: wallet.toLowerCase(),
        kycStatus: isExpired ? 'expired' : kycData.status,
        kycLevel: isExpired ? 0 : kycLevel,
        tier: isExpired ? 'None' : tierName,
        isVerified: kycData.status === 'approved' && !isExpired,
        canInvest: kycData.status === 'approved' && !isExpired && kycLevel >= 1,
        investmentLimit: effectiveLimit === null ? null : effectiveLimit,
        investmentLimitFormatted: formatLimit(effectiveLimit),
        submittedAt: kycData.created_at,
        verifiedAt: kycData.verified_at,
        expiresAt: expiresAt?.toISOString() || null,
        isExpired,
      }
    });

  } catch (error) {
    console.error('Error fetching KYC status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
