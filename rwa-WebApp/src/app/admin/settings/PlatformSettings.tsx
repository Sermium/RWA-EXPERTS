// src/app/admin/components/PlatformSettings.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Coins, Lock, Banknote, Ticket,
  CheckCircle2, XCircle, X, Globe, Pencil, BarChart3, Link2, RefreshCw, Radio, ClipboardList
} from 'lucide-react';
import { PLATFORM_FEES, DEPLOYMENTS } from '@/config/deployments';
import { getChainFees } from '@/lib/feesService'
import { SupportedChainId } from '@/config/chains';
import { getNativeTokenPrice, getNativeSymbol, getNativeDecimals } from '@/lib/priceService';
import { formatUnits, parseUnits } from 'viem';

interface PlatformFeesDisplay {
  crowdfunding_submission_fee: number;
  tokenization_submission_fee: number;
  escrow_transaction_fee_bps: number;
  crowdfunding_platform_usdt_fee_bps: number;
  crowdfunding_platform_token_fee_bps: number;
}

interface ChainFeesDisplay {
  chainId: number;
  chainName: string;
  symbol: string;
  decimals: number;
  kyc_fee: string; // Raw value in wei
  kyc_fee_formatted: string; // Human readable (e.g., "0.01 AVAX")
  kyc_fee_usd: number;
  creation_fee: string; // Raw value in wei
  creation_fee_formatted: string; // Human readable
  creation_fee_usd: number;
  nativePrice: number;
}

interface EditingChainFees {
  chainId: number;
  kyc_fee: string; // Human readable number as string
  creation_fee: string; // Human readable number as string
}

const CHAIN_NAMES: Record<number, string> = {
  43113: 'Avalanche Fuji',
  43114: 'Avalanche Mainnet',
  80002: 'Polygon Amoy',
  137: 'Polygon Mainnet',
  1: 'Ethereum Mainnet',
  11155111: 'Sepolia',
  42161: 'Arbitrum One',
  8453: 'Base',
  10: 'Optimism',
  56: 'BNB Chain',
  97: 'BNB Testnet',
  25: 'Cronos Mainnet',
  338: 'Cronos Testnet',
};

