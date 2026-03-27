// src/lib/feesService.ts

// ============================================
// Types (defined here, not imported)
// ============================================

export interface ChainFees {
  KYC_FEE: string;
  KYC_FEE_FORMATTED: string;
  CREATION_FEE: string;
  CREATION_FEE_FORMATTED: string;
}

export interface PlatformFees {
  CROWDFUNDING_SUBMISSION_FEE: number;
  TOKENIZATION_SUBMISSION_FEE: number;
  ESCROW_TRANSACTION_FEE_BPS: number;
  ESCROW_TRANSACTION_FEE_PERCENT: string;
  CROWDFUNDING_PLATFORM_USDT_FEE_BPS: number;
  CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS: number;
  CROWDFUNDING_CLAIM_FEE_BPS: number;
  FEE_RECEIVER_BPS: number;
  LIQUIDITY_WALLET_BPS: number;
  TREASURY_WALLET_BPS: number;
  TOKEN_LIQUIDITY_BPS: number;
  TOKEN_TREASURY_BPS: number;
  INVESTOR_ALLOCATION_BPS: number;
  BPS_DENOMINATOR: number;
}

// ============================================
// Defaults
// ============================================

export const DEFAULT_PLATFORM_FEES: PlatformFees = {
  CROWDFUNDING_SUBMISSION_FEE: 0,
  TOKENIZATION_SUBMISSION_FEE: 0,
  ESCROW_TRANSACTION_FEE_BPS: 0,
  ESCROW_TRANSACTION_FEE_PERCENT: '0',
  CROWDFUNDING_PLATFORM_USDT_FEE_BPS: 0,
  CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS: 0,
  CROWDFUNDING_CLAIM_FEE_BPS: 0,
  FEE_RECEIVER_BPS: 0,
  LIQUIDITY_WALLET_BPS: 0,
  TREASURY_WALLET_BPS: 0,
  TOKEN_LIQUIDITY_BPS: 0,
  TOKEN_TREASURY_BPS: 0,
  INVESTOR_ALLOCATION_BPS: 0,
  BPS_DENOMINATOR: 0,
};

export const DEFAULT_CHAIN_FEES: Record<number, ChainFees> = {
  43113: { KYC_FEE: '10000000000000000', KYC_FEE_FORMATTED: '0.01 AVAX', CREATION_FEE: '10000000000000000', CREATION_FEE_FORMATTED: '0.01 AVAX' },
  43114: { KYC_FEE: '100000000000000000', KYC_FEE_FORMATTED: '0.1 AVAX', CREATION_FEE: '200000000000000000', CREATION_FEE_FORMATTED: '0.2 AVAX' },
  80002: { KYC_FEE: '1000000000000000000', KYC_FEE_FORMATTED: '1 POL', CREATION_FEE: '2000000000000000000', CREATION_FEE_FORMATTED: '2 POL' },
  137: { KYC_FEE: '5000000000000000000', KYC_FEE_FORMATTED: '5 POL', CREATION_FEE: '10000000000000000000', CREATION_FEE_FORMATTED: '10 POL' },
  1: { KYC_FEE: '1000000000000000', KYC_FEE_FORMATTED: '0.001 ETH', CREATION_FEE: '2000000000000000', CREATION_FEE_FORMATTED: '0.002 ETH' },
  11155111: { KYC_FEE: '10000000000000000', KYC_FEE_FORMATTED: '0.01 ETH', CREATION_FEE: '10000000000000000', CREATION_FEE_FORMATTED: '0.01 ETH' },
  42161: { KYC_FEE: '1000000000000000', KYC_FEE_FORMATTED: '0.001 ETH', CREATION_FEE: '2000000000000000', CREATION_FEE_FORMATTED: '0.002 ETH' },
  8453: { KYC_FEE: '1000000000000000', KYC_FEE_FORMATTED: '0.001 ETH', CREATION_FEE: '2000000000000000', CREATION_FEE_FORMATTED: '0.002 ETH' },
  10: { KYC_FEE: '1000000000000000', KYC_FEE_FORMATTED: '0.001 ETH', CREATION_FEE: '2000000000000000', CREATION_FEE_FORMATTED: '0.002 ETH' },
  56: { KYC_FEE: '5000000000000000', KYC_FEE_FORMATTED: '0.005 BNB', CREATION_FEE: '10000000000000000', CREATION_FEE_FORMATTED: '0.01 BNB' },
  97: { KYC_FEE: '10000000000000000', KYC_FEE_FORMATTED: '0.01 BNB', CREATION_FEE: '10000000000000000', CREATION_FEE_FORMATTED: '0.01 BNB' },
  25: { KYC_FEE: '10000000000000000000', KYC_FEE_FORMATTED: '10 CRO', CREATION_FEE: '20000000000000000000', CREATION_FEE_FORMATTED: '20 CRO' },
  338: { KYC_FEE: '1000000000000000000', KYC_FEE_FORMATTED: '1 CRO', CREATION_FEE: '1000000000000000000', CREATION_FEE_FORMATTED: '1 CRO' },
};

