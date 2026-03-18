'use client';

import { useState, useEffect } from 'react';
import { useChainConfig } from './useChainConfig';
import { EXCHANGE_CONFIG } from '@/config/exchange';

interface FeeRecipientData {
  feeRecipient: string;
  isLoading: boolean;
  error: string | null;
}

export function useFeeRecipient(): FeeRecipientData {
  const { chainId } = useChainConfig();
  const [data, setData] = useState<FeeRecipientData>({
    feeRecipient: EXCHANGE_CONFIG.PLATFORM_WALLET || '',
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchFeeRecipient = async () => {
      if (!chainId) {
        setData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const response = await fetch(`/api/admin/settings/fee?chainId=${chainId}`);
        const result = await response.json();

        if (result.success && result.feeRecipient && result.feeRecipient !== '0x0000000000000000000000000000000000000000') {
          setData({
            feeRecipient: result.feeRecipient,
            isLoading: false,
            error: null,
          });
        } else {
          // Fallback to platform wallet from config
          setData({
            feeRecipient: EXCHANGE_CONFIG.PLATFORM_WALLET || '',
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Error fetching fee recipient:', error);
        // Fallback to platform wallet
        setData({
          feeRecipient: EXCHANGE_CONFIG.PLATFORM_WALLET || '',
          isLoading: false,
          error: 'Failed to fetch fee recipient',
        });
      }
    };

    fetchFeeRecipient();
  }, [chainId]);

  return data;
}
