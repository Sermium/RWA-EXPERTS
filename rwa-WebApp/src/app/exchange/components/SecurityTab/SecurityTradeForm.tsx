'use client';

import { ListedToken, SecurityTokenData } from '../../types';

interface SecurityTradeFormProps {
  isConnected: boolean;
  isWrongChain: boolean;
  chainName: string;
  chainId: number;
  selectedListedToken: ListedToken | null;
  selectedSecurityToken: SecurityTokenData | null;
  orderType: 'market' | 'limit';
  orderSide: 'buy' | 'sell';
  orderPrice: string;
  orderAmount: string;
  orderError: string | null;
  orderSubmitting: boolean;
  txHash?: string;
  explorerUrl: string;
  onOrderTypeChange: (type: 'market' | 'limit') => void;
  onOrderSideChange: (side: 'buy' | 'sell') => void;
  onPriceChange: (price: string) => void;
  onAmountChange: (amount: string) => void;
  onSubmit: () => void;
  onSwitchNetwork: (chainId: number) => void;
}

export function SecurityTradeForm({
  isConnected,
  isWrongChain,
  chainName,
  chainId,
  selectedListedToken,
  selectedSecurityToken,
  orderType,
  orderSide,
  orderPrice,
  orderAmount,
  orderError,
  orderSubmitting,
  txHash,
  explorerUrl,
  onOrderTypeChange,
  onOrderSideChange,
  onPriceChange,
  onAmountChange,
  onSubmit,
  onSwitchNetwork,
}: SecurityTradeFormProps) {
  const hasToken = selectedListedToken || selectedSecurityToken;
  const symbol = selectedListedToken?.symbol || selectedSecurityToken?.symbol || '';
  const currentPrice = selectedListedToken?.current_price || '1.00';

  if (!isConnected) {
    return (
      <div className="bg-gray-900 rounded-xl p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Trade
        </h3>
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-gray-400 mb-4">Connect wallet to trade</p>
        </div>
      </div>
    );
  }

  if (isWrongChain) {
    return (
      <div className="bg-gray-900 rounded-xl p-4">
        <h3 className="font-semibold mb-4">Trade</h3>
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">Switch to {chainName} to trade</p>
          <button
            onClick={() => onSwitchNetwork(chainId)}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors"
          >
            Switch Network
          </button>
        </div>
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div className="bg-gray-900 rounded-xl p-4">
        <h3 className="font-semibold mb-4">Trade</h3>
        <div className="text-center py-8">
          <p className="text-gray-400">Select a token to trade</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        Trade
      </h3>

      <div className="space-y-4">
        {/* Order Type Toggle */}
        <div className="flex gap-2 p-1 bg-gray-800 rounded-lg">
          <button
            onClick={() => onOrderTypeChange('limit')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              orderType === 'limit' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Limit
          </button>
          <button
            onClick={() => onOrderTypeChange('market')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              orderType === 'market' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Market
          </button>
        </div>

        {/* Buy/Sell Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => onOrderSideChange('buy')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              orderSide === 'buy' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => onOrderSideChange('sell')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              orderSide === 'sell' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Sell
          </button>
        </div>

        {/* Price Input (Limit orders only) */}
        {orderType === 'limit' && (
          <div>
            <label className="block text-sm text-gray-400 mb-2">Price (USDC)</label>
            <input
              type="number"
              value={orderPrice}
              onChange={(e) => onPriceChange(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Amount ({symbol})</label>
          <input
            type="number"
            value={orderAmount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-2 mt-2">
            {[25, 50, 75, 100].map((pct) => (
              <button key={pct} className="flex-1 text-xs py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        {orderAmount && (orderType === 'market' || orderPrice) && (
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Price</span>
              <span className="text-white">${orderType === 'limit' ? orderPrice : currentPrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Amount</span>
              <span className="text-white">{orderAmount} {symbol}</span>
            </div>
            <div className="flex justify-between border-t border-gray-700 pt-2">
              <span className="text-gray-400">Total</span>
              <span className={orderSide === 'buy' ? 'text-green-400' : 'text-red-400'}>
                ${(parseFloat(orderAmount || '0') * parseFloat(orderType === 'limit' ? orderPrice || '0' : String(currentPrice))).toFixed(2)} USDC
              </span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {orderError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-sm text-red-400">{orderError}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={onSubmit}
          disabled={!orderAmount || (orderType === 'limit' && !orderPrice) || orderSubmitting}
          className={`w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            orderSide === 'buy' ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
        >
          {orderSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing...
            </span>
          ) : (
            `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${symbol}`
          )}
        </button>

        {/* Transaction Link */}
        {txHash && (
          <div className="text-center">
            <a href={`${explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300">
              View Transaction →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
