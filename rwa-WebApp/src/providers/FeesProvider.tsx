// src/providers/FeesProvider.tsx

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  initializeFeesFromDB, 
  PlatformFeesType,
  ChainFees
} from '@/config/deployments';

import { getPlatformFees, getChainFees } from "@/lib/feesService";

interface PricesData {
  AVAX: number;
  ETH: number;
  POL: number;
  BNB: number;
  CRO: number;
}

interface FeesContextType {
  initialized: boolean;
  platformFees: PlatformFeesType;
  getChainFees: (chainId: number) => ChainFees;
  getChainFeesWithUsd: (chainId: number) => ChainFees & { KYC_FEE_USD: number; CREATION_FEE_USD: number };
  prices: PricesData;
  refreshPrices: () => Promise<void>;
}

const FeesContext = createContext<FeesContextType | null>(null);

const DEFAULT_PRICES: PricesData = {
  AVAX: 35,
  ETH: 3500,
  POL: 0.5,
  BNB: 600,
  CRO: 0.10,
};

const CHAIN_SYMBOLS: Record<number, keyof PricesData> = {
  43113: 'AVAX',
  43114: 'AVAX',
  80002: 'POL',
  137: 'POL',
  1: 'ETH',
  11155111: 'ETH',
  42161: 'ETH',
  8453: 'ETH',
  10: 'ETH',
  56: 'BNB',
  97: 'BNB',
  25: 'CRO',
  338: 'CRO',
};

export function FeesProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [prices, setPrices] = useState<PricesData>(DEFAULT_PRICES);

  useEffect(() => {
    const init = async () => {
      await initializeFeesFromDB();
      setInitialized(true);
      
      // Fetch prices
      try {
        const res = await fetch('/api/prices');
        if (res.ok) {
          const data = await res.json();
          if (data.prices) {
            setPrices(data.prices);
          }
        }
      } catch (e) {
        console.warn('[FeesProvider] Failed to fetch prices');
      }
    };

    init();
  }, []);

  const refreshPrices = async () => {
    try {
      const res = await fetch('/api/prices');
      if (res.ok) {
        const data = await res.json();
        if (data.prices) {
          setPrices(data.prices);
        }
      }
    } catch (e) {
      console.warn('[FeesProvider] Failed to refresh prices');
    }
  };

  const getChainFeesWithUsd = (chainId: number) => {
    const fees = getChainFees(chainId);
    const symbol = CHAIN_SYMBOLS[chainId] || 'ETH';
    const price = prices[symbol];

    return {
      ...fees,
      KYC_FEE_USD: parseFloat(fees.KYC_FEE_FORMATTED) * price,
      CREATION_FEE_USD: parseFloat(fees.CREATION_FEE_FORMATTED) * price,
    };
  };

  return (
    <FeesContext.Provider
      value={{
        initialized,
        platformFees: getPlatformFees(),
        getChainFees,
        getChainFeesWithUsd,
        prices,
        refreshPrices,
      }}
    >
      {children}
    </FeesContext.Provider>
  );
}

export function useFees() {
  const context = useContext(FeesContext);
  if (!context) {
    throw new Error('useFees must be used within a FeesProvider');
  }
  return context;
}
