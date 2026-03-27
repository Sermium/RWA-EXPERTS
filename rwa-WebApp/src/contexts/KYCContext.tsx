// src/contexts/KYCContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAccount } from 'wagmi';

// ============================================================================
// TYPES
// ============================================================================

export type KYCTier = 'None' | 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
export type KYCStatus = 'None' | 'Pending' | 'Approved' | 'Rejected' | 'Expired' | 'ManualReview' | 'AutoVerifying';

export interface KYCData {
  tier: KYCTier;
  tierNumber: number;
  status: KYCStatus;
  isVerified: boolean;
  isExpired: boolean;
  limit: number;
  limitFormatted: string;
  used: number;
  remaining: number;
  remainingFormatted: string;
  expiresAt: string | null;
  canInvest: boolean;
  canResubmit: boolean;
}

export interface TierInfo {
  name: KYCTier;
  level: number;
  limit: number;
  formattedLimit: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  label: string;
  description: string;
}

export interface TierLimits {
  None: number;
  Bronze: number;
  Silver: number;
  Gold: number;
  Diamond: number;
}

// ============================================================================
// CONSTANTS & MAPPINGS
// ============================================================================

export const KYC_TIERS: KYCTier[] = ['None', 'Bronze', 'Silver', 'Gold', 'Diamond'];

export const CONTRACT_LEVEL_TO_TIER: Record<number, KYCTier> = {
  0: 'None',
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Diamond',
};

export const TIER_TO_CONTRACT_LEVEL: Record<KYCTier, number> = {
  None: 0,
  Bronze: 1,
  Silver: 2,
  Gold: 3,
  Diamond: 4,
};

// Fallback limits - only used if API fails
const FALLBACK_LIMITS: TierLimits = {
  None: 0,
  Bronze: 0,
  Silver: 0,
  Gold: 0,
  Diamond: Infinity,
};

// ============================================================================
// HELPERS
// ============================================================================

export function formatLimitDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Unlimited';
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

export function getTierInfo(tier: KYCTier, limit?: number): TierInfo {
  const configs: Record<KYCTier, { color: string; bgColor: string; borderColor: string; icon: string; label: string; description: string }> = {
    None: { 
      color: 'text-gray-400', 
      bgColor: 'bg-gray-500/10', 
      borderColor: 'border-gray-500',
      icon: '○', 
      label: 'Unverified',
      description: 'Complete KYC to invest' 
    },
    Bronze: { 
      color: 'text-amber-600', 
      bgColor: 'bg-amber-500/10', 
      borderColor: 'border-amber-500',
      icon: '🥉', 
      label: 'Bronze',
      description: 'Basic verification' 
    },
    Silver: { 
      color: 'text-gray-300', 
      bgColor: 'bg-gray-400/10', 
      borderColor: 'border-gray-400',
      icon: '🥈', 
      label: 'Silver',
      description: 'Standard verification' 
    },
    Gold: { 
      color: 'text-yellow-400', 
      bgColor: 'bg-yellow-500/10', 
      borderColor: 'border-yellow-500',
      icon: '🥇', 
      label: 'Gold',
      description: 'Accredited investor' 
    },
    Diamond: { 
      color: 'text-cyan-400', 
      bgColor: 'bg-cyan-500/10', 
      borderColor: 'border-cyan-500',
      icon: '💎', 
      label: 'Diamond',
      description: 'Institutional investor' 
    },
  };

  const config = configs[tier];
  const level = TIER_TO_CONTRACT_LEVEL[tier];
  const limitValue = limit ?? 0;

  return {
    name: tier,
    level,
    limit: limitValue,
    formattedLimit: formatLimitDisplay(limitValue),
    ...config,
  };
}

export function meetsMinimumTier(
  userTier: KYCTier | string | undefined | null,
  requiredTier: KYCTier | string
): boolean {
  if (!userTier) return false;
  
  const userLevel = TIER_TO_CONTRACT_LEVEL[userTier as KYCTier];
  const requiredLevel = TIER_TO_CONTRACT_LEVEL[requiredTier as KYCTier];
  
  // If either tier is not recognized, return false
  if (userLevel === undefined || requiredLevel === undefined) return false;
  
  return userLevel >= requiredLevel;
}

