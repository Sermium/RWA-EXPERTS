'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, Shield, Globe, Zap, TrendingUp, Users, Lock, 
  ChevronRight, Sparkles, BarChart3, Wallet, Building2, Coins,
  CheckCircle, AlertTriangle, ExternalLink, RefreshCw, Copy, Check,
  Droplets, Clock, DollarSign, Scale, FileCheck, Repeat, CheckCircle2
} from 'lucide-react';
import { 
  useAccount, 
  useConnect, 
  useDisconnect, 
  useBalance,
  usePublicClient,
  useWriteContract,
  useChainId
} from 'wagmi';
import { formatUnits, parseUnits, type Address } from 'viem';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { DEPLOYMENTS } from '@/config/deployments';
import { CHAINS, SupportedChainId } from '@/config/chains';
import { TestTokenABI } from '@/config/abis';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Wallet Modal Component
function WalletModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const { connect } = useConnect();

  if (!isOpen) return null;

  const handleConnect = async (connector: any) => {
    try {
      connect({ connector });
      onClose();
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">Connect Wallet</h3>
        <div className="space-y-3">
          <button
            onClick={() => handleConnect(injected())}
            className="w-full flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
          >
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-white font-medium">MetaMask</div>
              <div className="text-gray-400 text-sm">Connect using browser wallet</div>
            </div>
          </button>
          <button
            onClick={() => handleConnect(coinbaseWallet({ appName: 'Investa' }))}
            className="w-full flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
          >
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-white font-medium">Coinbase Wallet</div>
              <div className="text-gray-400 text-sm">Connect using Coinbase</div>
            </div>
          </button>
          <button
            onClick={() => handleConnect(walletConnect({ 
              projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '' 
            }))}
            className="w-full flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
          >
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-white font-medium">WalletConnect</div>
              <div className="text-gray-400 text-sm">Scan with mobile wallet</div>
            </div>
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Testnet Faucet Component
function TestnetFaucet() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [mintAmount, setMintAmount] = useState('1000');
  const [mintingToken, setMintingToken] = useState<'USDC' | 'USDT' | null>(null);
  const [mintSuccess, setMintSuccess] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  
  const [balances, setBalances] = useState({
    usdc: '0',
    usdt: '0'
  });
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Get native balance
  const { data: nativeBalance, refetch: refetchNative } = useBalance({
    address: address,
  });

  // Get chain info from CHAINS config
  const chainInfo = chainId ? CHAINS[chainId as SupportedChainId] : null;
  const chainName = chainInfo?.name || 'Unknown Network';
  const faucetUrl = chainInfo?.faucetUrl || null;
  const nativeCurrency = chainInfo?.nativeCurrency || 'ETH';

  // Get deployment for current chain (for token addresses)
  const deployment = chainId ? DEPLOYMENTS[chainId as SupportedChainId] : null;
  
  // Get token addresses from deployment
  const usdcAddress = deployment?.tokens?.USDC && deployment.tokens.USDC !== ZERO_ADDRESS 
    ? deployment.tokens.USDC as Address 
    : null;
  const usdtAddress = deployment?.tokens?.USDT && deployment.tokens.USDT !== ZERO_ADDRESS 
    ? deployment.tokens.USDT as Address 
    : null;

  // Fetch token balances using TestTokenABI
  const fetchBalances = useCallback(async () => {
    if (!address || !publicClient) return;
    
    setIsLoadingBalances(true);
    try {
      const [usdcBal, usdtBal] = await Promise.all([
        usdcAddress 
          ? publicClient.readContract({
              address: usdcAddress,
              abi: TestTokenABI,
              functionName: 'balanceOf',
              args: [address]
            }).catch(() => BigInt(0))
          : Promise.resolve(BigInt(0)),
        usdtAddress
          ? publicClient.readContract({
              address: usdtAddress,
              abi: TestTokenABI,
              functionName: 'balanceOf',
              args: [address]
            }).catch(() => BigInt(0))
          : Promise.resolve(BigInt(0))
      ]);

      setBalances({
        usdc: formatUnits(usdcBal as bigint, 6),
        usdt: formatUnits(usdtBal as bigint, 6)
      });
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [address, publicClient, usdcAddress, usdtAddress]);

  useEffect(() => {
    if (isConnected && address) {
      fetchBalances();
    }
  }, [isConnected, address, chainId, fetchBalances]);

  // Clear messages after delay
  useEffect(() => {
    if (mintSuccess) {
      const timer = setTimeout(() => setMintSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [mintSuccess]);

  useEffect(() => {
    if (mintError) {
      const timer = setTimeout(() => setMintError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [mintError]);

  // Handle mint - using capital "Mint" function name from TestTokenABI
  const handleMint = async (token: 'USDC' | 'USDT') => {
    if (!address) {
      setShowWalletModal(true);
      return;
    }

    const tokenAddress = token === 'USDC' ? usdcAddress : usdtAddress;
    if (!tokenAddress) {
      setMintError(`${token} contract not deployed on this network`);
      return;
    }

    // Validate mint amount
    const parsedAmount = parseFloat(mintAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setMintError('Please enter a valid amount greater than 0');
      return;
    }
    if (parsedAmount > 1000000) {
      setMintError('Maximum mint amount is 1,000,000 tokens');
      return;
    }

    setMintingToken(token);
    setMintError(null);
    setMintSuccess(null);

    try {
      const amount = parseUnits(mintAmount, 6); // USDC/USDT have 6 decimals
      
      // Call "Mint" function (capital M) with "receiver" and "Amount" parameters
      // This matches the TestTokenABI: Mint(address receiver, uint256 Amount)
      await writeContractAsync({
        address: tokenAddress,
        abi: TestTokenABI,
        functionName: 'Mint',
        args: [address, amount],
      });

      setMintSuccess(`Successfully minted ${Number(mintAmount).toLocaleString()} ${token}!`);
      
      // Refresh balances after a short delay to allow blockchain to update
      setTimeout(() => {
        fetchBalances();
        refetchNative();
      }, 2000);
    } catch (error: any) {
      console.error('Mint error:', error);
      
      // Parse different error types
      if (error.message?.includes('User rejected') || error.message?.includes('user rejected')) {
        setMintError('Transaction rejected by user');
      } else if (error.message?.includes('execution reverted')) {
        // Check for specific revert reasons
        if (error.message?.includes('Ownable')) {
          setMintError('Only contract owner can mint. This may not be a public testnet token.');
        } else {
          setMintError('Minting failed. The token may have minting restrictions or you may not have permission.');
        }
      } else if (error.message?.includes('insufficient funds')) {
        setMintError(`Insufficient ${nativeCurrency} for gas. Get tokens from the faucet first.`);
      } else if (error.message?.includes('network')) {
        setMintError('Network error. Please check your connection and try again.');
      } else {
        setMintError(`Failed to mint ${token}: ${error.shortMessage || error.message || 'Unknown error'}`);
      }
    } finally {
      setMintingToken(null);
    }
  };

  // Copy address to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Format balance for display
  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.01) return '< 0.01';
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // Don't show if no stablecoins deployed
  if (!usdcAddress && !usdtAddress) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-yellow-400 font-semibold mb-1">No Stablecoins on {chainName}</h3>
            <p className="text-yellow-200/80 text-sm">
              USDC/USDT contracts are not deployed on this network. 
              Switch to Avalanche Fuji, Polygon Amoy, or BNB Testnet to mint test tokens.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 border border-purple-500/30 rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Droplets className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Testnet Faucet</h3>
            <p className="text-gray-400 text-sm">Mint test USDC & USDT on {chainName}</p>
          </div>
        </div>

        {/* Native Token Faucet Link */}
        {faucetUrl && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-blue-400" />
                <span className="text-blue-200 text-sm">Need {nativeCurrency} for gas?</span>
              </div>
              <a 
                href={faucetUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
              >
                Get from Faucet <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Balances */}
        {isConnected && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">{nativeCurrency}</div>
              <div className="text-white font-mono text-sm">
                {nativeBalance ? parseFloat(nativeBalance.formatted).toFixed(4) : '0'}
              </div>
            </div>
            {usdcAddress && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">USDC</div>
                <div className="text-white font-mono text-sm">
                  {isLoadingBalances ? '...' : formatBalance(balances.usdc)}
                </div>
              </div>
            )}
            {usdtAddress && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">USDT</div>
                <div className="text-white font-mono text-sm">
                  {isLoadingBalances ? '...' : formatBalance(balances.usdt)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mint Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <label className="text-gray-400 text-xs mb-1 block">Amount to Mint</label>
            <input
              type="number"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              placeholder="1000"
              min="1"
              max="1000000"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div className="flex gap-2 items-end">
            {usdcAddress && (
              <button
                onClick={() => handleMint('USDC')}
                disabled={mintingToken !== null}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {mintingToken === 'USDC' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Coins className="w-4 h-4" />
                )}
                Mint USDC
              </button>
            )}
            {usdtAddress && (
              <button
                onClick={() => handleMint('USDT')}
                disabled={mintingToken !== null}
                className="px-4 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {mintingToken === 'USDT' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Coins className="w-4 h-4" />
                )}
                Mint USDT
              </button>
            )}
            <button
              onClick={() => { fetchBalances(); refetchNative(); }}
              disabled={isLoadingBalances || !isConnected}
              className="p-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              title="Refresh balances"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingBalances ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {mintSuccess && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-green-200 text-sm">{mintSuccess}</span>
          </div>
        )}
        {mintError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-red-200 text-sm">{mintError}</span>
          </div>
        )}

        {/* Token Addresses for Import */}
        <div className="text-xs text-gray-400">
          <div className="font-medium mb-2">Add tokens to wallet:</div>
          <div className="space-y-1">
            {usdcAddress && (
              <div className="flex items-center gap-2 font-mono bg-gray-800/50 rounded px-2 py-1.5">
                <span className="text-blue-400 font-semibold">USDC:</span>
                <span className="text-gray-300 truncate flex-1 text-xs">{usdcAddress}</span>
                <button 
                  onClick={() => copyToClipboard(usdcAddress)}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                  title="Copy address"
                >
                  {copiedAddress === usdcAddress ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
            {usdtAddress && (
              <div className="flex items-center gap-2 font-mono bg-gray-800/50 rounded px-2 py-1.5">
                <span className="text-green-400 font-semibold">USDT:</span>
                <span className="text-gray-300 truncate flex-1 text-xs">{usdtAddress}</span>
                <button 
                  onClick={() => copyToClipboard(usdtAddress)}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                  title="Copy address"
                >
                  {copiedAddress === usdtAddress ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Connect Wallet Prompt */}
        {!isConnected && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <button
              onClick={() => setShowWalletModal(true)}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Wallet className="w-5 h-5" />
              Connect Wallet to Mint
            </button>
          </div>
        )}
      </div>

      <WalletModal 
        isOpen={showWalletModal} 
        onClose={() => setShowWalletModal(false)} 
      />
    </>
  );
}

export { TestnetFaucet };

export default function LandingPage() {
  const { isConnected } = useAccount();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const chainId = useChainId();
  
  // Get chain info from CHAINS config
  const chainInfo = chainId ? CHAINS[chainId as SupportedChainId] : null;
  const chainName = chainInfo?.name || null;
  const isTestnet = chainInfo?.testnet ?? false;
  const nativeCurrency = chainInfo?.nativeCurrency || 'ETH';
  
  // Check if deployment exists
  const deployment = chainId ? DEPLOYMENTS[chainId as SupportedChainId] : null;
  const isDeployed = !!deployment;

  const marketStats = [
    { value: "$33B+", label: "Tokenized RWA Market" },
    { value: "300%+", label: "3-Year Growth" },
    { value: "$30T", label: "Projected Potential" },
    { value: "24/7", label: "Global Trading" }
  ];

  const advantages = [
    {
      icon: <Clock className="w-7 h-7" />,
      title: "Faster Settlement",
      description: "Traditional markets operate on T+2 settlement cycles. Tokenized assets settle in near real-time, reducing counterparty risk and freeing up capital instantly.",
      stat: "Real-time",
      statLabel: "Settlement"
    },
    {
      icon: <DollarSign className="w-7 h-7" />,
      title: "Reduced Costs",
      description: "Eliminate intermediaries like banks, brokers, and clearinghouses. Smart contracts automate compliance, payments, and ownership transfers.",
      stat: "Up to 90%",
      statLabel: "Cost Reduction"
    },
    {
      icon: <Droplets className="w-7 h-7" />,
      title: "Enhanced Liquidity",
      description: "Transform illiquid assets into tradeable tokens. Create secondary markets for assets like real estate and private equity.",
      stat: "24/7",
      statLabel: "Trading"
    },
    {
      icon: <Globe className="w-7 h-7" />,
      title: "Global Access",
      description: "Blockchain networks are borderless. Reach investors worldwide without the complexities of traditional cross-border financial systems.",
      stat: "Borderless",
      statLabel: "Investment"
    },
    {
      icon: <Scale className="w-7 h-7" />,
      title: "Legal Frameworks",
      description: "Operate within established regulatory frameworks. Tokenized securities comply with existing securities laws.",
      stat: "Compliant",
      statLabel: "By Design"
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: "Enhanced Security",
      description: "Blockchain provides immutable ownership records and transparent audit trails. Every transaction is cryptographically secured.",
      stat: "Immutable",
      statLabel: "Records"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Wallet Modal */}
      {showWalletModal && (
        <WalletModal 
          isOpen={showWalletModal} 
          onClose={() => setShowWalletModal(false)} 
        />
      )}

      {/* Testnet Faucet Section - Show at top if on testnet */}
      {isTestnet && (
        <section className="px-4 sm:px-6 lg:px-8 pt-8">
          <div className="max-w-4xl mx-auto">
            <TestnetFaucet />
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-sm mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            $33+ Billion Market & Growing
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Tokenize Real-World Assets
            <span className="block bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Unlock Global Value
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10">
            Transform physical and financial assets into programmable, tradeable digital tokens. 
            From real estate to energy credits, democratize investment access and unlock liquidity 
            through blockchain technology.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            {!isConnected ? (
              <button
                onClick={() => setShowWalletModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition flex items-center cursor-pointer"
              >
                <Wallet className="mr-2 w-5 h-5" /> Connect Wallet
              </button>
            ) : (
              <Link 
                href="/crowdfunding"
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition flex items-center"
              >
                Browse Projects <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            )}
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {marketStats.map((stat, index) => (
              <div key={index} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl opacity-20 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full filter blur-[128px]"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full filter blur-[128px]"></div>
        </div>
      </section>

      {/* What is RWA Tokenization - Simplified */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            What is Real-World Asset Tokenization?
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Real-world asset (RWA) tokenization is the process of creating a digital representation 
            of physical or financial assets on a blockchain, enabling fractional ownership, 
            24/7 trading, and automated compliance.
          </p>
          <Link 
            href="/about/rwa-tokenization"
            className="inline-flex items-center px-6 py-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold rounded-xl hover:bg-blue-500/20 transition"
          >
            Learn More <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Why Tokenize Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Tokenize?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Blockchain technology brings unprecedented benefits to asset management, 
              trading, and ownership.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advantages.map((advantage, index) => (
              <div 
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    {advantage.icon}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">{advantage.stat}</div>
                    <div className="text-xs text-gray-500">{advantage.statLabel}</div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{advantage.title}</h3>
                <p className="text-gray-400 text-sm">{advantage.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Want to Tokenize Your Assets Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 text-sm mb-6">
            <Coins className="w-4 h-4 mr-2" />
            Asset Tokenization
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Want to Tokenize Your Assets?
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Transform your real estate, commodities, energy projects, or financial instruments 
            into digital tokens. Access global investors and unlock liquidity.
          </p>
          <Link 
            href="/tokenize"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition"
          >
            Start Tokenizing <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* What Are You Looking For Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              What Are You Looking For?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Whether you're an entrepreneur, established business, or investor, 
              RWA Experts provides comprehensive support for your tokenization journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Technical Solution */}
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-500/30 rounded-2xl p-6 hover:border-blue-400/50 transition-all duration-300 group">
              <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 inline-block mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Technical Solution</h3>
              <p className="text-gray-400 text-sm mb-4">
                Need smart contracts, token infrastructure, or blockchain integration? 
                Our technical team builds secure, compliant solutions tailored to your needs.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  Smart contract development
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  ERC-3643 compliant tokens
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  Custom blockchain solutions
                </li>
              </ul>
            </div>

            {/* Marketing & GTM */}
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-500/30 rounded-2xl p-6 hover:border-purple-400/50 transition-all duration-300 group">
              <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400 inline-block mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Marketing & GTM</h3>
              <p className="text-gray-400 text-sm mb-4">
                Ready to launch but need market visibility? We help you reach the right 
                investors and build a compelling go-to-market strategy.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  Investor outreach campaigns
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  Token launch strategy
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  Community building
                </li>
              </ul>
            </div>

            {/* Partnerships & Contacts */}
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-500/30 rounded-2xl p-6 hover:border-green-400/50 transition-all duration-300 group">
              <div className="p-3 bg-green-500/20 rounded-xl text-green-400 inline-block mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Partnerships & Contacts</h3>
              <p className="text-gray-400 text-sm mb-4">
                Looking to connect with key players in the RWA ecosystem? 
                We facilitate introductions to partners, exchanges, and service providers.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Exchange partnerships
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Custody & legal partners
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Industry network access
                </li>
              </ul>
            </div>

            {/* Team Building */}
            <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-500/30 rounded-2xl p-6 hover:border-orange-400/50 transition-all duration-300 group">
              <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400 inline-block mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Team Building</h3>
              <p className="text-gray-400 text-sm mb-4">
                Need to assemble a team for your tokenization project? 
                We connect you with vetted blockchain developers, legal experts, and advisors.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-400" />
                  Blockchain developers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-400" />
                  Legal & compliance experts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-400" />
                  Advisory board members
                </li>
              </ul>
            </div>

            {/* Funding */}
            <div className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 border border-cyan-500/30 rounded-2xl p-6 hover:border-cyan-400/50 transition-all duration-300 group">
              <div className="p-3 bg-cyan-500/20 rounded-xl text-cyan-400 inline-block mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Funding</h3>
              <p className="text-gray-400 text-sm mb-4">
                Ready to raise capital for your project? Launch a compliant security 
                token offering and access our global network of verified investors.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Security token offerings
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Investor introductions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Milestone-based escrow
                </li>
              </ul>
            </div>

            {/* All of the Above */}
            <div className="bg-gradient-to-br from-pink-900/30 to-pink-800/20 border border-pink-500/30 rounded-2xl p-6 hover:border-pink-400/50 transition-all duration-300 group">
              <div className="p-3 bg-pink-500/20 rounded-xl text-pink-400 inline-block mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Full Service Package</h3>
              <p className="text-gray-400 text-sm mb-4">
                Need comprehensive support? RWA Experts offers end-to-end solutions 
                combining all services to take your project from idea to launch.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-pink-400" />
                  Complete project management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-pink-400" />
                  Dedicated success manager
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-pink-400" />
                  Priority support & guidance
                </li>
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <p className="text-gray-400 mb-6">
              Not sure what you need? Let's discuss your project and find the right solution.
            </p>
            <Link
              href="/about/contact"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition"
            >
              Let's Talk <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Services Navigation */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Our Services
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              End-to-end tokenization solutions for issuers, investors, and institutions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Company */}
            <Link href="/about/company" className="group">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-blue-500 transition-all duration-300 h-full">
                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 inline-block mb-4">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition">
                  Company
                </h3>
                <p className="text-gray-400 text-sm">
                  Learn about our mission to democratize access to real-world assets through blockchain.
                </p>
              </div>
            </Link>

            {/* Team */}
            <Link href="/about/team" className="group">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-purple-500 transition-all duration-300 h-full">
                <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400 inline-block mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition">
                  Team
                </h3>
                <p className="text-gray-400 text-sm">
                  Meet the experts behind our platform: professionals in finance, blockchain, and law.
                </p>
              </div>
            </Link>

            {/* Custom Tokenization */}
            <Link href="/tokenize" className="group">
              <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-6 hover:border-blue-400 transition-all duration-300 h-full">
                <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400 inline-block mb-4">
                  <Coins className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition">
                  Tokenize Assets
                </h3>
                <p className="text-gray-400 text-sm mb-3">
                  Custom token minting for your specific needs. Security tokens, NFTs, and more.
                </p>
                <div className="text-xs text-blue-400">
                  Gold KYC Required • Platform fees apply
                </div>
              </div>
            </Link>

            {/* Crowdfunding */}
            <Link href="/crowdfunding" className="group">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-green-500 transition-all duration-300 h-full">
                <div className="p-3 bg-green-500/10 rounded-lg text-green-400 inline-block mb-4">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-green-400 transition">
                  Crowdfunding
                </h3>
                <p className="text-gray-400 text-sm">
                  Launch or invest in tokenized projects. RWA Experts connects issuers with global investors.
                </p>
              </div>
            </Link>

            {/* KYC */}
            <Link href="/kyc" className="group">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-yellow-500 transition-all duration-300 h-full">
                <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-400 inline-block mb-4">
                  <FileCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-yellow-400 transition">
                  Identity (KYC)
                </h3>
                <p className="text-gray-400 text-sm">
                  Verify your identity to access investment opportunities. Compliant with global regulations.
                </p>
              </div>
            </Link>

            {/* Exchange */}
            <Link href="/exchange" className="group">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-cyan-500 transition-all duration-300 h-full">
                <div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400 inline-block mb-4">
                  <Repeat className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-400 transition">
                  Exchange
                </h3>
                <p className="text-gray-400 text-sm">
                  Trade tokenized assets on our compliant secondary market. Instant settlement, global access.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Join the $33+ billion tokenized asset market. Whether you're an issuer looking to raise capital 
            or an investor seeking new opportunities, we're here to help.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!isConnected ? (
              <button
                onClick={() => setShowWalletModal(true)}
                className="px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition flex items-center cursor-pointer"
              >
                <Wallet className="mr-2 w-5 h-5" /> Connect Wallet
              </button>
            ) : (
              <Link 
                href="/crowdfunding"
                className="px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition flex items-center"
              >
                Browse Projects <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            )}
            <Link 
              href="/about/company"
              className="px-8 py-4 bg-transparent text-white font-semibold rounded-xl hover:bg-white/10 transition border border-white/30"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Network Notice - Bottom of page for non-testnet */}
      {!isTestnet && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Not Deployed Notice */}
          {!isDeployed && chainName && (
            <div className="bg-orange-900/50 border border-orange-600 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-orange-400 mr-2 flex-shrink-0" />
                <span className="text-orange-400 font-semibold mr-2">Coming Soon:</span>
                <span className="text-orange-200">
                  Platform contracts are not yet deployed on {chainName}. 
                  Please switch to a supported network to access all features.
                </span>
              </div>
            </div>
          )}

          {/* Mainnet Notice */}
          {isDeployed && chainName && (
            <div className="bg-green-900/50 border border-green-600 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
                <span className="text-green-400 font-semibold mr-2">Live on {chainName}:</span>
                <span className="text-green-200">
                  You're connected to the production network. Real transactions will use real {nativeCurrency}.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
