// src/app/exchange/ExchangeClient.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage, useChainId, useReadContract } from 'wagmi';
import { DEPLOYMENTS } from '@/config/deployments';
import type { SupportedChainId } from '@/config/chains';
import { formatUnits, parseUnits } from 'viem';
import { RWASecurityTokenABI, ERC20ABI } from '@/config/abis';
import PriceChart from '@/components/PriceChart';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  ArrowUpDown,
  Wallet,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ChevronDown,
  X,
  Check,
  Clock,
  DollarSign,
  BarChart3,
  Activity,
  Shield,
  Store,
  Filter,
  Coins,
} from 'lucide-react';

// MEXC Config - inline to avoid import issues
const MEXC_CONFIG = {
  tradingFee: 0.001,
  platformMarkup: 0.005,
  platformFee: 0.01,
  supportedPairs: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'AVAXUSDT', 'ARBUSDT', 'OPUSDT', 'POLUSDT'],
  refreshInterval: 10000,
};

const TOKEN_ICONS: Record<string, string> = {
  BTC: '/chains/bitcoin.svg',
  ETH: '/chains/ethereum.svg',
  BNB: '/chains/bnb.svg',
  AVAX: '/chains/avalanche.svg',
  ARB: '/chains/arbitrum.svg',
  OP: '/chains/optimism.svg',
  POL: '/chains/polygon.svg',
  USDT: '/chains/tether.svg',
  USDC: '/chains/usdc.svg',
};

// Types
interface CryptoPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: string;
  change24h: string;
  high24h: string;
  low24h: string;
  volume24h: string;
  icon?: string;
}

interface MexcOrderBookEntry {
  price: string;
  amount: string;
}

interface SecurityToken {
  id: string;
  address: string;
  symbol: string;
  name: string;
  owner: string;
  chainId: number;
  tradingPair: string;
  price: string;
  marketCap: string;
  minOrder: string;
  maxOrder: string;
  status: string;
  listedAt: string;
  logoUrl?: string;
  totalSupply?: string;
  projectId?: string;
  estimatedValue?: string;
}

interface OrderBookEntry {
  price: string;
  amount: string;
  total: string;
  orderCount?: number;
}

interface Order {
  id: string;
  token_address: string;
  side: 'buy' | 'sell';
  order_type: 'limit' | 'market';
  price: string;
  amount: string;
  filled_amount: string;
  status: string;
  created_at: string;
  exchange_listings?: {
    token_symbol: string;
    token_name: string;
    trading_pair: string;
  };
}

interface Trade {
  id: string;
  price: string;
  amount: string;
  total: string;
  side?: string;
  created_at: string;
  buyer_address?: string;
  seller_address?: string;
}

// Helper functions
function formatNumber(num: number | string, decimals = 2): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  
  if (n >= 1000000000) {
    return (n / 1000000000).toLocaleString('en-US', { maximumFractionDigits: decimals }) + 'B';
  }
  if (n >= 1000000) {
    return (n / 1000000).toLocaleString('en-US', { maximumFractionDigits: decimals }) + 'M';
  }
  
  return n.toLocaleString('en-US', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals 
  });
}

