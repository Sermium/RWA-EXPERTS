// src/app/admin/components/PlatformSettings.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  DEFAULT_PLATFORM_FEES, 
  DEFAULT_CHAIN_FEES,
  PlatformFees,
  ChainFees 
} from '@/config/deployments';
import { RefreshCw, DollarSign, Coins, AlertCircle } from 'lucide-react';

interface ChainFeesWithMeta {
  fees: ChainFees & {
    KYC_FEE_USD?: number;
    CREATION_FEE_USD?: number;
    NATIVE_PRICE?: number;
    LAST_UPDATED?: string;
  };
  updatedAt?: string;
  updatedBy?: string;
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

const CHAIN_SYMBOLS: Record<number, string> = {
  43113: 'AVAX', 43114: 'AVAX',
  80002: 'POL', 137: 'POL',
  1: 'ETH', 11155111: 'ETH', 42161: 'ETH', 8453: 'ETH', 10: 'ETH',
  56: 'BNB', 97: 'BNB',
  25: 'CRO', 338: 'CRO',
};

// Default USD fees
const DEFAULT_KYC_FEE_USD = 7.5;
const DEFAULT_CREATION_FEE_USD = 15;

export default function PlatformSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Platform fees state
  const [platformFees, setPlatformFees] = useState<PlatformFees >(DEFAULT_PLATFORM_FEES);
  const [editedPlatformFees, setEditedPlatformFees] = useState<PlatformFees >(DEFAULT_PLATFORM_FEES);

  // Chain fees state (with USD values)
  const [chainFees, setChainFees] = useState<Record<number, ChainFeesWithMeta>>({});
  const [editedChainFees, setEditedChainFees] = useState<Record<number, ChainFees & { KYC_FEE_USD?: number; CREATION_FEE_USD?: number }>>({});

  // Prices state
  const [prices, setPrices] = useState<Record<string, number>>({
    AVAX: 35, ETH: 3500, POL: 0.5, BNB: 600, CRO: 0.10
  });

