'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  ArrowLeft, 
  CreditCard, 
  Wallet,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Shield,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PLATFORM_FEES } from '@/config/deployments';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Get fee from config
const SUBMISSION_FEE = PLATFORM_FEES.CROWDFUNDING_SUBMISSION_FEE;

interface ApplicationInfo {
  id: string;
  name: string;
  fundingGoal: number;
  status: string;
}

function PaymentForm({ 
  applicationId, 
  onSuccess 
}: { 
  applicationId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/crowdfunding/payment/success?applicationId=${applicationId}`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent?.status === 'succeeded') {
        // Update application status
        await fetch('/api/crowdfunding/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId,
            paymentIntentId: paymentIntent.id,
          }),
        });
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement 
        options={{
          layout: 'tabs',
        }}
      />
      
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg text-white font-medium"
      >
        {isProcessing ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pay ${SUBMISSION_FEE} Submission Fee
          </>
        )}
      </button>
    </form>
  );
}

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const applicationId = searchParams.get('applicationId');

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<ApplicationInfo | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadApplication = useCallback(async () => {
    if (!applicationId || !address) return;

    try {
      setLoading(true);
      
      // Load application info
      const appResponse = await fetch(
        `/api/crowdfunding/application?id=${applicationId}&wallet=${address.toLowerCase()}`
      );
      
      if (!appResponse.ok) {
        throw new Error('Application not found');
      }

      const appData = await appResponse.json();
      
      if (appData.application.status !== 'draft') {
        throw new Error('Payment already completed or application in wrong state');
      }

      setApplication(appData.application);

      // Create payment intent
      const paymentResponse = await fetch('/api/payments/stripe/submission-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          walletAddress: address.toLowerCase(),
        }),
      });

      if (!paymentResponse.ok) {
        throw new Error('Failed to create payment');
      }

      const paymentData = await paymentResponse.json();
      setClientSecret(paymentData.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [applicationId, address]);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }
    if (!applicationId) {
      router.push('/crowdfunding/submit');
      return;
    }
    loadApplication();
  }, [isConnected, applicationId, router, loadApplication]);

  const handlePaymentSuccess = () => {
    setSuccess(true);
    setTimeout(() => {
      router.push(`/crowdfunding/submitted?applicationId=${applicationId}`);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          Loading payment details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/dashboard" className="text-blue-400 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
          <p className="text-gray-400">Your application has been submitted for review.</p>
          <p className="text-gray-500 text-sm mt-2">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Calculate fee breakdown
  const reviewFee = Math.round(SUBMISSION_FEE * 0.8); // 80% for review
  const deploymentFee = SUBMISSION_FEE - reviewFee;   // 20% for deployment

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/crowdfunding/submit`}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Complete Payment</h1>
            <p className="text-gray-400">Pay the submission fee to submit your project</p>
          </div>
        </div>

        {/* Application Summary */}
        {application && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">{application.name}</h3>
                <p className="text-gray-400 text-sm">
                  Funding Goal: ${application.fundingGoal.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Fee Breakdown */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Fee Breakdown</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between text-gray-400">
              <span>Application Review Fee</span>
              <span>${reviewFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Smart Contract Deployment</span>
              <span>${deploymentFee.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-700 pt-3 flex justify-between">
              <span className="text-white font-medium">Total</span>
              <span className="text-white font-bold text-xl">${SUBMISSION_FEE.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Shield className="w-4 h-4" />
              <span>Free resubmission if rejected</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Payment Method</h3>
          
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setPaymentMethod('card')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                paymentMethod === 'card'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              Credit Card
            </button>
            <button
              onClick={() => setPaymentMethod('crypto')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                paymentMethod === 'crypto'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <Wallet className="w-5 h-5" />
              Crypto (USDC)
            </button>
          </div>

          {paymentMethod === 'card' && clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#3b82f6',
                    colorBackground: '#111827',
                    colorText: '#ffffff',
                    colorDanger: '#ef4444',
                    borderRadius: '8px',
                  },
                },
              }}
            >
              <PaymentForm 
                applicationId={applicationId!}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
          )}

          {paymentMethod === 'crypto' && (
            <CryptoPayment 
              applicationId={applicationId!}
              onSuccess={handlePaymentSuccess}
            />
          )}
        </div>

        {/* Security Notice */}
        <div className="text-center text-gray-500 text-sm">
          <p>Payments are processed securely. Your information is encrypted.</p>
        </div>
      </div>
    </div>
  );
}

function CryptoPayment({ 
  applicationId, 
  onSuccess 
}: { 
  applicationId: string;
  onSuccess: () => void;
}) {
  const { address } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentAddress, setPaymentAddress] = useState<string | null>(null);

  useEffect(() => {
    // Get platform payment address
    const fetchPaymentAddress = async () => {
      try {
        const response = await fetch('/api/payments/crypto/submission-fee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId,
            walletAddress: address?.toLowerCase(),
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setPaymentAddress(data.paymentAddress);
        }
      } catch (err) {
        console.error('Failed to get payment address:', err);
      }
    };
    
    fetchPaymentAddress();
  }, [applicationId, address]);

  const handlePayment = async () => {
    if (!address) return;

    setIsProcessing(true);
    setError(null);

    try {
      // This would integrate with wagmi to send USDC
      // For now, show the payment address for manual transfer
      alert(`Please send ${SUBMISSION_FEE} USDC to: ${paymentAddress}\n\nAfter sending, click "Verify Payment" to confirm.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyPayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/crypto/verify-submission-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          walletAddress: address?.toLowerCase(),
        }),
      });

      if (!response.ok) {
        throw new Error('Payment not found or not confirmed');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-900 rounded-lg">
        <p className="text-gray-400 text-sm mb-2">Payment Amount</p>
        <p className="text-2xl font-bold text-white">{SUBMISSION_FEE} USDC</p>
      </div>

      {paymentAddress && (
        <div className="p-4 bg-gray-900 rounded-lg">
          <p className="text-gray-400 text-sm mb-2">Send to Address</p>
          <p className="text-white font-mono text-sm break-all">{paymentAddress}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handlePayment}
          disabled={isProcessing || !paymentAddress}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg text-white font-medium"
        >
          <Wallet className="w-5 h-5" />
          Pay with Wallet
        </button>
        <button
          onClick={verifyPayment}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed rounded-lg text-white font-medium"
        >
          {isProcessing ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          Verify Payment
        </button>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}
