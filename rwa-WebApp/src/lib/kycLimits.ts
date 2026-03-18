// src/lib/kycLimits.ts
// DB-driven KYC tier limits - no on-chain KYCManager dependency
// KYC verification now happens via signature (KYCVerifier) not contract reads

import { CHAINS, type SupportedChainId } from '@/config/chains';

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

export const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold', 'Diamond'] as const;
export type TierName = typeof TIER_NAMES[number];

export type KYCTier = 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';

export interface TierLimits {
  None: number;
  Bronze: number;
  Silver: number;
  Gold: number;
  Diamond: number;
}

export interface TierLimitsBigInt {
  tier: KYCTier;
  dailyLimit: bigint;
  monthlyLimit: bigint;
  yearlyLimit: bigint;
  singleTxLimit: bigint;
}

// Default limits in USD (can be overridden via env or DB config)
export const DEFAULT_LIMITS: TierLimits = {
  None: 0,
  Bronze: 10_000,
  Silver: 100_000,
  Gold: 1_000_000,
  Diamond: Infinity
};

// Detailed limits per tier (in wei for 18 decimal stablecoin)
export const TIER_LIMITS_DETAILED: Record<KYCTier, TierLimitsBigInt> = {
  none: { 
    tier: 'none', 
    dailyLimit: 0n, 
    monthlyLimit: 0n, 
    yearlyLimit: 0n, 
    singleTxLimit: 0n 
  },
  bronze: { 
    tier: 'bronze', 
    dailyLimit: 1_000n * 10n**18n, 
    monthlyLimit: 5_000n * 10n**18n, 
    yearlyLimit: 10_000n * 10n**18n, 
    singleTxLimit: 500n * 10n**18n 
  },
  silver: { 
    tier: 'silver', 
    dailyLimit: 10_000n * 10n**18n, 
    monthlyLimit: 50_000n * 10n**18n, 
    yearlyLimit: 100_000n * 10n**18n, 
    singleTxLimit: 5_000n * 10n**18n 
  },
  gold: { 
    tier: 'gold', 
    dailyLimit: 100_000n * 10n**18n, 
    monthlyLimit: 500_000n * 10n**18n, 
    yearlyLimit: 1_000_000n * 10n**18n, 
    singleTxLimit: 50_000n * 10n**18n 
  },
  diamond: { 
    tier: 'diamond', 
    dailyLimit: 0n,  // 0 = unlimited
    monthlyLimit: 0n, 
    yearlyLimit: 0n, 
    singleTxLimit: 0n 
  },
};

// =============================================================================
// MAIN FUNCTIONS - DB DRIVEN (no contract calls)
// =============================================================================

/**
 * Get tier limits - now returns static/configurable limits
 * Previously read from KYCManager contract, now DB/config driven
 */
export function getTierLimits(tier?: KYCTier): TierLimits {
  // Return static limits - can be enhanced to read from DB/env
  return DEFAULT_LIMITS;
}

/**
 * Get detailed limits for a specific tier
 */
export function getTierLimitsDetailed(tier: KYCTier): TierLimitsBigInt {
  return TIER_LIMITS_DETAILED[tier] || TIER_LIMITS_DETAILED.none;
}

/**
 * Get limit for a specific tier in USD
 */
export function getLimitForTier(tier: TierName | KYCTier): number {
  const normalizedTier = normalizeTierName(tier);
  return DEFAULT_LIMITS[normalizedTier];
}

/**
 * Get user's KYC limits - now fetched from API/DB
 */
export async function getUserLimits(
  address: `0x${string}`,
  chainId: SupportedChainId = 43113
): Promise<{
  tier: TierName;
  limit: number;
  used: number;
  remaining: number;
  chainId: SupportedChainId;
}> {
  try {
    // Fetch from API (which reads from DB)
    const response = await fetch(`/api/kyc/status/${address}`);
    
    if (!response.ok) {
      return { tier: 'None', limit: 0, used: 0, remaining: 0, chainId };
    }

    const data = await response.json();
    const tier = tierNumberToName(data.tier ? tierNameToNumber(data.tier) : 0);
    const limit = DEFAULT_LIMITS[tier];
    
    // Used/remaining would come from investment tracking in DB
    const used = data.totalInvested || 0;
    const remaining = tier === 'Diamond' ? Infinity : Math.max(0, limit - used);

    return { tier, limit, used, remaining, chainId };
  } catch (error) {
    console.error(`[KYC Limits] Failed to fetch user limits:`, error);
    return { tier: 'None', limit: 0, used: 0, remaining: 0, chainId };
  }
}

