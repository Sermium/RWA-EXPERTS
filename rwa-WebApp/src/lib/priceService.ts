// src/lib/priceService.ts
// Price Service - Real-time crypto price fetching and fee calculation

import { SupportedChainId } from '@/config/chains';
import { formatUnits, parseUnits } from 'viem';

// ============================================
// Types
// ============================================

interface PriceCache {
  price: number;
  timestamp: number;
}

interface ChainFeesWithUsd {
  KYC_FEE: string;
  KYC_FEE_FORMATTED: string;
  KYC_FEE_USD: number;
  CREATION_FEE: string;
  CREATION_FEE_FORMATTED: string;
  CREATION_FEE_USD: number;
}

interface CryptoPrices {
  [symbol: string]: number;
}

// ============================================
// Constants
// ============================================

const CACHE_DURATION = 60_000; // 1 minute cache
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for bulk prices

// CoinGecko IDs for native tokens
const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  MATIC: 'matic-network',
  POL: 'matic-network', // Polygon renamed
  AVAX: 'avalanche-2',
  BNB: 'binancecoin',
  CRO: 'crypto-com-chain',
};

// Chain ID to native token symbol mapping
const CHAIN_NATIVE_SYMBOLS: Record<number, string> = {
  1: 'ETH',       // Ethereum Mainnet
  11155111: 'ETH', // Sepolia
  137: 'POL',     // Polygon Mainnet
  80002: 'POL',   // Polygon Amoy
  43114: 'AVAX',  // Avalanche Mainnet
  43113: 'AVAX',  // Avalanche Fuji
  56: 'BNB',      // BNB Mainnet
  97: 'BNB',      // BNB Testnet
  42161: 'ETH',   // Arbitrum
  8453: 'ETH',    // Base
  10: 'ETH',      // Optimism
  25: 'CRO',      // Cronos Mainnet
  338: 'CRO',     // Cronos Testnet
};

// Chain ID to decimals (native token decimals)
const CHAIN_DECIMALS: Record<number, number> = {
  1: 18,
  11155111: 18,
  137: 18,
  80002: 18,
  43114: 18,
  43113: 18,
  56: 18,
  97: 18,
  42161: 18,
  8453: 18,
  10: 18,
  25: 18,
  338: 18,
};

// Fallback prices (in USD) - used when API fails
const FALLBACK_PRICES: Record<string, number> = {
  ETH: 3500,
  MATIC: 0.40,
  POL: 0.40,
  AVAX: 35,
  BNB: 600,
  CRO: 0.10,
};

// Fixed USD fee amounts
export const KYC_FEE_USD = 5;
export const CREATION_FEE_USD = 10;

// ============================================
// Cache
// ============================================

const priceCache: Record<string, PriceCache> = {};
let bulkPricesCache: { prices: CryptoPrices; timestamp: number } | null = null;

// ============================================
// Helper Functions
// ============================================

/**
 * Get native token symbol for a chain
 */
export function getNativeSymbol(chainId: number): string {
  return CHAIN_NATIVE_SYMBOLS[chainId] || 'ETH';
}

/**
 * Get decimals for native token on a chain
 */
export function getNativeDecimals(chainId: number): number {
  return CHAIN_DECIMALS[chainId] || 18;
}

/**
 * Check if cache is still valid
 */
function isCacheValid(timestamp: number, ttl: number = CACHE_DURATION): boolean {
  return Date.now() - timestamp < ttl;
}

// ============================================
// Price Fetching
// ============================================

/**
 * Fetch price for a single token from CoinGecko
 */
export async function getNativeTokenPrice(chainId: number): Promise<number> {
  const symbol = getNativeSymbol(chainId);
  const coingeckoId = COINGECKO_IDS[symbol];

  // Check cache first
  const cached = priceCache[symbol];
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.price;
  }

  // Fetch from CoinGecko
  if (coingeckoId) {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`,
        { next: { revalidate: 60 } }
      );

      if (response.ok) {
        const data = await response.json();
        const price = data[coingeckoId]?.usd;

        if (price && typeof price === 'number') {
          // Update cache
          priceCache[symbol] = { price, timestamp: Date.now() };
          return price;
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch price for ${symbol}:`, error);
    }
  }

  // Return fallback price
  return FALLBACK_PRICES[symbol] || FALLBACK_PRICES.ETH;
}

/**
 * Fetch prices for all supported tokens (bulk)
 */
export async function getCryptoPrices(): Promise<CryptoPrices> {
  // Check bulk cache
  if (bulkPricesCache && isCacheValid(bulkPricesCache.timestamp, CACHE_TTL)) {
    return bulkPricesCache.prices;
  }

  const ids = Object.values(COINGECKO_IDS).join(',');

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { next: { revalidate: 60 } }
    );

    if (response.ok) {
      const data = await response.json();
      const prices: CryptoPrices = {};

      // Map CoinGecko IDs back to symbols
      for (const [symbol, coingeckoId] of Object.entries(COINGECKO_IDS)) {
        const price = data[coingeckoId]?.usd;
        if (price && typeof price === 'number') {
          prices[symbol] = price;
          // Also update individual cache
          priceCache[symbol] = { price, timestamp: Date.now() };
        }
      }

      // Update bulk cache
      bulkPricesCache = { prices, timestamp: Date.now() };
      return prices;
    }
  } catch (error) {
    console.warn('Failed to fetch bulk prices:', error);
  }

  // Return fallback prices
  return { ...FALLBACK_PRICES };
}

