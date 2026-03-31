'use client';

import { TokenBanner } from './TokenBanner';
import { TokenList } from './TokenList';
import { SecurityOrderBook } from './SecurityOrderBook';
import { SecurityTradeForm } from './SecurityTradeForm';
import { ListedToken, SecurityTokenData, SecurityOrderBookData, CategoryCount } from '../../types';

interface SecurityTabProps {
  // Token data
  securityTokens: SecurityTokenData[];
  listedTokens: ListedToken[];
  selectedSecurityToken: SecurityTokenData | null;
  selectedListedToken: ListedToken | null;
  securityTokenLoading: boolean;
  listedTokensLoading: boolean;
  
  // Category filter
  selectedCategory: string;
  categoryCounts: CategoryCount;
  
  // Order book
  securityOrderBook: SecurityOrderBookData;
  securityOrderBookLoading: boolean;
  
  // Trade form
  isConnected: boolean;
  isWrongChain: boolean;
  chainName: string;
  chainId: number;
  orderType: 'market' | 'limit';
  orderSide: 'buy' | 'sell';
  orderPrice: string;
  orderAmount: string;
  orderError: string | null;
  orderSubmitting: boolean;
  txHash?: string;
  explorerUrl: string;
  
  // Handlers
  onSelectSecurityToken: (token: SecurityTokenData) => void;
  onSelectListedToken: (token: ListedToken) => void;
  onCategoryChange: (category: string) => void;
  onOrderTypeChange: (type: 'market' | 'limit') => void;
  onOrderSideChange: (side: 'buy' | 'sell') => void;
  onPriceChange: (price: string) => void;
  onAmountChange: (amount: string) => void;
  onSubmit: () => void;
  onSwitchNetwork: (chainId: number) => void;
}

export function SecurityTab(props: SecurityTabProps) {
  const handlePriceClick = (price: number, side: 'buy' | 'sell') => {
    props.onPriceChange(price.toFixed(4));
    props.onOrderSideChange(side);
  };

  return (
    <div className="space-y-6">
      {/* Token Details Banner */}
      <TokenBanner
        selectedListedToken={props.selectedListedToken}
        selectedSecurityToken={props.selectedSecurityToken}
        securityOrderBook={props.securityOrderBook}
        explorerUrl={props.explorerUrl}
      />

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Column 1: Token List */}
        <TokenList
          securityTokens={props.securityTokens}
          listedTokens={props.listedTokens}
          selectedSecurityToken={props.selectedSecurityToken}
          selectedListedToken={props.selectedListedToken}
          securityTokenLoading={props.securityTokenLoading}
          listedTokensLoading={props.listedTokensLoading}
          selectedCategory={props.selectedCategory}
          categoryCounts={props.categoryCounts}
          onSelectSecurityToken={props.onSelectSecurityToken}
          onSelectListedToken={props.onSelectListedToken}
          onCategoryChange={props.onCategoryChange}
        />

        {/* Column 2: Order Book */}
        <SecurityOrderBook
          selectedListedToken={props.selectedListedToken}
          selectedSecurityToken={props.selectedSecurityToken}
          securityOrderBook={props.securityOrderBook}
          securityOrderBookLoading={props.securityOrderBookLoading}
          onPriceClick={handlePriceClick}
        />

        {/* Column 3: Trade Form */}
        <SecurityTradeForm
          isConnected={props.isConnected}
          isWrongChain={props.isWrongChain}
          chainName={props.chainName}
          chainId={props.chainId}
          selectedListedToken={props.selectedListedToken}
          selectedSecurityToken={props.selectedSecurityToken}
          orderType={props.orderType}
          orderSide={props.orderSide}
          orderPrice={props.orderPrice}
          orderAmount={props.orderAmount}
          orderError={props.orderError}
          orderSubmitting={props.orderSubmitting}
          txHash={props.txHash}
          explorerUrl={props.explorerUrl}
          onOrderTypeChange={props.onOrderTypeChange}
          onOrderSideChange={props.onOrderSideChange}
          onPriceChange={props.onPriceChange}
          onAmountChange={props.onAmountChange}
          onSubmit={props.onSubmit}
          onSwitchNetwork={props.onSwitchNetwork}
        />
      </div>
    </div>
  );
}
