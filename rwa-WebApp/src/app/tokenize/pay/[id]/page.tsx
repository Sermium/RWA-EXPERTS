// src/app/tokenize/pay/[id]/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import Link from 'next/link';
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Coins,
  Banknote,
  Building2,
  ChevronDown,
  AlertTriangle,
  type LucideIcon
} from 'lucide-react';
import { useChainConfig } from '@/hooks/useChainConfig';
import { useTokenConfig } from '@/hooks/useTokenConfig';

// ERC-20 ABI
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }]
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }]
  }
] as const;

// Admin address receives payments
const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS as `0x${string}` | undefined;

interface TokenizationApplication {
  id: string;
  asset_name: string;
  asset_type: string;
  company_name: string;
  fee_amount: number;
  fee_currency: string;
  status: string;
  user_address: string;
}

interface PaymentToken {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  icon: LucideIcon;
  color: string;
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  // Multichain config
  const {
    chainId,
    chainName,
    tokens,
    isDeployed,
    explorerUrl,
    getTxUrl,
    nativeCurrency,
  } = useChainConfig();

  // Build payment tokens from chain config
  const PAYMENT_TOKENS = useMemo((): Record<string, PaymentToken> => {
    if (!tokens) return {};
    
    const paymentTokens: Record<string, PaymentToken> = {};
    
    if (tokens.USDC) {
      paymentTokens.USDC = {
        address: tokens.USDC as `0x${string}`,
        symbol: 'USDC',
        decimals: 6,
        icon: Coins,
        color: 'from-gold to-gold-light'
      };
    }

    if (tokens.USDT) {
      paymentTokens.USDT = {
        address: tokens.USDT as `0x${string}`,
        symbol: 'USDT',
        decimals: 6,
        icon: Banknote,
        color: 'from-gold to-gold-light'
      };
    }
    return paymentTokens;
  }, [tokens]);

  const paymentTokenKeys = useMemo(() => Object.keys(PAYMENT_TOKENS) as string[], [PAYMENT_TOKENS]);
  
  const [application, setApplication] = useState<TokenizationApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string>('USDC');
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [balances, setBalances] = useState<Record<string, bigint | undefined>>({});
  const [isAdditionalPayment, setIsAdditionalPayment] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const currentToken = PAYMENT_TOKENS[selectedToken];