// ============================================================================
// GLOBAL CACHE
// ============================================================================

interface GlobalCache {
  tierLimits: TierLimits | null;
  tierLimitsTimestamp: number;
  kycStatus: Record<string, { data: KYCData; timestamp: number }>;
}

const globalCache: GlobalCache = {
  tierLimits: null,
  tierLimitsTimestamp: 0,
  kycStatus: {},
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchTierLimitsGlobal(forceRefresh = false): Promise<TierLimits> {
  const now = Date.now();
  
  if (!forceRefresh && globalCache.tierLimits && (now - globalCache.tierLimitsTimestamp) < CACHE_TTL) {
    return globalCache.tierLimits;
  }

  try {
    const response = await fetch('/api/kyc/limits');
    if (!response.ok) throw new Error('Failed to fetch limits');
    
    const data = await response.json();
    
    if (data.success && data.limits) {
      const limits: TierLimits = {
        None: data.limits.None ?? 0,
        Bronze: data.limits.Bronze ?? 0,
        Silver: data.limits.Silver ?? 0,
        Gold: data.limits.Gold ?? 0,
        Diamond: data.limits.Diamond === null ? Infinity : (data.limits.Diamond ?? Infinity),
      };
      
      globalCache.tierLimits = limits;
      globalCache.tierLimitsTimestamp = now;
      
      console.log('[KYCContext] Loaded tier limits from API:', limits);
      return limits;
    }
  } catch (error) {
    console.error('[KYCContext] Error fetching tier limits:', error);
  }

  return globalCache.tierLimits || FALLBACK_LIMITS;
}

async function fetchKYCStatusGlobal(address: string, forceRefresh = false): Promise<KYCData | null> {
  const now = Date.now();
  const cached = globalCache.kycStatus[address.toLowerCase()];
  
  if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(`/api/kyc/status/${address}`);
    if (!response.ok) throw new Error('Failed to fetch KYC status');
    
    const data = await response.json();
    
    if (data.success) {
      // Update tier limits if returned by status endpoint
      if (data.tierLimits) {
        globalCache.tierLimits = {
          None: data.tierLimits.None ?? 0,
          Bronze: data.tierLimits.Bronze ?? 0,
          Silver: data.tierLimits.Silver ?? 0,
          Gold: data.tierLimits.Gold ?? 0,
          Diamond: data.tierLimits.Diamond === null ? Infinity : (data.tierLimits.Diamond ?? Infinity),
        };
        globalCache.tierLimitsTimestamp = now;
      }

      // Convert status from lowercase to PascalCase
      const statusMap: Record<string, KYCStatus> = {
        'none': 'None',
        'pending': 'Pending',
        'approved': 'Approved',
        'rejected': 'Rejected',
        'expired': 'Expired',
        'manual_review': 'ManualReview',
        'manualreview': 'ManualReview',
        'auto_verifying': 'AutoVerifying',
        'autoverifying': 'AutoVerifying',
      };

      const rawStatus = (data.status || 'none').toLowerCase();
      const normalizedStatus: KYCStatus = statusMap[rawStatus] || 'None';

      // Handle limit values - API returns null for unlimited (Diamond)
      const limitValue = data.limit === null ? Infinity : (data.limit ?? 0);
      const remainingValue = data.remaining === null ? Infinity : (data.remaining ?? 0);

      const kycData: KYCData = {
        tier: data.tier || 'None',
        tierNumber: data.tierNumber ?? data.kycLevel ?? 0,
        status: normalizedStatus,
        isVerified: data.isVerified ?? false,
        isExpired: data.isExpired ?? false,
        limit: limitValue,
        limitFormatted: data.limitFormatted || formatLimitDisplay(limitValue),
        used: data.used ?? 0,
        remaining: remainingValue,
        remainingFormatted: data.remainingFormatted || formatLimitDisplay(remainingValue),
        expiresAt: data.expiresAt || null,
        canInvest: data.canInvest ?? false,
        canResubmit: data.canResubmit ?? false,
      };

      globalCache.kycStatus[address.toLowerCase()] = {
        data: kycData,
        timestamp: now,
      };

      console.log('[KYCContext] Loaded KYC status:', kycData);

      return kycData;
    }
  } catch (error) {
    console.error('[KYCContext] Error fetching KYC status:', error);
  }

  return null;
}

