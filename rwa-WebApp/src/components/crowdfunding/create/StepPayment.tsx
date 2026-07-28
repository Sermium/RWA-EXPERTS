'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { CreditCard, Wallet, Loader2, CheckCircle, AlertCircle, Shield, Copy, ExternalLink } from 'lucide-react';
import { ProjectData } from '@/app/crowdfunding/create/page';
import { getChainById, type SupportedChainId } from '@/config/chains';
import { DEPLOYMENTS, getPlatformWallets } from '@/config/deployments';
import { ERC20ABI } from '@/config/abis';

// Initialize Stripe outside component
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface StepPaymentProps {
  data: ProjectData;
  applicationId: string | null;
  setApplicationId: (id: string | null) => void;
  submissionFee: number;
  onPaymentSuccess: (paymentIntentId: string, method: 'card' | 'crypto') => void;
  onBack: () => void;
  walletAddress?: string;
  chainId?: number;
}

// Get stablecoin addresses from deployment config
function getStablecoins(chainId: number): { USDT?: string; USDC?: string } {
  const deployment = DEPLOYMENTS[chainId as SupportedChainId];
  if (!deployment?.tokens) return {};
  
  const ZERO = "0x0000000000000000000000000000000000000000";
  const tokens: { USDT?: string; USDC?: string } = {};
  
  if (deployment.tokens.USDT && deployment.tokens.USDT !== ZERO) {
    tokens.USDT = deployment.tokens.USDT;
  }
  if (deployment.tokens.USDC && deployment.tokens.USDC !== ZERO) {
    tokens.USDC = deployment.tokens.USDC;
  }
  
  return tokens;
}

// Get fee receiver wallet from deployment config
function getFeeReceiverWallet(chainId: number): string {
  const wallets = getPlatformWallets(chainId as SupportedChainId);
  return wallets.feeReceiver;
}

// Card Payment Form Component
function CardPaymentForm({
  clientSecret,
  onSuccess,
  onError,
  amount,
}: {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  amount: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found');
      setProcessing(false);
      return;
    }

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    if (stripeError) {
      setError(stripeError.message || 'Payment failed');
      onError(stripeError.message || 'Payment failed');
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      setError('Payment was not successful');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-surface-overlay border border-border-strong rounded-lg p-4">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#ffffff',
                '::placeholder': {
                  color: '#9ca3af',
                },
              },
              invalid: {
                color: '#ef4444',
              },
            },
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-danger text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full px-6 py-4 bg-gold-600 hover:bg-gold-700 disabled:bg-border-strong disabled:cursor-not-allowed text-ink font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pay ${amount.toLocaleString()}
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-xs text-ink-faint">
        <Shield className="w-4 h-4" />
        Secured by Stripe
      </div>
    </form>
  );
}