  // Last recalculation time
  const [lastRecalculated, setLastRecalculated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch fees
      const feesRes = await fetch('/api/admin/settings/fee');
      const feesData = await feesRes.json();
      
      console.log('API Response:', feesData); // DEBUG - check structure

      if (feesData.success) {
        setPlatformFees(feesData.platformFees?.fees || feesData.platformFees || DEFAULT_PLATFORM_FEES);
        setEditedPlatformFees(feesData.platformFees?.fees || feesData.platformFees || DEFAULT_PLATFORM_FEES);
        
        const rawChainFees = feesData.chainFees || {};
        setChainFees(rawChainFees);
        
        const editableChain: Record<number, ChainFees & { KYC_FEE_USD?: number; CREATION_FEE_USD?: number }> = {};
        
        for (const [chainId, data] of Object.entries(rawChainFees)) {
          // Handle both structures: { fees: {...} } or direct {...}
          const fees = (data as any).fees || data;
          
          console.log(`Chain ${chainId} fees:`, fees); // DEBUG
          
          editableChain[parseInt(chainId)] = {
            ...fees,
            KYC_FEE_USD: fees.KYC_FEE_USD ?? DEFAULT_KYC_FEE_USD,
            CREATION_FEE_USD: fees.CREATION_FEE_USD ?? DEFAULT_CREATION_FEE_USD,
          };
          
          // Track last update
          if (fees.LAST_UPDATED && (!lastRecalculated || fees.LAST_UPDATED > lastRecalculated)) {
            setLastRecalculated(fees.LAST_UPDATED);
          }
        }
        
        console.log('Editable chain fees:', editableChain); // DEBUG
        setEditedChainFees(editableChain);
      }

      // Fetch prices
      const pricesRes = await fetch('/api/prices');
      const pricesData = await pricesRes.json();
      if (pricesData.success && pricesData.prices) {
        setPrices(pricesData.prices);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Recalculate all chain fees from USD values
  const handleRecalculateFees = async () => {
    setRecalculating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/settings/fee/recalculate', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `Recalculated fees for ${data.updated} chains using current prices` 
        });
        setLastRecalculated(data.timestamp);
        await fetchData(); // Refresh all data
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to recalculate fees' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error while recalculating' });
    } finally {
      setRecalculating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Save each chain's USD fees individually
      for (const [chainIdStr, fees] of Object.entries(editedChainFees)) {
        const chainId = parseInt(chainIdStr);
        
        await fetch('/api/admin/settings/fee', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'chain',
            chainId,
            fees: {
              KYC_FEE_USD: fees.KYC_FEE_USD ?? DEFAULT_KYC_FEE_USD,
              CREATION_FEE_USD: fees.CREATION_FEE_USD ?? DEFAULT_CREATION_FEE_USD,
              // Keep existing native values until recalculated
              KYC_FEE: fees.KYC_FEE,
              KYC_FEE_FORMATTED: fees.KYC_FEE_FORMATTED,
              CREATION_FEE: fees.CREATION_FEE,
              CREATION_FEE_FORMATTED: fees.CREATION_FEE_FORMATTED,
            },
          }),
        });
      }

      // Save platform fees
      await fetch('/api/admin/settings/fee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'platform',
          fees: editedPlatformFees,
        }),
      });

      setPlatformFees(editedPlatformFees);
      setEditing(false);
      setMessage({ type: 'success', text: 'Settings saved! Recalculating native amounts...' });
      
      // Auto-recalculate after saving USD values
      await handleRecalculateFees();
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedPlatformFees(platformFees);
    const editableChain: Record<number, ChainFees & { KYC_FEE_USD?: number; CREATION_FEE_USD?: number }> = {};
    for (const [chainId, data] of Object.entries(chainFees)) {
      editableChain[parseInt(chainId)] = {
        ...data.fees,
        KYC_FEE_USD: data.fees.KYC_FEE_USD ?? DEFAULT_KYC_FEE_USD,
        CREATION_FEE_USD: data.fees.CREATION_FEE_USD ?? DEFAULT_CREATION_FEE_USD,
      };
    }
    setEditedChainFees(editableChain);
    setEditing(false);
  };

  const updatePlatformFee = (key: keyof PlatformFees , value: string) => {
    setEditedPlatformFees(prev => ({
      ...prev,
      [key]: key.includes('PERCENT') ? value : (parseFloat(value) || 0),
    }));
  };

  const updateChainFeeUsd = (chainId: number, feeType: 'KYC_FEE_USD' | 'CREATION_FEE_USD', value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedChainFees(prev => ({
      ...prev,
      [chainId]: {
        ...prev[chainId],
        [feeType]: numValue,
      },
    }));
  };

  const getCalculatedNative = (chainId: number, usdAmount: number): string => {
    const symbol = CHAIN_SYMBOLS[chainId];
    const price = prices[symbol] || 1;
    if (price <= 0) return '0';
    const native = usdAmount / price;
    return native.toFixed(6);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Platform Settings</h2>
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-400">Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Platform Settings</h2>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <button
                onClick={handleRecalculateFees}
                disabled={recalculating}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-white text-sm flex items-center gap-2"
              >
                {recalculating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Recalculate Prices
              </button>
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm flex items-center gap-2"
              >
                <span>âœï¸</span> Edit Fees
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white text-sm flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Saving...
                  </>
                ) : (
                  <>ðŸ’¾ Save Changes</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-900/50 text-green-400 border border-green-500/30'
            : 'bg-red-900/50 text-red-400 border border-red-500/30'
        }`}>
          <span>{message.type === 'success' ? 'âœ…' : 'âŒ'}</span>
          {message.text}
        </div>
      )}

      {/* Platform-Wide Fees */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>ðŸŒ</span> Platform-Wide Fees
          <span className="text-xs text-gray-500 font-normal">(Same across all chains)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Submission Fees */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <label className="block text-gray-400 text-sm mb-2">Crowdfunding Submission Fee (USD)</label>
            {editing ? (
              <input
                type="number"
                value={editedPlatformFees.CROWDFUNDING_SUBMISSION_FEE}
                onChange={(e) => updatePlatformFee('CROWDFUNDING_SUBMISSION_FEE', e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            ) : (
              <p className="text-2xl font-bold text-white">${platformFees.CROWDFUNDING_SUBMISSION_FEE}</p>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <label className="block text-gray-400 text-sm mb-2">Tokenization Submission Fee (USD)</label>
            {editing ? (
              <input
                type="number"
                value={editedPlatformFees.TOKENIZATION_SUBMISSION_FEE}
                onChange={(e) => updatePlatformFee('TOKENIZATION_SUBMISSION_FEE', e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            ) : (
              <p className="text-2xl font-bold text-white">${platformFees.TOKENIZATION_SUBMISSION_FEE}</p>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <label className="block text-gray-400 text-sm mb-2">Escrow Transaction Fee (BPS)</label>
            {editing ? (
              <input
                type="number"
                value={editedPlatformFees.ESCROW_TRANSACTION_FEE_BPS}
                onChange={(e) => updatePlatformFee('ESCROW_TRANSACTION_FEE_BPS', e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            ) : (
              <p className="text-2xl font-bold text-white">{platformFees.ESCROW_TRANSACTION_FEE_BPS} BPS <span className="text-sm text-gray-400">({platformFees.ESCROW_TRANSACTION_FEE_BPS / 100}%)</span></p>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <label className="block text-gray-400 text-sm mb-2">Crowdfunding USDT Fee (BPS)</label>
            {editing ? (
              <input
                type="number"
                value={editedPlatformFees.CROWDFUNDING_PLATFORM_USDT_FEE_BPS}
                onChange={(e) => updatePlatformFee('CROWDFUNDING_PLATFORM_USDT_FEE_BPS', e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            ) : (
              <p className="text-2xl font-bold text-white">{platformFees.CROWDFUNDING_PLATFORM_USDT_FEE_BPS} BPS <span className="text-sm text-gray-400">({platformFees.CROWDFUNDING_PLATFORM_USDT_FEE_BPS / 100}%)</span></p>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <label className="block text-gray-400 text-sm mb-2">Crowdfunding Token Fee (BPS)</label>
            {editing ? (
              <input
                type="number"
                value={editedPlatformFees.CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS}
                onChange={(e) => updatePlatformFee('CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS', e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            ) : (
              <p className="text-2xl font-bold text-white">{platformFees.CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS} BPS <span className="text-sm text-gray-400">({platformFees.CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS / 100}%)</span></p>
            )}
          </div>
        </div>
      </div>

      {/* Fee Distribution */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>ðŸ“Š</span> Fee Distribution
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <label className="block text-gray-400 text-sm mb-2">Fee Receiver (BPS)</label>
            {editing ? (
              <input
                type="number"
                value={editedPlatformFees.FEE_RECEIVER_BPS}
                onChange={(e) => updatePlatformFee('FEE_RECEIVER_BPS', e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            ) : (
              <p className="text-xl font-bold text-white">{platformFees.FEE_RECEIVER_BPS / 100}%</p>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <label className="block text-gray-400 text-sm mb-2">Liquidity Wallet (BPS)</label>
            {editing ? (
              <input
                type="number"
                value={editedPlatformFees.LIQUIDITY_WALLET_BPS}
                onChange={(e) => updatePlatformFee('LIQUIDITY_WALLET_BPS', e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            ) : (
              <p className="text-xl font-bold text-white">{platformFees.LIQUIDITY_WALLET_BPS / 100}%</p>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <label className="block text-gray-400 text-sm mb-2">Treasury Wallet (BPS)</label>
            {editing ? (
              <input
                type="number"
                value={editedPlatformFees.TREASURY_WALLET_BPS}
                onChange={(e) => updatePlatformFee('TREASURY_WALLET_BPS', e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            ) : (
              <p className="text-xl font-bold text-white">{platformFees.TREASURY_WALLET_BPS / 100}%</p>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <label className="block text-gray-400 text-sm mb-2">Investor Allocation (BPS)</label>
            {editing ? (
              <input
                type="number"
                value={editedPlatformFees.INVESTOR_ALLOCATION_BPS}
                onChange={(e) => updatePlatformFee('INVESTOR_ALLOCATION_BPS', e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            ) : (
              <p className="text-xl font-bold text-white">{platformFees.INVESTOR_ALLOCATION_BPS / 100}%</p>
            )}
          </div>
        </div>
      </div>

      {/* Chain-Specific Fees - USD Based */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="py-3 px-4 text-gray-400 font-medium">Chain</th>
              <th className="py-3 px-4 text-gray-400 font-medium">Native Price</th>
              <th className="py-3 px-4 text-gray-400 font-medium">KYC Fee (USD)</th>
              <th className="py-3 px-4 text-gray-400 font-medium">â†’ Native</th>
              <th className="py-3 px-4 text-gray-400 font-medium">Creation Fee (USD)</th>
              <th className="py-3 px-4 text-gray-400 font-medium">â†’ Native</th>
              {editing && <th className="py-3 px-4 text-gray-400 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {Object.entries(editedChainFees).map(([chainIdStr, fees]) => {
              const chainId = parseInt(chainIdStr);
              const symbol = CHAIN_SYMBOLS[chainId];
              const price = prices[symbol] || 0;
              const storedFees = (chainFees[chainId] as any)?.fees || chainFees[chainId];
              
              // Get USD values - these are what we edit
              const kycUsd = fees.KYC_FEE_USD ?? DEFAULT_KYC_FEE_USD;
              const creationUsd = fees.CREATION_FEE_USD ?? DEFAULT_CREATION_FEE_USD;
              
              // Calculate native from USD
              const kycNative = price > 0 ? (kycUsd / price).toFixed(6) : '0';
              const creationNative = price > 0 ? (creationUsd / price).toFixed(6) : '0';
              
              return (
                <tr key={chainId} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  {/* Chain Name */}
                  <td className="py-3 px-4">
                    <span className="text-white font-medium">{CHAIN_NAMES[chainId]}</span>
                    <span className="text-xs text-gray-500 ml-2">({chainId})</span>
                    <span className="text-xs text-gray-400 ml-2">{symbol}</span>
                  </td>
                  
                  {/* Native Token Price */}
                  <td className="py-3 px-4">
                    <span className="text-yellow-400 font-mono">${price.toFixed(2)}</span>
                  </td>
                  
                  {/* KYC Fee USD - EDITABLE */}
                  <td className="py-3 px-4">
                    {editing ? (
                      <div className="flex items-center gap-1">
                        <span className="text-green-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={kycUsd}
                          onChange={(e) => updateChainFeeUsd(chainId, 'KYC_FEE_USD', e.target.value)}
                          className="w-20 p-1.5 bg-gray-700 border border-green-500/50 rounded text-white text-sm focus:border-green-400 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <span className="text-green-400 font-semibold">${kycUsd.toFixed(2)}</span>
                    )}
                  </td>
                  
                  {/* KYC Native Amount - CALCULATED */}
                  <td className="py-3 px-4">
                    <span className="text-gray-400 font-mono text-sm">
                      {storedFees?.KYC_FEE_FORMATTED || `${kycNative} ${symbol}`}
                    </span>
                  </td>
                  
                  {/* Creation Fee USD - EDITABLE */}
                  <td className="py-3 px-4">
                    {editing ? (
                      <div className="flex items-center gap-1">
                        <span className="text-blue-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={creationUsd}
                          onChange={(e) => updateChainFeeUsd(chainId, 'CREATION_FEE_USD', e.target.value)}
                          className="w-20 p-1.5 bg-gray-700 border border-blue-500/50 rounded text-white text-sm focus:border-blue-400 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <span className="text-blue-400 font-semibold">${creationUsd.toFixed(2)}</span>
                    )}
                  </td>
                  
                  {/* Creation Native Amount - CALCULATED */}
                  <td className="py-3 px-4">
                    <span className="text-gray-400 font-mono text-sm">
                      {storedFees?.CREATION_FEE_FORMATTED || `${creationNative} ${symbol}`}
                    </span>
                  </td>
                  
                  {/* Actions when editing */}
                  {editing && (
                    <td className="py-3 px-4">
                      <span className="text-gray-500 text-xs">Auto-calc</span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">â„¹ï¸</span>
          <div>
            <h4 className="text-blue-400 font-semibold">Fee Management</h4>
            <p className="text-gray-400 text-sm mt-1">
              Fees are stored in USD and automatically converted to native tokens using live market prices.
              The conversion happens when you save changes or click "Recalculate Prices".
              For automated updates, configure a cron job to call <code className="text-blue-300">/api/admin/settings/fee/recalculate</code> periodically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
