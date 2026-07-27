'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { DEPLOYMENTS } from '@/config/deployments';
import { CHAINS, SupportedChainId } from '@/config/chains';
import { ERC20ABI } from '@/config/abis';
import { 
  TrendingUp, Shield, Clock, Users, Coins, ChevronDown, ChevronUp, ExternalLink,
  CheckCircle, AlertCircle, CreditCard, Wallet, ArrowRight, Info, Loader2, Gift
} from 'lucide-react';
import Link from 'next/link';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// Constants
const STRIPE_FEE_PERCENT = 4;
const BONUS_PERCENT = 5;
const TGE_VALUATION = 10_000_000;
const TOTAL_SUPPLY = 1_000_000_000;
const TGE_TOKEN_PRICE = TGE_VALUATION / TOTAL_SUPPLY;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Get deployment data for a chain
function getChainDeployment(chainId: number) {
  return DEPLOYMENTS[chainId as SupportedChainId];
}

// Get token address from deployments
function getTokenAddress(chainId: number, token: 'USDC' | 'USDT'): string | null {
  const deployment = getChainDeployment(chainId);
  const address = deployment?.tokens?.[token];
  return address && address !== ZERO_ADDRESS ? address : null;
}

// Get fee receiver from platform wallets in deployments
function getFeeReceiver(chainId: number): string {
  const deployment = getChainDeployment(chainId);
  return deployment?.platformWallets?.feeReceiver || ZERO_ADDRESS;
}

// Check if chain has any stablecoin deployed
function hasStablecoins(chainId: number): boolean {
  return !!getTokenAddress(chainId, 'USDC') || !!getTokenAddress(chainId, 'USDT');
}

// Types
interface FundraisingRound {
  id: string;
  name: string;
  display_name: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  token_price_usd: number;
  min_investment_usd: number;
  max_investment_usd: number;
  target_amount_usd: number;
  raised_amount_usd: number;
  token_allocation_percent: number;
  token_allocation_amount: number;
  vesting_months: number;
  investor_count: number;
  deliverables: string[] | string | null;  // Add this
  timeline: string | null;                  // Add this
}

interface ProgressSegment { name: string; target: number; raised: number; color: string; status: string; }
interface ProgressData { currentTarget: number; raised: number; segments: ProgressSegment[]; }

// Helpers
const formatCurrency = (amount: number): string => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
const formatNumber = (num: number): string => { if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`; if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`; return num.toLocaleString(); };
const calculateROI = (tokenPrice: number): number => TGE_TOKEN_PRICE / tokenPrice;

// Token Icon Component
function TokenIcon({ token, className = "w-5 h-5" }: { token: 'USDC' | 'USDT'; className?: string }) {
  const colors = { USDC: 'bg-gold-500', USDT: 'bg-green-500' };
  return <div className={`${className} ${colors[token]} rounded-full flex items-center justify-center text-ink text-xs font-bold`}>{token === 'USDC' ? '$' : '₮'}</div>;
}

// Stripe Payment Form
function StripePaymentForm({ clientSecret, onSuccess, onError, amount, investmentId }: { clientSecret: string; onSuccess: () => void; onError: (error: string) => void; amount: number; investmentId: string; }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true); setErrorMessage(null);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({ 
        elements, 
        confirmParams: { return_url: `${window.location.origin}/raise/confirmation?investment_id=${investmentId}` }, 
        redirect: 'if_required' 
      });
      if (error) { 
        setErrorMessage(error.message || 'Payment failed'); 
        onError(error.message || 'Payment failed'); 
      } else if (paymentIntent?.status === 'succeeded') {
        await fetch('/api/fundraising/confirm-payment', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ investmentId, paymentIntentId: paymentIntent.id, paymentMethod: 'stripe' }) 
        });
        onSuccess();
      }
    } catch (err) { 
      const msg = err instanceof Error ? err.message : 'Payment failed'; 
      setErrorMessage(msg); 
      onError(msg); 
    } finally { 
      setProcessing(false); 
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-surface/50 rounded-lg p-4 border border-border">
        <PaymentElement />
      </div>
      {errorMessage && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />{errorMessage}
        </div>
      )}
      <button type="submit" disabled={!stripe || processing} 
        className="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-light-600 rounded-lg font-semibold hover:from-gold-500 hover:to-gold-light-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {processing ? <><Loader2 className="w-5 h-5 animate-spin" />Processing...</> : <><CreditCard className="w-5 h-5" />Pay {formatCurrency(amount)}</>}
      </button>
    </form>
  );
}

