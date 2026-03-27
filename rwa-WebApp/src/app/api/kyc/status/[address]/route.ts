// src/app/api/kyc/status/[address]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const KYC_EXPIRY_DAYS = 365;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

function formatLimit(value: number | null): string {
  if (value === null) return 'Unlimited';
  if (value === 0) return '$0';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold', 'Diamond'] as const;
type TierName = typeof TIER_NAMES[number];

function tierNumberToName(num: number): TierName {
  return TIER_NAMES[num] || 'None';
}

// Fetch tier limits from DB
async function getTierLimitsFromDB(supabase: any): Promise<Record<TierName, number | null>> {
  const { data, error } = await supabase
    .from('kyc_tier_limits')
    .select('tier_name, investment_limit');

  if (error || !data) {
    console.error('[KYC Status] Failed to fetch tier limits:', error);
    // Return empty - will show as 0 limits
    return { None: 0, Bronze: null, Silver: null, Gold: null, Diamond: null };
  }

  const limits: Record<string, number | null> = { None: 0, Bronze: null, Silver: null, Gold: null, Diamond: null };
  for (const tier of data) {
    limits[tier.tier_name] = tier.investment_limit === null ? null : Number(tier.investment_limit);
  }
  return limits as Record<TierName, number | null>;
}

function getDefaultResponse(wallet: string, tierLimits: Record<TierName, number | null>) {
  return {
    success: true,
    found: false,
    wallet: wallet.toLowerCase(),
    status: 'none' as const,
    applicationStatus: 'none' as const,
    tier: 'None' as TierName,
    tierNumber: 0,
    kycLevel: 0,
    isVerified: false,
    isExpired: false,
    canInvest: false,
    limit: 0,
    used: 0,
    remaining: 0,
    limitFormatted: '$0',
    remainingFormatted: '$0',
    submittedAt: null,
    approvedAt: null,
    expiresAt: null,
    linkedWallets: [],
    tierLimits, // Include all limits for context
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const wallet = address?.toLowerCase();

    if (!wallet || !/^0x[a-fA-F0-9]{40}$/i.test(wallet)) {
      return NextResponse.json({ success: false, error: 'Invalid address' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('[KYC Status] Supabase not configured');
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    // Fetch tier limits from DB first
    const tierLimits = await getTierLimitsFromDB(supabase);

    // Query KYC application
    const { data: kycData, error: kycError } = await supabase
      .from('kyc_applications')
      .select('*')
      .or(`wallet_address.ilike.${wallet},linked_wallets.cs.{${wallet}}`)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (kycError) {
      console.error('[KYC Status] Database error:', kycError);
    }

    if (!kycData) {
      return NextResponse.json(getDefaultResponse(wallet, tierLimits));
    }

    // Extract data
    const dbStatus = kycData.status || 'none';
    const tierNumber = kycData.current_level || kycData.kyc_tier || 0;
    const requestedLevel = kycData.requested_level || 0;
    const approvedAt = kycData.approved_at;
    const linkedWallets = kycData.linked_wallets || [];

    // Calculate expiry
    let expiresAt: Date | null = null;
    if (approvedAt) {
      expiresAt = new Date(approvedAt);
      expiresAt.setDate(expiresAt.getDate() + KYC_EXPIRY_DAYS);
    }
    if (kycData.expires_at) {
      expiresAt = new Date(kycData.expires_at);
    }

    const isExpired = expiresAt ? new Date() > expiresAt : false;
    const isApproved = dbStatus === 'approved' && !isExpired;

    let effectiveStatus: 'none' | 'pending' | 'approved' | 'rejected' | 'expired' = dbStatus;
    if (isExpired && dbStatus === 'approved') {
      effectiveStatus = 'expired';
    }

    const effectiveTierNumber = isApproved ? tierNumber : 0;
    const tier = tierNumberToName(effectiveTierNumber);
    
    // Get limit from DB-fetched limits
    const limit = tierLimits[tier];
    const limitValue = limit === null ? Infinity : (limit || 0);

    // Get total invested
    let totalInvested = 0;
    try {
      const { data: investments } = await supabase
        .from('investments')
        .select('amount')
        .or(`investor_address.ilike.${wallet},investor_address.ilike.${kycData.wallet_address}`);

      totalInvested = investments?.reduce((sum, inv) => {
        return sum + (parseFloat(inv.amount) || 0);
      }, 0) || 0;
    } catch (e) {
      console.warn('[KYC Status] Could not fetch investments:', e);
    }

    const remaining = limit === null ? null : Math.max(0, limitValue - totalInvested);

    return NextResponse.json({
      success: true,
      found: true,
      wallet,
      status: effectiveStatus,
      applicationStatus: dbStatus,
      tier,
      tierNumber: effectiveTierNumber,
      kycLevel: effectiveTierNumber,
      requestedLevel,
      isVerified: isApproved,
      isExpired,
      canInvest: isApproved && effectiveTierNumber >= 1,
      limit: limit,
      used: totalInvested,
      remaining: remaining,
      limitFormatted: formatLimit(limit),
      remainingFormatted: formatLimit(remaining),
      submittedAt: kycData.submitted_at || kycData.created_at,
      approvedAt: kycData.approved_at,
      expiresAt: expiresAt?.toISOString() || null,
      reviewedAt: kycData.reviewed_at,
      rejectionReason: kycData.rejection_reason,
      linkedWallets,
      primaryWallet: kycData.wallet_address,
      isPending: effectiveStatus === 'pending',
      isRejected: effectiveStatus === 'rejected',
      canResubmit: effectiveStatus === 'rejected' || effectiveStatus === 'expired',
      firstName: kycData.first_name,
      country: kycData.country,
      countryCode: kycData.country_code,
      tierLimits, // All limits for context to use
      submission: {
        level: effectiveTierNumber,
        status: effectiveStatus === 'approved' ? 1 : effectiveStatus === 'rejected' ? 2 : effectiveStatus === 'expired' ? 3 : 0,
        countryCode: kycData.country_code || 0,
        requestedLevel,
        expiresAt: expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null,
        totalInvested,
      },
    });
  } catch (error) {
    console.error('[KYC Status] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
