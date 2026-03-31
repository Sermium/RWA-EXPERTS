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
    <div className="lg:col-span-2 bg-gray-900 rounded-xl p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Order Book
        {hasToken && (
          <span className="text-sm font-normal text-gray-400">
            - {selectedListedToken?.symbol || selectedSecurityToken?.symbol}/USDC
          </span>
        )}
      </h3>

      {!hasToken ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <p>Select a token to view order book</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Spread indicator */}
          <div className="flex items-center justify-center gap-4 py-2 bg-gray-800/50 rounded-lg">
            <div className="text-center">
              <span className="text-green-400 font-medium">${securityOrderBook.bestBid.toFixed(4)}</span>
              <span className="text-xs text-gray-500 block">Best Bid</span>
            </div>
            <div className="text-center px-4 border-x border-gray-700">
              <span className="text-white font-medium">${securityOrderBook.spread}</span>
              <span className="text-xs text-gray-500 block">Spread ({securityOrderBook.spreadPercent}%)</span>
            </div>
            <div className="text-center">
              <span className="text-red-400 font-medium">${securityOrderBook.bestAsk.toFixed(4)}</span>
              <span className="text-xs text-gray-500 block">Best Ask</span>
            </div>
          </div>

          {/* Order Book Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Sell Orders (Asks) */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-2 px-2 font-medium">
                <span>Price (USDC)</span>
                <span>Amount</span>
                <span>Total</span>
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto flex flex-col-reverse">
                {securityOrderBookLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                  </div>
                ) : securityOrderBook.asks.length > 0 ? (
                  securityOrderBook.asks.map((level, i) => (
                    <div 
                      key={i} 
                      className="flex justify-between text-sm px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 cursor-pointer transition-colors"
                      onClick={() => onPriceClick(level.price, 'buy')}
                    >
                      <span className="text-red-400 font-medium">${level.price.toFixed(4)}</span>
                      <span className="text-gray-400">{level.quantity.toFixed(2)}</span>
                      <span className="text-gray-500 text-xs">${level.total.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">No sell orders</div>
                )}
              </div>
            </div>

            {/* Buy Orders (Bids) */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-2 px-2 font-medium">
                <span>Price (USDC)</span>
                <span>Amount</span>
                <span>Total</span>
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {securityOrderBookLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
                  </div>
                ) : securityOrderBook.bids.length > 0 ? (
                  securityOrderBook.bids.map((level, i) => (
                    <div 
                      key={i} 
                      className="flex justify-between text-sm px-2 py-1 rounded bg-green-500/10 hover:bg-green-500/20 cursor-pointer transition-colors"
                      onClick={() => onPriceClick(level.price, 'sell')}
                    >
                      <span className="text-green-400 font-medium">${level.price.toFixed(4)}</span>
                      <span className="text-gray-400">{level.quantity.toFixed(2)}</span>
                      <span className="text-gray-500 text-xs">${level.total.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">No buy orders</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