  // Read token balances dynamically
  const { data: firstTokenBalance, refetch: refetchFirstBalance } = useReadContract({
    address: paymentTokenKeys[0] ? PAYMENT_TOKENS[paymentTokenKeys[0]]?.address : undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && paymentTokenKeys.length > 0 }
  });

  const { data: secondTokenBalance, refetch: refetchSecondBalance } = useReadContract({
    address: paymentTokenKeys[1] ? PAYMENT_TOKENS[paymentTokenKeys[1]]?.address : undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && paymentTokenKeys.length > 1 }
  });

  const { data: thirdTokenBalance, refetch: refetchThirdBalance } = useReadContract({
    address: paymentTokenKeys[2] ? PAYMENT_TOKENS[paymentTokenKeys[2]]?.address : undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && paymentTokenKeys.length > 2 }
  });

  // Update balances when data changes
  useEffect(() => {
    const newBalances: Record<string, bigint | undefined> = {};
    if (paymentTokenKeys[0]) newBalances[paymentTokenKeys[0]] = firstTokenBalance;
    if (paymentTokenKeys[1]) newBalances[paymentTokenKeys[1]] = secondTokenBalance;
    if (paymentTokenKeys[2]) newBalances[paymentTokenKeys[2]] = thirdTokenBalance;
    setBalances(newBalances);
  }, [firstTokenBalance, secondTokenBalance, thirdTokenBalance, paymentTokenKeys]);

  // Wait for transaction receipt
  const { isSuccess: txSuccess } = useWaitForTransactionReceipt({hash: txHash || undefined,});

  // Set default selected token when tokens are available
  useEffect(() => {if (paymentTokenKeys.length > 0 && !PAYMENT_TOKENS[selectedToken]) {setSelectedToken(paymentTokenKeys[0]);}}, [paymentTokenKeys, selectedToken, PAYMENT_TOKENS]);

  // Fetch application details
  useEffect(() => {
    const fetchApplication = async () => {
      if (!address || !params.id) return;
      
      try {
        // Check for additional payment query param
        const searchParams = new URLSearchParams(window.location.search);
        const additionalAmount = searchParams.get('additional');
        
        const response = await fetch(`/api/tokenization/${params.id}`, {
          headers: { 'x-wallet-address': address }
        });
        
        if (!response.ok) {
          throw new Error('Application not found');
        }
        
        const data = await response.json();
        
        // Accept statuses that need payment
        const payableStatuses = ['approved', 'rejected', 'payment_pending'];
        
        // If coming from edit with additional payment, allow rejected status
        if (additionalAmount && data.status === 'rejected') {
          data.fee_amount = parseFloat(additionalAmount);
          data.isAdditionalPayment = true;
        } else if (!payableStatuses.includes(data.status)) {
          setError('This application is not ready for payment');
          return;
        }
        
        setApplication(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load application');
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [address, params.id]);

  // Refetch balances when address or chain changes
  useEffect(() => {
    if (address) {
      refetchFirstBalance();
      refetchSecondBalance();
      refetchThirdBalance();
    }
  }, [address, chainId, refetchFirstBalance, refetchSecondBalance, refetchThirdBalance]);

  // Auto-select token with sufficient balance
  useEffect(() => {
    if (!application || paymentTokenKeys.length === 0) return;
    const requiredAmount = parseUnits(application.fee_amount.toString(), 6);
    // If current selection has insufficient balance, try to switch
    const currentBalance = balances[selectedToken];
    if (currentBalance !== undefined && currentBalance < requiredAmount) {
      // Find a token with sufficient balance
      for (const tokenKey of paymentTokenKeys) {
        if (tokenKey !== selectedToken) {
          const otherBalance = balances[tokenKey];
          if (otherBalance !== undefined && otherBalance >= requiredAmount) {
            setSelectedToken(tokenKey);
            break;
          }
        }
      }
    }
  }, [balances, application, selectedToken, paymentTokenKeys]);

  // Handle successful transaction
  useEffect(() => {
    if (txSuccess && txHash && !paymentConfirmed) {
      handlePaymentConfirmation();
    }
  }, [txSuccess, txHash, paymentConfirmed]);

  const handlePaymentConfirmation = async () => {
    if (!address || !txHash) return;
    
    // Check if this is additional payment
    const searchParams = new URLSearchParams(window.location.search);
    const isAdditionalPayment = searchParams.get('additional') !== null;
    
    try {
      const response = await fetch(`/api/tokenization/${params.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address
        },
        body: JSON.stringify({ 
          txHash,
          paymentToken: selectedToken,
          chainId,
          isAdditionalPayment
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm payment');
      }

      setPaymentConfirmed(true);
      setIsAdditionalPayment(data.isAdditionalPayment);
    } catch (err: any) {
      setError(err.message || 'Payment confirmation failed');
    }
  };

  const handlePay = async () => {
    if (!application || !address || !ADMIN_ADDRESS || !currentToken) return;
    
    setIsPaying(true);
    setError(null);

    try {
      const amount = parseUnits(application.fee_amount.toString(), currentToken.decimals);
      const balance = balances[selectedToken];
      
      if (balance && balance < amount) {
        throw new Error(`Insufficient ${currentToken.symbol} balance`);
      }

      const hash = await writeContractAsync({
        address: currentToken.address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [ADMIN_ADDRESS, amount]
      });

      setTxHash(hash);
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed');
      setIsPaying(false);
    }
  };

  const formatBalance = (balance: bigint | undefined, decimals: number = 6): string => {
    if (balance === undefined) return 'Loading...';
    const formatted = parseFloat(formatUnits(balance, decimals));
    return formatted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const hasInsufficientBalance = (): boolean => {
    if (!application || !currentToken) return false;
    const balance = balances[selectedToken];
    if (balance === undefined) return false;
    return balance < parseUnits(application.fee_amount.toString(), currentToken.decimals);
  };

  const getTokenBalance = (token: string): string => {
    const tokenInfo = PAYMENT_TOKENS[token];
    if (!tokenInfo) return '0.00';
    return formatBalance(balances[token], tokenInfo.decimals);
  };

  // Not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-surface-sunken">
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-warning mx-auto mb-4" />
            <h2 className="text-xl text-ink mb-2">Wallet Not Connected</h2>
            <p className="text-ink-muted">Please connect your wallet to continue</p>
          </div>
        </div>
      </div>
    );
  }

  // Not deployed
  if (!isDeployed) {
    return (
      <div className="min-h-screen bg-surface-sunken">
        <div className="flex items-center justify-center pt-32">
          <div className="text-center max-w-md mx-auto px-4">
            <AlertTriangle className="w-16 h-16 text-warning mx-auto mb-4" />
            <h2 className="text-xl text-ink mb-2">Network Not Supported</h2>
            <p className="text-ink-muted mb-4">
              Payment is not available on {chainName || 'this network'}. 
              Please switch to a supported network.
            </p>
            <Link href="/tokenize" className="text-gold hover:text-gold-light">
              ← Back to Applications
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // No payment tokens available
  if (paymentTokenKeys.length === 0) {
    return (
      <div className="min-h-screen bg-surface-sunken">
        <div className="flex items-center justify-center pt-32">
          <div className="text-center max-w-md mx-auto px-4">
            <AlertCircle className="w-16 h-16 text-warning mx-auto mb-4" />
            <h2 className="text-xl text-ink mb-2">No Payment Tokens</h2>
            <p className="text-ink-muted mb-4">
              No stablecoin payment tokens are configured on {chainName || 'this network'}.
            </p>
            <Link href="/tokenize" className="text-gold hover:text-gold-light">
              ← Back to Applications
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Config error
  if (!ADMIN_ADDRESS) {
    return (
      <div className="min-h-screen bg-surface-sunken">
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-danger mx-auto mb-4" />
            <h2 className="text-xl text-ink mb-2">Configuration Error</h2>
            <p className="text-ink-muted">Payment recipient not configured</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-sunken">
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      </div>
    );
  }

  // Error
  if (error && !application) {
    return (
      <div className="min-h-screen bg-surface-sunken">
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-danger mx-auto mb-4" />
            <h2 className="text-xl text-ink mb-2">Error</h2>
            <p className="text-ink-muted mb-4">{error}</p>
            <Link href="/tokenize" className="text-gold hover:text-gold-light">
              ← Back to Applications
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Payment confirmed screen
  if (paymentConfirmed) {
    return (
      <div className="min-h-screen bg-surface-sunken">
        <div className="py-12 px-4 pt-24">
          <div className="max-w-lg mx-auto">
            <div className="bg-surface-raised rounded-xl p-8 text-center">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <h1 className="text-2xl font-bold text-ink mb-2">Payment Successful!</h1>
              <p className="text-ink-muted mb-6">
                Your payment of ${application?.fee_amount.toLocaleString()} {currentToken?.symbol} has been confirmed.
              </p>
              
              {txHash && explorerUrl && (
                <a
                  href={getTxUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-gold hover:text-gold-light mb-6"
                >
                  View Transaction <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {chainName && (
                <p className="text-ink-faint text-sm mb-6">
                  Confirmed on {chainName}
                </p>
              )}

              {/* Application submitted for review */}
              <div className="bg-gold-500/10 border border-gold-500/30 rounded-xl p-4 mb-6">
                <p className="text-gold-400 text-sm">
                  Your application has been submitted for review. 
                  We'll notify you once it's approved and ready for token deployment.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/dashboard"
                  className="w-full py-3 bg-gradient-to-r from-gold to-gold-light text-ink font-semibold rounded-xl hover:opacity-90 transition"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-sunken">
      <div className="py-12 px-4 pt-24">
        <div className="max-w-lg mx-auto">
          {/* Back Link */}
          <Link 
            href={`/tokenize/application/${params.id}`}
            className="inline-flex items-center gap-2 text-ink-muted hover:text-ink mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Application
          </Link>

          <div className="bg-surface-raised rounded-xl overflow-hidden">
            {/* Payment Header */}
            <div className="bg-gold/10 p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gold/15 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-7 h-7 text-gold" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-ink">
                    {(application as any)?.isAdditionalPayment ? 'Additional Payment Required' : 'Complete Payment'}
                  </h1>
                  <p className="text-ink-muted">
                    {(application as any)?.isAdditionalPayment 
                      ? 'Pay for new options to proceed' 
                      : 'Pay tokenization fee to proceed'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Network Info */}
              {chainName && (
                <div className="bg-surface-overlay/30 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-ink-muted text-sm">Network</span>
                  <span className="text-ink text-sm font-medium">{chainName}</span>
                </div>
              )}

              {/* Application Info */}
              {application && (
                <div className="bg-surface-overlay/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-ink-muted" />
                    <div>
                      <p className="text-sm text-ink-muted">Asset</p>
                      <p className="text-ink font-medium">{application.asset_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Coins className="w-5 h-5 text-ink-muted" />
                    <div>
                      <p className="text-sm text-ink-muted">Company</p>
                      <p className="text-ink font-medium">{application.company_name}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Token Selector */}
              <div className="relative">
                <label className="block text-sm text-ink-muted mb-2">Pay with</label>
                <button
                  onClick={() => setShowTokenSelector(!showTokenSelector)}
                  className="w-full flex items-center justify-between p-4 bg-surface-overlay/50 rounded-xl border border-border-strong hover:border-border-strong transition"
                >
                  <div className="flex items-center gap-3">
                    {currentToken ? <currentToken.icon className="w-6 h-6 text-gold" /> : <Coins className="w-6 h-6 text-ink-faint" />}
                    <div className="text-left">
                      <p className="text-ink font-medium">{currentToken?.symbol || 'Select Token'}</p>
                      <p className="text-sm text-ink-muted">
                        Balance: ${getTokenBalance(selectedToken)}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-ink-muted transition-transform ${showTokenSelector ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {showTokenSelector && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface-overlay rounded-xl border border-border-strong overflow-hidden z-10 shadow-xl">
                    {paymentTokenKeys.map((tokenKey) => {
                      const token = PAYMENT_TOKENS[tokenKey];
                      if (!token) return null;
                      
                      const balance = balances[tokenKey];
                      const isSelected = tokenKey === selectedToken;
                      const hasSufficientBalance = balance !== undefined && application
                        ? balance >= parseUnits(application.fee_amount.toString(), token.decimals)
                        : false;

                      return (
                        <button
                          key={tokenKey}
                          onClick={() => {
                            setSelectedToken(tokenKey);
                            setShowTokenSelector(false);
                          }}
                          className={`w-full flex items-center justify-between p-4 hover:bg-surface-overlay transition ${
                            isSelected ? 'bg-surface-overlay/60' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <token.icon className="w-6 h-6 text-gold" />
                            <div className="text-left">
                              <p className="text-ink font-medium">{token.symbol}</p>
                              <p className={`text-sm ${hasSufficientBalance ? 'text-ink-muted' : 'text-danger'}`}>
                                Balance: ${getTokenBalance(tokenKey)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasSufficientBalance && (
                              <span className="text-xs bg-success/15 text-success px-2 py-1 rounded-full">
                                Sufficient
                              </span>
                            )}
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-gold" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Fee Amount */}
              {currentToken && (
                <div className={`bg-gradient-to-r ${currentToken.color}/10 rounded-xl p-6 border border-border-strong`}>
                  <p className="text-ink-muted text-sm mb-2">Amount to Pay</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-ink">
                      ${application?.fee_amount.toLocaleString()}
                    </span>
                    <span className="text-ink-muted">{currentToken.symbol}</span>
                  </div>
                </div>
              )}

              {/* Balance Summary */}
              <div className="bg-surface-overlay/30 rounded-xl p-4">
                <p className="text-sm text-ink-muted mb-3">Your Stablecoin Balances</p>
                <div className="space-y-2">
                  {paymentTokenKeys.map((tokenKey) => {
                    const token = PAYMENT_TOKENS[tokenKey];
                    if (!token) return null;
                    
                    const balance = balances[tokenKey];
                    const isSelected = tokenKey === selectedToken;
                    const hasSufficientBalance = balance !== undefined && application
                      ? balance >= parseUnits(application.fee_amount.toString(), token.decimals)
                      : false;

                    return (
                      <div 
                        key={tokenKey}
                        className={`flex justify-between items-center p-2 rounded-lg ${
                          isSelected ? 'bg-surface-overlay/60' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <token.icon className="w-4 h-4 text-gold" />
                          <span className="text-ink">{token.symbol}</span>
                          {isSelected && (
                            <span className="text-xs bg-gold/15 text-gold px-2 py-0.5 rounded">
                              Selected
                            </span>
                          )}
                        </div>
                        <span className={`font-medium ${
                          hasSufficientBalance ? 'text-ink' : 'text-danger'
                        }`}>
                          ${getTokenBalance(tokenKey)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-danger text-sm">{error}</p>
                </div>
              )}

              {/* Insufficient Balance Warning */}
              {hasInsufficientBalance() && currentToken && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-warning text-sm">
                      Insufficient {currentToken.symbol} balance.
                    </p>
                    <p className="text-warning/70 text-xs mt-1">
                      You need ${application?.fee_amount.toLocaleString()} {currentToken.symbol}. 
                      {paymentTokenKeys.length > 1 && (
                        <> Try switching to another token.</>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Transaction Link */}
              {txHash && explorerUrl && (
                <div className="bg-gold-500/10 border border-gold-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gold-400 text-sm">Transaction submitted</span>
                    <a
                      href={getTxUrl(txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold-300 hover:text-gold-200 text-sm flex items-center gap-1"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Pay Button */}
              <button
                onClick={handlePay}
                disabled={isPaying || !application || hasInsufficientBalance() || !currentToken}
                className="w-full py-4 bg-gold hover:bg-gold-light text-surface-sunken font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPaying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {txHash ? 'Confirming...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pay ${application?.fee_amount.toLocaleString()} {currentToken?.symbol}
                  </>
                )}
              </button>

              {/* Payment Info */}
              <p className="text-center text-ink-faint text-xs">
                Payment will be sent to the platform admin wallet on {chainName || 'the current network'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
