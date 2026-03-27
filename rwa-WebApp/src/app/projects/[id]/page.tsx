'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  Check, 
  Calendar,
  Users,
  Target,
  TrendingUp,
  Clock,
  FileText,
  Building2,
  Globe,
  MapPin,
  Milestone,
  Play,
  AlertCircle,
  Loader2,
  Share2,
  Bookmark,
  Lock,
  Coins,
  BarChart3,
  DollarSign,
  PieChart,
  Percent,
  CreditCard,
  Wallet,
  CheckCircle,
  ChevronDown,
  ShieldAlert
} from 'lucide-react';

// Import configs
import { getChainById, type SupportedChainId } from '@/config/chains';
import { DEPLOYMENTS } from '@/config/deployments';

// Stripe
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// Get stablecoin addresses from deployment config
function getStablecoins(chainId: number): { USDT?: string; USDC?: string } {
  const deployment = DEPLOYMENTS[chainId as SupportedChainId];
  if (!deployment?.tokens) return {};
  const ZERO = "0x0000000000000000000000000000000000000000";
  const tokens: { USDT?: string; USDC?: string } = {};
  if (deployment.tokens.USDT && deployment.tokens.USDT !== ZERO) tokens.USDT = deployment.tokens.USDT;
  if (deployment.tokens.USDC && deployment.tokens.USDC !== ZERO) tokens.USDC = deployment.tokens.USDC;
  return tokens;
}

// Status configuration
const DB_STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'gray' },
  pending_review: { label: 'Pending Review', color: 'yellow' },
  pending_payment: { label: 'Pending Payment', color: 'orange' },
  approved: { label: 'Approved', color: 'green' },
  active: { label: 'Active', color: 'blue' },
  funded: { label: 'Funded', color: 'emerald' },
  completed: { label: 'Completed', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
  cancelled: { label: 'Cancelled', color: 'gray' },
  in_progress: { label: 'In Progress', color: 'blue' },
};

// Chain information
const CHAIN_INFO: Record<number, { name: string; explorer: string }> = {
  1: { name: 'Ethereum', explorer: 'https://etherscan.io' },
  11155111: { name: 'Sepolia', explorer: 'https://sepolia.etherscan.io' },
  137: { name: 'Polygon', explorer: 'https://polygonscan.com' },
  80002: { name: 'Polygon Amoy', explorer: 'https://amoy.polygonscan.com' },
  56: { name: 'BNB Chain', explorer: 'https://bscscan.com' },
  97: { name: 'BNB Testnet', explorer: 'https://testnet.bscscan.com' },
  43114: { name: 'Avalanche', explorer: 'https://snowtrace.io' },
  43113: { name: 'Avalanche Fuji', explorer: 'https://testnet.snowtrace.io' },
  42161: { name: 'Arbitrum', explorer: 'https://arbiscan.io' },
  10: { name: 'Optimism', explorer: 'https://optimistic.etherscan.io' },
  8453: { name: 'Base', explorer: 'https://basescan.org' },
  25: { name: 'Cronos', explorer: 'https://cronoscan.com' },
  338: { name: 'Cronos Testnet', explorer: 'https://testnet.cronoscan.com' },
};

// Project data interface
interface ProjectData {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  chainId: number;
  companyName: string;
  jurisdiction: string;
  registrationNumber: string;
  website: string;
  email: string;
  fundingGoal: number;
  totalRaised: number;
  investorCount: number;
  currency: string;
  exchangeRate: number;
  tokenName: string;
  tokenSymbol: string;
  totalSupply: number;
  tokensForRaise: number;
  tokensForRaisePercentage: number;
  tokenPrice: number;
  totalValuation: number;
  projectedRoi: number;
  roiTimeline: string;
  cliffPeriod: number;
  vestingPeriod: number;
  dividendYield: number;
  minInvestment: number;
  maxInvestment: number;
  approvedAt: Date | null;
  deadline: Date | null;
  daysLeft: number | null;
  createdAt: Date | null;
  logoUrl: string;
  bannerUrl: string;
  videoUrl: string;
  pitchDeckUrl: string;
  legalDocuments: Array<{ name: string; url: string; type?: string }>;
  milestones: Array<{ title: string; description: string; targetDate: string; fundingPercentage: number; status: string }>;
  teamMembers: Array<{ name: string; role: string; bio?: string; linkedin?: string; image?: string }>;
  socialLinks: { twitter?: string; telegram?: string; discord?: string; linkedin?: string; github?: string };
  contractAddress: string;
  escrowAddress: string;
  walletAddress: string;
  _raw?: Record<string, unknown>;
}