// Crypto Payment Component
function CryptoPaymentForm({
  amount,
  applicationId,
  onSuccess,
  onError,
}: {
  amount: number;
  applicationId: string;
  onSuccess: (txHash: string) => void;
  onError: (error: string) => void;
}) {
  const { address } = useAccount();
  const chainId = useChainId();
  const [selectedToken, setSelectedToken] = useState<'USDT' | 'USDC'>('USDC');
  const [copied, setCopied] = useState(false);

  // Get tokens and wallet from deployment config
  const chainStables = getStablecoins(chainId);
  const feeReceiverWallet = getFeeReceiverWallet(chainId);
  const availableTokens = Object.keys(chainStables) as ('USDT' | 'USDC')[];
  const tokenAddress = chainStables[selectedToken];
  const chainInfo = getChainById(chainId);

  // Set default token to first available
  useEffect(() => {
    if (availableTokens.length > 0 && !availableTokens.includes(selectedToken)) {
      setSelectedToken(availableTokens[0]);
    }
  }, [availableTokens, selectedToken]);

  // Read token balance
  const { data: balanceData, isLoading: isBalanceLoading, refetch: refetchBalance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!tokenAddress && !!address,
    },
  });

  // Read token decimals
  const { data: decimalsData } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'decimals',
    query: {
      enabled: !!tokenAddress,
    },
  });

  const decimals = decimalsData ?? 6;
  const balance = balanceData ? Number(formatUnits(balanceData as bigint, decimals)) : 0;
  const hasEnoughBalance = balance >= amount;

  // Write contract hook
  const { writeContract, data: txHash, isPending: isWritePending, error: writeError } = useWriteContract();

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Handle successful transaction
  useEffect(() => {
    if (isConfirmed && txHash) {
      // Refetch balance after successful transaction
      refetchBalance();
      
      // Update application with payment info
      fetch('/api/crowdfunding/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: applicationId,
          paymentStatus: 'paid',
          paymentMethod: 'crypto',
          paymentIntentId: txHash,
          paymentAmount: amount,
          paidAt: new Date().toISOString(),
          status: 'pending_review',
        }),
      })
        .then(() => onSuccess(txHash))
        .catch((err) => {
          console.error('Error updating application:', err);
          onSuccess(txHash);
        });
    }
  }, [isConfirmed, txHash, applicationId, amount, onSuccess, refetchBalance]);

  // Handle write error
  useEffect(() => {
    if (writeError) {
      onError(writeError.message || 'Transaction failed');
    }
  }, [writeError, onError]);

  // Refetch balance when token changes
  useEffect(() => {
    if (tokenAddress && address) {
      refetchBalance();
    }
  }, [selectedToken, tokenAddress, address, refetchBalance]);

  const handlePayment = async () => {
    if (!tokenAddress || !address) {
      onError('Token not available on this chain or wallet not connected');
      return;
    }

    if (!hasEnoughBalance) {
      onError(`Insufficient ${selectedToken} balance. You need ${amount} ${selectedToken} but only have ${balance.toFixed(2)} ${selectedToken}`);
      return;
    }

    try {
      const amountInTokens = parseUnits(amount.toString(), decimals);

      writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20ABI,
        functionName: 'transfer',
        args: [feeReceiverWallet as `0x${string}`, amountInTokens],
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to initiate payment');
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(feeReceiverWallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (availableTokens.length === 0) {
    return (
      <div className="bg-warning/10 border border-warning/30 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-ink mb-2">Chain Not Supported</h3>
        <p className="text-warning/80">
          Crypto payments are not available on {chainInfo?.name || 'this chain'}. 
          Please switch to a supported chain or use card payment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Token Selection */}
      <div>
        <label className="block text-sm text-ink-muted mb-2">Select Token</label>
        <div className="flex gap-3">
          {availableTokens.map((token) => {
            const isSelected = selectedToken === token;
            return (
              <button
                key={token}
                onClick={() => setSelectedToken(token)}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-gold-500 bg-gold-500/10'
                    : 'border-border bg-surface hover:border-border-strong'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    token === 'USDT' ? 'bg-success/20' : 'bg-gold-500/20'
                  }`}>
                    <span className={`text-sm font-bold ${
                      token === 'USDT' ? 'text-success' : 'text-gold-400'
                    }`}>
                      {token === 'USDT' ? '₮' : '$'}
                    </span>
                  </div>
                  <span className="text-ink font-medium">{token}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wallet Balance */}
      <div className={`p-4 rounded-xl border ${
        hasEnoughBalance 
          ? 'bg-success/5 border-success/20' 
          : 'bg-danger/5 border-danger/20'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className={`w-5 h-5 ${hasEnoughBalance ? 'text-success' : 'text-danger'}`} />
            <span className="text-ink-muted">Your {selectedToken} Balance</span>
          </div>
          <div className="text-right">
            {isBalanceLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-ink-muted" />
                <span className="text-ink-muted">Loading...</span>
              </div>
            ) : (
              <div>
                <span className={`text-lg font-bold ${hasEnoughBalance ? 'text-success' : 'text-danger'}`}>
                  {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`ml-1 ${hasEnoughBalance ? 'text-success' : 'text-danger'}`}>
                  {selectedToken}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {!hasEnoughBalance && !isBalanceLoading && (
          <div className="mt-2 flex items-center gap-2 text-danger text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>
              Insufficient balance. You need {amount} {selectedToken} but only have {balance.toFixed(2)} {selectedToken}
            </span>
          </div>
        )}
        
        {hasEnoughBalance && !isBalanceLoading && (
          <div className="mt-2 flex items-center gap-2 text-success text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>
              Sufficient balance for this payment
            </span>
          </div>
        )}
      </div>

      {/* Payment Details */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-ink-muted">Amount</span>
          <span className="text-xl font-bold text-ink">{amount} {selectedToken}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-ink-muted">Network</span>
          <span className="text-ink">{chainInfo?.name || `Chain ${chainId}`}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-ink-muted">Remaining after payment</span>
          <span className={`font-medium ${hasEnoughBalance ? 'text-ink-muted' : 'text-danger'}`}>
            {hasEnoughBalance 
              ? `${(balance - amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${selectedToken}`
              : 'Insufficient funds'
            }
          </span>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-ink-muted text-sm">Payment Address (Fee Receiver)</span>
            <button
              onClick={copyAddress}
              className="text-gold-400 hover:text-gold-300 text-sm flex items-center gap-1"
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="bg-surface-sunken rounded-lg p-3 font-mono text-sm text-ink-muted break-all">
            {feeReceiverWallet}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {isWritePending && (
        <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-gold-400 animate-spin" />
          <p className="text-gold-400">Please confirm the transaction in your wallet...</p>
        </div>
      )}

      {isConfirming && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-warning animate-spin" />
          <div>
            <p className="text-warning font-medium">Transaction submitted!</p>
            <p className="text-warning/80 text-sm">Waiting for confirmation...</p>
          </div>
        </div>
      )}

      {isConfirmed && (
        <div className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-success" />
          <div>
            <p className="text-success font-medium">Payment confirmed!</p>
            <a
              href={`${chainInfo?.explorerUrl || 'https://etherscan.io'}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-success/80 text-sm flex items-center gap-1 hover:underline"
            >
              View transaction <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Pay Button */}
      <button
        onClick={handlePayment}
        disabled={isWritePending || isConfirming || isConfirmed || !tokenAddress || !hasEnoughBalance}
        className={`w-full px-6 py-4 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
          !hasEnoughBalance
            ? 'bg-danger/50 cursor-not-allowed text-danger'
            : isWritePending || isConfirming || isConfirmed
              ? 'bg-border-strong cursor-not-allowed text-ink'
              : 'bg-gold-600 hover:bg-gold-700 text-ink'
        }`}
      >
        {isWritePending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Confirming in Wallet...
          </>
        ) : isConfirming ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Confirming Transaction...
          </>
        ) : isConfirmed ? (
          <>
            <CheckCircle className="w-5 h-5" />
            Payment Complete
          </>
        ) : !hasEnoughBalance ? (
          <>
            <AlertCircle className="w-5 h-5" />
            Insufficient {selectedToken} Balance
          </>
        ) : (
          <>
            <Wallet className="w-5 h-5" />
            Pay {amount} {selectedToken}
          </>
        )}
      </button>

      <p className="text-xs text-ink-faint text-center">
        Make sure you have enough {selectedToken} in your wallet to cover the payment plus gas fees.
      </p>
    </div>
  );
}

export default function StepPayment({
  data,
  applicationId,
  setApplicationId,
  submissionFee,
  onPaymentSuccess,
  onBack,
  walletAddress,
  chainId: propChainId,
}: StepPaymentProps) {
  const connectedChainId = useChainId();
  const chainId = propChainId || connectedChainId;
  
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Check if crypto is available on this chain
  const chainStables = getStablecoins(chainId);
  const cryptoAvailable = Object.keys(chainStables).length > 0;

  // Create application when component mounts
  useEffect(() => {
    const initializeApplication = async () => {
      if (!walletAddress || applicationId) return;

      setIsLoading(true);
      setError(null);

      try {
        const appResponse = await fetch('/api/crowdfunding/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            chainId: chainId || 1,
            projectName: data.projectName,
            category: data.category,
            description: data.description,
            website: data.website,
            companyName: data.companyName,
            registrationNumber: data.registrationNumber,
            jurisdiction: data.jurisdiction,
            fundingGoal: data.amountToRaise,
            localCurrency: data.localCurrency,
            exchangeRate: data.exchangeRate,
            investorSharePercentage: data.investorSharePercentage,
            projectedROI: data.projectedROI,
            roiTimelineMonths: data.roiTimelineMonths,
            revenueModel: data.revenueModel,
            tokenName: data.tokenName,
            tokenSymbol: data.tokenSymbol,
            totalSupply: data.totalSupply,
            tokenPrice: data.tokenPrice,
            investorTokens: data.investorTokens,
            platformFeeTokens: data.platformFeeTokens,
            platformFee: data.platformFee,
            milestones: data.milestones,
            // ADD THESE MEDIA FIELDS:
            logoUrl: data.logoUrl,
            bannerUrl: data.bannerUrl,
            pitchDeckUrl: data.pitchDeckUrl,
            images: data.imageUrls,
            videoUrl: data.videoUrl,
            legalDocuments: data.legalDocumentUrls,
            termsAccepted: data.termsAccepted,
          }),
        });

        if (!appResponse.ok) {
          const errData = await appResponse.json();
          throw new Error(errData.error || 'Failed to create application');
        }

        const appData = await appResponse.json();
        if (appData.id) {
          setApplicationId(appData.id);
        }
      } catch (err) {
        console.error('Error initializing application:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize application');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApplication();
  }, [walletAddress, chainId, applicationId]);

  // Create Stripe payment intent when card is selected
  const initializeStripePayment = async () => {
    if (!applicationId) {
      setError('Application not created yet. Please wait...');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'submission_fee',
          applicationId,
          walletAddress,
          projectName: data.projectName,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create payment intent');
      }

      const { clientSecret: secret } = await response.json();
      setClientSecret(secret);
    } catch (err) {
      console.error('Error creating payment intent:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize card payment');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle payment method selection
  const handleMethodSelect = async (method: 'card' | 'crypto') => {
    setPaymentMethod(method);
    setError(null);

    if (method === 'card' && !clientSecret) {
      await initializeStripePayment();
    }
  };

  // Handle card payment success
  const handleCardSuccess = async (paymentIntentId: string) => {
    try {
      await fetch('/api/crowdfunding/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: applicationId,
          paymentStatus: 'paid',
          paymentMethod: 'card',
          paymentIntentId,
          paymentAmount: submissionFee,
          paidAt: new Date().toISOString(),
          status: 'pending_review',
        }),
      });

      onPaymentSuccess(paymentIntentId, 'card');
    } catch (err) {
      console.error('Error updating application:', err);
      onPaymentSuccess(paymentIntentId, 'card');
    }
  };

  // Handle crypto payment success
  const handleCryptoSuccess = (txHash: string) => {
    onPaymentSuccess(txHash, 'crypto');
  };

  if (isLoading && !paymentMethod) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-gold-500 animate-spin mb-4" />
        <p className="text-ink-muted">Preparing your application...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-ink mb-2">Submission Fee</h2>
        <p className="text-ink-muted">Pay the submission fee to submit your project for review</p>
      </div>

      {/* Fee Summary */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-ink-muted">Project Submission Fee</span>
          <span className="text-2xl font-bold text-ink">${submissionFee.toLocaleString()}</span>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-sm text-ink-muted mb-3">This fee covers:</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-ink-muted">
              <CheckCircle className="w-4 h-4 text-success" />
              Document verification and compliance review
            </li>
            <li className="flex items-center gap-2 text-ink-muted">
              <CheckCircle className="w-4 h-4 text-success" />
              Smart contract deployment (upon approval)
            </li>
            <li className="flex items-center gap-2 text-ink-muted">
              <CheckCircle className="w-4 h-4 text-success" />
              Platform listing and marketing support
            </li>
            <li className="flex items-center gap-2 text-ink-muted">
              <CheckCircle className="w-4 h-4 text-success" />
              Ongoing technical support
            </li>
          </ul>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-danger">{error}</p>
        </div>
      )}

      {/* Payment Method Selection */}
      {!paymentMethod && (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted mb-4">Select payment method:</p>

          <button
            onClick={() => handleMethodSelect('card')}
            disabled={isLoading || !applicationId}
            className="w-full p-4 bg-surface hover:bg-gray-750 border border-border hover:border-gold-500 rounded-xl transition-all flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 bg-gold-500/20 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-gold-400" />
            </div>
            <div className="text-left flex-1">
              <p className="text-ink font-medium">Credit / Debit Card</p>
              <p className="text-sm text-ink-muted">Visa, Mastercard, Amex</p>
            </div>
            <span className="text-ink-muted">→</span>
          </button>

          <button
            onClick={() => handleMethodSelect('crypto')}
            disabled={isLoading || !applicationId || !cryptoAvailable}
            className={`w-full p-4 bg-surface border border-border rounded-xl transition-all flex items-center gap-4 ${
              cryptoAvailable 
                ? 'hover:bg-gray-750 hover:border-gold-500' 
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="w-12 h-12 bg-gold-500/20 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-gold-400" />
            </div>
            <div className="text-left flex-1">
              <p className="text-ink font-medium">Cryptocurrency</p>
              <p className="text-sm text-ink-muted">
                {cryptoAvailable 
                  ? `USDT, USDC on ${getChainById(chainId)?.name || 'current chain'}`
                  : 'Not available on this chain'
                }
              </p>
            </div>
            {cryptoAvailable ? (
              <span className="text-ink-muted">→</span>
            ) : (
              <span className="px-2 py-1 bg-surface-overlay text-ink-muted text-xs rounded">Unavailable</span>
            )}
          </button>

          {!applicationId && (
            <p className="text-sm text-warning text-center mt-4">
              <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
              Creating application...
            </p>
          )}
        </div>
      )}

      {/* Card Payment Form */}
      {paymentMethod === 'card' && (
        <div className="space-y-6">
          <button
            onClick={() => {
              setPaymentMethod(null);
              setClientSecret(null);
              setError(null);
            }}
            className="text-sm text-ink-muted hover:text-ink flex items-center gap-1"
          >
            ← Change payment method
          </button>

          {isLoading ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 text-gold-500 animate-spin mb-3" />
              <p className="text-ink-muted">Loading payment form...</p>
            </div>
          ) : clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CardPaymentForm
                clientSecret={clientSecret}
                amount={submissionFee}
                onSuccess={handleCardSuccess}
                onError={(err) => setError(err)}
              />
            </Elements>
          ) : !stripePromise ? (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <p className="text-warning">
                Stripe is not configured. Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment variables.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 text-gold-500 animate-spin mb-3" />
              <p className="text-ink-muted">Initializing payment...</p>
            </div>
          )}
        </div>
      )}

      {/* Crypto Payment Form */}
      {paymentMethod === 'crypto' && applicationId && (
        <div className="space-y-6">
          <button
            onClick={() => {
              setPaymentMethod(null);
              setError(null);
            }}
            className="text-sm text-ink-muted hover:text-ink flex items-center gap-1"
          >
            ← Change payment method
          </button>

          <CryptoPaymentForm
            amount={submissionFee}
            applicationId={applicationId}
            onSuccess={handleCryptoSuccess}
            onError={(err) => setError(err)}
          />
        </div>
      )}

      {/* Back Button */}
      <div className="mt-8 pt-6 border-t border-border">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-surface-overlay hover:bg-border-strong text-ink rounded-lg transition-colors"
        >
          Back to Review
        </button>
      </div>
    </div>
  );
}