'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Shield, Globe, Zap, TrendingUp, Users, Lock,
  ChevronRight, Sparkles, BarChart3, Wallet, Building2, Coins,
  CheckCircle, AlertTriangle, ExternalLink, RefreshCw, Copy, Check,
  Droplets, Clock, DollarSign, Scale, FileCheck, Repeat, CheckCircle2,
  Cog, Megaphone, Handshake, UsersRound, Landmark, Layers
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-panel animate-fade-up">
        <h3 className="text-xl font-display font-medium text-ink mb-4">Connect Wallet</h3>
        <div className="space-y-3">
          <button
            onClick={() => handleConnect(injected())}
            className="w-full flex items-center gap-3 p-4 bg-surface-raised hover:bg-surface-overlay rounded-lg transition-colors duration-200"
          >
            <div className="w-10 h-10 bg-gold/15 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-gold" />
            </div>
            <div className="text-left">
              <div className="text-ink font-medium">MetaMask</div>
              <div className="text-ink-muted text-sm">Connect using browser wallet</div>
            </div>
          </button>
          <button
            onClick={() => handleConnect(coinbaseWallet({ appName: 'Investa' }))}
            className="w-full flex items-center gap-3 p-4 bg-surface-raised hover:bg-surface-overlay rounded-lg transition-colors duration-200"
          >
            <div className="w-10 h-10 bg-gold/15 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-gold" />
            </div>
            <div className="text-left">
              <div className="text-ink font-medium">Coinbase Wallet</div>
              <div className="text-ink-muted text-sm">Connect using Coinbase</div>
            </div>
          </button>
          <button
            onClick={() => handleConnect(walletConnect({
              projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''
            }))}
            className="w-full flex items-center gap-3 p-4 bg-surface-raised hover:bg-surface-overlay rounded-lg transition-colors duration-200"
          >
            <div className="w-10 h-10 bg-gold/15 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-gold" />
            </div>
            <div className="text-left">
              <div className="text-ink font-medium">WalletConnect</div>
              <div className="text-ink-muted text-sm">Scan with mobile wallet</div>
            </div>
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 text-ink-muted hover:text-ink transition-colors duration-200"
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
      <div className="bg-warning-muted border border-warning/30 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-warning font-semibold mb-1">No Stablecoins on {chainName}</h3>
            <p className="text-ink-muted text-sm">
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
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gold/10 rounded-lg">
            <Droplets className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h3 className="text-ink font-semibold text-lg">Testnet Faucet</h3>
            <p className="text-ink-muted text-sm">Mint test USDC & USDT on {chainName}</p>
          </div>
        </div>

        {/* Native Token Faucet Link */}
        {faucetUrl && (
          <div className="mb-4 p-3 bg-surface-raised border border-border rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-gold" />
                <span className="text-ink-muted text-sm">Need {nativeCurrency} for gas?</span>
              </div>
              <a
                href={faucetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-gold hover:text-gold-light text-sm font-medium transition-colors duration-200"
              >
                Get from Faucet <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Balances */}
        {isConnected && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-surface-raised rounded-lg p-3">
              <div className="text-ink-faint text-xs mb-1">{nativeCurrency}</div>
              <div className="text-ink font-mono text-sm">
                {nativeBalance ? parseFloat(nativeBalance.formatted).toFixed(4) : '0'}
              </div>
            </div>
            {usdcAddress && (
              <div className="bg-surface-raised rounded-lg p-3">
                <div className="text-ink-faint text-xs mb-1">USDC</div>
                <div className="text-ink font-mono text-sm">
                  {isLoadingBalances ? '...' : formatBalance(balances.usdc)}
                </div>
              </div>
            )}
            {usdtAddress && (
              <div className="bg-surface-raised rounded-lg p-3">
                <div className="text-ink-faint text-xs mb-1">USDT</div>
                <div className="text-ink font-mono text-sm">
                  {isLoadingBalances ? '...' : formatBalance(balances.usdt)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mint Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <label className="text-ink-faint text-xs mb-1 block">Amount to Mint</label>
            <input
              type="number"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              placeholder="1000"
              min="1"
              max="1000000"
              className="w-full bg-surface-raised border border-border rounded-lg px-4 py-2.5 text-ink focus:outline-none focus:border-gold transition-colors duration-200"
            />
          </div>
          <div className="flex gap-2 items-end">
            {usdcAddress && (
              <button
                onClick={() => handleMint('USDC')}
                disabled={mintingToken !== null}
                className="px-4 py-2.5 bg-gold hover:bg-gold-light disabled:bg-border disabled:cursor-not-allowed text-surface-sunken font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
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
                className="px-4 py-2.5 bg-surface-overlay hover:bg-border-strong disabled:bg-border disabled:cursor-not-allowed text-ink font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
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
              className="p-2.5 bg-surface-raised hover:bg-surface-overlay disabled:opacity-50 disabled:cursor-not-allowed text-ink rounded-lg transition-colors duration-200"
              title="Refresh balances"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingBalances ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {mintSuccess && (
          <div className="mb-4 p-3 bg-success-muted border border-success/30 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
            <span className="text-ink-muted text-sm">{mintSuccess}</span>
          </div>
        )}
        {mintError && (
          <div className="mb-4 p-3 bg-danger-muted border border-danger/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
            <span className="text-ink-muted text-sm">{mintError}</span>
          </div>
        )}

        {/* Token Addresses for Import */}
        <div className="text-xs text-ink-muted">
          <div className="font-medium mb-2">Add tokens to wallet:</div>
          <div className="space-y-1">
            {usdcAddress && (
              <div className="flex items-center gap-2 font-mono bg-surface-raised rounded px-2 py-1.5">
                <span className="text-gold font-semibold">USDC:</span>
                <span className="text-ink-muted truncate flex-1 text-xs">{usdcAddress}</span>
                <button
                  onClick={() => copyToClipboard(usdcAddress)}
                  className="text-ink-faint hover:text-ink transition-colors duration-200 p-1"
                  title="Copy address"
                >
                  {copiedAddress === usdcAddress ? (
                    <Check className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
            {usdtAddress && (
              <div className="flex items-center gap-2 font-mono bg-surface-raised rounded px-2 py-1.5">
                <span className="text-gold font-semibold">USDT:</span>
                <span className="text-ink-muted truncate flex-1 text-xs">{usdtAddress}</span>
                <button
                  onClick={() => copyToClipboard(usdtAddress)}
                  className="text-ink-faint hover:text-ink transition-colors duration-200 p-1"
                  title="Copy address"
                >
                  {copiedAddress === usdtAddress ? (
                    <Check className="w-3.5 h-3.5 text-success" />
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
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setShowWalletModal(true)}
              className="w-full py-3 bg-gold hover:bg-gold-light text-surface-sunken font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
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

  const serviceOfferings = [
    {
      icon: Cog,
      title: "Technical Solution",
      description: "Need smart contracts, token infrastructure, or blockchain integration? Our technical team builds secure, compliant solutions tailored to your needs.",
      points: ["Smart contract development", "ERC-3643 compliant tokens", "Custom blockchain solutions"],
    },
    {
      icon: Megaphone,
      title: "Marketing & GTM",
      description: "Ready to launch but need market visibility? We help you reach the right investors and build a compelling go-to-market strategy.",
      points: ["Investor outreach campaigns", "Token launch strategy", "Community building"],
    },
    {
      icon: Handshake,
      title: "Partnerships & Contacts",
      description: "Looking to connect with key players in the RWA ecosystem? We facilitate introductions to partners, exchanges, and service providers.",
      points: ["Exchange partnerships", "Custody & legal partners", "Industry network access"],
    },
    {
      icon: UsersRound,
      title: "Team Building",
      description: "Need to assemble a team for your tokenization project? We connect you with vetted blockchain developers, legal experts, and advisors.",
      points: ["Blockchain developers", "Legal & compliance experts", "Advisory board members"],
    },
    {
      icon: Landmark,
      title: "Funding",
      description: "Ready to raise capital for your project? Launch a compliant security token offering and access our global network of verified investors.",
      points: ["Security token offerings", "Investor introductions", "Milestone-based escrow"],
    },
    {
      icon: Layers,
      title: "Full Service Package",
      description: "Need comprehensive support? Qwilon offers end-to-end solutions combining all services to take your project from idea to launch.",
      points: ["Complete project management", "Dedicated success manager", "Priority support & guidance"],
    },
  ];

  return (
    <div className="min-h-screen bg-surface-sunken">
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
      <section className="relative pt-20 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="relative max-w-5xl mx-auto text-center animate-fade-up">
          {/* Eyebrow */}
          <div className="inline-flex items-center px-4 py-1.5 bg-gold/10 border border-gold/25 rounded-full text-gold text-sm mb-8 tracking-wide">
            <span className="w-1.5 h-1.5 bg-gold rounded-full mr-2" />
            $33+ Billion Market & Growing
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-medium text-ink mb-6 text-balance">
            Tokenize real-world assets.
            <span className="block italic text-gradient-gold">Unlock global value.</span>
          </h1>

          <p className="text-lg sm:text-xl text-ink-muted max-w-2xl mx-auto mb-10 text-balance">
            Transform physical and financial assets into programmable, tradeable digital tokens.
            From real estate to energy credits, democratize investment access and unlock liquidity
            through blockchain technology.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            {!isConnected ? (
              <button
                onClick={() => setShowWalletModal(true)}
                className="px-8 py-4 bg-gold hover:bg-gold-light text-surface-sunken font-semibold rounded-lg transition-colors duration-200 flex items-center cursor-pointer"
              >
                <Wallet className="mr-2 w-5 h-5" /> Connect Wallet
              </button>
            ) : (
              <Link
                href="/crowdfunding"
                className="px-8 py-4 bg-gold hover:bg-gold-light text-surface-sunken font-semibold rounded-lg transition-colors duration-200 flex items-center"
              >
                Browse Projects <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            )}
            <Link
              href="/about/rwa-tokenization"
              className="px-8 py-4 bg-transparent text-ink font-semibold rounded-lg transition-colors duration-200 border border-border hover:border-border-strong flex items-center"
            >
              Learn How It Works
            </Link>
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {marketStats.map((stat, index) => (
              <div key={index} className="bg-surface border border-border rounded-xl p-5 transition-colors duration-200 hover:border-gold/40">
                <div className="text-2xl font-display font-medium text-gold">
                  {stat.value}
                </div>
                <div className="text-sm text-ink-muted mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 bg-grain opacity-40 pointer-events-none" />
      </section>

      {/* What is RWA Tokenization - Simplified */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-medium text-ink mb-6">
            What is real-world asset tokenization?
          </h2>
          <p className="text-ink-muted text-lg mb-8">
            Real-world asset (RWA) tokenization is the process of creating a digital representation
            of physical or financial assets on a blockchain, enabling fractional ownership,
            24/7 trading, and automated compliance.
          </p>
          <Link
            href="/about/rwa-tokenization"
            className="inline-flex items-center px-6 py-3 bg-transparent border border-border text-ink font-semibold rounded-lg hover:border-gold/50 hover:text-gold transition-colors duration-200"
          >
            Learn More <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Why Tokenize Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-surface/50 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-medium text-ink mb-4">
              Why tokenize?
            </h2>
            <p className="text-ink-muted max-w-2xl mx-auto text-lg">
              Blockchain technology brings unprecedented benefits to asset management,
              trading, and ownership.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advantages.map((advantage, index) => (
              <div
                key={index}
                className="bg-surface border border-border rounded-xl p-6 hover:border-gold/40 transition-colors duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-gold/10 rounded-lg text-gold">
                    {advantage.icon}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-display font-medium text-ink">{advantage.stat}</div>
                    <div className="text-xs text-ink-faint">{advantage.statLabel}</div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">{advantage.title}</h3>
                <p className="text-ink-muted text-sm">{advantage.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Want to Tokenize Your Assets Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-1.5 bg-gold/10 border border-gold/25 rounded-full text-gold text-sm mb-6">
            <Coins className="w-4 h-4 mr-2" />
            Asset Tokenization
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-medium text-ink mb-6">
            Want to tokenize your assets?
          </h2>
          <p className="text-ink-muted text-lg mb-8">
            Transform your real estate, commodities, energy projects, or financial instruments
            into digital tokens. Access global investors and unlock liquidity.
          </p>
          <Link
            href="/tokenize"
            className="inline-flex items-center px-8 py-4 bg-gold hover:bg-gold-light text-surface-sunken font-semibold rounded-lg transition-colors duration-200"
          >
            Start Tokenizing <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* What Are You Looking For Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-medium text-ink mb-4">
              What are you looking for?
            </h2>
            <p className="text-ink-muted max-w-2xl mx-auto text-lg">
              Whether you're an entrepreneur, established business, or investor,
              Qwilon provides comprehensive support for your tokenization journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceOfferings.map((offering) => (
              <div
                key={offering.title}
                className="bg-surface border border-border rounded-xl p-6 hover:border-gold/40 transition-colors duration-300 group"
              >
                <div className="p-3 bg-gold/10 rounded-lg text-gold inline-block mb-4">
                  <offering.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold text-ink mb-3">{offering.title}</h3>
                <p className="text-ink-muted text-sm mb-4">{offering.description}</p>
                <ul className="space-y-2 text-sm text-ink-muted">
                  {offering.points.map((point) => (
                    <li key={point} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-gold flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <p className="text-ink-muted mb-6">
              Not sure what you need? Let's discuss your project and find the right solution.
            </p>
            <Link
              href="/about/contact"
              className="inline-flex items-center px-8 py-4 bg-gold hover:bg-gold-light text-surface-sunken font-semibold rounded-lg transition-colors duration-200"
            >
              Let's Talk <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Services Navigation */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-surface/50 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-medium text-ink mb-4">
              Our Services
            </h2>
            <p className="text-ink-muted max-w-2xl mx-auto">
              End-to-end tokenization solutions for issuers, investors, and institutions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { href: '/about/company', icon: Building2, title: 'Company', description: 'Learn about our mission to democratize access to real-world assets through blockchain.' },
              { href: '/about/team', icon: Users, title: 'Team', description: 'Meet the experts behind our platform: professionals in finance, blockchain, and law.' },
              { href: '/tokenize', icon: Coins, title: 'Tokenize Assets', description: 'Custom token minting for your specific needs. Security tokens, NFTs, and more.', tag: 'Gold KYC Required · Platform fees apply' },
              { href: '/crowdfunding', icon: TrendingUp, title: 'Crowdfunding', description: 'Launch or invest in tokenized projects. Qwilon connects issuers with global investors.' },
              { href: '/kyc', icon: FileCheck, title: 'Identity (KYC)', description: 'Verify your identity to access investment opportunities. Compliant with global regulations.' },
              { href: '/exchange', icon: Repeat, title: 'Exchange', description: 'Trade tokenized assets on our compliant secondary market. Instant settlement, global access.' },
            ].map((service) => (
              <Link href={service.href} className="group" key={service.href}>
                <div className="bg-surface border border-border rounded-xl p-6 hover:border-gold/40 transition-colors duration-300 h-full">
                  <div className="p-3 bg-gold/10 rounded-lg text-gold inline-block mb-4">
                    <service.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-ink mb-2 group-hover:text-gold transition-colors duration-200">
                    {service.title}
                  </h3>
                  <p className="text-ink-muted text-sm">
                    {service.description}
                  </p>
                  {service.tag && (
                    <div className="text-xs text-gold mt-3">{service.tag}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-medium text-ink mb-6">
            Ready to get started?
          </h2>
          <p className="text-lg text-ink-muted mb-8">
            Join the $33+ billion tokenized asset market. Whether you're an issuer looking to raise capital
            or an investor seeking new opportunities, we're here to help.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!isConnected ? (
              <button
                onClick={() => setShowWalletModal(true)}
                className="px-8 py-4 bg-gold hover:bg-gold-light text-surface-sunken font-semibold rounded-lg transition-colors duration-200 flex items-center cursor-pointer"
              >
                <Wallet className="mr-2 w-5 h-5" /> Connect Wallet
              </button>
            ) : (
              <Link
                href="/crowdfunding"
                className="px-8 py-4 bg-gold hover:bg-gold-light text-surface-sunken font-semibold rounded-lg transition-colors duration-200 flex items-center"
              >
                Browse Projects <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            )}
            <Link
              href="/about/company"
              className="px-8 py-4 bg-transparent text-ink font-semibold rounded-lg transition-colors duration-200 border border-border hover:border-border-strong"
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
            <div className="bg-warning-muted border border-warning/30 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-warning mr-2 flex-shrink-0" />
                <span className="text-warning font-semibold mr-2">Coming Soon:</span>
                <span className="text-ink-muted">
                  Platform contracts are not yet deployed on {chainName}.
                  Please switch to a supported network to access all features.
                </span>
              </div>
            </div>
          )}

          {/* Mainnet Notice */}
          {isDeployed && chainName && (
            <div className="bg-success-muted border border-success/30 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-success mr-2 flex-shrink-0" />
                <span className="text-success font-semibold mr-2">Live on {chainName}:</span>
                <span className="text-ink-muted">
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
