'use client';

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
    <div className="bg-gray-900 rounded-xl p-4">
      <h3 className="text-lg font-semibold mb-4">Quick Trade</h3>
      
      {/* Order Type Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => onOrderTypeChange('market')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            orderType === 'market'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Market
        </button>
        <button
          onClick={() => onOrderTypeChange('limit')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            orderType === 'limit'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => onTradeTypeChange('sell')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            tradeType === 'sell'
              ? 'bg-red-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
            <label className="text-sm text-gray-400 mb-1 block">Limit Price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => onLimitPriceChange(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setQuickPrice(0.95)} className="flex-1 text-xs py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">-5%</button>
              <button onClick={() => setQuickPrice(0.99)} className="flex-1 text-xs py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">-1%</button>
              <button onClick={() => setQuickPrice(1)} className="flex-1 text-xs py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">Market</button>
              <button onClick={() => setQuickPrice(1.01)} className="flex-1 text-xs py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">+1%</button>
              <button onClick={() => setQuickPrice(1.05)} className="flex-1 text-xs py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">+5%</button>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={tradeAmount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{baseAsset}</span>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setQuickAmount(25)} className="flex-1 text-xs py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">$25</button>
            <button onClick={() => setQuickAmount(50)} className="flex-1 text-xs py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">$50</button>
            <button onClick={() => setQuickAmount(100)} className="flex-1 text-xs py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">$100</button>
            <button onClick={() => setQuickAmount(500)} className="flex-1 text-xs py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">$500</button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/20 text-blue-400">
              {orderType === 'market' ? 'Market Order' : 'Limit Order'}
            </span>
            {orderType === 'limit' && priceDiff !== 0 && (
              <span className={`text-xs ${priceDiff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(2)}% vs market
              </span>
            )}
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{orderType === 'market' ? 'Market Price' : 'Limit Price'}</span>
            <span className="text-white">{formatPrice(executionPrice)}</span>
          </div>

          {orderType === 'limit' && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Market Price</span>
              <span className="text-gray-500">{formatPrice(marketPrice)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Value</span>
            <span className="text-white">${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Fee ({((MEXC_CONFIG.tradingFee + MEXC_CONFIG.platformFee) * 100).toFixed(1)}%)</span>
            <span className="text-yellow-500">${fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="border-t border-gray-700 pt-2 flex justify-between text-sm font-medium">
            <span className="text-gray-300">Total</span>
            <span className={tradeType === 'buy' ? 'text-green-400' : 'text-red-400'}>
              ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {orderType === 'limit' && (
            <div className="text-xs text-gray-500 pt-1">
              {tradeType === 'buy' ? (
                parseFloat(limitPrice || '0') < marketPrice ? (
                  <span className="text-green-400">✓ Will execute when price drops to {formatPrice(parseFloat(limitPrice || '0'))}</span>
                ) : (
                  <span className="text-yellow-400">⚠ Price above market - may execute immediately</span>
                )
              ) : (
                parseFloat(limitPrice || '0') > marketPrice ? (
                  <span className="text-green-400">✓ Will execute when price rises to {formatPrice(parseFloat(limitPrice || '0'))}</span>
                ) : (
                  <span className="text-yellow-400">⚠ Price below market - may execute immediately</span>
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
              ? 'bg-green-600 hover:bg-green-500 disabled:bg-green-600/50'
              : 'bg-red-600 hover:bg-red-500 disabled:bg-red-600/50'
          } text-white disabled:cursor-not-allowed`}
        >
          {orderType === 'market' ? '' : 'Limit '}
          {tradeType === 'buy' ? 'Buy' : 'Sell'} {baseAsset}
        </button>

        <p className="text-xs text-gray-500 text-center">
          {orderType === 'market'
            ? 'Execute immediately at current market price'
            : 'Execute when market reaches your limit price'}
        </p>
      </div>
    </div>
  );
}