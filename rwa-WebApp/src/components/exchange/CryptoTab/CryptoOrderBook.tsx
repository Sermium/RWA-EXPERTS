'use client';

import { MexcOrderBook, MexcTicker } from '../../types';
import { TOKEN_ICONS } from '../../constants';
import { formatPrice, formatAmount } from '../../utils';

interface CryptoOrderBookProps {
  selectedPair: string;
  orderBook: MexcOrderBook | null;
  ticker: MexcTicker | null;
  tickers: Record<string, MexcTicker>;
}

export function CryptoOrderBook({
  selectedPair,
  orderBook,
  ticker,
  tickers,
}: CryptoOrderBookProps) {
  const getTokenIcon = (symbol: string) => TOKEN_ICONS[symbol] || '/chains/default.svg';
  const baseAsset = selectedPair.replace('USDT', '');
  
  const currentPrice = tickers[selectedPair]?.lastPrice 
    ? parseFloat(tickers[selectedPair].lastPrice) 
    : undefined;

  return (
    <div className="lg:col-span-2 bg-surface rounded-xl p-4">
      {/* Ticker Header */}
      {ticker && (
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <img 
              src={getTokenIcon(baseAsset)} 
              alt={selectedPair}
              className="w-10 h-10 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div>
              <h3 className="font-semibold text-lg">{selectedPair.replace('USDT', '/USDT')}</h3>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatPrice(ticker.lastPrice)}</div>
            <div className={`text-sm ${
              parseFloat(ticker.priceChangePercent) >= 0
                ? 'text-success'
                : 'text-danger'
            }`}>
              {parseFloat(ticker.priceChangePercent) >= 0 ? '+' : ''}
              {parseFloat(ticker.priceChangePercent).toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {/* Order Book Display */}
      <div className="grid grid-cols-2 gap-4">
        {/* Asks (Sell Orders) */}
        <div>
          <div className="flex justify-between text-xs text-ink-faint mb-2 px-1">
            <span>Price</span>
            <span>Amount</span>
            <span>Total</span>
          </div>
          <div className="space-y-1">
            {orderBook?.asks?.slice(0, 25).reverse().map((entry, i) => {
              const { qty, usd } = formatAmount(entry[1], currentPrice);
              return (
                <div key={i} className="flex justify-between text-sm items-center">
                  <span className="text-danger">{formatPrice(entry[0])}</span>
                  <span className="text-ink-muted">{qty}</span>
                  <span className="text-ink-faint text-xs">{usd}</span>
                </div>
              );
            })}
            {(!orderBook || !orderBook.asks?.length) && (
              <div className="text-ink-faint text-sm text-center py-2">No sell orders</div>
            )}
          </div>
        </div>

        {/* Bids (Buy Orders) */}
        <div>
          <div className="flex justify-between text-xs text-ink-faint mb-2 px-1">
            <span>Price</span>
            <span>Amount</span>
            <span>Total</span>
          </div>
          <div className="space-y-1">
            {orderBook?.bids?.slice(0, 25).map((entry, i) => {
              const { qty, usd } = formatAmount(entry[1], currentPrice);
              return (
                <div key={i} className="flex justify-between text-sm items-center">
                  <span className="text-success">{formatPrice(entry[0])}</span>
                  <span className="text-ink-muted">{qty}</span>
                  <span className="text-ink-faint text-xs">{usd}</span>
                </div>
              );
            })}
            {(!orderBook || !orderBook.bids?.length) && (
              <div className="text-ink-faint text-sm text-center py-2">No buy orders</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}