// ============================================================================
// CONTEXT
// ============================================================================

interface KYCContextValue {
  // Core data
  kycData: KYCData;
  tierLimits: TierLimits;
  allTiers: TierInfo[];
  tierInfo: TierInfo;
  
  // Convenience accessors
  tier: KYCTier;
  tierNumber: number;
  status: KYCStatus;
  isVerified: boolean;
  isLoading: boolean;
  
  // Investment limits
  investmentLimit: number;
  remainingLimit: number;
  usedLimit: number;
  
  // Wallet linking
  generateLinkCode: () => Promise<{ code: string; expiresAt: string } | null>;
  useLinkCode: (code: string, label?: string) => Promise<boolean>;
  linkError: string | null;
  
  // Functions
  refreshKYC: () => Promise<void>;
  canInvest: (amount: number) => { allowed: boolean; reason: string };
  canCreateProject: () => { allowed: boolean; reason: string };
  formatLimit: (value: number) => string;
  getTierInfoByName: (tierName: KYCTier) => TierInfo;
  getTierByContractLevel: (level: number) => KYCTier;
}

const defaultKYCData: KYCData = {
  tier: 'None',
  tierNumber: 0,
  status: 'None',
  isVerified: false,
  isExpired: false,
  limit: 0,
  limitFormatted: '$0',
  used: 0,
  remaining: 0,
  remainingFormatted: '$0',
  expiresAt: null,
  canInvest: false,
  canResubmit: true,
};