// Helpers
function safeNumber(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

function formatCurrency(amount: number | undefined | null, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(safeNumber(amount));
}

function formatCurrencyPrecise(amount: number | undefined | null): string {
  const value = safeNumber(amount);
  if (value === 0) return '$0.00';
  if (value < 0.01) return `$${value.toFixed(6)}`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatNumber(num: number | undefined | null): string {
  return new Intl.NumberFormat('en-US').format(safeNumber(num));
}

function formatPercent(num: number | undefined | null): string {
  return `${safeNumber(num).toFixed(1)}%`;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address || '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Infer document type from URL/name
function inferDocType(url: string, name?: string): string {
  const lower = (url + (name || '')).toLowerCase();
  if (lower.includes('pitch')) return 'Pitch Deck';
  if (lower.includes('whitepaper')) return 'Whitepaper';
  if (lower.includes('legal') || lower.includes('opinion')) return 'Legal Opinion';
  if (lower.includes('audit')) return 'Audit Report';
  if (lower.includes('financial')) return 'Financial Report';
  if (lower.includes('tokenomics') || lower.includes('token')) return 'Tokenomics';
  if (lower.includes('terms')) return 'Terms & Conditions';
  if (lower.includes('privacy')) return 'Privacy Policy';
  if (lower.includes('business')) return 'Business Plan';
  if (lower.includes('certificate') || lower.includes('registration')) return 'Registration Certificate';
  if (lower.includes('compliance')) return 'Compliance Document';
  if (lower.includes('kyc') || lower.includes('aml')) return 'KYC/AML Policy';
  const filename = url.split('/').pop()?.split('?')[0] || '';
  if (filename) {
    const cleanName = filename.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '');
    if (cleanName.length > 3) return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  }
  return 'Document';
}

// Copy button
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1 hover:bg-white/10 rounded transition-colors" title="Copy">
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
    </button>
  );
}

// Stat card
function StatCard({ icon: Icon, label, value, subValue }: { icon: React.ElementType; label: string; value: string; subValue?: string }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-slate-400 text-sm">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
    </div>
  );
}

