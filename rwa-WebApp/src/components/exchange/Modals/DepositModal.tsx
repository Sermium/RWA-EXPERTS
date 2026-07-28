'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle } from 'lucide-react';
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
      <div className="bg-surface-sunken rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Deposit Funds</h3>
          <button onClick={onClose} className="text-ink-muted hover:text-ink"><X className="w-5 h-5" /></button>
        </div>

        {/* Testnet Warning */}
        {isTestnet && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-sm text-warning">
              You&apos;re on a testnet. MEXC deposits are only available on mainnet networks.
            </p>
          </div>
        )}

        {/* Token Selection */}
        <div className="mb-4">
          <label className="block text-sm text-ink-muted mb-2">Select Token</label>
          <div className="flex gap-2">
            <button
              onClick={() => setDepositToken('native')}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                depositToken === 'native' ? 'bg-gold-500 text-ink' : 'bg-surface text-ink-muted'
              }`}
            >
              {nativeCurrency || 'NATIVE'}
            </button>
            {usdtAvailable && (
              <button
                onClick={() => setDepositToken('USDT')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  depositToken === 'USDT' ? 'bg-gold-500 text-ink' : 'bg-surface text-ink-muted'
                }`}
              >
                USDT
              </button>
            )}
            {usdcAvailable && (
              <button
                onClick={() => setDepositToken('USDC')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  depositToken === 'USDC' ? 'bg-gold-500 text-ink' : 'bg-surface text-ink-muted'
                }`}
              >
                USDC
              </button>
            )}
          </div>
        </div>

        {/* Deposit Address Display */}
        <div className="mb-6">
          <label className="block text-sm text-ink-muted mb-2">
            Deposit Address ({getDepositCoin()})
          </label>

          {isLoading ? (
            <div className="bg-surface rounded-lg p-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gold-500 mr-2"></div>
              <span className="text-ink-muted">Loading address...</span>
            </div>
          ) : error ? (
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-4">
              <p className="text-sm text-danger">{error}</p>
              <button onClick={fetchDepositAddress} className="mt-2 text-sm text-gold-400 hover:text-gold-300">
                Try again
              </button>
            </div>
          ) : depositAddress ? (
            <div className="bg-surface rounded-lg p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <code className="text-sm text-success break-all flex-1">{depositAddress.address}</code>
                <button
                  onClick={() => copyToClipboard(depositAddress.address)}
                  className="text-gold-400 hover:text-gold-300 text-sm whitespace-nowrap"
                >
                  Copy
                </button>
              </div>

              {(depositAddress.memo || depositAddress.tag) && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-sm text-warning mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Memo/Tag Required:
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="text-sm text-warning">{depositAddress.memo || depositAddress.tag}</code>
                    <button
                      onClick={() => copyToClipboard(depositAddress.memo || depositAddress.tag || '')}
                      className="ml-2 text-gold-400 hover:text-gold-300 text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3 text-xs text-ink-faint">Network: {depositAddress.network}</div>
            </div>
          ) : (
            <div className="bg-surface rounded-lg p-4 text-center">
              <p className="text-ink-muted text-sm">No deposit address available</p>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-sm text-warning">
            Only send <strong>{getDepositCoin()}</strong> on the <strong>{chainName}</strong> network.
            Sending other tokens or using the wrong network may result in permanent loss.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-surface-overlay hover:bg-border-strong rounded-lg font-medium transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
