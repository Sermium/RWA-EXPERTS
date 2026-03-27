// src/hooks/useKYCLimits.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

export interface TierLimits {
  None: number;
  Bronze: number;
  Silver: number;
  Gold: number;
  Diamond: number;
}

interface UserLimits {
  tier: string;
  limit: number;
  used: number;
  remaining: number;
}

// Fallback limits if API fails
const FALLBACK_LIMITS: TierLimits = {
  None: 0,
  Bronze: 20000,
  Silver: 200000,
  Gold: 2000000,
  Diamond: Infinity,
};

async function fetchTierLimits(): Promise<TierLimits> {
  try {
    const response = await fetch('/api/kyc/limits');
    if (!response.ok) return FALLBACK_LIMITS;
    
    const data = await response.json();
    if (data.success && data.limits) {
      return {
        None: data.limits.None ?? 0,
        Bronze: data.limits.Bronze ?? 0,
        Silver: data.limits.Silver ?? 0,
        Gold: data.limits.Gold ?? 0,
        Diamond: data.limits.Diamond === null ? Infinity : (data.limits.Diamond ?? Infinity),
      };
    }
  } catch (error) {
    console.error('[useKYCLimits] Failed to fetch tier limits:', error);
  }
  return FALLBACK_LIMITS;
}

async function fetchUserLimits(address: string): Promise<UserLimits | null> {
  try {
    const response = await fetch(`/api/kyc/status/${address}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.success) {
      return {
        tier: data.tier || 'None',
        limit: data.limit ?? 0,
        used: data.used ?? 0,
        remaining: data.remaining ?? 0,
      };
    }
  } catch (error) {
    console.error('[useKYCLimits] Failed to fetch user limits:', error);
  }
  return null;
}

export function useKYCLimits() {
  const { address } = useAccount();
  const [tierLimits, setTierLimits] = useState<TierLimits | null>(null);
  const [userLimits, setUserLimits] = useState<UserLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLimits() {
      setLoading(true);
      try {
        const limits = await fetchTierLimits();
        setTierLimits(limits);

        if (address) {
          const user = await fetchUserLimits(address);
          setUserLimits(user);
        }
      } catch (error) {
        console.error('[useKYCLimits] Failed to fetch limits:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLimits();
  }, [address]);

  const refetch = useCallback(async () => {
    if (address) {
      const [limits, user] = await Promise.all([
        fetchTierLimits(),
        fetchUserLimits(address),
      ]);
      setTierLimits(limits);
      setUserLimits(user);
    }
  }, [address]);

  return { tierLimits, userLimits, loading, refetch };
}
