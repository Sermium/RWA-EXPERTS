// src/components/tokenization/Step4Review.tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Edit2, FileText, CheckCircle, CreditCard, Loader2, Shield, PiggyBank, Coins, Wallet, Building2, X } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { FormData, DocumentFile, UploadedFile, ASSET_TYPES, USE_CASES, DOCUMENT_TYPES } from '@/types/tokenization';
import { useChainConfig } from '@/hooks/useChainConfig';
import { useFeeRecipient } from '@/hooks/useFeeRecipient';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface Step4ReviewProps {
  formData: FormData;
  documents: DocumentFile[];
  logoFile: UploadedFile | null;
  bannerFile: UploadedFile | null;
  onEdit: (step: number) => void;
  onPaymentComplete: (txHash: string, options: PaymentOptions) => void;
}

interface PaymentOptions {
  escrow: boolean;
  dividend: boolean;
  totalAmount: number;
  currency: 'USDC' | 'USDT' | 'USD';
  paymentMethod: 'crypto' | 'stripe';
}

// ERC20 ABI for transfer
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// Pricing
const PRICING = {
  base: 750,
  escrow: 250,
  dividend: 200,
};

// Initialize Stripe
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// Stripe Payment Form Component
function StripePaymentForm({ 
  onSuccess, 
  onError, 
  onCancel,
  amount 
}: { 
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
  amount: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/tokenize?payment_status=success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message || 'Payment failed');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
        <PaymentElement />
      </div>
      
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-light-500 hover:from-gold-600 hover:to-gold-light-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Pay ${amount} USD
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export function Step4Review({ 
  formData, 
  documents, 
  logoFile, 
  bannerFile, 
  onEdit,
  onPaymentComplete 
}: Step4ReviewProps) {
  const { address, isConnected } = useAccount();
  const { tokens } = useChainConfig();
  const { feeRecipient, isLoading: isLoadingRecipient } = useFeeRecipient();
  
  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'stripe'>('crypto');
  
  // Payment options state
  const [includeEscrow, setIncludeEscrow] = useState(false);
  const [includeDividend, setIncludeDividend] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'USDC' | 'USDT'>('USDC');
  const [paymentStep, setPaymentStep] = useState<'idle' | 'paying' | 'confirming' | 'done'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const paymentCompletedRef = useRef(false);

  // Stripe state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showStripeForm, setShowStripeForm] = useState(false);

  // Calculate total
  const totalAmount = PRICING.base + 
    (includeEscrow ? PRICING.escrow : 0) + 
    (includeDividend ? PRICING.dividend : 0);

  // Get token address based on selection
  const tokenAddress = selectedCurrency === 'USDC' ? tokens?.USDC : tokens?.USDT;

  // Read user balance
  const { data: balanceData } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const userBalance = balanceData && typeof balanceData === 'bigint' 
    ? parseFloat(formatUnits(balanceData, 6)) 
    : 0;
  const hasEnoughBalance = userBalance >= totalAmount;

  // Contract write
  const { 
    writeContract, 
    data: txHash, 
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed 
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Handle crypto payment
  const handleCryptoPayment = async () => {
    if (!address || !tokenAddress || !feeRecipient) return;
    
    setPaymentStep('paying');
    setPaymentError(null);

    try {
      writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [
          feeRecipient as `0x${string}`,
          parseUnits(totalAmount.toString(), 6),
        ],
      });
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentError(error.message || 'Payment failed');
      setPaymentStep('idle');
    }
  };

  // Handle Stripe payment
  const handleStripePayment = async () => {
    setPaymentStep('paying');
    setPaymentError(null);

    try {
      const response = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tokenization_fee',
          walletAddress: address || '',
          email: formData.email,
          includeEscrow,
          includeDividend,
          assetName: formData.assetName,
          tokenName: formData.tokenName,
          tokenSymbol: formData.tokenSymbol,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment');
      }

      const { clientSecret: secret } = await response.json();
      setClientSecret(secret);
      setShowStripeForm(true);
      setPaymentStep('idle');
    } catch (error: any) {
      console.error('Stripe payment error:', error);
      setPaymentError(error.message || 'Payment failed');
      setPaymentStep('idle');
    }
  };

  // Handle payment based on method
  const handlePayment = () => {
    if (paymentMethod === 'crypto') {
      handleCryptoPayment();
    } else {
      handleStripePayment();
    }
  };

  // Watch transaction status for crypto
  useEffect(() => {
    if (txHash && paymentStep === 'paying') {
      setPaymentStep('confirming');
    }
  }, [txHash, paymentStep]);

  useEffect(() => {
    if (isConfirmed && txHash && !paymentCompletedRef.current) {
      paymentCompletedRef.current = true;
      setPaymentStep('done');
      onPaymentComplete(txHash, {
        escrow: includeEscrow,
        dividend: includeDividend,
        totalAmount,
        currency: selectedCurrency,
        paymentMethod: 'crypto',
      });
    }
  }, [isConfirmed, txHash]);

  useEffect(() => {
    if (writeError) {
      const errorMessage = writeError.message || 'Transaction failed';
      if (errorMessage.includes('user rejected')) {
        setPaymentError('Transaction cancelled by user');
      } else if (errorMessage.includes('insufficient')) {
        setPaymentError('Insufficient balance');
      } else {
        setPaymentError(errorMessage);
      }
      setPaymentStep('idle');
    }
  }, [writeError]);

  // Handle Stripe success
  const handleStripeSuccess = useCallback((paymentIntentId: string) => {
    if (paymentCompletedRef.current) return;
    paymentCompletedRef.current = true;
    setPaymentStep('done');
    setShowStripeForm(false);
    onPaymentComplete(paymentIntentId, {
      escrow: includeEscrow,
      dividend: includeDividend,
      totalAmount,
      currency: 'USD',
      paymentMethod: 'stripe',
    });
  }, [includeEscrow, includeDividend, totalAmount, onPaymentComplete]);

  // Handle Stripe error
  const handleStripeError = (error: string) => {
    setPaymentError(error);
    setPaymentStep('idle');
  };

  // Handle Stripe cancel
  const handleStripeCancel = () => {
    setShowStripeForm(false);
    setClientSecret(null);
    setPaymentStep('idle');
  };

  const assetType = ASSET_TYPES.find(t => t.value === formData.assetType);
  const useCase = USE_CASES.find(u => u.value === formData.useCase);

  const Section = ({ title, step, children }: { title: string; step: number; children: React.ReactNode }) => (
    <div className="bg-gray-700/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-white">{title}</h3>
        <button
          onClick={() => onEdit(step)}
          className="flex items-center gap-1 text-gold-400 hover:text-gold-300 text-sm"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
      </div>
      {children}
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string | undefined }) => (
    <div>
      <span className="text-gray-400 text-sm">{label}:</span>
      <span className="ml-2 text-white">{value || '-'}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Review Your Application</h2>
        <p className="text-gray-400 text-sm">
          Please review all information and complete payment to submit
        </p>
      </div>

      {/* Asset Info */}
      <Section title="Asset Information" step={1}>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Asset Type" value={assetType?.label} />
          <Field label="Asset Name" value={formData.assetName} />
          <Field label="Location" value={formData.assetLocation} />
          <Field label="Estimated Value" value={`$${formData.estimatedValue} ${formData.currency}`} />
          <div className="col-span-2">
            <span className="text-gray-400 text-sm">Description:</span>
            <p className="mt-1 text-white text-sm">{formData.assetDescription}</p>
          </div>
          {formData.website && <Field label="Website" value={formData.website} />}
        </div>
      </Section>

      {/* Tokenization */}
      <Section title="Tokenization Details" step={2}>
        <div className="flex items-center gap-4 mb-4">
          {logoFile && (
            <img src={logoFile.url} alt="Logo" className="w-12 h-12 rounded-lg object-cover" />
          )}
          <div>
            <p className="text-white font-medium">{formData.tokenName}</p>
            <p className="text-gold-400 text-sm">${formData.tokenSymbol}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Total Supply" value={formData.totalSupply} />
          <Field label="Price Per Token" value={`$${formData.pricePerToken}`} />
          {useCase && <Field label="Use Case" value={useCase.label} />}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-600">
          <span className="text-gray-400 text-sm">Total Valuation:</span>
          <span className="ml-2 text-green-400 font-medium">
            ${(parseFloat(formData.totalSupply?.replace(/,/g, '') || '0') * parseFloat(formData.pricePerToken?.replace(/,/g, '') || '0')).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </Section>

      {/* Documents */}
      <Section title="Documents" step={3}>
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-white">{doc.name}</span>
              <span className="text-gray-500">
                ({DOCUMENT_TYPES.find(t => t.value === doc.type)?.label})
              </span>
            </div>
          ))}
          {documents.length === 0 && (
            <p className="text-gray-500 text-sm">No documents uploaded</p>
          )}
        </div>
      </Section>

      {/* Contact */}
      <Section title="Contact Information" step={3}>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Name" value={formData.contactName} />
          <Field label="Email" value={formData.email} />
          {formData.phone && <Field label="Phone" value={formData.phone} />}
        </div>
      </Section>

      {/* Payment Section */}
      <div className="bg-gradient-to-r from-gold-500/10 to-gold-light-500/10 border border-gold-500/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-gold-400" />
          <h3 className="text-lg font-medium text-white">Tokenization Package</h3>
        </div>

        {/* Package Options */}
        <div className="space-y-3 mb-6">
          {/* Base - Always included */}
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold-500/20 flex items-center justify-center">
                <Coins className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <p className="text-white font-medium">Token Creation</p>
                <p className="text-gray-400 text-xs">ERC-20 Security Token + NFT Certificate</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-semibold">${PRICING.base}</p>
              <p className="text-green-400 text-xs">Included</p>
            </div>
          </div>

          {/* Escrow Option */}
          <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
            includeEscrow 
              ? 'bg-gold-500/10 border-gold-500/50' 
              : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                includeEscrow ? 'bg-gold-500/20' : 'bg-gray-700'
              }`}>
                <Shield className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <p className="text-white font-medium">Escrow Vault</p>
                <p className="text-gray-400 text-xs">Secure fund management & milestone releases</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-white font-semibold">+${PRICING.escrow}</p>
              </div>
              <input
                type="checkbox"
                checked={includeEscrow}
                onChange={(e) => setIncludeEscrow(e.target.checked)}
                disabled={paymentStep !== 'idle' || showStripeForm}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-gold-500 focus:ring-purple-500"
              />
            </div>
          </label>

          {/* Dividend Option */}
          <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
            includeDividend 
              ? 'bg-green-500/10 border-green-500/50' 
              : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                includeDividend ? 'bg-green-500/20' : 'bg-gray-700'
              }`}>
                <PiggyBank className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">Dividend Engine</p>
                <p className="text-gray-400 text-xs">Automated profit distribution to token holders</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-white font-semibold">+${PRICING.dividend}</p>
              </div>
              <input
                type="checkbox"
                checked={includeDividend}
                onChange={(e) => setIncludeDividend(e.target.checked)}
                disabled={paymentStep !== 'idle' || showStripeForm}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
              />
            </div>
          </label>
        </div>

        {/* Payment Method Selection */}
        {!showStripeForm && paymentStep !== 'done' && (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-3">Payment Method</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('crypto')}
                disabled={paymentStep !== 'idle'}
                className={`p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === 'crypto'
                    ? 'border-gold-500 bg-gold-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    paymentMethod === 'crypto' ? 'bg-gold-500/20' : 'bg-gray-700'
                  }`}>
                    <Wallet className="w-5 h-5 text-gold-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">Crypto</p>
                    <p className="text-gray-400 text-xs">USDC or USDT</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('stripe')}
                disabled={paymentStep !== 'idle' || !stripePromise}
                className={`p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === 'stripe'
                    ? 'border-gold-500 bg-gold-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                } ${!stripePromise ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    paymentMethod === 'stripe' ? 'bg-gold-500/20' : 'bg-gray-700'
                  }`}>
                    <Building2 className="w-5 h-5 text-gold-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">Card / Bank</p>
                    <p className="text-gray-400 text-xs">Via Stripe</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Total & Currency Selection */}
        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm">Total Amount</p>
              <p className="text-3xl font-bold text-white">${totalAmount.toLocaleString()}</p>
            </div>
            
            {/* Currency Toggle - Only for crypto */}
            {paymentMethod === 'crypto' && !showStripeForm && paymentStep !== 'done' && (
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setSelectedCurrency('USDC')}
                  disabled={paymentStep !== 'idle'}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    selectedCurrency === 'USDC'
                      ? 'bg-gold-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  USDC
                </button>
                <button
                  onClick={() => setSelectedCurrency('USDT')}
                  disabled={paymentStep !== 'idle'}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    selectedCurrency === 'USDT'
                      ? 'bg-green-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  USDT
                </button>
              </div>
            )}
          </div>

          {/* Balance Display - Only for crypto */}
          {paymentMethod === 'crypto' && !showStripeForm && paymentStep !== 'done' && (
            <>
              {!isConnected ? (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-400 text-sm">Please connect your wallet to pay with crypto.</p>
                </div>
              ) : (
                <div className="flex items-center justify-between mb-4 text-sm">
                  <span className="text-gray-400">Your {selectedCurrency} Balance:</span>
                  <span className={hasEnoughBalance ? 'text-green-400' : 'text-red-400'}>
                    ${userBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    {!hasEnoughBalance && ' (Insufficient)'}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Fee Recipient Loading/Error - Only for crypto */}
          {paymentMethod === 'crypto' && !showStripeForm && isLoadingRecipient && (
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              <span className="text-gray-400 text-sm">Loading payment details...</span>
            </div>
          )}

          {paymentMethod === 'crypto' && !showStripeForm && !isLoadingRecipient && !feeRecipient && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">Payment recipient not configured. Please contact support.</p>
            </div>
          )}

          {/* Payment Error */}
          {paymentError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{paymentError}</p>
            </div>
          )}

          {/* Stripe Payment Form */}
          {showStripeForm && clientSecret && stripePromise && (
            <div className="mb-4">
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripePaymentForm 
                  onSuccess={handleStripeSuccess}
                  onError={handleStripeError}
                  onCancel={handleStripeCancel}
                  amount={totalAmount}
                />
              </Elements>
            </div>
          )}

          {/* Payment Button */}
          {!showStripeForm && (
            <>
              {paymentStep === 'done' ? (
                <div className="flex items-center justify-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <div>
                    <p className="text-green-400 font-medium">Payment Complete!</p>
                    {txHash && (
                      <p className="text-gray-400 text-xs">
                        Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handlePayment}
                  disabled={
                    paymentStep !== 'idle' || 
                    isWritePending || 
                    isConfirming || 
                    (paymentMethod === 'crypto' && (!hasEnoughBalance || isLoadingRecipient || !feeRecipient || !isConnected))
                  }
                  className={`w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                    (paymentMethod === 'stripe') || 
                    (paymentMethod === 'crypto' && hasEnoughBalance && feeRecipient && isConnected)
                      ? 'bg-gradient-to-r from-gold-500 to-gold-light-500 hover:from-gold-600 hover:to-gold-light-600 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isLoadingRecipient && paymentMethod === 'crypto' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading...
                    </>
                  ) : isWritePending || paymentStep === 'paying' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {paymentMethod === 'crypto' ? 'Confirm in Wallet...' : 'Preparing Payment...'}
                    </>
                  ) : isConfirming || paymentStep === 'confirming' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Confirming Transaction...
                    </>
                  ) : paymentMethod === 'crypto' ? (
                    <>
                      <Wallet className="w-5 h-5" />
                      Pay ${totalAmount} {selectedCurrency}
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Pay ${totalAmount} USD
                    </>
                  )}
                </button>
              )}
            </>
          )}

          <p className="text-gray-500 text-xs text-center mt-3">
            {paymentMethod === 'crypto' 
              ? "Payment is processed on-chain. You'll need to approve the transaction in your wallet."
              : "Secure payment powered by Stripe."
            }
          </p>
        </div>
      </div>

      {/* Terms */}
      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
        <p className="text-gray-400 text-sm">
          By submitting this application, you confirm that all provided information is accurate 
          and you have the legal rights to tokenize this asset. The tokenization fee is non-refundable.
        </p>
      </div>
    </div>
  );
}
