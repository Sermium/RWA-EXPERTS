import { RWASecurityExchangeABI } from '@/config/abis';

// Tradable statuses for security tokens
export const TRADABLE_STATUSES = [2, 3, 4]; // Funded, Distributing, Active

// MEXC API configuration
export const MEXC_CONFIG = {
  tradingFee: 0.001, // 0.1% MEXC fee
  platformMarkup: 0.005, // 0.5% platform markup
  platformFee: 0.01, // 1% total platform fee
  supportedPairs: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'AVAXUSDT', 'ARBUSDT', 'CROUSDT', 'OPUSDT', 'POLUSDT'],
  refreshInterval: 10000, // 10 seconds
};

// Token category filters - matches database constraint
export const TOKEN_CATEGORIES = [
  { value: 'all', label: 'All', icon: '🔷' },
  { value: 'real_estate', label: 'Real Estate', icon: '🏠' },
  { value: 'infrastructure', label: 'Infrastructure', icon: '🏗️' },
  { value: 'art_collectibles', label: 'Art & Collectibles', icon: '🎨' },
  { value: 'business_equity', label: 'Business Equity', icon: '🏢' },
  { value: 'revenue_based', label: 'Revenue', icon: '💰' },
  { value: 'commodities', label: 'Commodities', icon: '📦' },
  { value: 'other', label: 'Other', icon: '🔷' },
];

// Token icons mapping
export const TOKEN_ICONS: Record<string, string> = {
  BTC: '/chains/bitcoin.svg',
  ETH: '/chains/ethereum.svg',
  BNB: '/chains/bnb.svg',
  AVAX: '/chains/avalanche.svg',
  ARB: '/chains/arbitrum.svg',
  CRO: '/chains/cronos.svg',
  OP: '/chains/optimism.svg',
  POL: '/chains/polygon.svg',
  USDT: '/chains/tether.svg',
  USDC: '/chains/usdc.svg',
};

// Extended exchange ABI with additional view functions
export const ExtendedExchangeABI = [
  ...RWASecurityExchangeABI,
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'getTradingPair',
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'isActive', type: 'bool' },
      { name: 'minOrderSize', type: 'uint256' },
      { name: 'maxOrderSize', type: 'uint256' },
      { name: 'priceDecimals', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'validPairs',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'getOrderBook',
    outputs: [
      {
        name: 'bids', type: 'tuple[]', components: [
          { name: 'orderId', type: 'uint256' },
          { name: 'trader', type: 'address' },
          { name: 'tokenAddress', type: 'address' },
          { name: 'isBuy', type: 'bool' },
          { name: 'price', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
          { name: 'filled', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'status', type: 'uint8' },
        ]
      },
      {
        name: 'asks', type: 'tuple[]', components: [
          { name: 'orderId', type: 'uint256' },
          { name: 'trader', type: 'address' },
          { name: 'tokenAddress', type: 'address' },
          { name: 'isBuy', type: 'bool' },
          { name: 'price', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
          { name: 'filled', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'status', type: 'uint8' },
        ]
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'isBuy', type: 'bool' },
      { name: 'price', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'createOrder',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;