// Milestone card
function MilestoneCard({ milestone, index }: { milestone: ProjectData['milestones'][0]; index: number }) {
  const statusColors: Record<string, string> = { completed: 'bg-green-500', in_progress: 'bg-blue-500', pending: 'bg-slate-500' };
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${statusColors[milestone.status] || statusColors.pending}`}>{index + 1}</div>
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-white mb-2">{milestone.title}</h4>
          <p className="text-slate-400 text-sm mb-3">{milestone.description}</p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500"><Calendar className="w-4 h-4 inline mr-1" />{formatDate(milestone.targetDate)}</span>
            <span className="text-slate-500"><Target className="w-4 h-4 inline mr-1" />{milestone.fundingPercentage}% of funds</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Document item
function DocumentItem({ doc }: { doc: { name?: string; url: string; type?: string } }) {
  const docType = doc.type || inferDocType(doc.url, doc.name);
  return (
    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
      <FileText className="w-8 h-8 text-blue-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium">{docType}</p>
        <p className="text-slate-400 text-sm truncate">{doc.url.split('/').pop()?.split('?')[0]}</p>
      </div>
      <ExternalLink className="w-5 h-5 text-slate-400 flex-shrink-0" />
    </a>
  );
}

// Stripe Inline Form Component
function StripeInlineForm({
  amount,
  onSuccess,
  onError,
  onCancel,
}: {
  amount: number;
  onSuccess: (intentId: string) => void;
  onError: (message: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !isReady) return;

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Payment failed');
        setIsProcessing(false);
      } else if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        onSuccess(paymentIntent.id);
      } else {
        onError('Payment was not completed. Please try again.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      onError(err.message || 'An error occurred');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement onReady={() => setIsReady(true)} options={{ layout: 'tabs' }} />
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !isReady || isProcessing}
          className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <><Loader2 className="w-5 h-5 animate-spin" />Processing...</>
          ) : (
            <>Pay ${amount.toLocaleString()}</>
          )}
        </button>
      </div>
    </form>
  );
}

// Investment Card Component - WITH ESCROW REQUIREMENT
function InvestmentCard({
  project,
  onSuccess,
}: {
  project: ProjectData;
  onSuccess?: () => void;
}) {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  
  // State
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'usdc' | 'usdt' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState('');

  // Stripe
  const [clientSecret, setClientSecret] = useState('');
  const [stripeReady, setStripeReady] = useState(false);

  // Target chain from project
  const targetChainId = project.chainId || 43113;
  const chainInfo = CHAIN_INFO[targetChainId] || { name: `Chain ${targetChainId}`, explorer: '' };

  // Check if escrow is configured - REQUIRED for crypto payments
  const hasEscrow = !!project.escrowAddress && project.escrowAddress.length > 10;

  // Get stablecoin addresses
  const stablecoins = getStablecoins(targetChainId);
  const STABLECOIN_ADDRESSES: Record<number, { usdc?: `0x${string}`; usdt?: `0x${string}` }> = {
    43113: { 
      usdc: '0x5425890298aed601595a70AB815c96711a31Bc65' as `0x${string}`,
      usdt: '0xAb231A5744C8E6c45481754928cCfFFFD4aa0732' as `0x${string}`,
    },
    43114: { 
      usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' as `0x${string}`,
      usdt: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7' as `0x${string}`,
    },
    1: { 
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}`,
      usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as `0x${string}`,
    },
    137: { 
      usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as `0x${string}`,
      usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as `0x${string}`,
    },
  };

  const chainTokens = {
    usdc: (stablecoins.USDC || STABLECOIN_ADDRESSES[targetChainId]?.usdc) as `0x${string}` | undefined,
    usdt: (stablecoins.USDT || STABLECOIN_ADDRESSES[targetChainId]?.usdt) as `0x${string}` | undefined,
  };

  // ERC20 ABI
  const erc20Abi = [
    { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
    { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  ] as const;

  // Read balances
  const { data: usdcBalance } = useReadContract({
    address: chainTokens.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected && !!chainTokens.usdc },
  });

  const { data: usdtBalance } = useReadContract({
    address: chainTokens.usdt,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected && !!chainTokens.usdt },
  });

  // Contract write
  const { writeContractAsync } = useWriteContract();
  const [pendingTx, setPendingTx] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: pendingTx });

  // Calculations
  const numericAmount = parseFloat(amount) || 0;
  const tokensToReceive = project.tokenPrice > 0 ? numericAmount / project.tokenPrice : 0;
  const isValidAmount = numericAmount >= project.minInvestment && numericAmount <= project.maxInvestment;
  const isWrongChain = isConnected && chain?.id !== targetChainId;

  // Format balance
  const formatBalance = (bal: bigint | undefined): string => {
    if (!bal) return '0.00';
    return (Number(bal) / 1e6).toFixed(2);
  };

  const usdcBal = formatBalance(usdcBalance as bigint | undefined);
  const usdtBal = formatBalance(usdtBalance as bigint | undefined);

  // Record investment to database
  const recordInvestment = async (txHashOrIntent: string, method: string) => {
    try {
      const res = await fetch('/api/investments/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          investor_address: address?.toLowerCase(),
          amount_usd: numericAmount,
          amount_tokens: tokensToReceive,
          payment_method: method,
          tx_hash: method !== 'stripe' ? txHashOrIntent : null,
          payment_intent_id: method === 'stripe' ? txHashOrIntent : null,
          chain_id: targetChainId,
          metadata: { token_symbol: project.tokenSymbol, token_price: project.tokenPrice, project_name: project.name },
        }),
      });
      const data = await res.json();
      console.log('[Investment] Record response:', data);
      if (!res.ok) console.error('[Investment] Record failed:', data);
      return data;
    } catch (err) {
      console.error('[Investment] Record error:', err);
    }
  };

  // Handle crypto payment - REQUIRES ESCROW
  const handleCryptoPayment = async (token: 'usdc' | 'usdt') => {
    // SECURITY: Require escrow contract
    if (!hasEscrow) {
      setError('Crypto payments are not available for this project yet. An escrow contract must be deployed first. Please use card payment.');
      return;
    }

    if (!address || !isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (isWrongChain) {
      try {
        await switchChain({ chainId: targetChainId });
        return;
      } catch {
        setError(`Please switch to ${chainInfo.name}`);
        return;
      }
    }

    const tokenAddress = token === 'usdc' ? chainTokens.usdc : chainTokens.usdt;
    if (!tokenAddress) {
      setError(`${token.toUpperCase()} not available on ${chainInfo.name}`);
      return;
    }

    const balance = token === 'usdc' ? usdcBal : usdtBal;
    if (parseFloat(balance) < numericAmount) {
      setError(`Insufficient ${token.toUpperCase()} balance. You have ${balance} ${token.toUpperCase()}`);
      return;
    }

    // Send to ESCROW contract (not owner wallet)
    const escrowAddress = project.escrowAddress as `0x${string}`;

    setIsProcessing(true);
    setError('');
    setPaymentMethod(token);

    try {
      const amountInWei = BigInt(Math.floor(numericAmount * 1e6));

      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [escrowAddress, amountInWei],
      });

      console.log('[Investment] Transaction sent to escrow:', hash);
      setPendingTx(hash);
      setTxHash(hash);
    } catch (err: any) {
      console.error('[Investment] Transaction error:', err);
      setError(err?.shortMessage || err?.message || 'Transaction failed');
      setIsProcessing(false);
      setPaymentMethod(null);
    }
  };

  // Watch for confirmation
  useEffect(() => {
    if (isConfirmed && pendingTx && paymentMethod && paymentMethod !== 'card') {
      recordInvestment(pendingTx, paymentMethod).then(() => {
        setSuccess(true);
        setIsProcessing(false);
        onSuccess?.();
      });
    }
  }, [isConfirmed, pendingTx, paymentMethod]);

  // Create Stripe payment intent
  const createStripeIntent = async () => {
    if (!isValidAmount) return;
    
    setPaymentMethod('card');
    setError('');
    setIsProcessing(true);

    try {
      const res = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(numericAmount * 100),
          type: 'investment',
          projectId: project.id,
          walletAddress: address,
          metadata: { project_name: project.name, token_symbol: project.tokenSymbol },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create payment');

      setClientSecret(data.clientSecret);
      setStripeReady(true);
      setIsProcessing(false);
    } catch (err: any) {
      console.error('[Investment] Stripe intent error:', err);
      setError(err.message || 'Failed to initialize payment');
      setPaymentMethod(null);
      setIsProcessing(false);
    }
  };

  // Handle Stripe success
  const handleStripeSuccess = async (paymentIntentId: string) => {
    await recordInvestment(paymentIntentId, 'stripe');
    setSuccess(true);
    onSuccess?.();
  };

  // Reset form
  const resetForm = () => {
    setSuccess(false);
    setAmount('');
    setPaymentMethod(null);
    setPendingTx(undefined);
    setTxHash('');
    setClientSecret('');
    setStripeReady(false);
    setError('');
    setIsProcessing(false);
  };

  // Funding progress
  const fundingProgress = project.fundingGoal > 0 ? Math.min(100, (project.totalRaised / project.fundingGoal) * 100) : 0;
  const remainingAmount = Math.max(0, project.fundingGoal - project.totalRaised);

  // SUCCESS STATE
  if (success) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-green-500/30">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-green-400 mb-2">Investment Successful!</h3>
          <p className="text-slate-300 mb-4">
            You invested <span className="font-bold text-white">${numericAmount.toLocaleString()}</span> for{' '}
            <span className="font-bold text-white">{tokensToReceive.toLocaleString(undefined, { maximumFractionDigits: 2 })} {project.tokenSymbol}</span>
          </p>
          {txHash && chainInfo.explorer && (
            <a href={`${chainInfo.explorer}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm mb-4">
              View Transaction <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button onClick={resetForm} className="w-full mt-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors">
            Make Another Investment
          </button>
        </div>
      </div>
    );
  }

  // MAIN CARD
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <h3 className="text-xl font-bold text-white mb-1">Invest Now</h3>
        <p className="text-slate-400 text-sm">{project.tokenSymbol} Token Sale</p>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4 bg-slate-900/50">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">Raised</span>
          <span className="text-white font-medium">{formatCurrency(project.totalRaised)} / {formatCurrency(project.fundingGoal)}</span>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${fundingProgress}%` }} />
        </div>
        <div className="flex justify-between text-xs mt-2">
          <span className="text-slate-500">{fundingProgress.toFixed(1)}% funded</span>
          <span className="text-slate-500">{formatCurrency(remainingAmount)} remaining</span>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Amount Input */}
        {!paymentMethod && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Investment Amount (USD)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(''); }}
                  placeholder={`Min ${project.minInvestment}`}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={project.minInvestment}
                  max={project.maxInvestment}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">Min: ${project.minInvestment.toLocaleString()} • Max: ${project.maxInvestment.toLocaleString()}</p>
            </div>

            {/* Token Preview */}
            {numericAmount > 0 && (
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400 text-sm">You will receive</span>
                  <span className="text-white font-bold">{tokensToReceive.toLocaleString(undefined, { maximumFractionDigits: 2 })} {project.tokenSymbol}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Token Price</span>
                  <span className="text-slate-400">{formatCurrencyPrecise(project.tokenPrice)}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Payment Methods */}
        {!paymentMethod && isValidAmount && !isProcessing && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-300">Select Payment Method</p>
            
            {/* Card Payment - Always available */}
            <button
              onClick={createStripeIntent}
              className="w-full flex items-center justify-between p-4 bg-slate-900/50 border-2 border-slate-600 rounded-xl hover:border-blue-500 hover:bg-slate-900 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-white">Credit / Debit Card</p>
                  <p className="text-xs text-slate-500">Visa, Mastercard, Amex</p>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-slate-500 -rotate-90 group-hover:text-blue-400" />
            </button>

            {/* USDC Payment - Requires escrow */}
            {chainTokens.usdc && (
              <button
                onClick={() => handleCryptoPayment('usdc')}
                disabled={!isConnected || !hasEscrow}
                className="w-full flex items-center justify-between p-4 bg-slate-900/50 border-2 border-slate-600 rounded-xl hover:border-green-500 hover:bg-slate-900 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-green-400 font-bold text-sm">USDC</span>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Pay with USDC</p>
                    <p className="text-xs text-slate-500">
                      {!hasEscrow ? (
                        <span className="text-orange-400">Escrow not configured</span>
                      ) : isConnected ? (
                        `Balance: ${usdcBal} USDC`
                      ) : (
                        'Connect wallet'
                      )}
                    </p>
                  </div>
                </div>
                {!hasEscrow ? (
                  <ShieldAlert className="w-5 h-5 text-orange-400" />
                ) : isWrongChain && isConnected ? (
                  <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded">Switch to {chainInfo.name}</span>
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-500 -rotate-90 group-hover:text-green-400" />
                )}
              </button>
            )}

            {/* USDT Payment - Requires escrow */}
            {chainTokens.usdt && (
              <button
                onClick={() => handleCryptoPayment('usdt')}
                disabled={!isConnected || !hasEscrow}
                className="w-full flex items-center justify-between p-4 bg-slate-900/50 border-2 border-slate-600 rounded-xl hover:border-teal-500 hover:bg-slate-900 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-teal-400 font-bold text-sm">USDT</span>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Pay with USDT</p>
                    <p className="text-xs text-slate-500">
                      {!hasEscrow ? (
                        <span className="text-orange-400">Escrow not configured</span>
                      ) : isConnected ? (
                        `Balance: ${usdtBal} USDT`
                      ) : (
                        'Connect wallet'
                      )}
                    </p>
                  </div>
                </div>
                {!hasEscrow ? (
                  <ShieldAlert className="w-5 h-5 text-orange-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-500 -rotate-90 group-hover:text-teal-400" />
                )}
              </button>
            )}

            {/* Escrow Warning */}
            {!hasEscrow && (
              <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-orange-400 text-xs">
                  Crypto payments require an escrow contract for investor protection. This project's escrow is not yet deployed. Use card payment or wait for escrow setup.
                </p>
              </div>
            )}

            {!isConnected && hasEscrow && (
              <p className="text-center text-slate-500 text-sm py-2">
                <Wallet className="w-4 h-4 inline mr-1" />
                Connect wallet for crypto payments
              </p>
            )}
          </div>
        )}

        {/* Invalid Amount Warning */}
        {!paymentMethod && amount !== '' && !isValidAmount && (
          <p className="text-center text-orange-400 text-sm">
            Please enter an amount between ${project.minInvestment.toLocaleString()} and ${project.maxInvestment.toLocaleString()}
          </p>
        )}

        {/* Processing State */}
        {isProcessing && !stripeReady && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-white font-medium mb-1">{isConfirming ? 'Confirming Transaction...' : 'Processing...'}</p>
            <p className="text-slate-400 text-sm">{isConfirming ? 'Waiting for blockchain confirmation' : 'Please wait'}</p>
            {txHash && chainInfo.explorer && (
              <a href={`${chainInfo.explorer}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm mt-4">
                View on Explorer <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        {/* Stripe Card Form */}
        {paymentMethod === 'card' && stripeReady && clientSecret && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Payment Amount</span>
              <span className="text-white font-bold">${numericAmount.toLocaleString()}</span>
            </div>
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#3b82f6',
                    colorBackground: '#0f172a',
                    colorText: '#f8fafc',
                    colorDanger: '#ef4444',
                    fontFamily: 'system-ui, sans-serif',
                    borderRadius: '12px',
                  },
                  rules: {
                    '.Input': { backgroundColor: '#1e293b', border: '1px solid #334155' },
                    '.Input:focus': { border: '1px solid #3b82f6', boxShadow: '0 0 0 1px #3b82f6' },
                    '.Label': { color: '#94a3b8' },
                  },
                },
              }}
            >
              <StripeInlineForm 
                amount={numericAmount}
                onSuccess={handleStripeSuccess}
                onError={(msg) => { setError(msg); setPaymentMethod(null); setStripeReady(false); setClientSecret(''); }}
                onCancel={resetForm}
              />
            </Elements>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-6 py-4 bg-slate-900/30 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Chain: {chainInfo.name}</span>
          <span>{project.daysLeft !== null ? `${project.daysLeft} days left` : 'Open-ended'}</span>
        </div>
      </div>
    </div>
  );
}

// Main Page Content
function ProjectPageContent() {
  const params = useParams();
  const router = useRouter();
  const { isConnected } = useAccount();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDebug, setShowDebug] = useState(false);

  const projectId = params?.id as string;

  useEffect(() => {
    if (projectId) fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/crowdfunding/applications/${projectId}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to fetch project');
      
      const raw = data.application;
      console.log('[ProjectPage] Raw API data:', raw);

      const parseJsonField = (field: unknown): unknown[] => {
        if (!field) return [];
        if (typeof field === 'string') { try { return JSON.parse(field); } catch { return []; } }
        return Array.isArray(field) ? field : [];
      };

      const fundingGoal = safeNumber(raw.funding_goal);
      const totalSupply = safeNumber(raw.total_supply);
      const investorSharePercentage = safeNumber(raw.investor_share_percentage);
      
      // FIX: Read from funded_amount, not total_raised
      const totalRaised = safeNumber(raw.funded_amount);
      
      const tokensForRaise = totalSupply * (investorSharePercentage / 100);
      const totalValuation = investorSharePercentage > 0 ? fundingGoal / (investorSharePercentage / 100) : 0;
      const tokenPrice = totalSupply > 0 ? totalValuation / totalSupply : 0;
      const approvedAt = raw.approved_at ? new Date(raw.approved_at) : null;
      const deadline = approvedAt ? new Date(approvedAt.getTime() + (30 * 24 * 60 * 60 * 1000)) : null;
      const daysLeft = deadline ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
      const remainingCapacity = fundingGoal - totalRaised;
      const minInvestment = safeNumber(raw.min_investment, 100);
      const maxInvestment = Math.min(safeNumber(raw.max_investment, remainingCapacity), remainingCapacity > 0 ? remainingCapacity : fundingGoal);

      // Parse legal documents and deduplicate
      const legalDocsRaw = parseJsonField(raw.legal_documents);
      const pitchDeckUrl = raw.pitch_deck_url || '';
      
      const seenUrls = new Set<string>();
      const legalDocuments: Array<{ name: string; url: string; type?: string }> = [];
      
      if (pitchDeckUrl) {
        seenUrls.add(pitchDeckUrl.toLowerCase());
        legalDocuments.push({ name: 'Pitch Deck', url: pitchDeckUrl, type: 'Pitch Deck' });
      }
      
      legalDocsRaw.forEach((doc: unknown) => {
        let url = '';
        let name = '';
        let type = '';
        
        if (typeof doc === 'string') {
          url = doc;
        } else {
          const d = doc as { url?: string; name?: string; type?: string };
          url = d.url || '';
          name = d.name || '';
          type = d.type || '';
        }
        
        if (url && !seenUrls.has(url.toLowerCase())) {
          seenUrls.add(url.toLowerCase());
          legalDocuments.push({ url, name: name || url.split('/').pop() || 'Document', type: type || inferDocType(url, name) });
        }
      });

      const milestonesRaw = parseJsonField(raw.milestones);
      const milestones = milestonesRaw.map((m: unknown) => {
        const ms = m as Record<string, unknown>;
        return { 
          title: String(ms.title || ms.name || 'Milestone'), 
          description: String(ms.description || ''), 
          targetDate: String(ms.targetDate || ms.target_date || ms.date || ''), 
          fundingPercentage: safeNumber(ms.fundingPercentage || ms.funding_percentage || ms.percentage), 
          status: String(ms.status || 'pending') 
        };
      });

      const teamRaw = parseJsonField(raw.team_members);
      const teamMembers = teamRaw.map((t: unknown) => {
        const tm = t as Record<string, unknown>;
        return { 
          name: String(tm.name || ''), 
          role: String(tm.role || tm.position || ''), 
          bio: String(tm.bio || tm.description || ''), 
          linkedin: String(tm.linkedin || tm.linkedIn || ''), 
          image: String(tm.image || tm.avatar || tm.photo || '') 
        };
      });

      const socialRaw = raw.social_links || {};
      const socialLinks = typeof socialRaw === 'string' ? (() => { try { return JSON.parse(socialRaw); } catch { return {}; } })() : socialRaw;

      const projectData: ProjectData = {
        id: raw.id,
        name: raw.project_name || raw.name || 'Unnamed Project',
        description: raw.description || '',
        category: raw.category || 'Other',
        status: raw.status || 'pending',
        chainId: safeNumber(raw.chain_id, 1),
        companyName: raw.company_name || '',
        jurisdiction: raw.jurisdiction || '',
        registrationNumber: raw.registration_number || '',
        website: raw.website || '',
        email: raw.email || raw.contact_email || '',
        fundingGoal,
        totalRaised,
        investorCount: safeNumber(raw.investor_count),
        currency: raw.local_currency || 'USD',
        exchangeRate: safeNumber(raw.exchange_rate, 1),
        tokenName: raw.token_name || '',
        tokenSymbol: raw.token_symbol || '',
        totalSupply,
        tokensForRaise,
        tokensForRaisePercentage: investorSharePercentage,
        tokenPrice,
        totalValuation,
        projectedRoi: safeNumber(raw.projected_roi),
        roiTimeline: raw.roi_timeline || '12 months',
        cliffPeriod: safeNumber(raw.cliff_period),
        vestingPeriod: safeNumber(raw.vesting_period),
        dividendYield: safeNumber(raw.dividend_yield),
        minInvestment,
        maxInvestment: maxInvestment > 0 ? maxInvestment : fundingGoal,
        approvedAt,
        deadline,
        daysLeft,
        createdAt: raw.created_at ? new Date(raw.created_at) : null,
        logoUrl: raw.logo_url || '',
        bannerUrl: raw.banner_url || '',
        videoUrl: raw.video_url || '',
        pitchDeckUrl: '',
        legalDocuments,
        milestones,
        teamMembers,
        socialLinks,
        contractAddress: raw.contract_address || '',
        escrowAddress: raw.escrow_address || '',
        walletAddress: raw.wallet_address || '',
        _raw: raw,
      };

      setProject(projectData);
    } catch (err) {
      console.error('[ProjectPage] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleInvestmentSuccess = () => {
    fetchProject();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Project Not Found</h1>
          <p className="text-slate-400 mb-6">{error || 'The project does not exist.'}</p>
          <button onClick={() => router.push('/projects')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Browse Projects</button>
        </div>
      </div>
    );
  }

  const statusConfig = DB_STATUS_MAP[project.status] || DB_STATUS_MAP.draft;
  const chainInfo = CHAIN_INFO[project.chainId] || { name: `Chain ${project.chainId}`, explorer: '' };
  const fundingProgress = project.fundingGoal > 0 ? Math.min(100, (project.totalRaised / project.fundingGoal) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Hero Banner */}
      <div className="relative h-[400px] md:h-[500px] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: project.bannerUrl ? `url(${project.bannerUrl})` : 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-transparent to-slate-900/80" />
        
        <div className="absolute top-6 left-6 z-10">
          <button onClick={() => router.push('/projects')} className="flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-sm rounded-lg text-white hover:bg-black/50">
            <ArrowLeft className="w-5 h-5" />Back
          </button>
        </div>

        <div className="absolute top-6 right-6 z-10 flex gap-2">
          <button className="p-3 bg-black/30 backdrop-blur-sm rounded-lg text-white hover:bg-black/50"><Share2 className="w-5 h-5" /></button>
          <button className="p-3 bg-black/30 backdrop-blur-sm rounded-lg text-white hover:bg-black/50"><Bookmark className="w-5 h-5" /></button>
          <button onClick={() => setShowDebug(!showDebug)} className="px-3 py-2 bg-black/30 backdrop-blur-sm rounded-lg text-white hover:bg-black/50 text-sm">Debug</button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-end gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 border-slate-800 bg-slate-800 flex-shrink-0">
              {project.logoUrl ? (
                <img src={project.logoUrl} alt={project.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
                  <span className="text-3xl md:text-4xl font-bold text-white">{project.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${statusConfig.color}-500/20 text-${statusConfig.color}-400`}>{statusConfig.label}</span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-700/50 text-slate-300">{project.category}</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{project.name}</h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-slate-300"><Globe className="w-4 h-4" />{chainInfo.name}</div>
                {project.companyName && <div className="flex items-center gap-2 text-slate-300"><Building2 className="w-4 h-4" />{project.companyName}</div>}
                {project.jurisdiction && <div className="flex items-center gap-2 text-slate-300"><MapPin className="w-4 h-4" />{project.jurisdiction}</div>}
                {project.website && <a href={project.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-400 hover:text-blue-300"><ExternalLink className="w-4 h-4" />Website</a>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="relative z-10 -mt-6 px-4 md:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard icon={Target} label="Funding Goal" value={formatCurrency(project.fundingGoal)} />
          <StatCard icon={TrendingUp} label="Total Raised" value={formatCurrency(project.totalRaised)} subValue={`${fundingProgress.toFixed(1)}% funded`} />
          <StatCard icon={Users} label="Investors" value={formatNumber(project.investorCount)} />
          <StatCard icon={Clock} label="Days Left" value={project.daysLeft !== null ? project.daysLeft.toString() : 'N/A'} subValue={project.deadline ? `Ends ${formatDate(project.deadline)}` : ''} />
          <StatCard icon={Percent} label="Projected ROI" value={`${safeNumber(project.projectedRoi)}%`} subValue={project.roiTimeline} />
          <StatCard icon={BarChart3} label="Valuation" value={formatCurrency(project.totalValuation)} />
          <StatCard icon={Lock} label="Cliff" value={`${project.cliffPeriod} months`} />
          <StatCard icon={Clock} label="Vesting" value={`${project.vestingPeriod} months`} />
          <StatCard icon={DollarSign} label="Token Price" value={formatCurrencyPrecise(project.tokenPrice)} />
          <StatCard icon={Coins} label="Tokens for Raise" value={formatNumber(project.tokensForRaise)} subValue={`${formatPercent(project.tokensForRaisePercentage)} of supply`} />
          <StatCard icon={PieChart} label="Total Supply" value={formatNumber(project.totalSupply)} subValue={project.tokenSymbol} />
          <StatCard icon={Percent} label="Investor Share" value={formatPercent(project.tokensForRaisePercentage)} />
        </div>
      </div>

      {/* Debug Panel */}
      {showDebug && project._raw && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 mt-6">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">Debug: Raw API Data</h3>
            <pre className="text-xs text-slate-400 overflow-auto max-h-96">{JSON.stringify(project._raw, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Video Link */}
        {project.videoUrl && (
          <div className="mb-8">
            <a href={project.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-6 py-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-blue-500/50">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center"><Play className="w-6 h-6 text-white" /></div>
              <div><p className="text-white font-medium">Watch Project Video</p><p className="text-slate-400 text-sm">Learn more about this project</p></div>
            </a>
          </div>
        )}

        {/* Description */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">About This Project</h2>
          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{project.description || 'No description available.'}</p>
        </div>

        {/* Tabs and Investment Card */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex gap-2 mb-6 border-b border-slate-700 overflow-x-auto">
              {['overview', 'milestones', 'documents', 'company'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 font-medium capitalize whitespace-nowrap ${activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'}`}>{tab}</button>
              ))}
            </div>

            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Token Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 rounded-lg p-4"><p className="text-slate-400 text-sm">Token Name</p><p className="text-white font-medium">{project.tokenName || 'N/A'}</p></div>
                      <div className="bg-slate-800/50 rounded-lg p-4"><p className="text-slate-400 text-sm">Token Symbol</p><p className="text-white font-medium">{project.tokenSymbol || 'N/A'}</p></div>
                      <div className="bg-slate-800/50 rounded-lg p-4"><p className="text-slate-400 text-sm">Total Supply</p><p className="text-white font-medium">{formatNumber(project.totalSupply)}</p></div>
                      <div className="bg-slate-800/50 rounded-lg p-4"><p className="text-slate-400 text-sm">Token Price</p><p className="text-white font-medium">{formatCurrencyPrecise(project.tokenPrice)}</p></div>
                      <div className="bg-slate-800/50 rounded-lg p-4"><p className="text-slate-400 text-sm">Tokens for Raise</p><p className="text-white font-medium">{formatNumber(project.tokensForRaise)} ({formatPercent(project.tokensForRaisePercentage)})</p></div>
                      <div className="bg-slate-800/50 rounded-lg p-4"><p className="text-slate-400 text-sm">Total Valuation</p><p className="text-white font-medium">{formatCurrency(project.totalValuation)}</p></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Investment Terms</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 rounded-lg p-4"><p className="text-slate-400 text-sm">Projected ROI</p><p className="text-white font-medium">{safeNumber(project.projectedRoi)}% over {project.roiTimeline}</p></div>
                      <div className="bg-slate-800/50 rounded-lg p-4"><p className="text-slate-400 text-sm">Cliff Period</p><p className="text-white font-medium">{project.cliffPeriod} months</p></div>
                      <div className="bg-slate-800/50 rounded-lg p-4"><p className="text-slate-400 text-sm">Vesting Period</p><p className="text-white font-medium">{project.vestingPeriod} months</p></div>
                      {project.dividendYield > 0 && <div className="bg-slate-800/50 rounded-lg p-4"><p className="text-slate-400 text-sm">Dividend Yield</p><p className="text-white font-medium">{project.dividendYield}%</p></div>}
                    </div>
                  </div>
                  {(project.contractAddress || project.escrowAddress) && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Contract Addresses</h3>
                      <div className="space-y-3">
                        {project.contractAddress && (
                          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4">
                            <div><p className="text-slate-400 text-sm">Token Contract</p><p className="text-white font-mono text-sm">{shortenAddress(project.contractAddress)}</p></div>
                            <div className="flex items-center gap-2">
                              <CopyButton text={project.contractAddress} />
                              {chainInfo.explorer && <a href={`${chainInfo.explorer}/address/${project.contractAddress}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/10 rounded"><ExternalLink className="w-4 h-4 text-slate-400" /></a>}
                            </div>
                          </div>
                        )}
                        {project.escrowAddress && (
                          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4">
                            <div><p className="text-slate-400 text-sm">Escrow Contract</p><p className="text-white font-mono text-sm">{shortenAddress(project.escrowAddress)}</p></div>
                            <div className="flex items-center gap-2">
                              <CopyButton text={project.escrowAddress} />
                              {chainInfo.explorer && <a href={`${chainInfo.explorer}/address/${project.escrowAddress}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/10 rounded"><ExternalLink className="w-4 h-4 text-slate-400" /></a>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'milestones' && (
                <div className="space-y-4">
                  {project.milestones.length > 0 ? project.milestones.map((milestone, index) => <MilestoneCard key={index} milestone={milestone} index={index} />) : (
                    <div className="text-center py-12"><Milestone className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No milestones defined</p></div>
                  )}
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="space-y-4">
                  {project.legalDocuments.length > 0 ? project.legalDocuments.map((doc, index) => <DocumentItem key={index} doc={doc} />) : (
                    <div className="text-center py-12"><FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No documents available</p></div>
                  )}
                </div>
              )}

              {activeTab === 'company' && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    {project.companyName && <div className="bg-slate-800/50 rounded-lg p-4"><p className="text-slate-400 text-sm">Company Name</p><p className="text-white font-medium">{project.companyName}</p></div>}
                    {project.jurisdiction && <div className="bg-slate-800/50 rounded-lg p-4"><p className="text-slate-400 text-sm">Jurisdiction</p><p className="text-white font-medium">{project.jurisdiction}</p></div>}
                    {project.registrationNumber && <div className="bg-slate-800/50 rounded-lg p-4"><p className="text-slate-400 text-sm">Registration Number</p><p className="text-white font-medium">{project.registrationNumber}</p></div>}
                    {project.email && <div className="bg-slate-800/50 rounded-lg p-4"><p className="text-slate-400 text-sm">Contact Email</p><a href={`mailto:${project.email}`} className="text-blue-400 hover:text-blue-300">{project.email}</a></div>}
                  </div>
                  {project.teamMembers.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Team</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {project.teamMembers.map((member, index) => (
                          <div key={index} className="flex items-center gap-4 bg-slate-800/50 rounded-lg p-4">
                            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                              {member.image ? <img src={member.image} alt={member.name} className="w-full h-full object-cover" /> : <span className="text-lg font-bold text-white">{member.name.charAt(0).toUpperCase()}</span>}
                            </div>
                            <div><p className="text-white font-medium">{member.name}</p><p className="text-slate-400 text-sm">{member.role}</p></div>
                            {member.linkedin && <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="ml-auto text-blue-400 hover:text-blue-300"><ExternalLink className="w-4 h-4" /></a>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {Object.values(project.socialLinks).some(Boolean) && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Social Links</h3>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(project.socialLinks).map(([platform, url]) => url ? (
                          <a key={platform} href={url as string} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 capitalize"><Globe className="w-4 h-4" />{platform}</a>
                        ) : null)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Investment Card */}
          <div className="lg:col-span-1">
            <InvestmentCard project={project} onSuccess={handleInvestmentSuccess} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-12 h-12 text-blue-500 animate-spin" /></div>}>
      <ProjectPageContent />
    </Suspense>
  );
}