export default function PlatformSettings() {
  const [loading, setLoading] = useState(true);
  const [chainFeesList, setChainFeesList] = useState<ChainFeesDisplay[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit state
  const [editingPlatformFees, setEditingPlatformFees] = useState(false);
  const [editingChain, setEditingChain] = useState<EditingChainFees | null>(null);
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [savingChain, setSavingChain] = useState(false);

  // Editable platform fees state
  const [editablePlatformFees, setEditablePlatformFees] = useState<PlatformFeesDisplay>({
    crowdfunding_submission_fee: PLATFORM_FEES.CROWDFUNDING_SUBMISSION_FEE,
    tokenization_submission_fee: PLATFORM_FEES.TOKENIZATION_SUBMISSION_FEE,
    escrow_transaction_fee_bps: PLATFORM_FEES.ESCROW_TRANSACTION_FEE_BPS,
    crowdfunding_platform_usdt_fee_bps: PLATFORM_FEES.CROWDFUNDING_PLATFORM_USDT_FEE_BPS,
    crowdfunding_platform_token_fee_bps: PLATFORM_FEES.CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS,
  });

  // Platform fees display (from DB or config)
  const [platformFees, setPlatformFees] = useState<PlatformFeesDisplay>({
    crowdfunding_submission_fee: PLATFORM_FEES.CROWDFUNDING_SUBMISSION_FEE,
    tokenization_submission_fee: PLATFORM_FEES.TOKENIZATION_SUBMISSION_FEE,
    escrow_transaction_fee_bps: PLATFORM_FEES.ESCROW_TRANSACTION_FEE_BPS,
    crowdfunding_platform_usdt_fee_bps: PLATFORM_FEES.CROWDFUNDING_PLATFORM_USDT_FEE_BPS,
    crowdfunding_platform_token_fee_bps: PLATFORM_FEES.CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS,
  });

  // Fetch platform fees from DB
  const loadPlatformFees = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings/fee');
      if (response.ok) {
        const data = await response.json();
        if (data.platformFees) {
          const dbFees: PlatformFeesDisplay = {
            crowdfunding_submission_fee:
              data.platformFees.CROWDFUNDING_SUBMISSION_FEE ??
              PLATFORM_FEES.CROWDFUNDING_SUBMISSION_FEE,
            tokenization_submission_fee:
              data.platformFees.TOKENIZATION_SUBMISSION_FEE ??
              PLATFORM_FEES.TOKENIZATION_SUBMISSION_FEE,
            escrow_transaction_fee_bps:
              data.platformFees.ESCROW_TRANSACTION_FEE_BPS ??
              PLATFORM_FEES.ESCROW_TRANSACTION_FEE_BPS,
            crowdfunding_platform_usdt_fee_bps:
              data.platformFees.CROWDFUNDING_PLATFORM_USDT_FEE_BPS ??
              PLATFORM_FEES.CROWDFUNDING_PLATFORM_USDT_FEE_BPS,
            crowdfunding_platform_token_fee_bps:
              data.platformFees.CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS ??
              PLATFORM_FEES.CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS,
          };
          setPlatformFees(dbFees);
          setEditablePlatformFees(dbFees);
        }
      }
    } catch (error) {
      console.error('Failed to load platform fees from DB:', error);
    }
  }, []);

  // Fetch chain fees with real-time USD prices
  const loadChainFeesWithPrices = useCallback(async () => {
    setPricesLoading(true);
    try {
      const chainIds = Object.keys(DEPLOYMENTS).map((id) => parseInt(id) as SupportedChainId);

      const results = await Promise.all(
        chainIds.map(async (chainId) => {
          const fees = getChainFees(chainId);
          const symbol = getNativeSymbol(chainId);
          const decimals = getNativeDecimals(chainId);

          let nativePrice = 0;
          try {
            nativePrice = await getNativeTokenPrice(chainId);
          } catch (error) {
            console.warn(`Failed to fetch price for chain ${chainId}:`, error);
          }

          // Parse from wei to human readable
          const kycFeeFormatted = formatUnits(BigInt(fees.KYC_FEE || '0'), decimals);
          const creationFeeFormatted = formatUnits(BigInt(fees.CREATION_FEE || '0'), decimals);

          // Calculate USD values
          const kycFeeUsd = parseFloat(kycFeeFormatted) * nativePrice;
          const creationFeeUsd = parseFloat(creationFeeFormatted) * nativePrice;

          return {
            chainId,
            chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
            symbol,
            decimals,
            kyc_fee: fees.KYC_FEE,
            kyc_fee_formatted: kycFeeFormatted,
            kyc_fee_usd: kycFeeUsd,
            creation_fee: fees.CREATION_FEE,
            creation_fee_formatted: creationFeeFormatted,
            creation_fee_usd: creationFeeUsd,
            nativePrice,
          };
        })
      );

      setChainFeesList(results);
      setLastPriceUpdate(new Date());
    } catch (error) {
      console.error('Failed to load chain fees:', error);
      setMessage({ type: 'error', text: 'Failed to load real-time prices' });
    } finally {
      setPricesLoading(false);
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadPlatformFees();
    loadChainFeesWithPrices();
  }, [loadPlatformFees, loadChainFeesWithPrices]);

  // Auto-refresh prices every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadChainFeesWithPrices();
    }, 60_000);

    return () => clearInterval(interval);
  }, [loadChainFeesWithPrices]);

  const handleRefreshPrices = () => {
    loadChainFeesWithPrices();
  };

  // Save platform fees to DB
  const handleSavePlatformFees = async () => {
    setSavingPlatform(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/settings/fee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'platform',
          fees: {
            CROWDFUNDING_SUBMISSION_FEE: editablePlatformFees.crowdfunding_submission_fee,
            TOKENIZATION_SUBMISSION_FEE: editablePlatformFees.tokenization_submission_fee,
            ESCROW_TRANSACTION_FEE_BPS: editablePlatformFees.escrow_transaction_fee_bps,
            CROWDFUNDING_PLATFORM_USDT_FEE_BPS: editablePlatformFees.crowdfunding_platform_usdt_fee_bps,
            CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS: editablePlatformFees.crowdfunding_platform_token_fee_bps,
          },
        }),
      });

      if (response.ok) {
        setPlatformFees(editablePlatformFees);
        setEditingPlatformFees(false);
        setMessage({ type: 'success', text: 'Platform fees updated successfully' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to update platform fees' });
      }
    } catch (error) {
      console.error('Failed to save platform fees:', error);
      setMessage({ type: 'error', text: 'Failed to save platform fees' });
    } finally {
      setSavingPlatform(false);
    }
  };

  // Start editing chain fees
  const handleEditChain = (chain: ChainFeesDisplay) => {
    setEditingChain({
      chainId: chain.chainId,
      kyc_fee: chain.kyc_fee_formatted,
      creation_fee: chain.creation_fee_formatted,
    });
  };

  // Save chain fees to DB
  const handleSaveChainFees = async () => {
    if (!editingChain) return;

    setSavingChain(true);
    setMessage(null);

    try {
      const chain = chainFeesList.find((c) => c.chainId === editingChain.chainId);
      if (!chain) throw new Error('Chain not found');

      // Convert human readable to wei
      const kycFeeWei = parseUnits(editingChain.kyc_fee, chain.decimals).toString();
      const creationFeeWei = parseUnits(editingChain.creation_fee, chain.decimals).toString();

      const response = await fetch('/api/admin/settings/fee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chain',
          chainId: editingChain.chainId,
          fees: {
            KYC_FEE: kycFeeWei,
            KYC_FEE_FORMATTED: `${editingChain.kyc_fee} ${chain.symbol}`,
            CREATION_FEE: creationFeeWei,
            CREATION_FEE_FORMATTED: `${editingChain.creation_fee} ${chain.symbol}`,
          },
        }),
      });

      if (response.ok) {
        // Update local state
        setChainFeesList((prev) =>
          prev.map((c) =>
            c.chainId === editingChain.chainId
              ? {
                  ...c,
                  kyc_fee: kycFeeWei,
                  kyc_fee_formatted: editingChain.kyc_fee,
                  kyc_fee_usd: parseFloat(editingChain.kyc_fee) * c.nativePrice,
                  creation_fee: creationFeeWei,
                  creation_fee_formatted: editingChain.creation_fee,
                  creation_fee_usd: parseFloat(editingChain.creation_fee) * c.nativePrice,
                }
              : c
          )
        );
        setEditingChain(null);
        setMessage({ type: 'success', text: `Chain ${editingChain.chainId} fees updated successfully` });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to update chain fees' });
      }
    } catch (error) {
      console.error('Failed to save chain fees:', error);
      setMessage({ type: 'error', text: 'Failed to save chain fees' });
    } finally {
      setSavingChain(false);
    }
  };

  const handleCancelPlatformEdit = () => {
    setEditablePlatformFees(platformFees);
    setEditingPlatformFees(false);
  };

  const handleCancelChainEdit = () => {
    setEditingChain(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-ink">Platform Settings</h2>
        <div className="bg-surface rounded-xl p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-ink-muted">Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  const platformFeeConfig = [
    {
      key: 'crowdfunding_submission_fee' as const,
      label: 'Crowdfunding Submission Fee',
      suffix: 'USD',
      icon: DollarSign,
      description: 'Fee to submit a crowdfunding application',
      color: 'from-success/10 to-success/10',
      isBps: false,
    },
    {
      key: 'tokenization_submission_fee' as const,
      label: 'Tokenization Submission Fee',
      suffix: 'USD',
      icon: Coins,
      description: 'Fee to submit a tokenization application',
      color: 'from-gold-500/10 to-gold/10',
      isBps: false,
    },
    {
      key: 'escrow_transaction_fee_bps' as const,
      label: 'Escrow Transaction Fee',
      suffix: 'BPS',
      icon: Lock,
      description: 'Fee on escrow transactions (100 BPS = 1%)',
      color: 'from-gold-500/10 to-gold/10',
      isBps: true,
    },
    {
      key: 'crowdfunding_platform_usdt_fee_bps' as const,
      label: 'Crowdfunding USDT Fee',
      suffix: 'BPS',
      icon: Banknote,
      description: 'Platform fee on raised USDT (100 BPS = 1%)',
      color: 'from-warning/10 to-orange-500/10',
      isBps: true,
    },
    {
      key: 'crowdfunding_platform_token_fee_bps' as const,
      label: 'Crowdfunding Token Fee',
      suffix: 'BPS',
      icon: Ticket,
      description: 'Platform fee on project tokens (100 BPS = 1%)',
      color: 'from-danger/10 to-rose-500/10',
      isBps: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink">Platform Settings</h2>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-success-muted text-success border border-success/30'
              : 'bg-danger-muted text-danger border border-danger/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {message.text}
          </div>
          <button onClick={() => setMessage(null)} className="text-ink-muted hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Platform-Wide Fees Section */}
      <div className="bg-surface/50 rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
            <Globe className="w-4 h-4" /> Platform-Wide Fees
            <span className="text-xs text-ink-faint font-normal">(Same across all chains)</span>
          </h3>
          {!editingPlatformFees ? (
            <button
              onClick={() => setEditingPlatformFees(true)}
              className="px-4 py-2 bg-gold-600 hover:bg-gold-700 rounded-lg text-sm text-ink transition-colors flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit Fees
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancelPlatformEdit}
                className="px-4 py-2 bg-surface-overlay hover:bg-surface-raised rounded-lg text-sm text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlatformFees}
                disabled={savingPlatform}
                className="px-4 py-2 bg-success hover:bg-success rounded-lg text-sm text-ink transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingPlatform && (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                Save Changes
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platformFeeConfig.map(({ key, label, suffix, icon, description, color, isBps }) => (
            <div key={key} className="bg-surface rounded-xl overflow-hidden border border-border">
              <div className={`px-6 py-4 bg-gradient-to-r ${color}`}>
                <div className="flex items-center gap-3">
                  {(() => { const Icon = icon; return <Icon className="w-6 h-6 text-ink" />; })()}
                  <div>
                    <h4 className="text-ink font-semibold text-sm">{label}</h4>
                    <p className="text-ink-muted text-xs">{description}</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {editingPlatformFees ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editablePlatformFees[key]}
                      onChange={(e) =>
                        setEditablePlatformFees((prev) => ({
                          ...prev,
                          [key]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full bg-surface-raised border border-border-strong rounded-lg px-3 py-2 text-ink text-xl font-bold focus:outline-none focus:border-gold-500"
                    />
                    <span className="text-ink-muted text-lg whitespace-nowrap">
                      {suffix === 'USD' ? 'USD' : 'BPS'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-ink">
                      {suffix === 'USD' ? '$' : ''}
                      {isBps ? platformFees[key] / 100 : platformFees[key]}
                    </span>
                    <span className="text-ink-muted text-lg">
                      {suffix === 'USD' ? '' : '%'}
                    </span>
                    {isBps && (
                      <span className="text-xs text-ink-faint ml-2">({platformFees[key]} BPS)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fee Distribution Section */}
      <div className="bg-surface/50 rounded-xl p-6 border border-border">
        <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Fee Distribution (BPS)
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface rounded-lg p-4 border border-border">
            <p className="text-ink-muted text-sm">Fee Receiver</p>
            <p className="text-2xl font-bold text-ink">{PLATFORM_FEES.FEE_RECEIVER_BPS / 100}%</p>
            <p className="text-xs text-ink-faint">{PLATFORM_FEES.FEE_RECEIVER_BPS} BPS</p>
          </div>
          <div className="bg-surface rounded-lg p-4 border border-border">
            <p className="text-ink-muted text-sm">Liquidity Wallet</p>
            <p className="text-2xl font-bold text-ink">{PLATFORM_FEES.LIQUIDITY_WALLET_BPS / 100}%</p>
            <p className="text-xs text-ink-faint">{PLATFORM_FEES.LIQUIDITY_WALLET_BPS} BPS</p>
          </div>
          <div className="bg-surface rounded-lg p-4 border border-border">
            <p className="text-ink-muted text-sm">Treasury Wallet</p>
            <p className="text-2xl font-bold text-ink">{PLATFORM_FEES.TREASURY_WALLET_BPS / 100}%</p>
            <p className="text-xs text-ink-faint">{PLATFORM_FEES.TREASURY_WALLET_BPS} BPS</p>
          </div>
          <div className="bg-surface rounded-lg p-4 border border-border">
            <p className="text-ink-muted text-sm">Investor Allocation</p>
            <p className="text-2xl font-bold text-ink">{PLATFORM_FEES.INVESTOR_ALLOCATION_BPS / 100}%</p>
            <p className="text-xs text-ink-faint">{PLATFORM_FEES.INVESTOR_ALLOCATION_BPS} BPS</p>
          </div>
        </div>
      </div>

      {/* Chain-Specific Fees Section */}
      <div className="bg-surface/50 rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Chain-Specific Fees
            <span className="text-xs text-ink-faint font-normal">(Native token fees per chain)</span>
          </h3>
          <div className="flex items-center gap-3">
            {lastPriceUpdate && (
              <span className="text-xs text-ink-faint">
                Updated: {lastPriceUpdate.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleRefreshPrices}
              disabled={pricesLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface-raised hover:bg-surface-overlay rounded-lg text-sm text-ink transition-colors disabled:opacity-50"
            >
              {pricesLoading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh Prices
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 px-4 text-ink-muted font-medium">Chain</th>
                <th className="py-3 px-4 text-ink-muted font-medium">Native Price</th>
                <th className="py-3 px-4 text-ink-muted font-medium">KYC Fee</th>
                <th className="py-3 px-4 text-ink-muted font-medium">KYC Fee (USD)</th>
                <th className="py-3 px-4 text-ink-muted font-medium">Creation Fee</th>
                <th className="py-3 px-4 text-ink-muted font-medium">Creation Fee (USD)</th>
                <th className="py-3 px-4 text-ink-muted font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {chainFeesList.map((chain) => (
                <tr key={chain.chainId} className="border-b border-border/50 hover:bg-surface-raised/30">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-ink font-medium">{chain.chainName}</span>
                      <span className="text-xs text-ink-faint">({chain.chainId})</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <span className="text-warning font-mono">
                        ${chain.nativePrice.toFixed(2)}
                      </span>
                      <span className="text-ink-faint text-xs">/{chain.symbol}</span>
                    </div>
                  </td>

                  {/* KYC Fee */}
                  <td className="py-3 px-4">
                    {editingChain?.chainId === chain.chainId ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.0001"
                          value={editingChain.kyc_fee}
                          onChange={(e) =>
                            setEditingChain((prev) =>
                              prev ? { ...prev, kyc_fee: e.target.value } : null
                            )
                          }
                          className="w-24 bg-surface-raised border border-border-strong rounded px-2 py-1 text-success font-mono text-sm focus:outline-none focus:border-gold-500"
                        />
                        <span className="text-ink-faint text-xs">{chain.symbol}</span>
                      </div>
                    ) : (
                      <span className="text-success font-mono">
                        {chain.kyc_fee_formatted} {chain.symbol}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {pricesLoading ? (
                      <div className="animate-pulse bg-surface-raised h-5 w-16 rounded" />
                    ) : (
                      <span className="text-ink-muted">${chain.kyc_fee_usd.toFixed(2)}</span>
                    )}
                  </td>

                  {/* Creation Fee */}
                  <td className="py-3 px-4">
                    {editingChain?.chainId === chain.chainId ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.0001"
                          value={editingChain.creation_fee}
                          onChange={(e) =>
                            setEditingChain((prev) =>
                              prev ? { ...prev, creation_fee: e.target.value } : null
                            )
                          }
                          className="w-24 bg-surface-raised border border-border-strong rounded px-2 py-1 text-gold-400 font-mono text-sm focus:outline-none focus:border-gold-500"
                        />
                        <span className="text-ink-faint text-xs">{chain.symbol}</span>
                      </div>
                    ) : (
                      <span className="text-gold-400 font-mono">
                        {chain.creation_fee_formatted} {chain.symbol}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {pricesLoading ? (
                      <div className="animate-pulse bg-surface-raised h-5 w-16 rounded" />
                    ) : (
                      <span className="text-ink-muted">${chain.creation_fee_usd.toFixed(2)}</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4">
                    {editingChain?.chainId === chain.chainId ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCancelChainEdit}
                          className="px-2 py-1 bg-surface-overlay hover:bg-surface-raised rounded text-xs text-ink transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveChainFees}
                          disabled={savingChain}
                          className="px-2 py-1 bg-success hover:bg-success rounded text-xs text-ink transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {savingChain && (
                            <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                          )}
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditChain(chain)}
                        disabled={editingChain !== null}
                        className="px-2 py-1 bg-gold-600 hover:bg-gold-700 rounded text-xs text-ink transition-colors disabled:opacity-50"
                      >
                        <span className="inline-flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Price Source Disclaimer */}
        <div className="mt-4 flex items-center gap-2 text-xs text-ink-faint">
          <Radio className="w-3.5 h-3.5" />
          <span>USD prices fetched from CoinGecko API • Auto-refreshes every 60 seconds</span>
        </div>
      </div>

      {/* Platform Fee Summary */}
      <div className="bg-surface rounded-xl p-6 border border-border">
        <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" /> Fee Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 px-4 text-ink-muted font-medium">Fee Type</th>
                <th className="py-3 px-4 text-ink-muted font-medium">Rate</th>
                <th className="py-3 px-4 text-ink-muted font-medium">Applied To</th>
                <th className="py-3 px-4 text-ink-muted font-medium">Example</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50 hover:bg-surface-raised/30">
                <td className="py-3 px-4 text-ink">Crowdfunding Submission</td>
                <td className="py-3 px-4 text-success font-semibold">
                  ${platformFees.crowdfunding_submission_fee}
                </td>
                <td className="py-3 px-4 text-ink-muted">Per application (fixed)</td>
                <td className="py-3 px-4 text-ink-faint">
                  1 application → ${platformFees.crowdfunding_submission_fee} fee
                </td>
              </tr>
              <tr className="border-b border-border/50 hover:bg-surface-raised/30">
                <td className="py-3 px-4 text-ink">Tokenization Submission</td>
                <td className="py-3 px-4 text-success font-semibold">
                  ${platformFees.tokenization_submission_fee}
                </td>
                <td className="py-3 px-4 text-ink-muted">Per application (fixed)</td>
                <td className="py-3 px-4 text-ink-faint">
                  1 application → ${platformFees.tokenization_submission_fee} fee
                </td>
              </tr>
              <tr className="border-b border-border/50 hover:bg-surface-raised/30">
                <td className="py-3 px-4 text-ink">Crowdfunding USDT Fee</td>
                <td className="py-3 px-4 text-success font-semibold">
                  {platformFees.crowdfunding_platform_usdt_fee_bps / 100}%
                </td>
                <td className="py-3 px-4 text-ink-muted">Total raised amount</td>
                <td className="py-3 px-4 text-ink-faint">
                  $100K raise → $
                  {((100000 * platformFees.crowdfunding_platform_usdt_fee_bps) / 10000).toFixed(0)} fee
                </td>
              </tr>
              <tr className="border-b border-border/50 hover:bg-surface-raised/30">
                <td className="py-3 px-4 text-ink">Crowdfunding Token Fee</td>
                <td className="py-3 px-4 text-success font-semibold">
                  {platformFees.crowdfunding_platform_token_fee_bps / 100}%
                </td>
                <td className="py-3 px-4 text-ink-muted">Project tokens minted</td>
                <td className="py-3 px-4 text-ink-faint">
                  1M tokens →{' '}
                  {((1000000 * platformFees.crowdfunding_platform_token_fee_bps) / 10000).toLocaleString()}{' '}
                  tokens fee
                </td>
              </tr>
              <tr className="hover:bg-surface-raised/30">
                <td className="py-3 px-4 text-ink">Escrow Transaction</td>
                <td className="py-3 px-4 text-success font-semibold">
                  {platformFees.escrow_transaction_fee_bps / 100}%
                </td>
                <td className="py-3 px-4 text-ink-muted">Escrow releases</td>
                <td className="py-3 px-4 text-ink-faint">
                  $50K release → $
                  {((50000 * platformFees.escrow_transaction_fee_bps) / 10000).toFixed(0)} fee
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gold-900/20 border border-gold-500/30 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h4 className="text-gold-400 font-semibold">Fee Configuration</h4>
            <p className="text-ink-muted text-sm mt-1">
              <strong>Platform-wide fees</strong> can be edited above and are stored in the database.
              Changes apply immediately to new transactions.
            </p>
            <p className="text-ink-muted text-sm mt-2">
              <strong>Chain-specific fees</strong> (KYC, creation fees in native tokens) can be
              edited per chain. Values are stored in wei and displayed in human-readable format.
            </p>
            <p className="text-ink-muted text-sm mt-2">
              <strong>USD values</strong> are calculated in real-time using CoinGecko price feeds.
              Native token fees remain constant; USD equivalents fluctuate with market prices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
