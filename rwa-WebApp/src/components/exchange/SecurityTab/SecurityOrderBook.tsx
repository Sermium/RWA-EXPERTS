'use client';

import { SecurityOrderBookData, ListedToken, SecurityTokenData } from '../../types';

interface SecurityOrderBookProps {
  selectedListedToken: ListedToken | null;
  selectedSecurityToken: SecurityTokenData | null;
  securityOrderBook: SecurityOrderBookData;
  securityOrderBookLoading: boolean;
  onPriceClick: (price: number, side: 'buy' | 'sell') => void;
}

export function SecurityOrderBook({
  selectedListedToken,
  selectedSecurityToken,
  securityOrderBook,
  securityOrderBookLoading,
  onPriceClick,
}: SecurityOrderBookProps) {
  const hasToken = selectedListedToken || selectedSecurityToken;

  return (
    <div className="lg:col-span-2 bg-surface-sunken rounded-xl p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Order Book
        {hasToken && (
          <span className="text-sm font-normal text-ink-muted">
            - {selectedListedToken?.symbol || selectedSecurityToken?.symbol}/USDC
          </span>
        )}
      </h3>

      {!hasToken ? (
        <div className="flex items-center justify-center py-16 text-ink-muted">
          <p>Select a token to view order book</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Spread indicator */}
          <div className="flex items-center justify-center gap-4 py-2 bg-surface/50 rounded-lg">
            <div className="text-center">
              <span className="text-success font-medium">${securityOrderBook.bestBid.toFixed(4)}</span>
              <span className="text-xs text-ink-faint block">Best Bid</span>
            </div>
            <div className="text-center px-4 border-x border-border">
              <span className="text-ink font-medium">${securityOrderBook.spread}</span>
              <span className="text-xs text-ink-faint block">Spread ({securityOrderBook.spreadPercent}%)</span>
            </div>
            <div className="text-center">
              <span className="text-danger font-medium">${securityOrderBook.bestAsk.toFixed(4)}</span>
              <span className="text-xs text-ink-faint block">Best Ask</span>
            </div>
          </div>

          {/* Order Book Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Sell Orders (Asks) */}
            <div>
              <div className="flex justify-between text-xs text-ink-faint mb-2 px-2 font-medium">
                <span>Price (USDC)</span>
                <span>Amount</span>
                <span>Total</span>
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto flex flex-col-reverse">
                {securityOrderBookLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-danger"></div>
                  </div>
                ) : securityOrderBook.asks.length > 0 ? (
                  securityOrderBook.asks.map((level, i) => (
                    <div 
                      key={i} 
                      className="flex justify-between text-sm px-2 py-1 rounded bg-danger/10 hover:bg-danger/20 cursor-pointer transition-colors"
                      onClick={() => onPriceClick(level.price, 'buy')}
                    >
                      <span className="text-danger font-medium">${level.price.toFixed(4)}</span>
                      <span className="text-ink-muted">{level.quantity.toFixed(2)}</span>
                      <span className="text-ink-faint text-xs">${level.total.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-ink-faint text-sm">No sell orders</div>
                )}
              </div>
            </div>

            {/* Buy Orders (Bids) */}
            <div>
              <div className="flex justify-between text-xs text-ink-faint mb-2 px-2 font-medium">
                <span>Price (USDC)</span>
                <span>Amount</span>
                <span>Total</span>
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {securityOrderBookLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-success"></div>
                  </div>
                ) : securityOrderBook.bids.length > 0 ? (
                  securityOrderBook.bids.map((level, i) => (
                    <div 
                      key={i} 
                      className="flex justify-between text-sm px-2 py-1 rounded bg-success/10 hover:bg-success/20 cursor-pointer transition-colors"
                      onClick={() => onPriceClick(level.price, 'sell')}
                    >
                      <span className="text-success font-medium">${level.price.toFixed(4)}</span>
                      <span className="text-ink-muted">{level.quantity.toFixed(2)}</span>
                      <span className="text-ink-faint text-xs">${level.total.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-ink-faint text-sm">No buy orders</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
