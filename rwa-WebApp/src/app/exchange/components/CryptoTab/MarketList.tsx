'use client';

import { MexcTicker } from '../../types';
import { MEXC_CONFIG, TOKEN_ICONS } from '../../constants';
import { formatPrice } from '../../utils';

interface MarketListProps {
  selectedPair: string;
  tickers: Record<string, MexcTicker>;
  onPairSelect: (pair: string) => void;
  onDepositClick: () => void;
}

export function MarketList({
  selectedPair,
  tickers,
  onPairSelect,
  onDepositClick,
}: MarketListProps) {
  const getTokenIcon = (symbol: string) => TOKEN_ICONS[symbol] || '🪙';

  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <h3 className="font-semibold mb-4">Markets</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {MEXC_CONFIG.supportedPairs.map((pair) => {
          const ticker = tickers[pair];
          const baseAsset = pair.replace('USDT', '');
          return (
            <button
              key={pair}
              onClick={() => onPairSelect(pair)}
              className={`w-full p-3 rounded-lg transition-colors ${
                selectedPair === pair
                  ? 'bg-blue-500/20 border border-blue-500/30'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img 
                    src={getTokenIcon(baseAsset)} 
                    alt={baseAsset}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="font-medium">{baseAsset}/USDT</span>
                </div>
                {ticker && (
                  <div className="text-right">
                    <div className="font-medium">{formatPrice(ticker.lastPrice)}</div>
                    <div className={`text-xs ${
                      parseFloat(ticker.priceChangePercent) >= 0
                        ? 'text-green-500'
                        : 'text-red-500'
                    }`}>
                      {parseFloat(ticker.priceChangePercent) >= 0 ? '+' : ''}
                      {parseFloat(ticker.priceChangePercent).toFixed(2)}%
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Deposit Button */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <button
          onClick={onDepositClick}
          className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
        >
          Deposit
        </button>
      </div>
    </div>
  );
}