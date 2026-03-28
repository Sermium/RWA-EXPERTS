// src/config/exchange.ts
// Unified exchange configuration - MEXC + Platform settings

// ============================================================================
// TYPES
// ============================================================================

export type TokenSymbol = 'USDT' | 'USDC' | 'POL' | 'ETH' | 'BTC' | 'MATIC';
export type PairSymbol = 'USDTUSDC' | 'POLUSDT' | 'POLUSDC' | 'ETHUSDT' | 'ETHUSDC' | 'BTCUSDT' | 'BTCUSDC' | 'MATICUSDT';

export interface TradingPair {
  symbol: PairSymbol;
  base: TokenSymbol;
  quote: TokenSymbol;
  displaySymbol: string;
}

export interface PairConfig {
  pricePrecision: number;
  qtyPrecision: number;
  minQty: number;
}

export interface TokenConfig {
  symbol: TokenSymbol;
  name: string;
  address: `0x${string}`;
  decimals: number;
  icon: string;
  isNative?: boolean;
}

// ============================================================================
// PLATFORM CONFIGURATION
// ============================================================================

export const PLATFORM_CONFIG = {
  // Wallets
  WALLET: process.env.NEXT_PUBLIC_ADMIN_ADDRESS as `0x${string}`,
  PRIVATE_KEY: process.env.VERIFIER_PRIVATE_KEY as `0x${string}`,
  
  // Fees
  MARKUP_PERCENT: 0.5,        // Spread markup (profit from spread)
  PLATFORM_FEE_PERCENT: 1.0,  // Platform fee
  
  get TOTAL_FEE_PERCENT() {
    return this.MARKUP_PERCENT + this.PLATFORM_FEE_PERCENT;
  },
} as const;

// ============================================================================
// MEXC CONFIGURATION
// ============================================================================

export const MEXC_CONFIG = {
  // API Settings (both naming conventions for backward compatibility)
  API_KEY: process.env.MEXC_API_KEY!,
  SECRET_KEY: process.env.MEXC_SECRET_KEY!,
  BASE_URL: 'https://api.mexc.com',
  baseUrl: 'https://api.mexc.com',  // backward compat
  WS_URL: 'wss://wbs.mexc.com/ws',
  wsUrl: 'wss://wbs.mexc.com/ws',   // backward compat

  // Fees (both formats for backward compatibility)
  MARKUP_PERCENT: 0.5,
  MARKUP_MULTIPLIER: 0.005,         // 0.5% as multiplier
  PLATFORM_FEE_PERCENT: 0.1,
  PLATFORM_FEE_MULTIPLIER: 0.001,   // 0.1% as multiplier


  // Trading pairs
  SUPPORTED_PAIRS: [
    { symbol: 'USDTUSDC', base: 'USDT', quote: 'USDC', displaySymbol: 'USDT/USDC' },
    { symbol: 'POLUSDT', base: 'POL', quote: 'USDT', displaySymbol: 'POL/USDT' },
    { symbol: 'POLUSDC', base: 'POL', quote: 'USDC', displaySymbol: 'POL/USDC' },
    { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT', displaySymbol: 'ETH/USDT' },
    { symbol: 'ETHUSDC', base: 'ETH', quote: 'USDC', displaySymbol: 'ETH/USDC' },
    { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', displaySymbol: 'BTC/USDT' },
    { symbol: 'BTCUSDC', base: 'BTC', quote: 'USDC', displaySymbol: 'BTC/USDC' },
    { symbol: 'MATICUSDT', base: 'MATIC', quote: 'USDT', displaySymbol: 'MATIC/USDT' },
  ] as TradingPair[],

  // Precision settings per pair
  PAIR_CONFIG: {
    'USDTUSDC': { pricePrecision: 4, qtyPrecision: 2, minQty: 1 },
    'POLUSDT': { pricePrecision: 4, qtyPrecision: 2, minQty: 1 },
    'POLUSDC': { pricePrecision: 4, qtyPrecision: 2, minQty: 1 },
    'ETHUSDT': { pricePrecision: 2, qtyPrecision: 5, minQty: 0.001 },
    'ETHUSDC': { pricePrecision: 2, qtyPrecision: 5, minQty: 0.001 },
    'BTCUSDT': { pricePrecision: 2, qtyPrecision: 6, minQty: 0.0001 },
    'BTCUSDC': { pricePrecision: 2, qtyPrecision: 6, minQty: 0.0001 },
    'MATICUSDT': { pricePrecision: 4, qtyPrecision: 2, minQty: 1 },
  } as Record<PairSymbol, PairConfig>,
} as const;

// ============================================================================
// DEFAULT TOKENS (Avalanche Fuji - for backward compatibility)
// Note: Use TOKEN_CONFIGS from tokens.ts for chain-specific addresses
// ============================================================================

export const DEFAULT_TOKENS: Record<TokenSymbol, TokenConfig> = {
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x1dBe87Efd97c84d3a73807399EBbfcfF13Ff578e',
    decimals: 6,
    icon: '💲',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    decimals: 6,
    icon: '💵',
  },
  POL: {
    symbol: 'POL',
    name: 'Polygon',
    address: '0x0000000000000000000000000000000000001010',
    decimals: 18,
    icon: '🟣',
    isNative: true,
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
    decimals: 18,
    icon: '⟠',
  },
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 8,
    icon: '₿',
  },
  MATIC: {
    symbol: 'MATIC',
    name: 'Polygon (Legacy)',
    address: '0x0000000000000000000000000000000000001010',
    decimals: 18,
    icon: '🟣',
    isNative: true,
  },
};

// ============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================================================

// Keep EXCHANGE_CONFIG for existing imports
export const EXCHANGE_CONFIG = {
  PLATFORM_WALLET: PLATFORM_CONFIG.WALLET,
  PLATFORM_PRIVATE_KEY: PLATFORM_CONFIG.PRIVATE_KEY,
  MEXC_API_KEY: MEXC_CONFIG.API_KEY,
  MEXC_SECRET_KEY: MEXC_CONFIG.SECRET_KEY,
  MEXC_BASE_URL: MEXC_CONFIG.BASE_URL,
  MARKUP_PERCENT: PLATFORM_CONFIG.MARKUP_PERCENT,
  PLATFORM_FEE_PERCENT: PLATFORM_CONFIG.PLATFORM_FEE_PERCENT,
  get TOTAL_FEE_PERCENT() {
    return PLATFORM_CONFIG.TOTAL_FEE_PERCENT;
  },
  TOKENS: DEFAULT_TOKENS,
};

export type MexcPairSymbol = PairSymbol;
