'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useChainId } from 'wagmi';
import { parseUnits, Address } from 'viem';
import { ZERO_ADDRESS, SupportedChainId } from '@/config/contracts';
import { useChainConfig } from '@/hooks/useChainConfig';
import { RWAProjectNFTABI, RWASecurityTokenABI, ERC20ABI } from '@/config/abis';

// Local imports
import { TRADABLE_STATUSES, MEXC_CONFIG, ExtendedExchangeABI } from './constants';
import { 
  MexcOrderBook, MexcTicker, SecurityTokenData, TradingPair, 
  TokenBalance, ListedToken, SecurityOrderBookData, CategoryCount 
} from './types';
import {
  NetworkBadge,
  WrongChainWarning,
  CryptoTab,
  SecurityTab,
  DepositModal,
  WithdrawModal,
} from './components';

export default function ExchangeClient() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const walletChainId = useChainId();
  
  const {
    chainId, chainName, contracts, tokens, explorerUrl,
    nativeCurrency, isDeployed, isTestnet, switchToChain,
    isSwitching, deployedChains,
  } = useChainConfig();

  // Contract addresses
  const exchangeAddress = contracts?.RWASecurityExchange as Address | undefined;
  const projectNFTAddress = contracts?.RWAProjectNFT as Address | undefined;
  const usdcAddress = tokens?.USDC as Address | undefined;
  const usdtAddress = tokens?.USDT as Address | undefined;

  // Check wrong chain
  const isWrongChain = useMemo(() => {
    if (!isConnected) return false;
    return walletChainId !== chainId;
  }, [isConnected, walletChainId, chainId]);

  // UI State
  const [activeTab, setActiveTab] = useState<'crypto' | 'security'>('crypto');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Crypto Tab State
  const [selectedMexcPair, setSelectedMexcPair] = useState('AVAXUSDT');
  const [mexcOrderBook, setMexcOrderBook] = useState<MexcOrderBook | null>(null);
  const [mexcTicker, setMexcTicker] = useState<MexcTicker | null>(null);
  const [mexcTickers, setMexcTickers] = useState<Record<string, MexcTicker>>({});
  const [cryptoOrderType, setCryptoOrderType] = useState<'market' | 'limit'>('market');
  const [cryptoTradeType, setCryptoTradeType] = useState<'buy' | 'sell'>('buy');
  const [cryptoTradeAmount, setCryptoTradeAmount] = useState('');
  const [cryptoLimitPrice, setCryptoLimitPrice] = useState('');

  // Security Tab State
  const [securityTokens, setSecurityTokens] = useState<SecurityTokenData[]>([]);
  const [listedTokens, setListedTokens] = useState<ListedToken[]>([]);
  const [selectedSecurityToken, setSelectedSecurityToken] = useState<SecurityTokenData | null>(null);
  const [selectedListedToken, setSelectedListedToken] = useState<ListedToken | null>(null);
  const [securityTokenLoading, setSecurityTokenLoading] = useState(true);
  const [listedTokensLoading, setListedTokensLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount>({});
  const [securityOrderBook, setSecurityOrderBook] = useState<SecurityOrderBookData>({
    bids: [], asks: [], spread: '0', spreadPercent: '0', bestBid: 0, bestAsk: 0
  });
  const [securityOrderBookLoading, setSecurityOrderBookLoading] = useState(false);
  const [securityOrderType, setSecurityOrderType] = useState<'market' | 'limit'>('limit');
  const [securityOrderSide, setSecurityOrderSide] = useState<'buy' | 'sell'>('buy');
  const [securityOrderPrice, setSecurityOrderPrice] = useState('');
  const [securityOrderAmount, setSecurityOrderAmount] = useState('');
  const [securityOrderError, setSecurityOrderError] = useState<string | null>(null);
  const [securityOrderSubmitting, setSecurityOrderSubmitting] = useState(false);

  // Transaction state
  const { writeContract, data: txHash, isPending: isWritePending } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Safe deployed chains
  const safeDeployedChains = Array.isArray(deployedChains) 
    ? deployedChains 
    : typeof deployedChains === 'object' && deployedChains !== null
      ? Object.keys(deployedChains).map(Number).filter(n => !isNaN(n))
      : [];

  // Network switch handler
  const handleSwitchNetwork = useCallback(async (targetChainId?: number) => {
    if (!targetChainId) return;
    try {
      await switchToChain(targetChainId as SupportedChainId);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  }, [switchToChain]);

  // ===== MEXC Data Fetching =====
  const fetchMexcOrderBook = useCallback(async (symbol: string) => {
    try {
      const response = await fetch(`/api/exchange/mexc/orderbook?symbol=${symbol}&limit=40`);
      if (!response.ok) return;
      const data = await response.json();
      setMexcOrderBook({
        asks: Array.isArray(data.asks) ? data.asks : [],
        bids: Array.isArray(data.bids) ? data.bids : [],
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[OrderBook] Error:', error);
    }
  }, []);

  const fetchMexcTicker = useCallback(async (symbol: string) => {
    try {
      const response = await fetch(`/api/exchange/mexc/ticker?symbol=${symbol}`);
      if (response.ok) {
        const data = await response.json();
        setMexcTicker(data);
      }
    } catch (error) {
      console.error('Error fetching MEXC ticker:', error);
    }
  }, []);

  const fetchAllMexcTickers = useCallback(async () => {
    try {
      const tickersData: Record<string, MexcTicker> = {};
      for (const pair of MEXC_CONFIG.supportedPairs) {
        const response = await fetch(`/api/exchange/mexc/ticker?symbol=${pair}`);
        if (response.ok) {
          tickersData[pair] = await response.json();
        }
      }
      setMexcTickers(tickersData);
    } catch (error) {
      console.error('Error fetching MEXC tickers:', error);
    }
  }, []);

  // ===== Listed Tokens Loading =====
  const loadListedTokens = useCallback(async () => {
    if (!chainId) return;
    setListedTokensLoading(true);
    try {
      const params = new URLSearchParams({ chainId: chainId.toString() });
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      const response = await fetch(`/api/exchange/listed-tokens?${params}`);
      const data = await response.json();
      setListedTokens(data.tokens || []);
      setCategoryCounts(data.categoryCounts || {});
    } catch (error) {
      console.error('Error loading listed tokens:', error);
      setListedTokens([]);
    } finally {
      setListedTokensLoading(false);
    }
  }, [chainId, selectedCategory]);

  // ===== Security Order Book Loading =====
  const loadSecurityOrderBook = useCallback(async () => {
    const tokenAddress = selectedListedToken?.token_address;
    if (!tokenAddress) return;
    setSecurityOrderBookLoading(true);
    try {
      const response = await fetch(`/api/exchange/security-orderbook?tokenAddress=${tokenAddress}`);
      if (response.ok) {
        setSecurityOrderBook(await response.json());
      }
    } catch (error) {
      console.error('Error loading security order book:', error);
    } finally {
      setSecurityOrderBookLoading(false);
    }
  }, [selectedListedToken?.token_address]);

  // ===== On-chain Security Tokens Loading =====
  const loadSecurityTokens = useCallback(async () => {
    // Extra safety: verify we have the right chain's contracts
    if (!publicClient || !projectNFTAddress || !exchangeAddress || !isDeployed) {
      setSecurityTokenLoading(false);
      return;
    }

    // Verify contract exists on current chain before proceeding
    try {
      const code = await publicClient.getCode({ address: projectNFTAddress });
      if (!code || code === '0x') {
        console.log('ProjectNFT not deployed on this chain, skipping...');
        setSecurityTokens([]);
        setSecurityTokenLoading(false);
        return;
      }
    } catch (err) {
      console.log('Error checking contract, skipping on-chain tokens');
      setSecurityTokens([]);
      setSecurityTokenLoading(false);
      return;
    }

    setSecurityTokenLoading(true);
    
    try {
      const totalProjects = await publicClient.readContract({
        address: projectNFTAddress,
        abi: RWAProjectNFTABI,
        functionName: 'totalProjects',
      }) as bigint;

      // ... rest of the function
    } catch (error) {
      console.error('Error loading security tokens:', error);
      setSecurityTokens([]);
    } finally {
      setSecurityTokenLoading(false);
    }
  }, [publicClient, projectNFTAddress, exchangeAddress, isDeployed]);
  
  // ===== Effects =====
  useEffect(() => {
    if (isDeployed) {
      fetchAllMexcTickers();
      loadListedTokens();
    }
  }, [isDeployed, chainId, selectedCategory, fetchAllMexcTickers, loadListedTokens]);

  useEffect(() => {
    if (!isDeployed) return;
    fetchMexcOrderBook(selectedMexcPair);
    fetchMexcTicker(selectedMexcPair);
    const interval = setInterval(() => {
      fetchMexcOrderBook(selectedMexcPair);
      fetchMexcTicker(selectedMexcPair);
      fetchAllMexcTickers();
    }, MEXC_CONFIG.refreshInterval);
    return () => clearInterval(interval);
  }, [selectedMexcPair, fetchMexcOrderBook, fetchMexcTicker, fetchAllMexcTickers, isDeployed]);

  useEffect(() => {
    if (selectedListedToken) {
      loadSecurityOrderBook();
      const interval = setInterval(loadSecurityOrderBook, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedListedToken, loadSecurityOrderBook]);

  useEffect(() => {
    // Don't load if chain is switching or wrong chain
    if (!isDeployed || isWrongChain || isSwitching) {
      setSecurityTokenLoading(false);
      return;
    }
    
    // Add a small delay to let chain config settle
    const timer = setTimeout(() => {
      loadSecurityTokens();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [loadSecurityTokens, isDeployed, isWrongChain, isSwitching]);

  // ===== Handlers =====
  const handleCryptoTrade = useCallback(() => {
    const marketPrice = mexcTickers[selectedMexcPair]?.lastPrice ? parseFloat(mexcTickers[selectedMexcPair].lastPrice) : 0;
    const executionPrice = cryptoOrderType === 'limit' ? parseFloat(cryptoLimitPrice) : marketPrice;
    const amount = parseFloat(cryptoTradeAmount);
    
    alert(`${cryptoTradeType.toUpperCase()} ${cryptoOrderType} Order - ${amount} ${selectedMexcPair.replace('USDT', '')} @ $${executionPrice.toFixed(2)}\n\nNote: This is a demo.`);
    setCryptoTradeAmount('');
    setCryptoLimitPrice('');
  }, [cryptoTradeAmount, cryptoTradeType, cryptoOrderType, cryptoLimitPrice, selectedMexcPair, mexcTickers]);

  const handleSecurityOrderSubmit = useCallback(async () => {
    if (!address || !selectedListedToken) return;
    setSecurityOrderSubmitting(true);
    setSecurityOrderError(null);
    try {
      // TODO: Implement actual order submission to database
      alert(`${securityOrderSide.toUpperCase()} ${securityOrderType} Order\n${securityOrderAmount} ${selectedListedToken.symbol} @ $${securityOrderPrice || 'Market'}`);
      setSecurityOrderPrice('');
      setSecurityOrderAmount('');
      loadSecurityOrderBook();
    } catch (error: any) {
      setSecurityOrderError(error.message || 'Failed to submit order');
    } finally {
      setSecurityOrderSubmitting(false);
    }
  }, [address, selectedListedToken, securityOrderSide, securityOrderType, securityOrderAmount, securityOrderPrice, loadSecurityOrderBook]);

  const handleWithdraw = async (token: string, amount: string) => {
    if (!address) return;
    try {
      await fetch('/api/exchange/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-chain-id': chainId.toString() },
        body: JSON.stringify({ address, action: 'withdraw', token, amount }),
      });
    } catch (error) {
      console.error('Withdraw error:', error);
    }
  };

  const handleSelectListedToken = (token: ListedToken) => {
    setSelectedListedToken(token);
    setSelectedSecurityToken(null);
  };

  const handleSelectSecurityToken = (token: SecurityTokenData) => {
    setSelectedSecurityToken(token);
    setSelectedListedToken(null);
  };

  // ===== Not Deployed View =====
  if (!isDeployed) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-2">Network Not Supported</h2>
            <p className="text-gray-400 mb-6">The Exchange is not deployed on {chainName}.</p>
            <div className="flex flex-wrap justify-center gap-3">
              {safeDeployedChains.slice(0, 4).map((chain: any, index: number) => {
                const chainIdNum = typeof chain === 'object' ? chain.id : chain;
                const chainNameStr = typeof chain === 'object' ? chain.name : `Chain ${chain}`;
                return (
                  <button
                    key={chainIdNum || index}
                    onClick={() => handleSwitchNetwork(chainIdNum)}
                    disabled={isSwitching}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium"
                  >
                    {chainNameStr}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== Main Render =====
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Exchange</h1>
            <p className="text-gray-400 mt-1">Trade crypto and security tokens</p>
          </div>
          <div className="flex items-center gap-4">
            <NetworkBadge chainName={chainName} isTestnet={isTestnet} />
            {explorerUrl && exchangeAddress && (
              <a href={`${explorerUrl}/address/${exchangeAddress}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300">
                View Contract →
              </a>
            )}
          </div>
        </div>

        {/* Wrong Chain Warning */}
        {isWrongChain && (
          <WrongChainWarning
            chainName={chainName}
            chainId={chainId}
            onSwitchNetwork={handleSwitchNetwork}
            isSwitching={isSwitching}
          />
        )}

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('crypto')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'crypto' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'
            }`}
          >
            Crypto Trading
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'security' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'
            }`}
          >
            Security Tokens
          </button>
        </div>

        {/* Crypto Tab */}
        {activeTab === 'crypto' && (
          <CryptoTab
            selectedPair={selectedMexcPair}
            orderBook={mexcOrderBook}
            ticker={mexcTicker}
            tickers={mexcTickers}
            orderType={cryptoOrderType}
            tradeType={cryptoTradeType}
            tradeAmount={cryptoTradeAmount}
            limitPrice={cryptoLimitPrice}
            onPairSelect={setSelectedMexcPair}
            onOrderTypeChange={setCryptoOrderType}
            onTradeTypeChange={setCryptoTradeType}
            onAmountChange={setCryptoTradeAmount}
            onLimitPriceChange={setCryptoLimitPrice}
            onSubmit={handleCryptoTrade}
            onDepositClick={() => setShowDepositModal(true)}
          />
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <SecurityTab
            securityTokens={securityTokens}
            listedTokens={listedTokens}
            selectedSecurityToken={selectedSecurityToken}
            selectedListedToken={selectedListedToken}
            securityTokenLoading={securityTokenLoading}
            listedTokensLoading={listedTokensLoading}
            selectedCategory={selectedCategory}
            categoryCounts={categoryCounts}
            securityOrderBook={securityOrderBook}
            securityOrderBookLoading={securityOrderBookLoading}
            isConnected={isConnected}
            isWrongChain={isWrongChain}
            chainName={chainName}
            chainId={chainId}
            orderType={securityOrderType}
            orderSide={securityOrderSide}
            orderPrice={securityOrderPrice}
            orderAmount={securityOrderAmount}
            orderError={securityOrderError}
            orderSubmitting={securityOrderSubmitting}
            txHash={txHash}
            explorerUrl={explorerUrl}
            onSelectSecurityToken={handleSelectSecurityToken}
            onSelectListedToken={handleSelectListedToken}
            onCategoryChange={setSelectedCategory}
            onOrderTypeChange={setSecurityOrderType}
            onOrderSideChange={setSecurityOrderSide}
            onPriceChange={setSecurityOrderPrice}
            onAmountChange={setSecurityOrderAmount}
            onSubmit={handleSecurityOrderSubmit}
            onSwitchNetwork={handleSwitchNetwork}
          />
        )}

        {/* Modals */}
        <DepositModal
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          chainId={chainId}
          chainName={chainName}
          isTestnet={isTestnet}
          nativeCurrency={nativeCurrency || 'POL'}
          usdtAvailable={!!usdtAddress}
          usdcAvailable={!!usdcAddress}
        />

        <WithdrawModal
          isOpen={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
          nativeCurrency={nativeCurrency || 'POL'}
          usdtAvailable={!!usdtAddress}
          usdcAvailable={!!usdcAddress}
          onWithdraw={handleWithdraw}
        />
      </div>
    </div>
  );
}
