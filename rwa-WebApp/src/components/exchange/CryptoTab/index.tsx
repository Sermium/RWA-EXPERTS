'use client';

import { MarketList } from './MarketList';
import { CryptoOrderBook } from './CryptoOrderBook';
import { QuickTradeForm } from './QuickTradeForm';
import { MexcOrderBook, MexcTicker } from '../../types';

interface CryptoTabProps {
  selectedPair: string;
  orderBook: MexcOrderBook | null;
  ticker: MexcTicker | null;
  tickers: Record<string, MexcTicker>;
  orderType: 'market' | 'limit';
  tradeType: 'buy' | 'sell';
  tradeAmount: string;
  limitPrice: string;
  onPairSelect: (pair: string) => void;
  onOrderTypeChange: (type: 'market' | 'limit') => void;
  onTradeTypeChange: (type: 'buy' | 'sell') => void;
  onAmountChange: (amount: string) => void;
  onLimitPriceChange: (price: string) => void;
  onSubmit: () => void;
  onDepositClick: () => void;
}

export function CryptoTab(props: CryptoTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Market List */}
      <MarketList
        selectedPair={props.selectedPair}
        tickers={props.tickers}
        onPairSelect={props.onPairSelect}
        onDepositClick={props.onDepositClick}
      />

      {/* Order Book */}
      <CryptoOrderBook
        selectedPair={props.selectedPair}
        orderBook={props.orderBook}
        ticker={props.ticker}
        tickers={props.tickers}
      />

      {/* Quick Trade Form */}
      <QuickTradeForm
        selectedPair={props.selectedPair}
        tickers={props.tickers}
        orderType={props.orderType}
        tradeType={props.tradeType}
        tradeAmount={props.tradeAmount}
        limitPrice={props.limitPrice}
        onOrderTypeChange={props.onOrderTypeChange}
        onTradeTypeChange={props.onTradeTypeChange}
        onAmountChange={props.onAmountChange}
        onLimitPriceChange={props.onLimitPriceChange}
        onSubmit={props.onSubmit}
      />
    </div>
  );
}