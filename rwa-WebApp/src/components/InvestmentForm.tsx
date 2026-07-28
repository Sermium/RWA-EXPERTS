'use client';

import { useState } from 'react';
import { useKYC } from '@/contexts/KYCContext';

interface InvestmentFormProps {
  projectId: string;
  minInvestment: number;
  maxInvestment: number;
  onInvest: (amount: number) => Promise<void>;
}

export default function InvestmentForm({ 
  projectId, 
  minInvestment, 
  maxInvestment,
  onInvest 
}: InvestmentFormProps) {
  const { kycData, tierInfo, canInvest, formatLimit } = useKYC();
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericAmount = parseFloat(amount) || 0;
  const investCheck = canInvest(numericAmount);
  
  // Calculate effective max (minimum of project max and remaining KYC limit)
  const effectiveMax = Math.min(maxInvestment, kycData.remainingLimit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!investCheck.allowed) {
      setError(investCheck.reason || 'Cannot invest');
      return;
    }

    if (numericAmount < minInvestment) {
      setError(`Minimum investment is $${minInvestment}`);
      return;
    }

    if (numericAmount > effectiveMax) {
      setError(`Maximum investment is $${effectiveMax.toLocaleString()}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onInvest(numericAmount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Investment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl p-6 border border-border">
      <h3 className="text-lg font-semibold text-ink mb-4">Invest in Project</h3>

      {/* KYC Tier Info */}
      <div className={`mb-4 p-3 rounded-lg ${tierInfo.bgColor} border ${tierInfo.borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <tierInfo.icon className={`w-4 h-4 ${tierInfo.color}`} />
            <span className={`text-sm font-medium ${tierInfo.color}`}>{tierInfo.label} Tier</span>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-muted">Remaining Limit</div>
            <div className={`text-sm font-medium ${tierInfo.color}`}>
              {formatLimit(kycData.remainingLimit)}
            </div>
          </div>
        </div>
      </div>

      {/* Investment Form */}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-ink-muted mb-2">
            Investment Amount (USDC)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-3 bg-surface-sunken border border-border-strong rounded-lg text-ink focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              placeholder="0.00"
              min={minInvestment}
              max={effectiveMax}
              step="0.01"
            />
          </div>
          <div className="flex justify-between text-xs text-ink-faint mt-1">
            <span>Min: ${minInvestment.toLocaleString()}</span>
            <span>Max: ${effectiveMax.toLocaleString()}</span>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2 mb-4">
          {[100, 500, 1000, 5000].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset.toString())}
              disabled={preset > effectiveMax}
              className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                preset > effectiveMax
                  ? 'bg-surface-overlay text-ink-faint cursor-not-allowed'
                  : 'bg-surface-overlay hover:bg-border-strong text-ink'
              }`}
            >
              ${preset >= 1000 ? `${preset / 1000}K` : preset}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-danger-muted border border-danger/40 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}

        {/* Investment Check Warning */}
        {!investCheck.allowed && numericAmount > 0 && (
          <div className="mb-4 p-3 bg-warning-muted border border-warning/40 rounded-lg text-warning text-sm">
            {investCheck.reason}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!investCheck.allowed || isSubmitting || numericAmount <= 0}
          className={`w-full py-4 rounded-lg font-semibold transition-all ${
            !investCheck.allowed || isSubmitting || numericAmount <= 0
              ? 'bg-surface-overlay text-ink-muted cursor-not-allowed'
              : 'bg-gradient-to-r from-success to-success hover:from-success hover:to-success text-ink'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            `Invest $${numericAmount.toLocaleString()}`
          )}
        </button>
      </form>
    </div>
  );
}