// Crypto Payment Component
function CryptoPayment({ amount, selectedToken, onTokenChange, onSuccess, onError, investmentId }: { 
  amount: number; 
  selectedToken: 'USDC' | 'USDT'; 
  onTokenChange: (token: 'USDC' | 'USDT') => void; 
  onSuccess: () => void; 
  onError: (error: string) => void; 
  investmentId: string; 
}) {
  const { address, chain } = useAccount();
  const [transferring, setTransferring] = useState(false);
  
  const chainId = chain?.id || 43113;
  const chainInfo = CHAINS[chainId as SupportedChainId];
  const tokenAddress = getTokenAddress(chainId, selectedToken);
  const feeReceiver = getFeeReceiver(chainId);
  const hasTokens = hasStablecoins(chainId);
  
  // Read token balance
  const { data: balance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && !!tokenAddress }
  });

  // Read token decimals
  const { data: decimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'decimals',
    query: { enabled: !!tokenAddress }
  });

  // Write contract hook
  const { writeContract, data: txHash, error: writeError, reset } = useWriteContract();
  
  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Handle successful transaction
  useEffect(() => {
    if (isConfirmed && txHash) {
      fetch('/api/fundraising/confirm-payment', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ investmentId, txHash, paymentMethod: 'crypto', token: selectedToken, chainId }) 
      })
        .then(() => { setTransferring(false); onSuccess(); })
        .catch((err) => { onError(err.message); setTransferring(false); });
    }
  }, [isConfirmed, txHash, investmentId, selectedToken, chainId, onSuccess, onError]);

  // Handle write error
  useEffect(() => { 
    if (writeError) { 
      onError(writeError.message); 
      setTransferring(false); 
      reset();
    } 
  }, [writeError, onError, reset]);

  const handleTransfer = () => {
    if (!address) { onError('Please connect your wallet'); return; }
    if (!tokenAddress) { onError(`${selectedToken} is not available on ${chainInfo?.name || 'this network'}`); return; }
    if (decimals === undefined) { onError('Unable to read token decimals'); return; }
    if (feeReceiver === ZERO_ADDRESS) { onError('Fee receiver not configured for this network'); return; }
    
    const tokenDecimals = Number(decimals);
    const amountInWei = parseUnits(amount.toString(), tokenDecimals);
    
    if (balance !== undefined && balance < amountInWei) { 
      onError(`Insufficient ${selectedToken} balance. You have ${formatUnits(balance, tokenDecimals)} ${selectedToken}`); 
      return; 
    }
    
    setTransferring(true);
    writeContract({ 
      address: tokenAddress as `0x${string}`, 
      abi: ERC20ABI, 
      functionName: 'transfer', 
      args: [feeReceiver as `0x${string}`, amountInWei] 
    });
  };

  const formattedBalance = balance !== undefined && decimals !== undefined 
    ? parseFloat(formatUnits(balance, Number(decimals))).toFixed(2) 
    : '0.00';

  // Get available tokens for this chain
  const usdcAvailable = !!getTokenAddress(chainId, 'USDC');
  const usdtAvailable = !!getTokenAddress(chainId, 'USDT');

  return (
    <div className="space-y-4">
      {/* Token Selection */}
      <div>
        <label className="block text-sm text-ink-muted mb-2">Select Stablecoin</label>
        <div className="flex gap-2">
          {(['USDC', 'USDT'] as const).map((token) => {
            const available = token === 'USDC' ? usdcAvailable : usdtAvailable;
            return (
              <button 
                key={token} 
                type="button" 
                onClick={() => available && onTokenChange(token)} 
                disabled={!available}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 
                  ${!available 
                    ? 'opacity-40 cursor-not-allowed bg-surface/50 border border-border' 
                    : selectedToken === token 
                      ? 'bg-gold-600 text-ink border-2 border-gold-400' 
                      : 'bg-surface text-ink-muted border border-border hover:border-border-strong'
                  }`}
              >
                <TokenIcon token={token} />
                <span>{token}</span>
                {!available && <span className="text-xs text-ink-faint">(N/A)</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chain & Balance Info */}
      {hasTokens && tokenAddress ? (
        <>
          <div className="bg-surface/50 rounded-lg p-4 border border-border space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-ink-muted">Network</span>
              <span className="font-medium flex items-center gap-2">
                {chainInfo?.name || `Chain ${chainId}`}
                {chainInfo?.testnet && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Testnet</span>}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-muted">Your {selectedToken} Balance</span>
              <span className="font-medium">{formattedBalance} {selectedToken}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-muted">Receiving Wallet</span>
              <span className="font-mono text-xs text-ink-faint">{feeReceiver.slice(0,6)}...{feeReceiver.slice(-4)}</span>
            </div>
          </div>

          {/* Transfer Button */}
          <button 
            onClick={handleTransfer} 
            disabled={transferring || isConfirming || !address || !tokenAddress}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-semibold hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {transferring || isConfirming ? (
              <><Loader2 className="w-5 h-5 animate-spin" />{isConfirming ? 'Confirming on-chain...' : 'Sending...'}</>
            ) : (
              <><Wallet className="w-5 h-5" />Pay {formatCurrency(amount)} in {selectedToken}</>
            )}
          </button>

          {/* Transaction Link */}
          {txHash && (
            <div className="text-sm text-ink-muted text-center">
              <a 
                href={`${chainInfo?.explorerUrl || 'https://snowtrace.io'}/tx/${txHash}`}
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gold-400 hover:text-gold-300 flex items-center justify-center gap-1"
              >
                View transaction <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </>
      ) : (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-yellow-400 font-medium">No stablecoins available on {chainInfo?.name || 'this network'}</p>
          <p className="text-sm text-ink-muted mt-1">
            Please switch to a network with USDC/USDT deployed, or use card payment.
          </p>
          <div className="mt-3 text-xs text-ink-faint">
            Supported networks: Avalanche Fuji, Polygon Amoy, BNB Testnet
          </div>
        </div>
      )}
    </div>
  );
}

function WalletBalanceDisplay({ chainId, token, address }: { chainId: number; token: 'USDC' | 'USDT'; address: string | undefined }) {
  const tokenAddress = getTokenAddress(chainId, token);
  const chainInfo = CHAINS[chainId as SupportedChainId];
  
  const { data: balance, isLoading } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && !!tokenAddress }
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'decimals',
    query: { enabled: !!tokenAddress }
  });

  const formattedBalance = balance !== undefined && decimals !== undefined 
    ? parseFloat(formatUnits(balance, Number(decimals))).toFixed(2) 
    : '0.00';

  if (!tokenAddress) return null;

  return (
    <div className="mt-3 p-3 bg-surface/50 rounded-lg border border-border">
      <div className="flex justify-between items-center">
        <span className="text-sm text-ink-muted flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Your {token} Balance
        </span>
        <span className="font-medium flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <TokenIcon token={token} className="w-4 h-4" />
              {formattedBalance} {token}
            </>
          )}
        </span>
      </div>
      <div className="flex justify-between items-center mt-2 text-xs">
        <span className="text-ink-faint">Network</span>
        <span className="text-ink-muted flex items-center gap-1">
          {chainInfo?.name || `Chain ${chainId}`}
          {chainInfo?.testnet && <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">Testnet</span>}
        </span>
      </div>
    </div>
  );
}

// Main Page Component
export default function RaisePage() {
  const { isConnected, address, chain } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [rounds, setRounds] = useState<FundraisingRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'fiat'>('crypto');
  const [selectedToken, setSelectedToken] = useState<'USDC' | 'USDT'>('USDC');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [investmentId, setInvestmentId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Referral state
  const [referralCode, setReferralCode] = useState('');
  const [appliedReferral, setAppliedReferral] = useState<{ code: string; referrerAddress: string } | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [checkingReferral, setCheckingReferral] = useState(false);

  // Handle hydration
  useEffect(() => { setMounted(true); }, []);
  
  // Fetch rounds
  useEffect(() => {
    fetch('/api/fundraising/rounds')
      .then(res => res.json())
      .then(data => setRounds(data.rounds || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Check for referral code in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref') || urlParams.get('referral');
      
      if (refCode) {
        // Store in session storage for tracking
        sessionStorage.setItem('referral_code', refCode.toUpperCase());
        sessionStorage.setItem('referral_source', document.referrer || 'direct');
        sessionStorage.setItem('referral_timestamp', new Date().toISOString());
        
        setReferralCode(refCode);
        validateReferralCode(refCode);
      } else {
        // Check if there's a stored referral code
        const storedCode = sessionStorage.getItem('referral_code');
        if (storedCode) {
          setReferralCode(storedCode);
          validateReferralCode(storedCode);
        }
      }
    }
  }, []);

  // Auto-select available token when chain changes
  useEffect(() => {
    if (chain?.id) {
      const usdcAvailable = !!getTokenAddress(chain.id, 'USDC');
      const usdtAvailable = !!getTokenAddress(chain.id, 'USDT');
      if (!usdcAvailable && usdtAvailable) setSelectedToken('USDT');
      else if (usdcAvailable) setSelectedToken('USDC');
    }
  }, [chain?.id]);

  // Validate referral code
  const validateReferralCode = async (code: string) => {
    if (!code.trim()) {
      setAppliedReferral(null);
      setReferralError(null);
      return;
    }

    setCheckingReferral(true);
    setReferralError(null);

    try {
      const res = await fetch(`/api/referrals/validate?code=${encodeURIComponent(code.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setReferralError(data.error || 'Invalid referral code');
        setAppliedReferral(null);
      } else {
        setAppliedReferral({
          code: data.code,
          referrerAddress: data.referrerAddress
        });
        setReferralError(null);
      }
    } catch (err) {
      setReferralError('Failed to validate referral code');
      setAppliedReferral(null);
    } finally {
      setCheckingReferral(false);
    }
  };

  const activeRound = rounds.find(r => r.status === 'active');

  const getProgressiveTarget = useCallback((): ProgressData => {
    const sorted = [...rounds].sort((a, b) => {
      const order: Record<'completed' | 'active' | 'upcoming' | 'cancelled', number> = { 
        completed: 0, 
        active: 1, 
        upcoming: 2, 
        cancelled: 3 
      };
      return (order[a.status] || 2) - (order[b.status] || 2);
    });
    let currentTarget = 0, totalRaised = 0;
    const segments: ProgressSegment[] = [];
    for (const r of sorted) {
      if (r.status === 'completed' || r.status === 'active') {
        currentTarget += r.target_amount_usd; 
        totalRaised += r.raised_amount_usd;
        segments.push({ 
          name: r.name, 
          target: r.target_amount_usd, 
          raised: r.raised_amount_usd, 
          color: r.status === 'completed' ? 'bg-gold-500' : 'bg-gold-500', 
          status: r.status 
        });
      }
      if (r.status === 'active') break;
    }
    return { currentTarget: currentTarget || 400000, raised: totalRaised, segments };
  }, [rounds]);

  const progressData = getProgressiveTarget();
  const amount = parseFloat(investmentAmount) || 0;
  const stripeFee = paymentMethod === 'fiat' ? amount * (STRIPE_FEE_PERCENT / 100) : 0;
  const totalCharge = amount + stripeFee;
  const tokensToReceive = activeRound ? amount / activeRound.token_price_usd : 0;
  const bonusTokens = tokensToReceive * (BONUS_PERCENT / 100);
  const totalTokens = tokensToReceive + bonusTokens;
  const valueAtTGE = totalTokens * TGE_TOKEN_PRICE;
  const roi = activeRound ? calculateROI(activeRound.token_price_usd) : 3.75;

  // Determine bonus recipient
  const bonusRecipient = appliedReferral ? 'referrer' : 'platform';

  const handleInvest = async () => {
    if (!activeRound || !address || amount <= 0) { 
      setError('Please connect wallet and enter a valid amount'); 
      return; 
    }
    if (amount < activeRound.min_investment_usd) { 
      setError(`Minimum investment is ${formatCurrency(activeRound.min_investment_usd)}`); 
      return; 
    }
    if (amount > activeRound.max_investment_usd) { 
      setError(`Maximum investment is ${formatCurrency(activeRound.max_investment_usd)}`); 
      return; 
    }
    
    setError(null); 
    setProcessingPayment(true);
    
    // Get fee receiver for the current chain
    const platformFeeReceiver = chain?.id ? getFeeReceiver(chain.id) : ZERO_ADDRESS;
    
    try {
      // Create investment record
      const investRes = await fetch('/api/fundraising/invest', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          roundId: activeRound.id, 
          walletAddress: address, 
          investmentAmountUsd: amount, 
          paymentMethod, 
          token: paymentMethod === 'crypto' ? selectedToken : undefined,
          chainId: chain?.id,
          // Referral/bonus info
          referralCode: appliedReferral?.code || null,
          referrerAddress: appliedReferral?.referrerAddress || null,
          bonusTokens: bonusTokens,
          bonusRecipient: appliedReferral ? appliedReferral.referrerAddress : platformFeeReceiver,
          bonusType: appliedReferral ? 'referral' : 'platform'
        }) 
      });
      const investData = await investRes.json();
      if (!investRes.ok) throw new Error(investData.error || 'Failed to create investment');
      
      setInvestmentId(investData.investmentId);
      
      // For fiat, create Stripe payment intent
      if (paymentMethod === 'fiat') {
        const stripeRes = await fetch('/api/payments/stripe/create-intent', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
            type: 'fundraising_investment', 
            amount: totalCharge, 
            investmentId: investData.investmentId, 
            roundId: activeRound.id, 
            walletAddress: address, 
            metadata: { 
              round_name: activeRound.name, 
              tokens: tokensToReceive.toString(),
              bonus_tokens: bonusTokens.toString(),
              bonus_recipient: appliedReferral ? appliedReferral.referrerAddress : platformFeeReceiver,
              bonus_type: appliedReferral ? 'referral' : 'platform',
              referral_code: appliedReferral?.code || '',
              investment_amount: amount.toString(), 
              stripe_fee: stripeFee.toString() 
            } 
          }) 
        });
        const stripeData = await stripeRes.json();
        if (!stripeRes.ok) throw new Error(stripeData.error || 'Failed to create payment intent');
        setClientSecret(stripeData.clientSecret);
      }
    } catch (err) { 
      setError(err instanceof Error ? err.message : 'Investment failed'); 
    } finally { 
      setProcessingPayment(false); 
    }
  };

  const handlePaymentSuccess = () => {
    setSuccess(true);
    setInvestmentAmount('');
    setClientSecret(null);
    setInvestmentId(null);
    setAppliedReferral(null);
    setReferralCode('');
    // Refresh rounds data
    fetch('/api/fundraising/rounds')
      .then(res => res.json())
      .then(data => setRounds(data.rounds || []));
  };

  const handlePaymentError = (msg: string) => setError(msg);

  const resetPayment = () => {
    setClientSecret(null);
    setInvestmentId(null);
    setError(null);
  };

  // Quick amount buttons
  const quickAmounts = activeRound 
    ? [...new Set([activeRound.min_investment_usd, 250, 500, 1000, 2500, 5000])]
        .filter(a => a >= activeRound.min_investment_usd && a <= activeRound.max_investment_usd)
        .sort((a, b) => a - b)
        .slice(0, 5)
    : [100, 250, 500, 1000, 2500];

  // FAQ data
  const faqs = [
    { question: 'What is the vesting schedule?', answer: `${activeRound?.vesting_months || 40}-month linear vesting with no cliff. Tokens unlock gradually from TGE.` },
    { question: 'What is the ROI potential?', answer: `At TGE ($10M valuation), pre-seed investors get ${roi.toFixed(2)}x return. Token price at TGE: $0.01.` },
    { question: 'How do I pay with crypto?', answer: 'Connect your wallet, select USDC or USDT on a supported network, and confirm the transfer. No additional fees.' },
    { question: 'How do I pay with card?', answer: 'Select card payment and complete checkout via Stripe. A 4% processing fee applies.' },
    { question: 'When will I receive tokens?', answer: 'Tokens are distributed at TGE according to the vesting schedule. You\'ll get dashboard access to track your allocation.' },
    { question: 'Which networks are supported?', answer: 'We support Avalanche, Polygon, BNB Chain, and more. Testnet payments are available on Fuji, Amoy, and BNB Testnet.' },
    { question: 'How does the referral program work?', answer: 'Gold and Diamond tier users can generate referral codes. When someone invests using your code, you earn 5% of the tokens they purchased.' },
  ];

  // 5-Year financial projections for ROI calculation
  const yearlyProjections = {
    year1: { revenue: 348000, ebitda: -713000, tokenValue: 0.01 },
    year2: { revenue: 2890000, ebitda: 951000, tokenValue: 0.025 },
    year3: { revenue: 9650000, ebitda: 5765000, tokenValue: 0.06 },
    year4: { revenue: 19870000, ebitda: 13450000, tokenValue: 0.12 },
    year5: { revenue: 32255000, ebitda: 24659000, tokenValue: 0.25 }
  };

  // Calculate 5Y ROI based on projected token value
  const calculate5YearROI = (tokenPrice: number): number => {
    return yearlyProjections.year5.tokenValue / tokenPrice;
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-sunken">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-sunken text-ink">
      {/* Header */}
      <div className="bg-gradient-to-r from-gold-900/50 to-gold-light-900/50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Invest in RWA Platform</h1>
            <p className="text-ink-muted text-lg">Join the future of real-world asset tokenization</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Success Message */}
        {success && (
          <div className="mb-8 bg-green-500/10 border border-green-500/30 rounded-xl p-6 flex items-start gap-4">
            <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-400">Investment Successful!</h3>
              <p className="text-ink-muted mt-1">Thank you for your investment. You will receive a confirmation email shortly with details about your token allocation.</p>
            </div>
            <button onClick={() => setSuccess(false)} className="text-ink-muted hover:text-ink text-2xl leading-none">&times;</button>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-8 md:mb-12 bg-surface/50 rounded-xl p-6 border border-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Fundraising Progress</h2>
            <span className="text-2xl font-bold text-gold-400">
              {formatCurrency(progressData.raised)} / {formatCurrency(progressData.currentTarget)}
            </span>
          </div>
          <div className="relative h-6 md:h-8 bg-surface-overlay rounded-full overflow-hidden mb-4">
            {progressData.segments.map((seg, i) => {
              const prev = progressData.segments.slice(0, i).reduce((a, s) => a + (s.target / progressData.currentTarget) * 100, 0);
              const width = (seg.raised / progressData.currentTarget) * 100;
              return <div key={`seg-${i}`} className={`absolute h-full ${seg.color} transition-all duration-700`} style={{ left: `${prev}%`, width: `${width}%` }} />;
            })}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-ink-muted">
            {progressData.segments.map((seg, i) => (
              <div key={`lbl-${i}`} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${seg.color}`} />
                <span>{seg.name}</span>
                {seg.status === 'active' && <span className="px-2 py-0.5 bg-gold-500/20 text-gold-400 text-xs rounded-full">Active</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Investment Form */}
          <div className="lg:col-span-2 space-y-8">
            {activeRound ? (
              <div className="bg-surface/50 rounded-xl p-6 border border-border">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <span className="px-3 py-1 bg-gold-500/20 text-gold-400 rounded-full text-sm font-medium">{activeRound.name}</span>
                    <h2 className="text-2xl font-bold mt-2">Current Investment Round</h2>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-400">{roi.toFixed(2)}x</div>
                    <div className="text-sm text-ink-muted">ROI at TGE</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">{calculate5YearROI(activeRound.token_price_usd).toFixed(0)}x</div>
                    <div className="text-xs text-ink-faint">5Y Potential</div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                  <div className="bg-surface/50 rounded-lg p-3 md:p-4">
                    <div className="text-xs md:text-sm text-ink-muted">Token Price</div>
                    <div className="text-lg md:text-xl font-bold">${activeRound.token_price_usd}</div>
                  </div>
                  <div className="bg-surface/50 rounded-lg p-3 md:p-4">
                    <div className="text-xs md:text-sm text-ink-muted">Vesting</div>
                    <div className="text-lg md:text-xl font-bold">{activeRound.vesting_months}mo</div>
                    <div className="text-xs text-ink-faint">No cliff</div>
                  </div>
                  <div className="bg-surface/50 rounded-lg p-3 md:p-4">
                    <div className="text-xs md:text-sm text-ink-muted">Min Investment</div>
                    <div className="text-lg md:text-xl font-bold">{formatCurrency(activeRound.min_investment_usd)}</div>
                  </div>
                  <div className="bg-surface/50 rounded-lg p-3 md:p-4">
                    <div className="text-xs md:text-sm text-ink-muted">Investors</div>
                    <div className="text-lg md:text-xl font-bold">{activeRound.investor_count}</div>
                  </div>
                </div>

                {/* Investment Flow */}
                {!isConnected ? (
                  <div className="text-center py-8 bg-surface/50 rounded-lg">
                    <Wallet className="w-12 h-12 mx-auto mb-4 text-ink-faint" />
                    <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                    <p className="text-ink-muted">Connect your wallet using the button in the header to start investing</p>
                  </div>
                ) : clientSecret && investmentId ? (
                  
                  
                  
                  
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Complete Card Payment</h3>
                      <button onClick={resetPayment} className="text-sm text-ink-muted hover:text-ink">← Back</button>
                    </div>
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                      <StripePaymentForm 
                        clientSecret={clientSecret} 
                        onSuccess={handlePaymentSuccess} 
                        onError={handlePaymentError} 
                        amount={totalCharge} 
                        investmentId={investmentId} 
                      />
                    </Elements>
                  </div>
                ) : investmentId && paymentMethod === 'crypto' ? (
                  
                  
                  
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Complete Crypto Payment</h3>
                      <button onClick={resetPayment} className="text-sm text-ink-muted hover:text-ink">← Back</button>
                    </div>
                    <CryptoPayment 
                      amount={amount} 
                      selectedToken={selectedToken} 
                      onTokenChange={setSelectedToken} 
                      onSuccess={handlePaymentSuccess} 
                      onError={handlePaymentError} 
                      investmentId={investmentId} 
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Referral Code - MOVED TO TOP */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <label className="block text-sm text-ink-muted">Referral Code (Optional)</label>
                        <div className="relative group">
                          <Info className="w-4 h-4 text-ink-faint cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-sunken border border-border rounded-lg text-xs text-ink-muted w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl">
                            <div className="font-medium text-ink mb-1">How referrals work</div>
                            Every investment includes a 5% token bonus. If you use a referral code, the bonus goes to your referrer. Gold and Diamond tier users can generate referral codes to share.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input 
                            type="text" 
                            value={referralCode} 
                            onChange={e => {
                              setReferralCode(e.target.value.toUpperCase());
                              setAppliedReferral(null);
                              setReferralError(null);
                            }} 
                            placeholder="Enter referral code"
                            disabled={!!appliedReferral}
                            className={`w-full px-4 py-3 bg-surface-sunken border rounded-lg focus:outline-none transition-colors ${
                              appliedReferral 
                                ? 'border-green-500 bg-green-500/10' 
                                : referralError 
                                  ? 'border-red-500' 
                                  : 'border-border focus:border-gold-500'
                            }`}
                          />
                          {appliedReferral && (
                            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                          )}
                        </div>
                        {!appliedReferral ? (
                          <button
                            type="button"
                            onClick={() => validateReferralCode(referralCode)}
                            disabled={!referralCode.trim() || checkingReferral}
                            className="px-4 py-3 bg-gold-600 hover:bg-gold-500 disabled:bg-surface-overlay disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
                          >
                            {checkingReferral ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Apply'
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setReferralCode('');
                              setAppliedReferral(null);
                              setReferralError(null);
                            }}
                            className="px-4 py-3 bg-surface-overlay hover:bg-border-strong rounded-lg font-medium transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      {referralError && (
                        <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {referralError}
                        </p>
                      )}
                      {appliedReferral && (
                        <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Referral applied! Your referrer will receive 5% bonus tokens.
                        </p>
                      )}
                      <p className="text-xs text-ink-faint mt-2">
                        Apply your referrer&apos;s code to give them a 5% token bonus. You cannot use your own code or codes from your linked wallets.
                      </p>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-sm text-ink-muted mb-2">Payment Method</label>
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <button onClick={() => setPaymentMethod('crypto')} 
                          className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${paymentMethod === 'crypto' ? 'border-gold-500 bg-gold-500/10' : 'border-border bg-surface hover:border-border-strong'}`}>
                          <Wallet className="w-6 h-6" />
                          <div className="text-left">
                            <div className="font-medium">Crypto</div>
                            <div className="text-xs text-ink-muted">USDC / USDT</div>
                          </div>
                        </button>
                        <button onClick={() => setPaymentMethod('fiat')} 
                          className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${paymentMethod === 'fiat' ? 'border-gold-500 bg-gold-500/10' : 'border-border bg-surface hover:border-border-strong'}`}>
                          <CreditCard className="w-6 h-6" />
                          <div className="text-left">
                            <div className="font-medium">Card</div>
                            <div className="text-xs text-yellow-400">+4% fee</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Crypto Token Selection */}
                    {paymentMethod === 'crypto' && (
                      <div>
                        <label className="block text-sm text-ink-muted mb-2">Select Token</label>
                        <div className="flex gap-2">
                          {(['USDC', 'USDT'] as const).map(token => {
                            const available = chain?.id ? !!getTokenAddress(chain.id, token) : false;
                            return (
                              <button key={token} onClick={() => available && setSelectedToken(token)} disabled={!available}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 
                                  ${!available ? 'opacity-40 cursor-not-allowed bg-surface/50' : selectedToken === token ? 'bg-gold-600 text-ink' : 'bg-surface text-ink-muted hover:bg-surface-overlay'}`}>
                                <TokenIcon token={token} />{token}
                              </button>
                            );
                          })}
                        </div>
                        {chain && !hasStablecoins(chain.id) && (
                          <p className="text-xs text-yellow-400 mt-2">No stablecoins on {CHAINS[chain.id as SupportedChainId]?.name}. Switch network or use card.</p>
                        )}
                        
                        {/* Show balance in main form */}
                        {isConnected && chain?.id && hasStablecoins(chain.id) && (
                          <WalletBalanceDisplay chainId={chain.id} token={selectedToken} address={address} />
                        )}
                      </div>
                    )}

                    {/* Amount Input */}
                    <div>
                      <label className="block text-sm text-ink-muted mb-2">Investment Amount (USD)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted text-lg">$</span>
                        <input 
                          type="number" 
                          value={investmentAmount} 
                          onChange={e => setInvestmentAmount(e.target.value)} 
                          placeholder="0.00" 
                          min={activeRound.min_investment_usd} 
                          max={activeRound.max_investment_usd}
                          className="w-full pl-8 pr-4 py-3 bg-surface-sunken border border-border rounded-lg text-xl focus:outline-none focus:border-gold-500 transition-colors" 
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {quickAmounts.map((amt, i) => (
                          <button key={`q-${i}`} onClick={() => setInvestmentAmount(amt.toString())} 
                            className="px-3 py-1.5 bg-surface-overlay rounded-lg text-sm hover:bg-border-strong transition-colors">
                            {formatCurrency(amt)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Summary */}
                    {amount > 0 && (
                      <div className="bg-surface/50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between"><span className="text-ink-muted">Investment</span><span>{formatCurrency(amount)}</span></div>
                        {paymentMethod === 'fiat' && (
                          <div className="flex justify-between text-yellow-400">
                            <span className="flex items-center gap-1"><Info className="w-4 h-4" />Stripe Fee (4%)</span>
                            <span>+{formatCurrency(stripeFee)}</span>
                          </div>
                        )}
                        <div className="border-t border-border pt-3 flex justify-between font-semibold">
                          <span>Total</span><span>{formatCurrency(totalCharge)}</span>
                        </div>
                        <div className="border-t border-border pt-3 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-ink-muted">Base Tokens</span>
                            <span className="text-gold-400 font-semibold">{formatNumber(tokensToReceive)} RWA</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-muted flex items-center gap-1">
                              <Gift className="w-4 h-4 text-green-400" /> 
                              {appliedReferral ? 'Referral Bonus (5%)' : 'Investor Bonus (5%)'}
                            </span>
                            <span className="text-green-400 font-semibold">+{formatNumber(bonusTokens)} RWA</span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span className="text-ink-muted">Total Tokens</span>
                            <span className="text-gold-400">{formatNumber(totalTokens)} RWA</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-muted">Value at TGE</span>
                            <span className="text-green-400 font-semibold">{formatCurrency(valueAtTGE)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-muted">ROI at TGE</span>
                            <span className="text-green-400 font-semibold">+{((roi - 1) * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-muted">5Y Potential ROI</span>
                            <span className="text-emerald-400 font-semibold">+{((calculate5YearROI(activeRound.token_price_usd) - 1) * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-muted">5Y Token Value</span>
                            <span className="text-emerald-400 font-semibold">{formatCurrency(totalTokens * yearlyProjections.year5.tokenValue)}</span>
                          </div>
                        </div>
                        {!appliedReferral && (
                          <div className="text-xs text-ink-faint pt-2 border-t border-border">
                            <Info className="w-3 h-3 inline mr-1" />
                            Have a referral code? Apply it above to give the 5% bonus to your referrer instead of the platform.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Error */}
                    {error && (
                      <div className="flex items-start gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Submit */}
                    <button onClick={handleInvest} disabled={!amount || amount < activeRound.min_investment_usd || processingPayment}
                      className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-light-600 rounded-lg font-semibold text-lg hover:from-gold-500 hover:to-gold-light-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {processingPayment ? <><Loader2 className="w-5 h-5 animate-spin" />Processing...</> : <>Invest Now<ArrowRight className="w-5 h-5" /></>}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-surface/50 rounded-xl p-8 border border-border text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-ink-faint" />
                <h2 className="text-2xl font-bold mb-2">No Active Round</h2>
                <p className="text-ink-muted">Check back soon for investment opportunities.</p>
              </div>
            )}

            {/* Investment Rounds - Unified Section */}
            <div className="bg-surface/50 rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-6">Investment Rounds</h2>
              
              <div className="space-y-4">
                {rounds.map((round, idx) => {
                  // Parse deliverables from DB (JSONB)
                  let deliverables: string[] = [];
                  if (round.deliverables) {
                    if (Array.isArray(round.deliverables)) {
                      deliverables = round.deliverables;
                    } else if (typeof round.deliverables === 'string') {
                      try { deliverables = JSON.parse(round.deliverables); } catch {}
                    }
                  }
                  
                  const isActive = round.status === 'active';
                  const isCompleted = round.status === 'completed';
                  const isUpcoming = round.status === 'upcoming';
                  const isCancelled = round.status === 'cancelled';
                  
                  // Hide cancelled rounds
                  if (isCancelled) return null;
                  
                  // Active round - fully expanded
                  if (isActive) {
                    return (
                      <div key={round.id} className="p-6 rounded-xl border-2 border-gold-500 bg-gold-500/10 relative overflow-hidden">
                        {/* Active badge */}
                        <div className="absolute top-0 right-0 bg-gold-500 text-ink text-xs font-bold px-3 py-1 rounded-bl-lg">
                          NOW OPEN
                        </div>
                        
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center font-bold">
                              {idx + 1}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold">{round.display_name || round.name}</h3>
                              <span className="text-sm text-gold-300">{round.timeline || 'Current Round'}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gold-400">${round.token_price_usd}</div>
                            <div className="text-sm text-ink-muted">per token</div>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-ink-muted">Raised</span>
                            <span className="text-gold-300">
                              {formatCurrency(round.raised_amount_usd || 0)} / {formatCurrency(round.target_amount_usd)}
                            </span>
                          </div>
                          <div className="h-3 bg-surface-overlay rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-gold-500 to-gold-light-400 rounded-full transition-all"
                              style={{ width: `${Math.min(100, ((round.raised_amount_usd || 0) / round.target_amount_usd) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs mt-1 text-ink-faint">
                            <span>{round.investor_count || 0} investors</span>
                            <span>{((round.raised_amount_usd || 0) / round.target_amount_usd * 100).toFixed(1)}% funded</span>
                          </div>
                        </div>
                        
                        {/* Investment limits */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-surface/50 rounded-lg">
                          <div>
                            <span className="text-xs text-ink-faint">Min Investment</span>
                            <div className="font-semibold">{formatCurrency(round.min_investment_usd)}</div>
                          </div>
                          <div>
                            <span className="text-xs text-ink-faint">Max Investment</span>
                            <div className="font-semibold">{formatCurrency(round.max_investment_usd)}</div>
                          </div>
                          <div>
                            <span className="text-xs text-ink-faint">Allocation</span>
                            <div className="font-semibold">{round.token_allocation_percent}%</div>
                          </div>
                          <div>
                            <span className="text-xs text-ink-faint">Vesting</span>
                            <div className="font-semibold">{round.vesting_months}mo <span className="text-xs text-ink-faint">(no cliff)</span></div>
                          </div>
                        </div>
                        
                        {/* ROI */}
                        <div className="flex gap-4 mb-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <div className="flex-1 text-center">
                            <div className="text-xs text-ink-muted">TGE ROI</div>
                            <div className="text-lg font-bold text-green-400">{calculateROI(round.token_price_usd).toFixed(2)}x</div>
                          </div>
                          <div className="flex-1 text-center border-l border-border">
                            <div className="text-xs text-ink-muted">5Y Potential</div>
                            <div className="text-lg font-bold text-emerald-400">{calculate5YearROI(round.token_price_usd).toFixed(0)}x</div>
                          </div>
                        </div>
                        
                        {/* Deliverables */}
                        {deliverables.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-ink-muted mb-2">Milestones & Deliverables</h4>
                            <div className="grid md:grid-cols-2 gap-2">
                              {deliverables.map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <CheckCircle className="w-4 h-4 flex-shrink-0 text-gold-400" />
                                  <span className="text-ink-muted">{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  // Completed round - collapsed with summary
                  if (isCompleted) {
                    return (
                      <div key={round.id} className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-ink" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-green-400">{round.display_name || round.name}</h3>
                              <span className="text-xs text-ink-faint">{round.timeline || 'Completed'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                              <div className="text-sm font-medium text-green-400">{formatCurrency(round.raised_amount_usd || 0)} raised</div>
                              <div className="text-xs text-ink-faint">{round.investor_count || 0} investors • ${round.token_price_usd}/token</div>
                            </div>
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">Completed</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Upcoming round - collapsed, locked appearance
                  if (isUpcoming) {
                    return (
                      <div key={round.id} className="p-4 rounded-lg border border-border bg-surface-sunken/30 opacity-70">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-surface-overlay flex items-center justify-center">
                              <Clock className="w-4 h-4 text-ink-faint" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-ink-muted">{round.display_name || round.name}</h3>
                              <span className="text-xs text-slate-600">{round.timeline || 'Coming Soon'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                              <div className="text-sm font-medium text-ink-faint">${round.token_price_usd}/token</div>
                              <div className="text-xs text-slate-600">Target: {formatCurrency(round.target_amount_usd)}</div>
                            </div>
                            <span className="px-2 py-1 bg-surface-overlay text-ink-faint text-xs rounded-full font-medium">Upcoming</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                })}
              </div>
              
              {/* No rounds message */}
              {rounds.length === 0 && (
                <div className="text-center py-8 text-ink-muted">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-lg font-medium">No investment rounds available</p>
                  <p className="text-sm">Check back soon for opportunities</p>
                </div>
              )}
            </div>
            {/* 5-Year Projections */}
            <div className="bg-surface/50 rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">5-Year Financial Projections</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-ink-muted font-medium">Year</th>
                      <th className="text-right py-2 text-ink-muted font-medium">Revenue</th>
                      <th className="text-right py-2 text-ink-muted font-medium">EBITDA</th>
                      <th className="text-right py-2 text-ink-muted font-medium">Token Value</th>
                      <th className="text-right py-2 text-ink-muted font-medium">Your Value*</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(yearlyProjections).map(([year, data], idx) => (
                      <tr key={year} className="border-b border-border/50">
                        <td className="py-2 font-medium">Year {idx + 1}</td>
                        <td className="py-2 text-right">{formatCurrency(data.revenue)}</td>
                        <td className={`py-2 text-right ${data.ebitda < 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {formatCurrency(data.ebitda)}
                        </td>
                        <td className="py-2 text-right text-gold-400">${data.tokenValue}</td>
                        <td className="py-2 text-right text-emerald-400">
                          {amount > 0 && activeRound ? formatCurrency(totalTokens * data.tokenValue) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-ink-faint mt-3">*Based on your current investment amount. Projections are estimates and not guaranteed.</p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Referral Program */}
            <div className="bg-surface/50 rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5 text-gold-400" /> Referral Program
              </h2>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-gold-500/10 to-gold-light-500/10 rounded-lg p-4 border border-gold-500/30">
                  <div className="text-2xl font-bold text-gold-400 mb-1">5% Bonus</div>
                  <div className="text-sm text-ink-muted">On every investment</div>
                </div>
                
                <div className="bg-surface/50 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    With referral → Bonus goes to referrer
                  </div>

                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold text-xs flex-shrink-0">1</div>
                    <div>
                      <div className="font-medium">Get Your Code</div>
                      <div className="text-ink-muted">Gold & Diamond KYC tiers can generate referral codes</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold text-xs flex-shrink-0">2</div>
                    <div>
                      <div className="font-medium">Share & Earn</div>
                      <div className="text-ink-muted">Share your code with friends and network</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold text-xs flex-shrink-0">3</div>
                    <div>
                      <div className="font-medium">Earn 5% Tokens</div>
                      <div className="text-ink-muted">Receive 5% of tokens bought using your code</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Why Invest */}
            <div className="bg-surface/50 rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">Why Invest?</h2>
              <div className="space-y-4">
                {[
                  { icon: TrendingUp, color: 'text-green-500', title: 'High ROI', desc: 'Up to 3.75x at TGE' },
                  { icon: Shield, color: 'text-gold-500', title: 'Regulated', desc: 'Full compliance' },
                  { icon: Coins, color: 'text-gold-500', title: '80% Revenue Share', desc: 'EBITDA to holders' },
                  { icon: Users, color: 'text-orange-500', title: '$16T Market', desc: 'RWA by 2030' },
                ].map(item => (
                  <div key={item.title} className="flex gap-3">
                    <item.icon className={`w-6 h-6 ${item.color} flex-shrink-0`} />
                    <div><h3 className="font-medium">{item.title}</h3><p className="text-sm text-ink-muted">{item.desc}</p></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-surface/50 rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">Payment Methods</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-surface/50 rounded-lg">
                  <TokenIcon token="USDC" className="w-8 h-8" />
                  <div><div className="font-medium">USDC</div><div className="text-xs text-green-400">No fees</div></div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-surface/50 rounded-lg">
                  <TokenIcon token="USDT" className="w-8 h-8" />
                  <div><div className="font-medium">USDT</div><div className="text-xs text-green-400">No fees</div></div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-surface/50 rounded-lg">
                  <CreditCard className="w-8 h-8 text-gold-400" />
                  <div><div className="font-medium">Credit/Debit Card</div><div className="text-xs text-yellow-400">+4% Stripe fee</div></div>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-surface/50 rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">FAQ</h2>
              <div className="space-y-1">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="border-b border-border last:border-0">
                    <button onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)} className="w-full py-3 flex justify-between items-center text-left">
                      <span className="font-medium text-sm">{faq.question}</span>
                      {expandedFaq === idx ? <ChevronUp className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
                    </button>
                    {expandedFaq === idx && <p className="pb-3 text-ink-muted text-sm">{faq.answer}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div className="bg-surface/50 rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">Resources</h2>
              <div className="space-y-2">
                {[
                  { href: '/docs/whitepaper', label: 'Whitepaper' },
                  { href: '/docs/tokenomics', label: 'Tokenomics' },
                  { href: '/docs/investor-guide', label: 'Investor Guide' },
                ].map(link => (
                  <Link key={link.href} href={link.href} className="flex items-center justify-between p-3 bg-surface/50 rounded-lg hover:bg-surface-sunken transition-colors">
                    <span>{link.label}</span>
                    <ExternalLink className="w-4 h-4 text-ink-muted" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
