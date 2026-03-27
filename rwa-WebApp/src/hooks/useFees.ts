// src/hooks/useFees.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getPlatformFees,
  initializeFees,
  refreshFees,
  setChainFees,
  setPlatformFees,
  subscribeToFees,
  getFeesStatus,
  isChainFeesFromDB,
  ChainFees,
  PlatformFees,
} from '@/config/deployments';
import { getChainFees } from "@/lib/feesService";

/**
 * Hook to use fees in React components
 * Automatically initializes and subscribes to updates
 */
export function useFees() {
  const [, forceUpdate] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState(getFeesStatus());

  // Subscribe to fee updates
  useEffect(() => {
    const unsubscribe = subscribeToFees(() => {
      forceUpdate({});
      setStatus(getFeesStatus());
    });

    return unsubscribe;
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeFees().finally(() => {
      setIsLoading(false);
      setStatus(getFeesStatus());
    });
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await refreshFees();
    setIsLoading(false);
    setStatus(getFeesStatus());
  }, []);

  const updateChainFees = useCallback(async (chainId: number, fees: ChainFees): Promise<boolean> => {
    try {
      const response = await fetch('/api/config/fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'chain', chainId, fees }),
      });

      if (response.ok) {
        setChainFees(chainId, fees);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const updatePlatformFees = useCallback(async (fees: Partial<PlatformFees>): Promise<boolean> => {
    try {
      const currentFees = getPlatformFees();
      const newFees = { ...currentFees, ...fees };

      const response = await fetch('/api/config/fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'platform', fees: newFees }),
      });

      if (response.ok) {
        setPlatformFees(fees);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return {
    // Getters (always return current values)
    getChainFees,
    getPlatformFees,
    isChainFeesFromDB,

    // State
    isLoading,
    isInitialized: status.initialized,
    status,

    // Actions
    refresh,
    updateChainFees,
    updatePlatformFees,
  };
}

/**
 * Hook for a specific chain's fees
 */
export function useChainFees(chainId: number) {
  const { getChainFees, isLoading, isInitialized } = useFees();
  const [fees, setFees] = useState<ChainFees>(getChainFees(chainId));

  useEffect(() => {
    const unsubscribe = subscribeToFees(() => {
      setFees(getChainFees(chainId));
    });
    return unsubscribe;
  }, [chainId, getChainFees]);

  useEffect(() => {
    setFees(getChainFees(chainId));
  }, [chainId, isInitialized, getChainFees]);

  return { fees, isLoading };
}

/**
 * Hook for platform fees
 */
export function usePlatformFees() {
  const { getPlatformFees, isLoading, isInitialized } = useFees();
  const [fees, setFees] = useState<PlatformFees>(getPlatformFees());

  useEffect(() => {
    const unsubscribe = subscribeToFees(() => {
      setFees(getPlatformFees());
    });
    return unsubscribe;
  }, [getPlatformFees]);

  useEffect(() => {
    setFees(getPlatformFees());
  }, [isInitialized, getPlatformFees]);

  return { fees, isLoading };
}