const FALLBACK_CHAIN_FEES: ChainFees = {
  KYC_FEE: '10000000000000000',
  KYC_FEE_FORMATTED: '0.01',
  CREATION_FEE: '10000000000000000',
  CREATION_FEE_FORMATTED: '0.01',
};

// ============================================
// State
// ============================================

let _platformFees: PlatformFees = { ...DEFAULT_PLATFORM_FEES };
let _chainFees: Record<string, ChainFees> = {};
let _initialized = false;
let _initializing: Promise<void> | null = null;
let _lastFetch: number = 0;
const CACHE_TTL = 60_000; // 1 minute

// ============================================
// Subscribers
// ============================================

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function subscribe(callback: Subscriber): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function notifySubscribers() {
  subscribers.forEach((cb) => cb());
}

// ============================================
// Initialization
// ============================================

export async function initializeFees(force = false): Promise<void> {
  const now = Date.now();

  console.log('[feesService] initializeFees called', { 
    force, 
    _initialized, 
    cacheAge: now - _lastFetch,
    hasInitializing: !!_initializing 
  });

  if (!force && _initialized && now - _lastFetch < CACHE_TTL) {
    console.log('[feesService] Using cached data');
    return;
  }

  if (_initializing) {
    console.log('[feesService] Already initializing, waiting...');
    return _initializing;
  }

  _initializing = (async () => {
    try {
      console.log('[feesService] Fetching from /api/config/fees...');
      
      const response = await fetch('/api/config/fees', { 
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('[feesService] Response status:', response.status);

      if (!response.ok) {
        console.warn('[feesService] Failed to fetch fees, status:', response.status);
        _initialized = true;
        return;
      }

      const data = await response.json();
      console.log('[feesService] Received data:', data);

      if (data.success) {
        if (data.platformFees) {
          _platformFees = { ...DEFAULT_PLATFORM_FEES, ...data.platformFees };
          console.log('[feesService] Platform fees loaded:', _platformFees);
        }
        if (data.chainFees) {
          _chainFees = data.chainFees;
          console.log('[feesService] Chain fees loaded:', Object.keys(_chainFees));
        }
        _lastFetch = now;
        _initialized = true;

        notifySubscribers();
      } else {
        console.warn('[feesService] Response success=false:', data);
      }
    } catch (error) {
      console.error('[feesService] Error fetching fees:', error);
      _initialized = true;
    } finally {
      _initializing = null;
    }
  })();

  return _initializing;
}

export async function refreshFees(): Promise<void> {
  _initialized = false;
  _lastFetch = 0;
  return initializeFees(true);
}

// ============================================
// Getters
// ============================================

export function getChainFees(chainId: number): ChainFees {
  const chainIdStr = chainId.toString();

  // DB values first
  if (_chainFees[chainIdStr]) {
    return _chainFees[chainIdStr];
  }

  // Defaults
  if (DEFAULT_CHAIN_FEES[chainId]) {
    return DEFAULT_CHAIN_FEES[chainId];
  }

  return FALLBACK_CHAIN_FEES;
}

export function getPlatformFees(): PlatformFees {
  return _platformFees;
}

export function getFees(chainId?: number): PlatformFees & ChainFees {
  return {
    ...getPlatformFees(),
    ...getChainFees(chainId ?? 43113),
  };
}

export function isChainFeesFromDB(chainId: number): boolean {
  return !!_chainFees[chainId.toString()];
}

export function getFeesStatus() {
  return {
    initialized: _initialized,
    chainFeesCount: Object.keys(_chainFees).length,
    lastFetch: _lastFetch,
    cacheAge: Date.now() - _lastFetch,
  };
}

// ============================================
// Setters
// ============================================

export function setChainFees(chainId: number, fees: ChainFees): void {
  _chainFees[chainId.toString()] = fees;
  notifySubscribers();
}

export function setPlatformFees(fees: Partial<PlatformFees>): void {
  _platformFees = { ..._platformFees, ...fees };
  notifySubscribers();
}

// ============================================
// Async Getters
// ============================================

export async function getChainFeesAsync(chainId: number): Promise<ChainFees> {
  await initializeFees();
  return getChainFees(chainId);
}

export async function getPlatformFeesAsync(): Promise<PlatformFees> {
  await initializeFees();
  return getPlatformFees();
}