const KYCContext = createContext<KYCContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function KYCProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  
  const [kycData, setKycData] = useState<KYCData>(defaultKYCData);
  const [tierLimits, setTierLimits] = useState<TierLimits>(FALLBACK_LIMITS);
  const [isLoading, setIsLoading] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Build all tiers info
  const allTiers = useMemo<TierInfo[]>(() => {
    return KYC_TIERS.map((tier, index) => {
      const limit = tierLimits[tier];
      return getTierInfo(tier, limit);
    });
  }, [tierLimits]);

  // Current tier info
  const tierInfo = useMemo<TierInfo>(() => {
    const info = getTierInfo(kycData.tier, kycData.limit);
    return info;
  }, [kycData.tier, kycData.limit]);

  // Load tier limits on mount
  useEffect(() => {
    fetchTierLimitsGlobal().then(limits => {
      setTierLimits(limits);
    });
  }, []);

  // Load KYC status when address changes
  useEffect(() => {
    if (!address) {
      setKycData(defaultKYCData);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchKYCStatusGlobal(address).then(data => {
      if (data) {
        setKycData(data);
      } else {
        setKycData(defaultKYCData);
      }
      setIsLoading(false);
    });
  }, [address]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      fetchKYCStatusGlobal(address, true).then(data => {
        if (data) setKycData(data);
      });
    }, CACHE_TTL);

    return () => clearInterval(interval);
  }, [address]);

  // Listen for cache invalidation events
  useEffect(() => {
    const handleInvalidate = () => {
      if (address) {
        fetchKYCStatusGlobal(address, true).then(data => {
          if (data) setKycData(data);
        });
      }
    };

    const handleLimitsUpdate = () => {
      fetchTierLimitsGlobal(true).then(setTierLimits);
    };

    window.addEventListener('kyc-cache-invalidate', handleInvalidate);
    window.addEventListener('kyc-limits-updated', handleLimitsUpdate);

    return () => {
      window.removeEventListener('kyc-cache-invalidate', handleInvalidate);
      window.removeEventListener('kyc-limits-updated', handleLimitsUpdate);
    };
  }, [address]);

  // Refresh function
  const refreshKYC = useCallback(async () => {
    if (!address) return;
    
    setIsLoading(true);
    const [limits, status] = await Promise.all([
      fetchTierLimitsGlobal(true),
      fetchKYCStatusGlobal(address, true),
    ]);
    
    setTierLimits(limits);
    if (status) setKycData(status);
    setIsLoading(false);
  }, [address]);

  // Wallet linking: Generate link code
  const generateLinkCode = useCallback(async (): Promise<{ code: string; expiresAt: string } | null> => {
    if (!address) {
      setLinkError('No wallet connected');
      return null;
    }

    setLinkError(null);
    
    try {
      const response = await fetch('/api/kyc/link/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setLinkError(data.error || 'Failed to generate link code');
        return null;
      }

      return {
        code: data.code,
        expiresAt: data.expiresAt,
      };
    } catch (error) {
      console.error('[KYCContext] Error generating link code:', error);
      setLinkError('Network error generating link code');
      return null;
    }
  }, [address]);

  // Wallet linking: Use link code
  const useLinkCode = useCallback(async (code: string, label?: string): Promise<boolean> => {
    if (!address) {
      setLinkError('No wallet connected');
      return false;
    }

    setLinkError(null);

    try {
      const response = await fetch('/api/kyc/link/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: address,
          code: code.toUpperCase(),
          label: label || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setLinkError(data.error || 'Failed to link wallet');
        return false;
      }

      // Refresh KYC status after successful linking
      await refreshKYC();
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('kyc-cache-invalidate'));
      
      return true;
    } catch (error) {
      console.error('[KYCContext] Error using link code:', error);
      setLinkError('Network error linking wallet');
      return false;
    }
  }, [address, refreshKYC]);

  // Can invest check
  const canInvestCheck = useCallback((amount: number): { allowed: boolean; reason: string } => {
    if (!kycData.isVerified) {
      return { allowed: false, reason: 'KYC verification required' };
    }
    if (kycData.isExpired) {
      return { allowed: false, reason: 'KYC verification has expired' };
    }
    if (kycData.tier === 'None') {
      return { allowed: false, reason: 'Complete KYC to invest' };
    }
    if (kycData.tier === 'Diamond') {
      return { allowed: true, reason: 'No limit for Diamond tier' };
    }
    if (amount > kycData.remaining) {
      return { 
        allowed: false, 
        reason: `Amount exceeds remaining limit (${formatLimitDisplay(kycData.remaining)})` 
      };
    }
    return { allowed: true, reason: '' };
  }, [kycData]);

  // Can create project check
  const canCreateProject = useCallback((): { allowed: boolean; reason: string } => {
    if (!kycData.isVerified) {
      return { allowed: false, reason: 'KYC verification required to create projects' };
    }
    if (kycData.tierNumber < 3) { // Gold or Diamond required
      return { allowed: false, reason: 'Gold or Diamond tier required to create projects' };
    }
    return { allowed: true, reason: '' };
  }, [kycData]);

  // Get tier info by name
  const getTierInfoByName = useCallback((tierName: KYCTier): TierInfo => {
    const limit = tierLimits[tierName];
    return getTierInfo(tierName, limit);
  }, [tierLimits]);

  // Get tier by contract level
  const getTierByContractLevel = useCallback((level: number): KYCTier => {
    return CONTRACT_LEVEL_TO_TIER[level] || 'None';
  }, []);

  const value: KYCContextValue = {
    kycData,
    tierLimits,
    allTiers,
    tierInfo,
    
    tier: kycData.tier,
    tierNumber: kycData.tierNumber,
    status: kycData.status,
    isVerified: kycData.isVerified,
    isLoading,
    
    investmentLimit: kycData.limit,
    remainingLimit: kycData.remaining,
    usedLimit: kycData.used,
    
    generateLinkCode,
    useLinkCode,
    linkError,
    
    refreshKYC,
    canInvest: canInvestCheck,
    canCreateProject,
    formatLimit: formatLimitDisplay,
    getTierInfoByName,
    getTierByContractLevel,
  };

  return (
    <KYCContext.Provider value={value}>
      {children}
    </KYCContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useKYC(): KYCContextValue {
  const context = useContext(KYCContext);
  if (!context) {
    throw new Error('useKYC must be used within a KYCProvider');
  }
  return context;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { formatLimitDisplay as formatLimit };
export const getTierByContractLevel = (level: number): KYCTier => CONTRACT_LEVEL_TO_TIER[level] || 'None';
