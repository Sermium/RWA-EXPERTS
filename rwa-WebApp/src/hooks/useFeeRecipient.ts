// src/hooks/useFeeRecipient.ts
'use client';

import { useState, useEffect } from 'react';
import { useChainConfig } from './useChainConfig';
import { getPlatformWallets } from '@/config/deployments';

interface FeeRecipientData {
  feeRecipient: string;
  tokenizationFeeRecipient: string;
  crowdfundingFeeRecipient: string;
  liquidityWallet: string;
  treasuryWallet: string;
  isLoading: boolean;
  error: string | null;
}

export function useFeeRecipient(): FeeRecipientData {
  const { chainId } = useChainConfig();
  const [data, setData] = useState<FeeRecipientData>({
    feeRecipient: '',
    tokenizationFeeRecipient: '',
    crowdfundingFeeRecipient: '',
    liquidityWallet: '',
    treasuryWallet: '',
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const loadFeeRecipients = async () => {
      try {
        // Get platform wallets from deployments config
        const wallets = getPlatformWallets(chainId);
        
        console.log('=== FEE RECIPIENT DEBUG ===');
        console.log('Chain ID:', chainId);
        console.log('Fee Receiver:', wallets.feeReceiver);
        console.log('Liquidity Wallet:', wallets.liquidityWallet);
        console.log('Treasury Wallet:', wallets.treasuryWallet);

        // Try to fetch chain-specific overrides from API
        let apiOverrides: any = null;
        try {
          const response = await fetch(`/api/config/fee-recipient?chainId=${chainId}`);
          if (response.ok) {
            apiOverrides = await response.json();
            console.log('API overrides:', apiOverrides);
          }
        } catch (err) {
          console.log('No API overrides available');
        }

        const isValidAddress = (addr: string | null | undefined): boolean => {
          return !!addr && 
                 addr !== '0x0000000000000000000000000000000000000000' &&
                 addr.startsWith('0x') &&
                 addr.length === 42;
        };

        // Use API overrides if valid, otherwise use config values
        const feeReceiver = isValidAddress(apiOverrides?.feeRecipient) 
          ? apiOverrides.feeRecipient 
          : wallets.feeReceiver;

        setData({
          feeRecipient: feeReceiver,
          tokenizationFeeRecipient: isValidAddress(apiOverrides?.tokenizationFeeRecipient) 
            ? apiOverrides.tokenizationFeeRecipient 
            : feeReceiver,
          crowdfundingFeeRecipient: isValidAddress(apiOverrides?.crowdfundingFeeRecipient) 
            ? apiOverrides.crowdfundingFeeRecipient 
            : feeReceiver,
          liquidityWallet: wallets.liquidityWallet,
          treasuryWallet: wallets.treasuryWallet,
          isLoading: false,
          error: null,
        });

      } catch (error) {
        console.error('Error loading fee recipients:', error);
        
        // Even on error, try to use default wallets
        const wallets = getPlatformWallets(chainId);
        setData({
          feeRecipient: wallets.feeReceiver,
          tokenizationFeeRecipient: wallets.feeReceiver,
          crowdfundingFeeRecipient: wallets.feeReceiver,
          liquidityWallet: wallets.liquidityWallet,
          treasuryWallet: wallets.treasuryWallet,
          isLoading: false,
          error: 'Failed to load overrides, using defaults',
        });
      }
    };

    if (chainId) {
      loadFeeRecipients();
    }
  }, [chainId]);

  return data;
}
