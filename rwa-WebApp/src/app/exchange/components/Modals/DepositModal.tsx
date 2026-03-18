'use client';

import { useState, useEffect, useCallback } from 'react';
import { DepositAddress } from '../../types';
import { copyToClipboard } from '../../utils';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  chainId: number;
  chainName: string;
  isTestnet: boolean;
  nativeCurrency: string;
  usdtAvailable: boolean;
  usdcAvailable: boolean;
}

export function DepositModal({
  isOpen,
  onClose,
  chainId,
  chainName,
  isTestnet,
  nativeCurrency,
  usdtAvailable,
  usdcAvailable,
}: DepositModalProps) {
  const [depositToken, setDepositToken] = useState<'native' | 'USDT' | 'USDC'>('native');
  const [depositAddress, setDepositAddress] = useState<DepositAddress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDepositCoin = useCallback(() => {
    if (depositToken === 'native') {
      const native = nativeCurrency || 'POL';
      return native === 'MATIC' ? 'POL' : native;
    }
    return depositToken;
  }, [depositToken, nativeCurrency]);

  const fetchDepositAddress = useCallback(async () => {
    if (isTestnet) {
      setError('Deposits only available on mainnet');
      return;
    }
    
    if (!chainId) return;

    setIsLoading(true);
    setError(null);
    setDepositAddress(null);

    try {
      const coin = getDepositCoin();
      const response = await fetch(`/api/exchange/mexc/deposit-address?coin=${coin}&chainId=${chainId}`);
      const data = await response.json();

      if (response.ok && data.address) {
        setDepositAddress(data);
      } else {
        setError(data.error || 'Failed to get deposit address');
      }
    } catch (err) {
      console.error('Error fetching deposit address:', err);
      setError('Failed to fetch deposit address');
    } finally {
      setIsLoading(false);
    }
  }, [chainId, getDepositCoin, isTestnet]);

  useEffect(() => {
    if (isOpen) {
      fetchDepositAddress();
    }
  }, [isOpen, depositToken, fetchDepositAddress]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Deposit Funds</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Testnet Warning */}
        {isTestnet && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-400">
              ⚠️ You&apos;re on a testnet. MEXC deposits are only available on mainnet networks.
            </p>
          </div>
        )}

        {/* Token Selection */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Select Token</label>
          <div className="flex gap-2">
            <button
              onClick={() => setDepositToken('native')}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                depositToken === 'native' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {nativeCurrency || 'NATIVE'}
            </button>
            {usdtAvailable && (
              <button
                onClick={() => setDepositToken('USDT')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  depositToken === 'USDT' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                USDT
              </button>
            )}
            {usdcAvailable && (
              <button
                onClick={() => setDepositToken('USDC')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  depositToken === 'USDC' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                USDC
              </button>
            )}
          </div>
        </div>

        {/* Deposit Address Display */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">
            Deposit Address ({getDepositCoin()})
          </label>

          {isLoading ? (
            <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
              <span className="text-gray-400">Loading address...</span>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={fetchDepositAddress} className="mt-2 text-sm text-blue-400 hover:text-blue-300">
                Try again
              </button>
            </div>
          ) : depositAddress ? (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <code className="text-sm text-green-400 break-all flex-1">{depositAddress.address}</code>
                <button
                  onClick={() => copyToClipboard(depositAddress.address)}
                  className="text-blue-400 hover:text-blue-300 text-sm whitespace-nowrap"
                >
                  Copy
                </button>
              </div>

              {(depositAddress.memo || depositAddress.tag) && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="text-sm text-yellow-400 mb-1">⚠️ Memo/Tag Required:</div>
                  <div className="flex items-center justify-between">
                    <code className="text-sm text-yellow-300">{depositAddress.memo || depositAddress.tag}</code>
                    <button
                      onClick={() => copyToClipboard(depositAddress.memo || depositAddress.tag || '')}
                      className="ml-2 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3 text-xs text-gray-500">Network: {depositAddress.network}</div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">No deposit address available</p>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-yellow-400">
            ⚠️ Only send <strong>{getDepositCoin()}</strong> on the <strong>{chainName}</strong> network.
            Sending other tokens or using the wrong network may result in permanent loss.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
