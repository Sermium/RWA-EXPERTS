import { Address } from 'viem';

// MEXC Types
export interface MexcOrderBook {
  bids: [string, string][];
  asks: [string, string][];
  timestamp: number;
}

export interface MexcTicker {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

// Security Token Types
export interface SecurityOrder {
  orderId: bigint;
  trader: Address;
  tokenAddress: Address;
  isBuy: boolean;
  price: bigint;
  amount: bigint;
  filled: bigint;
  timestamp: bigint;
  status: number;
}

export interface TradingPair {
  token: Address;
  isActive: boolean;
  minOrderSize: bigint;
  maxOrderSize: bigint;
  priceDecimals: number;
}

export interface TokenBalance {
  address: Address;
  symbol: string;
  balance: bigint;
  decimals: number;
}

export interface SecurityTokenData {
  address: Address;
  name: string;
  symbol: string;
  totalSupply: bigint;
  tradingPair: TradingPair | null;
  orderBook: {
    bids: SecurityOrder[];
    asks: SecurityOrder[];
  };
}

export interface DepositAddress {
  address: string;
  memo: string | null;
  tag: string | null;
  network: string;
  coin: string;
}

export interface SecurityOrderBookData {
  bids: { price: number; quantity: number; total: number }[];
  asks: { price: number; quantity: number; total: number }[];
  spread: string;
  spreadPercent: string;
  bestBid: number;
  bestAsk: number;
  pairId?: string;
}

export interface ListedToken {
  id: string;
  project_id: string;
  name: string;
  symbol: string;
  token_address: string;
  chain_id: number;
  decimals: number;
  is_active: boolean;
  is_tradeable: boolean;
  initial_price: number;
  current_price: number;
  asset_type: string;
  logo_url?: string;
  banner_url?: string;
  documents?: {
    files?: Array<{
      name: string;
      type: string;
      url: string;
      mimeType: string;
      size: number;
    }>;
    website?: string;
  };
  asset_description?: string;
  projects?: {
    id: string;
    name: string;
    symbol: string;
    description: string;
    token_address: string;
    nft_address: string;
    total_supply: number;
    price_per_token: number;
    funding_goal: number;
    metadata_uri: string;
    owner_address: string;
    status: string;
    application_id: string;
  };
}

export interface CategoryCount {
  [key: string]: number;
}