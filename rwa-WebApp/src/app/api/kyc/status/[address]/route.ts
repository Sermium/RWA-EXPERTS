// src/app/api/kyc/status/[address]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  TierName,
  tierNumberToName,
  getLimitForTier,
  getRemainingLimit,
  formatLimit,
  DEFAULT_LIMITS,
} from '@/lib/kycLimits';

// KYC expiry duration (1 year)
const KYC_EXPIRY_DAYS = 365;

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Default response for non-KYC'd users
function getDefaultResponse(wallet: string) {
  return {
    success: true,
    found: false,
    wallet: wallet.toLowerCase(),
    
    // Status
    status: 'none' as const,
    applicationStatus: 'none' as const,
    
    // Tier info
    tier: 'None' as TierName,
    tierNumber: 0,
    kycLevel: 0, // Alias for tierNumber (backward compatibility)
    
    // Verification
    isVerified: false,
    isExpired: false,
    canInvest: false,
    
    // Limits
    limit: 0,
    used: 0,
    remaining: 0,
    limitFormatted: '$0',
    remainingFormatted: '$0',
    
    // Dates
    submittedAt: null,
    approvedAt: null,
    expiresAt: null,
    
    // Linked wallets
    linkedWallets: [],
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const wallet = address?.toLowerCase();

    // Validate wallet address
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/i.test(wallet)) {
      return NextResponse.json(getDefaultResponse(wallet || 'invalid'));
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('[KYC Status] Supabase not configured');
      return NextResponse.json(getDefaultResponse(wallet));
    }

    // Query KYC application - check both direct wallet and linked wallets
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

    // No KYC application found
    if (!kycData) {
      return NextResponse.json(getDefaultResponse(wallet));
    }

    // Extract data from DB
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
    // Override with DB expiry if set
    if (kycData.expires_at) {
      expiresAt = new Date(kycData.expires_at);
    }

    const isExpired = expiresAt ? new Date() > expiresAt : false;
    const isApproved = dbStatus === 'approved' && !isExpired;

    // Determine effective status
    let effectiveStatus: 'none' | 'pending' | 'approved' | 'rejected' | 'expired' = dbStatus;
    if (isExpired && dbStatus === 'approved') {
      effectiveStatus = 'expired';
    }

    // Get tier info
    const effectiveTierNumber = isApproved ? tierNumber : 0;
    const tier = tierNumberToName(effectiveTierNumber);
    const limit = getLimitForTier(tier);

    // Get total invested from investments table
    let totalInvested = 0;
    try {
      const { data: investments } = await supabase
        .from('investments')
        .select('amount')
        .or(`investor_address.ilike.${wallet},investor_address.ilike.${kycData.wallet_address}`);

      totalInvested = investments?.reduce((sum, inv) => {
        const amount = parseFloat(inv.amount) || 0;
        return sum + amount;
      }, 0) || 0;
    } catch (e) {
      console.warn('[KYC Status] Could not fetch investments:', e);
    }

    const remaining = getRemainingLimit(tier, totalInvested);

    return NextResponse.json({
      success: true,
      found: true,
      wallet: wallet,
      
      // Status
      status: effectiveStatus,
      applicationStatus: dbStatus,
      
      // Tier info
      tier,
      tierNumber: effectiveTierNumber,
      kycLevel: effectiveTierNumber, // Backward compatibility
      requestedLevel,
      
      // Verification
      isVerified: isApproved,
      isExpired,
      canInvest: isApproved && effectiveTierNumber >= 1,
      
      // Limits
      limit: limit === Infinity ? null : limit,
      used: totalInvested,
      remaining: remaining === Infinity ? null : remaining,
      limitFormatted: formatLimit(limit),
      remainingFormatted: formatLimit(remaining),
      
      // Dates
      submittedAt: kycData.submitted_at || kycData.created_at,
      approvedAt: kycData.approved_at,
      expiresAt: expiresAt?.toISOString() || null,
      reviewedAt: kycData.reviewed_at,
      
      // Rejection info
      rejectionReason: kycData.rejection_reason,
      
      // Linked wallets
      linkedWallets,
      primaryWallet: kycData.wallet_address,
      
      // Status flags for UI
      isPending: effectiveStatus === 'pending',
      isRejected: effectiveStatus === 'rejected',
      canResubmit: effectiveStatus === 'rejected' || effectiveStatus === 'expired',
      
      // Personal info (limited)
      firstName: kycData.first_name,
      country: kycData.country,
      countryCode: kycData.country_code,
      
      // Legacy submission object for backward compatibility
      submission: {
        level: effectiveTierNumber,
        status: effectiveStatus === 'approved' ? 1 
              : effectiveStatus === 'rejected' ? 2 
              : effectiveStatus === 'expired' ? 3 
              : 0,
        countryCode: kycData.country_code || 0,
        requestedLevel,
        expiresAt: expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null,
        totalInvested,
      },
    });

    } catch (error) {
      console.error('[KYC Status] Error:', error);
      const defaultResponse = getDefaultResponse('error');
      return NextResponse.json({
        ...defaultResponse,
        success: false,
        error: 'Internal server error',
      }, { status: 500 });
    }
}
