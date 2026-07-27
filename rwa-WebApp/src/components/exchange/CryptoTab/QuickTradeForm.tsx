'use client';

import { Check, AlertTriangle } from 'lucide-react';
import { MexcTicker } from '../../types';
import { MEXC_CONFIG } from '../../constants';
import { formatPrice } from '../../utils';

interface QuickTradeFormProps {
  selectedPair: string;
  tickers: Record<string, MexcTicker>;
  orderType: 'market' | 'limit';
  tradeType: 'buy' | 'sell';
  tradeAmount: string;
  limitPrice: string;
  onOrderTypeChange: (type: 'market' | 'limit') => void;
  onTradeTypeChange: (type: 'buy' | 'sell') => void;
  onAmountChange: (amount: string) => void;
  onLimitPriceChange: (price: string) => void;
  onSubmit: () => void;
}

export function QuickTradeForm({
  selectedPair,
  tickers,
  orderType,
  tradeType,
  tradeAmount,
  limitPrice,
  onOrderTypeChange,
  onTradeTypeChange,
  onAmountChange,
  onLimitPriceChange,
  onSubmit,
}: QuickTradeFormProps) {
  const baseAsset = selectedPair.replace('USDT', '');
  const ticker = tickers[selectedPair];
  const marketPrice = ticker?.lastPrice ? parseFloat(ticker.lastPrice) : 0;
  const executionPrice = orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : marketPrice;
  const amount = parseFloat(tradeAmount) || 0;
  const usdValue = amount * executionPrice;
  const fee = usdValue * (MEXC_CONFIG.tradingFee + MEXC_CONFIG.platformFee);
  const total = tradeType === 'buy' ? usdValue + fee : usdValue - fee;
  const priceDiff = orderType === 'limit' && limitPrice && marketPrice
    ? ((parseFloat(limitPrice) - marketPrice) / marketPrice) * 100
    : 0;

  const setQuickPrice = (multiplier: number) => {
    const price = marketPrice * multiplier;
    onLimitPriceChange(price.toFixed(marketPrice < 1 ? 4 : 2));
  };

  const setQuickAmount = (usdAmount: number) => {
    const price = orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : marketPrice;
    if (price > 0) {
      const decimals = price >= 2000 ? 6 : price >= 500 ? 4 : 2;
      onAmountChange((usdAmount / price).toFixed(decimals));
    }
  };

  return (
    <div className="bg-surface rounded-xl p-4">
      <h3 className="text-lg font-semibold mb-4">Quick Trade</h3>
      
      {/* Order Type Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => onOrderTypeChange('market')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            orderType === 'market'
              ? 'bg-gold-600 text-ink'
              : 'bg-surface-raised text-ink-muted hover:bg-surface-overlay'
          }`}
        >
          Market
        </button>
        <button
          onClick={() => onOrderTypeChange('limit')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            orderType === 'limit'
              ? 'bg-gold-600 text-ink'
              : 'bg-surface-raised text-ink-muted hover:bg-surface-overlay'
          }`}
        >
          Limit
        </button>
      </div>

      {/* Trade Type Tabs (Buy/Sell) */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => onTradeTypeChange('buy')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            tradeType === 'buy'
              ? 'bg-success text-ink'
              : 'bg-surface-raised text-ink-muted hover:bg-surface-overlay'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => onTradeTypeChange('sell')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            tradeType === 'sell'
              ? 'bg-danger text-ink'
              : 'bg-surface-raised text-ink-muted hover:bg-surface-overlay'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Order Form */}
      <div className="space-y-3">
        {/* Limit Price Input */}
        {orderType === 'limit' && (
          <div>
            <label className="text-sm text-ink-muted mb-1 block">Limit Price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted">$</span>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => onLimitPriceChange(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="w-full bg-surface-raised border border-border rounded-lg pl-8 pr-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-gold-500"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setQuickPrice(0.95)} className="flex-1 text-xs py-1 bg-surface-raised hover:bg-surface-overlay rounded text-ink-muted">-5%</button>
              <button onClick={() => setQuickPrice(0.99)} className="flex-1 text-xs py-1 bg-surface-raised hover:bg-surface-overlay rounded text-ink-muted">-1%</button>
              <button onClick={() => setQuickPrice(1)} className="flex-1 text-xs py-1 bg-surface-raised hover:bg-surface-overlay rounded text-ink-muted">Market</button>
              <button onClick={() => setQuickPrice(1.01)} className="flex-1 text-xs py-1 bg-surface-raised hover:bg-surface-overlay rounded text-ink-muted">+1%</button>
              <button onClick={() => setQuickPrice(1.05)} className="flex-1 text-xs py-1 bg-surface-raised hover:bg-surface-overlay rounded text-ink-muted">+5%</button>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="text-sm text-ink-muted mb-1 block">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={tradeAmount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="0.00"
              className="w-full bg-surface-raised border border-border rounded-lg px-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-gold-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted">{baseAsset}</span>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setQuickAmount(25)} className="flex-1 text-xs py-1 bg-surface-raised hover:bg-surface-overlay rounded text-ink-muted">$25</button>
            <button onClick={() => setQuickAmount(50)} className="flex-1 text-xs py-1 bg-surface-raised hover:bg-surface-overlay rounded text-ink-muted">$50</button>
            <button onClick={() => setQuickAmount(100)} className="flex-1 text-xs py-1 bg-surface-raised hover:bg-surface-overlay rounded text-ink-muted">$100</button>
            <button onClick={() => setQuickAmount(500)} className="flex-1 text-xs py-1 bg-surface-raised hover:bg-surface-overlay rounded text-ink-muted">$500</button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-surface-raised/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium px-2 py-1 rounded bg-gold-500/20 text-gold-400">
              {orderType === 'market' ? 'Market Order' : 'Limit Order'}
            </span>
            {orderType === 'limit' && priceDiff !== 0 && (
              <span className={`text-xs ${priceDiff > 0 ? 'text-danger' : 'text-success'}`}>
                {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(2)}% vs market
              </span>
            )}
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">{orderType === 'market' ? 'Market Price' : 'Limit Price'}</span>
            <span className="text-ink">{formatPrice(executionPrice)}</span>
          </div>

          {orderType === 'limit' && (
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">Market Price</span>
              <span className="text-ink-faint">{formatPrice(marketPrice)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Value</span>
            <span className="text-ink">${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Fee ({((MEXC_CONFIG.tradingFee + MEXC_CONFIG.platformFee) * 100).toFixed(1)}%)</span>
            <span className="text-warning">${fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="border-t border-border pt-2 flex justify-between text-sm font-medium">
            <span className="text-ink-muted">Total</span>
            <span className={tradeType === 'buy' ? 'text-success' : 'text-danger'}>
              ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {orderType === 'limit' && (
            <div className="text-xs text-ink-faint pt-1">
              {tradeType === 'buy' ? (
                parseFloat(limitPrice || '0') < marketPrice ? (
                  <span className="text-success flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Will execute when price drops to {formatPrice(parseFloat(limitPrice || '0'))}</span>
                ) : (
                  <span className="text-warning flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Price above market - may execute immediately</span>
                )
              ) : (
                parseFloat(limitPrice || '0') > marketPrice ? (
                  <span className="text-success flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Will execute when price rises to {formatPrice(parseFloat(limitPrice || '0'))}</span>
                ) : (
                  <span className="text-warning flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Price below market - may execute immediately</span>
                )
              )}
            </div>
          )}
        </div>

        {/* Trade Button */}
        <button
          onClick={onSubmit}
          disabled={!tradeAmount || parseFloat(tradeAmount) <= 0 || (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0))}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            tradeType === 'buy'
              ? 'bg-success hover:bg-success/90 disabled:bg-success/50'
              : 'bg-danger hover:bg-danger/90 disabled:bg-danger/50'
          } text-ink disabled:cursor-not-allowed`}
        >
          {orderType === 'market' ? '' : 'Limit '}
          {tradeType === 'buy' ? 'Buy' : 'Sell'} {baseAsset}
        </button>

        <p className="text-xs text-ink-faint text-center">
          {orderType === 'market'
            ? 'Execute immediately at current market price'
            : 'Execute when market reaches your limit price'}
        </p>
      </div>
    </div>
  );
}