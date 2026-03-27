// src/components/FeesInitializer.tsx
'use client';

import { useEffect } from 'react';
import { useChainId } from 'wagmi';
import { initializeFees, getFeesStatus, getChainFees } from '@/lib/feesService';

export function FeesInitializer({ children }: { children: React.ReactNode }) {
  const chainId = useChainId();

  useEffect(() => {
    const init = async () => {
      console.log('[FeesInitializer] Initializing fees...');
      await initializeFees();
      
      const status = getFeesStatus();
      console.log('[FeesInitializer] Status:', status);
      
      if (chainId) {
        const fees = getChainFees(chainId);
        console.log(`[FeesInitializer] Active chain ${chainId} fees:`, fees);
      }
    };
    
    init();
  }, [chainId]);

  return <>{children}</>;
}