/**
 * Get price for a specific symbol
 */
export async function getSymbolPrice(symbol: string): Promise<number> {
  const prices = await getCryptoPrices();
  return prices[symbol] || FALLBACK_PRICES[symbol] || FALLBACK_PRICES.ETH;
}

// ============================================
// Fee Calculations
// ============================================

/**
 * Calculate native token amount for a given USD value
 */
export async function calculateNativeAmountForUSD(
  chainId: number,
  usdAmount: number
): Promise<{
  native: bigint;
  nativeFormatted: string;
  price: number;
  symbol: string;
}> {
  const price = await getNativeTokenPrice(chainId);
  const symbol = getNativeSymbol(chainId);
  const decimals = getNativeDecimals(chainId);

  // Calculate native amount: usdAmount / price
  const nativeAmount = usdAmount / price;

  // Convert to bigint with proper decimals
  const native = parseUnits(nativeAmount.toFixed(decimals), decimals);
  const nativeFormatted = nativeAmount.toFixed(6);

  return {
    native,
    nativeFormatted,
    price,
    symbol,
  };
}

/**
 * Convert native token amount to USD
 */
export async function convertToUsd(
  chainId: number,
  nativeAmount: string | bigint
): Promise<number> {
  const price = await getNativeTokenPrice(chainId);
  const decimals = getNativeDecimals(chainId);

  const amountBigInt = typeof nativeAmount === 'string' ? BigInt(nativeAmount) : nativeAmount;
  const formatted = parseFloat(formatUnits(amountBigInt, decimals));

  return formatted * price;
}

/**
 * Get chain fees with real-time USD conversion
 */
export async function getChainFeesWithUsd(
  chainId: number,
  baseFees: { KYC_FEE: string; CREATION_FEE: string }
): Promise<ChainFeesWithUsd> {
  const price = await getNativeTokenPrice(chainId);
  const decimals = getNativeDecimals(chainId);
  const symbol = getNativeSymbol(chainId);

  // Parse native amounts
  const kycFeeNative = parseFloat(baseFees.KYC_FEE);
  const creationFeeNative = parseFloat(baseFees.CREATION_FEE);

  // Calculate USD values
  const kycFeeUsd = kycFeeNative * price;
  const creationFeeUsd = creationFeeNative * price;

  return {
    KYC_FEE: parseUnits(baseFees.KYC_FEE, decimals).toString(),
    KYC_FEE_FORMATTED: `${baseFees.KYC_FEE} ${symbol}`,
    KYC_FEE_USD: kycFeeUsd,
    CREATION_FEE: parseUnits(baseFees.CREATION_FEE, decimals).toString(),
    CREATION_FEE_FORMATTED: `${baseFees.CREATION_FEE} ${symbol}`,
    CREATION_FEE_USD: creationFeeUsd,
  };
}

/**
 * Calculate dynamic fee based on target USD amount
 * Returns the native token amount needed to equal the target USD
 */
export async function calculateDynamicFee(
  chainId: number,
  targetUsd: number
): Promise<{
  nativeAmount: bigint;
  nativeFormatted: string;
  usdAmount: number;
  price: number;
  symbol: string;
}> {
  const result = await calculateNativeAmountForUSD(chainId, targetUsd);

  return {
    nativeAmount: result.native,
    nativeFormatted: result.nativeFormatted,
    usdAmount: targetUsd,
    price: result.price,
    symbol: result.symbol,
  };
}

// ============================================
// Cache Management
// ============================================

/**
 * Clear all price caches
 */
export function clearPriceCache(): void {
  Object.keys(priceCache).forEach((key) => delete priceCache[key]);
  bulkPricesCache = null;
}

/**
 * Get cache status (for debugging)
 */
export function getCacheStatus(): {
  individualCaches: Record<string, { price: number; age: number }>;
  bulkCache: { age: number; symbols: string[] } | null;
} {
  const now = Date.now();

  const individualCaches: Record<string, { price: number; age: number }> = {};
  for (const [symbol, cache] of Object.entries(priceCache)) {
    individualCaches[symbol] = {
      price: cache.price,
      age: Math.round((now - cache.timestamp) / 1000),
    };
  }

  const bulkCache = bulkPricesCache
    ? {
        age: Math.round((now - bulkPricesCache.timestamp) / 1000),
        symbols: Object.keys(bulkPricesCache.prices),
      }
    : null;

  return { individualCaches, bulkCache };
}