function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ExchangeClient() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const chainId = useChainId();

  // Main tab state
  const [marketType, setMarketType] = useState<'crypto' | 'security'>('crypto');
  const [activeTab, setActiveTab] = useState<'trade' | 'orders' | 'history'>('trade');

  // ============ CRYPTO STATE (MEXC) ============
  const [cryptoPairs, setCryptoPairs] = useState<CryptoPair[]>([]);
  const [selectedCryptoPair, setSelectedCryptoPair] = useState<CryptoPair | null>(null);
  const [cryptoOrderBook, setCryptoOrderBook] = useState<{ bids: MexcOrderBookEntry[]; asks: MexcOrderBookEntry[] }>({ bids: [], asks: [] });
  const [cryptoLoading, setCryptoLoading] = useState(true);
  const [cryptoOrderBookLoading, setCryptoOrderBookLoading] = useState(false);

  // Crypto order form
  const [cryptoOrderSide, setCryptoOrderSide] = useState<'buy' | 'sell'>('buy');
  const [cryptoOrderType, setCryptoOrderType] = useState<'limit' | 'market'>('limit');
  const [cryptoOrderPrice, setCryptoOrderPrice] = useState('');
  const [cryptoOrderAmount, setCryptoOrderAmount] = useState('');
  const [cryptoSubmitting, setCryptoSubmitting] = useState(false);
  const [cryptoSliderValue, setCryptoSliderValue] = useState(0);

  // Crypto balances
  const [cryptoQuoteBalance, setCryptoQuoteBalance] = useState(0);
  const [cryptoBaseBalance, setCryptoBaseBalance] = useState(0);

  // ============ SECURITY TOKEN STATE ============
  const [securityTokens, setSecurityTokens] = useState<SecurityToken[]>([]);
  const [selectedSecurityToken, setSelectedSecurityToken] = useState<SecurityToken | null>(null);
  const [securityOrderBook, setSecurityOrderBook] = useState<{ bids: OrderBookEntry[]; asks: OrderBookEntry[]; spread: any }>({ bids: [], asks: [], spread: null });
  const [securityTrades, setSecurityTrades] = useState<Trade[]>([]);
  const [securityOrders, setSecurityOrders] = useState<Order[]>([]);
  const [securityLoading, setSecurityLoading] = useState(true);

  // Security order form
  const [securityOrderSide, setSecurityOrderSide] = useState<'buy' | 'sell'>('buy');
  const [securityOrderType, setSecurityOrderType] = useState<'limit' | 'market'>('limit');
  const [securityOrderPrice, setSecurityOrderPrice] = useState('');
  const [securityOrderAmount, setSecurityOrderAmount] = useState('');
  const [securitySubmitting, setSecuritySubmitting] = useState(false);
  const [securityQuoteCurrency, setSecurityQuoteCurrency] = useState<'USDC' | 'USDT'>('USDC');
  const [securitySliderValue, setSecuritySliderValue] = useState(0);

  // Balances
  const [securityQuoteBalance, setSecurityQuoteBalance] = useState(0);
  const [securityTokenBalance, setSecurityTokenBalance] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const cryptoSliderRef = useRef<HTMLDivElement>(null);
  const securitySliderRef = useRef<HTMLDivElement>(null);

  // Search
  const [cryptoSearchQuery, setCryptoSearchQuery] = useState('');
  const [securitySearchQuery, setSecuritySearchQuery] = useState('');
  const [showCryptoSelector, setShowCryptoSelector] = useState(false);
  const [showSecuritySelector, setShowSecuritySelector] = useState(false);

  // ============ SLIDER HANDLERS ============
  
  const handleCryptoSliderChange = (value: number) => {
    setCryptoSliderValue(value);
    if (!selectedCryptoPair) return;
    
    const price = parseFloat(cryptoOrderPrice) || parseFloat(selectedCryptoPair.price) || 0;
    if (price <= 0) return;
    
    if (cryptoOrderSide === 'buy') {
      const maxAmount = cryptoQuoteBalance / price;
      const amount = (maxAmount * value / 100).toFixed(6);
      setCryptoOrderAmount(amount);
    } else {
      const amount = (cryptoBaseBalance * value / 100).toFixed(6);
      setCryptoOrderAmount(amount);
    }
  };

  const getStablecoinAddress = (chain: number, currency: 'USDC' | 'USDT'): `0x${string}` | undefined => {
    const deployment = DEPLOYMENTS[chain as SupportedChainId];
    if (!deployment?.tokens) return undefined;
    
    const address = deployment.tokens[currency];
    // Check if it's not the zero address
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return undefined;
    }
    
    return address as `0x${string}`;
  };

  const stablecoinAddress = getStablecoinAddress(chainId, securityQuoteCurrency);

  const handleSecuritySliderChange = (value: number) => {
    setSecuritySliderValue(value);
    if (!selectedSecurityToken) return;
    
    const price = parseFloat(securityOrderPrice) || parseFloat(selectedSecurityToken.price) || 0;
    if (price <= 0) return;
    
    if (securityOrderSide === 'buy') {
      const maxAmount = securityQuoteBalance / price;
      const amount = (maxAmount * value / 100).toFixed(2);
      setSecurityOrderAmount(amount);
    } else {
      const amount = (securityTokenBalance * value / 100).toFixed(2);
      setSecurityOrderAmount(amount);
    }
  };

  const { data: quoteBalanceData, refetch: refetchQuoteBalance } = useReadContract({
    address: stablecoinAddress,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!stablecoinAddress,
    },
  });

  const { data: quoteDecimalsData } = useReadContract({
    address: stablecoinAddress,
    abi: ERC20ABI,
    functionName: 'decimals',
    query: {
      enabled: !!stablecoinAddress,
    },
  });

  const { data: tokenBalanceData, refetch: refetchTokenBalance } = useReadContract({
    address: selectedSecurityToken?.address as `0x${string}` | undefined,
    abi: RWASecurityTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!selectedSecurityToken?.address,
    },
  });

  const { data: tokenDecimalsData } = useReadContract({
    address: selectedSecurityToken?.address as `0x${string}` | undefined,
    abi: RWASecurityTokenABI,
    functionName: 'decimals',
    query: {
      enabled: !!selectedSecurityToken?.address,
    },
  });

  // ============ MEXC CRYPTO FUNCTIONS ============

  const fetchMexcPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/exchange/mexc/prices');
      const data = await res.json();
      
      if (data.pairs) {
        setCryptoPairs(data.pairs);
        
        if (!selectedCryptoPair && data.pairs.length > 0) {
          setSelectedCryptoPair(data.pairs[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch MEXC prices:', err);
    } finally {
      setCryptoLoading(false);
    }
  }, [selectedCryptoPair]);

  const fetchMexcOrderBook = useCallback(async () => {
    if (!selectedCryptoPair) return;
    
    setCryptoOrderBookLoading(true);
    try {
      const res = await fetch(`/api/exchange/mexc/orderbook?symbol=${selectedCryptoPair.symbol}`);
      const data = await res.json();
      
      setCryptoOrderBook({
        bids: data.bids || [],
        asks: data.asks || [],
      });
    } catch (err) {
      console.error('Failed to fetch MEXC order book:', err);
    } finally {
      setCryptoOrderBookLoading(false);
    }
  }, [selectedCryptoPair]);

  // Fetch crypto balances (placeholder)
  useEffect(() => {
    if (address && selectedCryptoPair) {
      // TODO: Replace with actual balance fetching
      setCryptoQuoteBalance(5000);
      setCryptoBaseBalance(0.5);
    }
  }, [address, selectedCryptoPair]);

  // Update quote balance when data changes
  useEffect(() => {
    if (quoteBalanceData !== undefined && quoteDecimalsData !== undefined) {
      const balance = Number(formatUnits(quoteBalanceData as bigint, quoteDecimalsData as number));
      setSecurityQuoteBalance(balance);
    } else {
      setSecurityQuoteBalance(0);
    }
  }, [quoteBalanceData, quoteDecimalsData]);

  // Update token balance when data changes
  useEffect(() => {
    if (tokenBalanceData !== undefined && tokenDecimalsData !== undefined) {
      const balance = Number(formatUnits(tokenBalanceData as bigint, tokenDecimalsData as number));
      setSecurityTokenBalance(balance);
    } else {
      setSecurityTokenBalance(0);
    }
  }, [tokenBalanceData, tokenDecimalsData]);

  const handleCryptoOrder = async () => {
    if (!selectedCryptoPair || !cryptoOrderAmount) return;
    
    setCryptoSubmitting(true);
    try {
      alert(`To ${cryptoOrderSide} ${cryptoOrderAmount} ${selectedCryptoPair.baseAsset}, you will be redirected to MEXC or our fiat on-ramp partner.`);
    } catch (err) {
      console.error('Crypto order error:', err);
    } finally {
      setCryptoSubmitting(false);
    }
  };

  // ============ SECURITY TOKEN FUNCTIONS ============

  const fetchSecurityTokens = useCallback(async () => {
    setSecurityLoading(true);
    try {
      const res = await fetch(`/api/exchange/security/tokens?chainId=${chainId}`);
      const data = await res.json();
      
      if (data.tokens) {
        setSecurityTokens(data.tokens);
        
        if (data.tokens.length > 0) {
          const currentStillValid = selectedSecurityToken && 
            data.tokens.some((t: SecurityToken) => t.id === selectedSecurityToken.id);
          
          if (!currentStillValid) {
            setSelectedSecurityToken(data.tokens[0]);
          }
        } else {
          setSelectedSecurityToken(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch security tokens:', err);
    } finally {
      setSecurityLoading(false);
    }
  }, [chainId, selectedSecurityToken]);

  const fetchSecurityOrderBook = useCallback(async () => {
    if (!selectedSecurityToken) return;
    try {
      const res = await fetch(`/api/exchange/security/orderbook?tokenAddress=${selectedSecurityToken.address}`);
      const data = await res.json();
      setSecurityOrderBook({
        bids: data.bids || [],
        asks: data.asks || [],
        spread: data.spread,
      });
    } catch (err) {
      console.error('Failed to fetch security order book:', err);
    }
  }, [selectedSecurityToken]);

  const fetchSecurityTrades = useCallback(async () => {
    if (!selectedSecurityToken) return;
    try {
      const res = await fetch(`/api/exchange/security/trades?tokenAddress=${selectedSecurityToken.address}&limit=20`);
      const data = await res.json();
      setSecurityTrades(data.trades || []);
    } catch (err) {
      console.error('Failed to fetch security trades:', err);
    }
  }, [selectedSecurityToken]);

  const fetchSecurityOrders = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/exchange/security/order?wallet=${address}&chainId=${chainId}`);
      const data = await res.json();
      setSecurityOrders(data.orders || []);
    } catch (err) {
      console.error('Failed to fetch security orders:', err);
    }
  }, [address, chainId]);

  const handlePlaceSecurityOrder = async () => {
    if (!selectedSecurityToken || !address || !securityOrderAmount) return;
    if (securityOrderType === 'limit' && !securityOrderPrice) return;

    setSecuritySubmitting(true);
    try {
      const timestamp = Date.now().toString();
      const price = securityOrderType === 'market' 
        ? selectedSecurityToken.price 
        : securityOrderPrice;
      
      const message = `Place ${securityOrderSide} order on RWA Exchange\nToken: ${selectedSecurityToken.address}\nAmount: ${securityOrderAmount}\nPrice: ${price}\nQuote: ${securityQuoteCurrency}\nTimestamp: ${timestamp}`;
      
      const signature = await signMessageAsync({ message });

      const res = await fetch('/api/exchange/security/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: selectedSecurityToken.address,
          chainId: selectedSecurityToken.chainId,
          side: securityOrderSide,
          orderType: securityOrderType,
          price: price,
          amount: securityOrderAmount,
          quoteCurrency: securityQuoteCurrency,
          walletAddress: address,
          signature,
          timestamp,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSecurityOrderPrice('');
        setSecurityOrderAmount('');
        setSecuritySliderValue(0);
        fetchSecurityOrderBook();
        fetchSecurityOrders();
        refetchQuoteBalance();
        refetchTokenBalance();
        alert(`Order placed successfully!`);
      } else {
        throw new Error(data.error || 'Failed to place order');
      }
    } catch (err) {
      console.error('Security order error:', err);
      alert(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setSecuritySubmitting(false);
    }
  };

  const handleCancelSecurityOrder = async (orderId: string) => {
    if (!address) return;
    try {
      const res = await fetch(`/api/exchange/security/order?orderId=${orderId}&wallet=${address}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchSecurityOrders();
        fetchSecurityOrderBook();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Cancel error:', err);
      alert('Failed to cancel order');
    }
  };

  const handleSliderMouseDown = (e: React.MouseEvent<HTMLDivElement>, type: 'crypto' | 'security') => {
    setIsDragging(true);
    updateSliderFromEvent(e, type);
  };

  const handleSliderTouchStart = (e: React.TouchEvent<HTMLDivElement>, type: 'crypto' | 'security') => {
    setIsDragging(true);
    updateSliderFromTouch(e, type);
  };

  const updateSliderFromEvent = (e: React.MouseEvent<HTMLDivElement> | MouseEvent, type: 'crypto' | 'security') => {
    const ref = type === 'crypto' ? cryptoSliderRef : securitySliderRef;
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const x = 'clientX' in e ? e.clientX : 0;
    const percentage = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100));
    
    if (type === 'crypto') {
      handleCryptoSliderChange(Math.round(percentage));
    } else {
      handleSecuritySliderChange(Math.round(percentage));
    }
  };

  const updateSliderFromTouch = (e: React.TouchEvent<HTMLDivElement> | TouchEvent, type: 'crypto' | 'security') => {
    const ref = type === 'crypto' ? cryptoSliderRef : securitySliderRef;
    if (!ref.current || !e.touches[0]) return;
    
    const rect = ref.current.getBoundingClientRect();
    const x = e.touches[0].clientX;
    const percentage = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100));
    
    if (type === 'crypto') {
      handleCryptoSliderChange(Math.round(percentage));
    } else {
      handleSecuritySliderChange(Math.round(percentage));
    }
  };

  // ============ EFFECTS ============

  useEffect(() => {
    if (marketType === 'crypto') {
      fetchMexcPrices();
    }
  }, [marketType, fetchMexcPrices]);

  useEffect(() => {
    if (marketType === 'crypto' && selectedCryptoPair) {
      fetchMexcOrderBook();
    }
  }, [marketType, selectedCryptoPair, fetchMexcOrderBook]);

  useEffect(() => {
    if (marketType !== 'crypto') return;
    
    const interval = setInterval(() => {
      fetchMexcPrices();
      if (selectedCryptoPair) {
        fetchMexcOrderBook();
      }
    }, MEXC_CONFIG.refreshInterval);

    return () => clearInterval(interval);
  }, [marketType, selectedCryptoPair, fetchMexcPrices, fetchMexcOrderBook]);

  useEffect(() => {
    if (marketType === 'security') {
      fetchSecurityTokens();
    }
  }, [marketType, chainId, fetchSecurityTokens]);

  useEffect(() => {
    if (marketType === 'security' && selectedSecurityToken) {
      fetchSecurityOrderBook();
      fetchSecurityTrades();
    }
  }, [marketType, selectedSecurityToken, fetchSecurityOrderBook, fetchSecurityTrades]);

  useEffect(() => {
    if (address && marketType === 'security') {
      fetchSecurityOrders();
    }
  }, [address, marketType, chainId, fetchSecurityOrders]);

  useEffect(() => {
    if (marketType !== 'security' || !selectedSecurityToken) return;
    
    const interval = setInterval(() => {
      fetchSecurityOrderBook();
      fetchSecurityTrades();
    }, 10000);

    return () => clearInterval(interval);
  }, [marketType, selectedSecurityToken, fetchSecurityOrderBook, fetchSecurityTrades]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const type = marketType;
      updateSliderFromEvent(e as any, type);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const type = marketType;
      updateSliderFromTouch(e as any, type);
    };
    
    const handleTouchEnd = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, marketType]);

  // Filter functions
  const filteredCryptoPairs = cryptoPairs.filter(pair =>
    pair.baseAsset.toLowerCase().includes(cryptoSearchQuery.toLowerCase()) ||
    pair.symbol.toLowerCase().includes(cryptoSearchQuery.toLowerCase())
  );

  const filteredSecurityTokens = securityTokens.filter(token =>
    token.symbol.toLowerCase().includes(securitySearchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(securitySearchQuery.toLowerCase())
  );

  // Calculate order totals
  const cryptoOrderTotal = cryptoOrderPrice && cryptoOrderAmount 
    ? (parseFloat(cryptoOrderPrice) * parseFloat(cryptoOrderAmount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : selectedCryptoPair && cryptoOrderAmount
    ? (parseFloat(selectedCryptoPair.price) * parseFloat(cryptoOrderAmount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  const securityOrderTotal = securityOrderPrice && securityOrderAmount 
    ? (parseFloat(securityOrderPrice) * parseFloat(securityOrderAmount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : selectedSecurityToken && securityOrderAmount
    ? (parseFloat(selectedSecurityToken.price) * parseFloat(securityOrderAmount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  const getChainName = (id: number) => {
    const chains: Record<number, string> = {
      1: 'Ethereum',
      137: 'Polygon',
      80002: 'Polygon Amoy',
      43114: 'Avalanche',
      43113: 'Avalanche Fuji',
      56: 'BSC',
      97: 'BSC Testnet',
      42161: 'Arbitrum',
      421614: 'Arbitrum Sepolia',
    };
    return chains[id] || `Chain ${id}`;
  };

  const isLoading = marketType === 'crypto' ? cryptoLoading : securityLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-sunken flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
          <p className="text-ink-muted">Loading exchange...</p>
        </div>
      </div>
    );
  }

  // ============ SHARED ORDER FORM COMPONENT ============
  const renderOrderForm = (type: 'crypto' | 'security') => {
    const isCrypto = type === 'crypto';
    const orderSide = isCrypto ? cryptoOrderSide : securityOrderSide;
    const setOrderSide = isCrypto ? setCryptoOrderSide : setSecurityOrderSide;
    const orderType = isCrypto ? cryptoOrderType : securityOrderType;
    const setOrderType = isCrypto ? setCryptoOrderType : setSecurityOrderType;
    const orderPrice = isCrypto ? cryptoOrderPrice : securityOrderPrice;
    const setOrderPrice = isCrypto ? setCryptoOrderPrice : setSecurityOrderPrice;
    const orderAmount = isCrypto ? cryptoOrderAmount : securityOrderAmount;
    const setOrderAmount = isCrypto ? setCryptoOrderAmount : setSecurityOrderAmount;
    const sliderValue = isCrypto ? cryptoSliderValue : securitySliderValue;
    const handleSliderChange = isCrypto ? handleCryptoSliderChange : handleSecuritySliderChange;
    const submitting = isCrypto ? cryptoSubmitting : securitySubmitting;
    const handleOrder = isCrypto ? handleCryptoOrder : handlePlaceSecurityOrder;
    const orderTotal = isCrypto ? cryptoOrderTotal : securityOrderTotal;
    
    const baseSymbol = isCrypto ? selectedCryptoPair?.baseAsset : selectedSecurityToken?.symbol;
    const quoteSymbol = isCrypto ? 'USDT' : securityQuoteCurrency;
    const currentPrice = isCrypto ? selectedCryptoPair?.price : selectedSecurityToken?.price;
    const quoteBalance = isCrypto ? cryptoQuoteBalance : securityQuoteBalance;
    const baseBalance = isCrypto ? cryptoBaseBalance : securityTokenBalance;
    
    return (
      <div className="p-3 space-y-3">
        {/* Available Balance Section */}
        <div className="p-2.5 bg-surface rounded-lg border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-ink-faint uppercase tracking-wide">Available</span>
            <Wallet className="w-3 h-3 text-ink-faint" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-ink">
                {orderSide === 'buy' 
                  ? quoteBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                  : baseBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
              <span className="text-xs text-ink-faint ml-1">{orderSide === 'buy' ? quoteSymbol : baseSymbol}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-ink-faint">≈ $</span>
              <span className="text-xs text-ink-muted">
                {orderSide === 'buy' 
                  ? quoteBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : (baseBalance * parseFloat(currentPrice || '0')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }
              </span>
            </div>
          </div>
        </div>

        {/* Order Type Tabs */}
        <div className="flex gap-4 border-b border-border pb-1">
          <button
            onClick={() => setOrderType('limit')}
            className={`text-xs font-medium pb-1 border-b-2 transition-colors ${
              orderType === 'limit'
                ? 'text-ink border-gold'
                : 'text-ink-faint border-transparent hover:text-ink-muted'
            }`}
          >
            Limit
          </button>
          <button
            onClick={() => setOrderType('market')}
            className={`text-xs font-medium pb-1 border-b-2 transition-colors ${
              orderType === 'market'
                ? 'text-ink border-gold'
                : 'text-ink-faint border-transparent hover:text-ink-muted'
            }`}
          >
            Market
          </button>
        </div>

        {/* Quote Currency Selector (Security only) */}
        {!isCrypto && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-ink-faint">Quote:</span>
            <div className="flex bg-surface rounded p-0.5 border border-border">
              <button
                onClick={() => setSecurityQuoteCurrency('USDC')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  securityQuoteCurrency === 'USDC'
                    ? 'bg-gold text-surface-sunken'
                    : 'text-ink-faint hover:text-ink'
                }`}
              >
                USDC
              </button>
              <button
                onClick={() => setSecurityQuoteCurrency('USDT')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  securityQuoteCurrency === 'USDT'
                    ? 'bg-gold text-surface-sunken'
                    : 'text-ink-faint hover:text-ink'
                }`}
              >
                USDT
              </button>
            </div>
          </div>
        )}

        {/* Price Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-ink-faint">Price</label>
            {orderType === 'limit' && currentPrice && (
              <button 
                onClick={() => setOrderPrice(currentPrice)}
                className="text-[10px] text-ink-faint hover:text-ink"
              >
                Last: {currentPrice}
              </button>
            )}
          </div>
          {orderType === 'limit' ? (
            <div className="relative">
              <input
                type="number"
                value={orderPrice}
                onChange={(e) => setOrderPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded focus:border-border-strong outline-none text-right pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">{quoteSymbol}</span>
            </div>
          ) : (
            <div className="px-3 py-2 text-sm bg-surface border border-border rounded text-ink-faint text-right">
              Market Price
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-ink-faint">Amount</label>
          </div>
          <div className="relative">
            <input
              type="number"
              value={orderAmount}
              onChange={(e) => {
                setOrderAmount(e.target.value);
                // Update slider based on amount
                const price = parseFloat(orderPrice) || parseFloat(currentPrice || '0');
                if (price > 0) {
                  const maxAmount = orderSide === 'buy' ? quoteBalance / price : baseBalance;
                  const pct = Math.min(100, (parseFloat(e.target.value) / maxAmount) * 100);
                  if (isCrypto) setCryptoSliderValue(pct);
                  else setSecuritySliderValue(pct);
                }
              }}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded focus:border-border-strong outline-none text-right pr-14"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">{baseSymbol}</span>
          </div>
        </div>

        {/* Progress Bar Slider */}
        <div className="space-y-2">
          <div 
            ref={isCrypto ? cryptoSliderRef : securitySliderRef}
            className="relative h-3 bg-surface rounded-full cursor-pointer select-none"
            onMouseDown={(e) => handleSliderMouseDown(e, isCrypto ? 'crypto' : 'security')}
            onTouchStart={(e) => handleSliderTouchStart(e, isCrypto ? 'crypto' : 'security')}
          >
            {/* Filled track */}
            <div 
              className={`absolute left-0 top-0 h-full rounded-full pointer-events-none ${
                orderSide === 'buy' ? 'bg-success' : 'bg-danger'
              }`}
              style={{ width: `${sliderValue}%` }}
            />
            {/* Dot markers */}
            <div className="absolute inset-0 flex items-center justify-between pointer-events-none">
              {[0, 25, 50, 75, 100].map((pct) => (
                <div
                  key={pct}
                  className={`w-2.5 h-2.5 rounded-full border-2 transition-colors ${
                    sliderValue >= pct
                      ? orderSide === 'buy'
                        ? 'bg-success border-success/60'
                        : 'bg-danger border-danger/60'
                      : 'bg-surface-overlay border-border-strong'
                  }`}
                />
              ))}
            </div>
            {/* Draggable Thumb */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 shadow-panel pointer-events-none ${
                orderSide === 'buy'
                  ? 'bg-success border-success/40'
                  : 'bg-danger border-danger/40'
              } ${isDragging ? 'scale-110' : ''}`}
              style={{ 
                left: `calc(${sliderValue}% - 8px)`,
                transition: isDragging ? 'none' : 'left 0.1s ease-out'
              }}
            />
          </div>
          {/* Percentage labels */}
          <div className="flex justify-between text-[10px] text-ink-faint">
            {[0, 25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => {
                  if (isCrypto) handleCryptoSliderChange(pct);
                  else handleSecuritySliderChange(pct);
                }}
                className={`hover:text-ink-muted transition-colors w-6 text-center ${
                  sliderValue >= pct 
                    ? orderSide === 'buy' ? 'text-success' : 'text-danger' 
                    : ''
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between p-2 bg-surface rounded border border-border">
          <span className="text-[10px] text-ink-faint">Total</span>
          <div>
            <span className="text-sm font-medium text-ink">{orderTotal}</span>
            <span className="text-xs text-ink-faint ml-1">{quoteSymbol}</span>
          </div>
        </div>

        {/* Buy/Sell Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setOrderSide('buy');
              if (isCrypto) setCryptoSliderValue(0);
              else setSecuritySliderValue(0);
              setOrderAmount('');
            }}
            disabled={!isConnected || submitting}
            className={`py-2 rounded text-xs font-medium transition-all ${
              orderSide === 'buy'
                ? 'bg-success hover:bg-success/80 text-ink'
                : 'bg-surface border border-border text-ink-muted hover:text-ink hover:border-success'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Buy {baseSymbol}
          </button>
          <button
            onClick={() => {
              setOrderSide('sell');
              if (isCrypto) setCryptoSliderValue(0);
              else setSecuritySliderValue(0);
              setOrderAmount('');
            }}
            disabled={!isConnected || submitting}
            className={`py-2 rounded text-xs font-medium transition-all ${
              orderSide === 'sell'
                ? 'bg-danger hover:bg-danger/80 text-ink'
                : 'bg-surface border border-border text-ink-muted hover:text-ink hover:border-danger'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Sell {baseSymbol}
          </button>
        </div>

        {/* Submit Order Button */}
        {orderAmount && parseFloat(orderAmount) > 0 && (
          <button
            onClick={handleOrder}
            disabled={!isConnected || submitting || (orderType === 'limit' && !orderPrice)}
            className={`w-full py-2.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              orderSide === 'buy'
                ? 'bg-success hover:bg-success/80'
                : 'bg-danger hover:bg-danger/80'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {submitting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                {orderSide === 'buy' ? 'Buy' : 'Sell'} {orderAmount} {baseSymbol}
              </>
            )}
          </button>
        )}

        {!isConnected && (
          <p className="text-center text-warning text-[10px]">
            Connect wallet to trade
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface-sunken text-ink">
      {/* Header */}
      <div className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="w-5 h-5 text-gold" />
              <h1 className="text-lg font-semibold text-ink">RWA Exchange</h1>
              <span className="px-1.5 py-0.5 bg-success/20 text-success text-[10px] rounded">Live</span>
            </div>

            {/* MAIN MARKET TYPE TABS */}
            <div className="flex items-center gap-1 bg-surface-overlay rounded-lg p-0.5">
              <button
                onClick={() => setMarketType('crypto')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  marketType === 'crypto'
                    ? 'bg-gold text-ink'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Coins className="w-3 h-3" />
                Crypto
              </button>
              <button
                onClick={() => setMarketType('security')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  marketType === 'security'
                    ? 'bg-gold text-surface-sunken'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Shield className="w-3 h-3" />
                Security Tokens
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Chain indicator for security tokens */}
              {marketType === 'security' && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-gold/10 text-gold rounded text-xs">
                  <Activity className="w-3 h-3" />
                  {getChainName(chainId)}
                </div>
              )}

              {/* Wallet Status */}
              {isConnected ? (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-success/10 text-success rounded text-xs">
                  <Wallet className="w-3 h-3" />
                  {truncateAddress(address || '')}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-warning/10 text-warning rounded text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  Connect Wallet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ CRYPTO MARKET (MEXC) ============ */}
      {marketType === 'crypto' && (
        <>
          {cryptoPairs.length === 0 ? (
            <div className="max-w-7xl mx-auto px-4 py-16">
              <div className="text-center">
                <Coins className="w-16 h-16 text-ink-faint mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Loading Crypto Pairs...</h2>
                <p className="text-ink-muted">Fetching live prices from MEXC</p>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto px-4 py-4">
              {/* Compact Market Info Bar */}
              {selectedCryptoPair && (
                <div className="flex items-center gap-4 mb-4 p-3 bg-surface-overlay rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    {selectedCryptoPair.icon && (
                      <img src={selectedCryptoPair.icon} alt="" className="w-8 h-8" />
                    )}
                    <div>
                      <h2 className="text-sm font-bold">{selectedCryptoPair.baseAsset}/{selectedCryptoPair.quoteAsset}</h2>
                      <p className="text-[10px] text-ink-faint">MEXC Spot</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex items-center gap-6 text-xs">
                    <div>
                      <span className="text-ink-faint">Price </span>
                      <span className="font-bold text-lg">${selectedCryptoPair.price}</span>
                    </div>
                    <div>
                      <span className="text-ink-faint">24h </span>
                      <span className={`font-medium ${parseFloat(selectedCryptoPair.change24h) >= 0 ? 'text-success' : 'text-danger'}`}>
                        {parseFloat(selectedCryptoPair.change24h) >= 0 ? '+' : ''}{selectedCryptoPair.change24h}%
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-faint">High </span>
                      <span className="text-ink">${selectedCryptoPair.high24h}</span>
                    </div>
                    <div>
                      <span className="text-ink-faint">Low </span>
                      <span className="text-ink">${selectedCryptoPair.low24h}</span>
                    </div>
                    <div>
                      <span className="text-ink-faint">Vol </span>
                      <span className="text-ink">${formatNumber(selectedCryptoPair.volume24h)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Price Chart */}
              {selectedCryptoPair && (
                <div className="mb-4">
                  <PriceChart
                    symbol={selectedCryptoPair.symbol}
                    type="crypto"
                    height={200}
                  />
                </div>
              )}

              {/* Main Trading Interface */}
              <div className="grid grid-cols-12 gap-3">
                {/* Left - All Pairs List */}
                <div className="col-span-3 bg-surface-overlay rounded-lg border border-border h-[500px] flex flex-col">
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-faint" />
                      <input
                        type="text"
                        value={cryptoSearchQuery}
                        onChange={(e) => setCryptoSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-full pl-7 pr-3 py-1.5 bg-surface rounded border border-border-strong focus:border-gold outline-none text-xs"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center text-[10px] text-ink-faint px-2 py-1 border-b border-border">
                    <span className="flex-1">Pair</span>
                    <span className="w-20 text-right">Price</span>
                    <span className="w-16 text-right">24h %</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    {filteredCryptoPairs.map((pair) => (
                      <button
                        key={pair.symbol}
                        onClick={() => setSelectedCryptoPair(pair)}
                        className={`w-full px-2 py-2 flex items-center hover:bg-ink/5 transition-colors ${
                          selectedCryptoPair?.symbol === pair.symbol ? 'bg-gold/10 border-l-2 border-gold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5 flex-1">
                          {pair.icon ? (
                            <img src={pair.icon} alt="" className="w-5 h-5" />
                          ) : (
                            <div className="w-5 h-5 bg-surface-overlay rounded-full flex items-center justify-center text-[8px]">
                              {pair.baseAsset.slice(0, 2)}
                            </div>
                          )}
                          <span className="font-medium text-xs">{pair.baseAsset}</span>
                        </div>
                        <span className="w-20 text-right text-xs">${pair.price}</span>
                        <span className={`w-16 text-right text-xs ${
                          parseFloat(pair.change24h) >= 0 ? 'text-success' : 'text-danger'
                        }`}>
                          {parseFloat(pair.change24h) >= 0 ? '+' : ''}{pair.change24h}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Middle - Order Book */}
                <div className="col-span-5 bg-surface-overlay rounded-lg border border-border h-[500px] flex flex-col">
                  <div className="p-2 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-medium">Order Book</span>
                    <button onClick={fetchMexcOrderBook} className="p-1 hover:bg-ink/10 rounded">
                      <RefreshCw className={`w-3 h-3 ${cryptoOrderBookLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Order Book Header */}
                  <div className="grid grid-cols-2 text-[10px] text-ink-faint border-b border-border">
                    <div className="flex px-2 py-1 border-r border-border">
                      <span className="flex-1">Bid</span>
                      <span className="flex-1 text-right">Amount</span>
                    </div>
                    <div className="flex px-2 py-1">
                      <span className="flex-1">Ask</span>
                      <span className="flex-1 text-right">Amount</span>
                    </div>
                  </div>

                  {/* Order Book Body */}
                  <div className="flex-1 grid grid-cols-2 overflow-hidden">
                    {/* Bids */}
                    <div className="border-r border-border overflow-y-auto">
                      {cryptoOrderBook.bids.slice(0, 15).map((bid, i) => {
                        const maxAmount = Math.max(...cryptoOrderBook.bids.slice(0, 15).map(b => parseFloat(b.amount)));
                        const widthPct = (parseFloat(bid.amount) / maxAmount) * 100;
                        return (
                          <div key={i} className="relative flex text-[10px] px-2 py-0.5 hover:bg-success/10 cursor-pointer"
                            onClick={() => setCryptoOrderPrice(bid.price)}>
                            <div className="absolute right-0 top-0 bottom-0 bg-success/10" style={{ width: `${widthPct}%` }} />
                            <span className="flex-1 text-success font-mono relative z-10">{parseFloat(bid.price).toFixed(2)}</span>
                            <span className="flex-1 text-right text-ink-muted font-mono relative z-10">{parseFloat(bid.amount).toFixed(4)}</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Asks */}
                    <div className="overflow-y-auto">
                      {cryptoOrderBook.asks.slice(0, 15).map((ask, i) => {
                        const maxAmount = Math.max(...cryptoOrderBook.asks.slice(0, 15).map(a => parseFloat(a.amount)));
                        const widthPct = (parseFloat(ask.amount) / maxAmount) * 100;
                        return (
                          <div key={i} className="relative flex text-[10px] px-2 py-0.5 hover:bg-danger/10 cursor-pointer"
                            onClick={() => setCryptoOrderPrice(ask.price)}>
                            <div className="absolute left-0 top-0 bottom-0 bg-danger/10" style={{ width: `${widthPct}%` }} />
                            <span className="flex-1 text-danger font-mono relative z-10">{parseFloat(ask.price).toFixed(2)}</span>
                            <span className="flex-1 text-right text-ink-muted font-mono relative z-10">{parseFloat(ask.amount).toFixed(4)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Spread */}
                  <div className="p-2 border-t border-border text-center">
                    <span className="text-lg font-bold">${selectedCryptoPair?.price}</span>
                  </div>
                </div>

                {/* Right - Order Form */}
                <div className="col-span-4 bg-surface-overlay rounded-lg border border-border h-[500px] flex flex-col overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <span className="text-xs font-medium">{selectedCryptoPair?.baseAsset}/USDT</span>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {renderOrderForm('crypto')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ SECURITY TOKEN MARKET ============ */}
      {marketType === 'security' && (
        <>
          {securityTokens.length === 0 ? (
            <div className="max-w-7xl mx-auto px-4 py-16">
              <div className="text-center">
                <Shield className="w-16 h-16 text-ink-faint mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">No Security Tokens on {getChainName(chainId)}</h2>
                <p className="text-ink-muted mb-6">No tokenized assets are currently listed on this network.</p>
                <a href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-light rounded text-sm">
                  List Your Asset <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto px-4 py-4">
              {/* Compact Market Info Bar */}
              {selectedSecurityToken && (
                <div className="flex items-center gap-4 mb-4 p-3 bg-surface-overlay rounded-lg border border-gold-dark/30">
                  <div className="flex items-center gap-2">
                    {selectedSecurityToken.logoUrl ? (
                      <img src={selectedSecurityToken.logoUrl} alt="" className="w-8 h-8 rounded" />
                    ) : (
                      <div className="w-8 h-8 bg-gold-dark rounded flex items-center justify-center text-xs font-bold">
                        {selectedSecurityToken.symbol?.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <h2 className="text-sm font-bold">{selectedSecurityToken.symbol}/{selectedSecurityToken.tradingPair}</h2>
                      <p className="text-[10px] text-ink-faint">{selectedSecurityToken.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex items-center gap-6 text-xs">
                    <div>
                      <span className="text-ink-faint">Price </span>
                      <span className="font-bold text-lg">${selectedSecurityToken.price}</span>
                    </div>
                    <div>
                      <span className="text-ink-faint">MCap </span>
                      <span className="text-ink">${formatNumber(selectedSecurityToken.marketCap || '0')}</span>
                    </div>
                    <div>
                      <span className="text-ink-faint">Supply </span>
                      <span className="text-ink">{formatNumber(selectedSecurityToken.totalSupply || '0')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Price Chart */}
              {selectedSecurityToken && (
                <div className="mb-4">
                  <PriceChart
                    symbol={selectedSecurityToken.symbol}
                    type="security"
                    tokenAddress={selectedSecurityToken.address}
                    currentPrice={selectedSecurityToken.price}
                    height={200}
                  />
                </div>
              )}

              {/* Main Trading Interface */}
              <div className="grid grid-cols-12 gap-3">
                {/* Left - Token List & Recent Trades */}
                <div className="col-span-3 space-y-3">
                  {/* Token List */}
                  <div className="bg-surface-overlay rounded-lg border border-border h-[280px] flex flex-col">
                    <div className="p-2 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-faint" />
                        <input
                          type="text"
                          value={securitySearchQuery}
                          onChange={(e) => setSecuritySearchQuery(e.target.value)}
                          placeholder="Search..."
                          className="w-full pl-7 pr-3 py-1.5 bg-surface rounded border border-border-strong focus:border-gold outline-none text-xs"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center text-[10px] text-ink-faint px-2 py-1 border-b border-border">
                      <span className="flex-1">Token</span>
                      <span className="w-16 text-right">Price</span>
                      <span className="w-16 text-right">MCap</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                      {filteredSecurityTokens.map((token) => (
                        <button
                          key={token.id}
                          onClick={() => setSelectedSecurityToken(token)}
                          className={`w-full px-2 py-1.5 flex items-center hover:bg-ink/5 transition-colors ${
                            selectedSecurityToken?.id === token.id ? 'bg-gold/10 border-l-2 border-gold' : ''
                          }`}
                        >
                          <div className="flex items-center gap-1.5 flex-1">
                            {token.logoUrl ? (
                              <img src={token.logoUrl} alt="" className="w-4 h-4 rounded" />
                            ) : (
                              <div className="w-4 h-4 bg-gold-dark rounded flex items-center justify-center text-[8px]">
                                {token.symbol?.slice(0, 2)}
                              </div>
                            )}
                            <span className="font-medium text-xs">{token.symbol}</span>
                          </div>
                          <span className="w-16 text-right text-xs">${token.price}</span>
                          <span className="w-16 text-right text-[10px] text-ink-faint">${formatNumber(token.marketCap || '0')}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recent Trades */}
                  <div className="bg-surface-overlay rounded-lg border border-border h-[200px] flex flex-col">
                    <div className="p-2 border-b border-border flex items-center justify-between">
                      <span className="text-xs font-medium">Recent Trades</span>
                      <button onClick={fetchSecurityTrades} className="p-1 hover:bg-ink/10 rounded">
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div className="flex items-center text-[10px] text-ink-faint px-2 py-1 border-b border-border">
                      <span className="flex-1">Price</span>
                      <span className="flex-1 text-right">Amount</span>
                      <span className="flex-1 text-right">Time</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                      {securityTrades.length === 0 ? (
                        <div className="text-center text-ink-faint text-[10px] py-6">No trades yet</div>
                      ) : (
                        securityTrades.map((trade) => (
                          <div key={trade.id} className="flex text-[10px] px-2 py-0.5 hover:bg-ink/5">
                            <span className={`flex-1 ${trade.side === 'buy' ? 'text-success' : 'text-danger'}`}>
                              {parseFloat(trade.price).toFixed(4)}
                            </span>
                            <span className="flex-1 text-right text-ink-muted">{formatNumber(trade.amount)}</span>
                            <span className="flex-1 text-right text-ink-faint">{formatTime(trade.created_at)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle - Order Book */}
                <div className="col-span-5 bg-surface-overlay rounded-lg border border-border h-[500px] flex flex-col">
                  <div className="p-2 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-medium">Order Book</span>
                    <button onClick={fetchSecurityOrderBook} className="p-1 hover:bg-ink/10 rounded">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Order Book Header */}
                  <div className="grid grid-cols-2 text-[10px] text-ink-faint border-b border-border">
                    <div className="flex px-2 py-1 border-r border-border">
                      <span className="flex-1">Bid</span>
                      <span className="flex-1 text-right">Amount</span>
                    </div>
                    <div className="flex px-2 py-1">
                      <span className="flex-1">Ask</span>
                      <span className="flex-1 text-right">Amount</span>
                    </div>
                  </div>

                  {/* Order Book Body */}
                  <div className="flex-1 grid grid-cols-2 overflow-hidden">
                    {/* Bids */}
                    <div className="border-r border-border overflow-y-auto">
                      {securityOrderBook.bids.length === 0 ? (
                        Array.from({ length: 15 }).map((_, i) => (
                          <div key={i} className="flex text-[10px] px-2 py-0.5">
                            <span className="flex-1 text-success/20">-</span>
                            <span className="flex-1 text-right text-ink-faint">-</span>
                          </div>
                        ))
                      ) : (
                        securityOrderBook.bids.slice(0, 15).map((bid, i) => {
                          const maxAmount = Math.max(...securityOrderBook.bids.slice(0, 15).map(b => parseFloat(b.amount)));
                          const widthPct = maxAmount > 0 ? (parseFloat(bid.amount) / maxAmount) * 100 : 0;
                          return (
                            <div key={i} className="relative flex text-[10px] px-2 py-0.5 hover:bg-success/10 cursor-pointer"
                              onClick={() => setSecurityOrderPrice(bid.price)}>
                              <div className="absolute right-0 top-0 bottom-0 bg-success/10" style={{ width: `${widthPct}%` }} />
                              <span className="flex-1 text-success font-mono relative z-10">{parseFloat(bid.price).toFixed(4)}</span>
                              <span className="flex-1 text-right text-ink-muted font-mono relative z-10">{formatNumber(bid.amount)}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {/* Asks */}
                    <div className="overflow-y-auto">
                      {securityOrderBook.asks.length === 0 ? (
                        Array.from({ length: 15 }).map((_, i) => (
                          <div key={i} className="flex text-[10px] px-2 py-0.5">
                            <span className="flex-1 text-danger/20">-</span>
                            <span className="flex-1 text-right text-ink-faint">-</span>
                          </div>
                        ))
                      ) : (
                        securityOrderBook.asks.slice(0, 15).map((ask, i) => {
                          const maxAmount = Math.max(...securityOrderBook.asks.slice(0, 15).map(a => parseFloat(a.amount)));
                          const widthPct = maxAmount > 0 ? (parseFloat(ask.amount) / maxAmount) * 100 : 0;
                          return (
                            <div key={i} className="relative flex text-[10px] px-2 py-0.5 hover:bg-danger/10 cursor-pointer"
                              onClick={() => setSecurityOrderPrice(ask.price)}>
                              <div className="absolute left-0 top-0 bottom-0 bg-danger/10" style={{ width: `${widthPct}%` }} />
                              <span className="flex-1 text-danger font-mono relative z-10">{parseFloat(ask.price).toFixed(4)}</span>
                              <span className="flex-1 text-right text-ink-muted font-mono relative z-10">{formatNumber(ask.amount)}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Spread */}
                  <div className="p-2 border-t border-border text-center">
                    <span className="text-lg font-bold">${selectedSecurityToken?.price}</span>
                  </div>
                </div>

                {/* Right - Order Form */}
                <div className="col-span-4 bg-surface-overlay rounded-lg border border-border h-[500px] flex flex-col overflow-hidden">
                  {/* Tabs */}
                  <div className="flex border-b border-border">
                    {(['trade', 'orders', 'history'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 text-xs font-medium transition-colors ${
                          activeTab === tab
                            ? 'text-gold border-b-2 border-gold'
                            : 'text-ink-faint hover:text-ink'
                        }`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {activeTab === 'trade' && renderOrderForm('security')}

                    {activeTab === 'orders' && (
                      <div className="p-3">
                        <h4 className="text-xs font-medium mb-2">Open Orders</h4>
                        {securityOrders.filter(o => o.status === 'open' || o.status === 'partial').length === 0 ? (
                          <div className="text-center text-ink-faint text-[10px] py-8">No open orders</div>
                        ) : (
                          <div className="space-y-2">
                            {securityOrders
                              .filter(o => o.status === 'open' || o.status === 'partial')
                              .map((order) => (
                                <div key={order.id} className="p-2 bg-surface rounded flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center gap-1">
                                      <span className={`px-1 py-0.5 rounded text-[8px] ${
                                        order.side === 'buy' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                                      }`}>
                                        {order.side?.toUpperCase()}
                                      </span>
                                      <span className="text-[10px] font-medium">{selectedSecurityToken?.symbol}</span>
                                    </div>
                                    <div className="text-[9px] text-ink-faint mt-0.5">
                                      @ ${order.price} • {formatNumber(order.amount)} tokens
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleCancelSecurityOrder(order.id)}
                                    className="p-1 text-danger hover:bg-danger/10 rounded"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'history' && (
                      <div className="p-3">
                        <h4 className="text-xs font-medium mb-2">Order History</h4>
                        {securityOrders.filter(o => o.status === 'filled' || o.status === 'cancelled').length === 0 ? (
                          <div className="text-center text-ink-faint text-[10px] py-8">No order history</div>
                        ) : (
                          <div className="space-y-2">
                            {securityOrders
                              .filter(o => o.status === 'filled' || o.status === 'cancelled')
                              .map((order) => (
                                <div key={order.id} className="p-2 bg-surface rounded">
                                  <div className="flex items-center gap-1">
                                    <span className={`px-1 py-0.5 rounded text-[8px] ${
                                      order.side === 'buy' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                                    }`}>
                                      {order.side?.toUpperCase()}
                                    </span>
                                    <span className="text-[10px] font-medium">{selectedSecurityToken?.symbol}</span>
                                    <span className={`px-1 py-0.5 rounded text-[8px] ${
                                      order.status === 'filled' ? 'bg-gold/20 text-gold' : 'bg-surface-overlay/20 text-ink-muted'
                                    }`}>
                                      {order.status}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-[9px] text-ink-faint mt-0.5">
                                    <span>@ ${order.price}</span>
                                    <span>{formatTime(order.created_at)}</span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