/**
 * Get user limits - server-side version (for API routes)
 */
export async function getUserLimitsServer(
  address: string,
  supabaseClient: any
): Promise<{
  tier: TierName;
  limit: number;
  used: number;
  remaining: number;
}> {
  try {
    const { data: submission, error } = await supabaseClient
      .from('kyc_submissions')
      .select('kyc_tier, status')
      .or(`wallet_address.eq.${address.toLowerCase()},linked_wallets.cs.{${address.toLowerCase()}}`)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !submission) {
      return { tier: 'None', limit: 0, used: 0, remaining: 0 };
    }

    const tier = tierNumberToName(submission.kyc_tier || 0);
    const limit = DEFAULT_LIMITS[tier];

    // Get total invested from investments table
    const { data: investments } = await supabaseClient
      .from('investments')
      .select('amount')
      .eq('investor_address', address.toLowerCase());

    const used = investments?.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0) || 0;
    const remaining = tier === 'Diamond' ? Infinity : Math.max(0, limit - used);

    return { tier, limit, used, remaining };
  } catch (error) {
    console.error('[KYC Limits] Server fetch failed:', error);
    return { tier: 'None', limit: 0, used: 0, remaining: 0 };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert tier name to number (0-4)
 */
export function tierNameToNumber(tier: TierName | KYCTier | string): number {
  const normalized = normalizeTierName(tier as TierName);
  return TIER_NAMES.indexOf(normalized);
}

/**
 * Convert tier number to name
 */
export function tierNumberToName(num: number): TierName {
  return TIER_NAMES[num] || 'None';
}

/**
 * Normalize tier name (handles both 'bronze' and 'Bronze' formats)
 */
export function normalizeTierName(tier: TierName | KYCTier | string): TierName {
  if (!tier) return 'None';
  const lower = tier.toLowerCase();
  const map: Record<string, TierName> = {
    'none': 'None',
    'bronze': 'Bronze',
    'silver': 'Silver',
    'gold': 'Gold',
    'diamond': 'Diamond'
  };
  return map[lower] || 'None';
}

/**
 * Convert TierName to KYCTier (lowercase version)
 */
export function toKYCTier(tier: TierName | string): KYCTier {
  return (tier?.toLowerCase() || 'none') as KYCTier;
}

/**
 * Format limit for display
 */
export function formatLimit(value: number | bigint, decimals: number = 18): string {
  if (value === Infinity || value === 0n || value === 0) {
    return value === 0 || value === 0n ? '$0' : 'Unlimited';
  }
  
  if (typeof value === 'bigint') {
    const divisor = 10n ** BigInt(decimals);
    const integerPart = value / divisor;
    return `$${integerPart.toLocaleString()}`;
  }
  
  return `$${value.toLocaleString()}`;
}

/**
 * Check if user can invest a specific amount
 */
export function canInvest(
  tier: TierName | KYCTier, 
  amount: number, 
  currentUsed: number = 0
): boolean {
  const normalizedTier = normalizeTierName(tier as TierName);
  if (normalizedTier === 'None') return false;
  if (normalizedTier === 'Diamond') return true;
  
  const limit = DEFAULT_LIMITS[normalizedTier];
  return (currentUsed + amount) <= limit;
}

/**
 * Get remaining investment limit
 */
export function getRemainingLimit(
  tier: TierName | KYCTier, 
  currentUsed: number
): number {
  const normalizedTier = normalizeTierName(tier as TierName);
  if (normalizedTier === 'Diamond') return Infinity;
  if (normalizedTier === 'None') return 0;
  
  const limit = DEFAULT_LIMITS[normalizedTier];
  return Math.max(0, limit - currentUsed);
}

/**
 * Get chain name for display
 */
export function getChainName(chainId: SupportedChainId): string {
  return CHAINS[chainId]?.name || `Chain ${chainId}`;
}

/**
 * Check if a chain supports KYC features
 * Now always returns true since KYC is DB-driven, not contract-dependent
 */
export function isKYCAvailableOnChain(chainId: SupportedChainId): boolean {
  // KYC is now DB-driven, available on all supported chains
  return chainId in CHAINS;
}

/**
 * Get all chains where KYC features are available
 */
export function getKYCEnabledChains(): SupportedChainId[] {
  return Object.keys(CHAINS).map(id => Number(id) as SupportedChainId);
}
