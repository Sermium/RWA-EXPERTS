'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId');

  useEffect(() => {
    // Confirm payment on backend
    const confirmPayment = async () => {
      if (!applicationId) return;

      try {
        await fetch('/api/crowdfunding/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationId }),
        });
      } catch (error) {
        console.error('Failed to confirm payment:', error);
      }
    };

    confirmPayment();

    // Redirect after 3 seconds
    const timer = setTimeout(() => {
      router.push(`/crowdfunding/submitted?applicationId=${applicationId}`);
    }, 3000);

    return () => clearTimeout(timer);
  }, [applicationId, router]);

  return (
    <div className="min-h-screen bg-surface-sunken flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>
        
        <h1 className="text-3xl font-bold text-ink mb-4">Payment Successful!</h1>
        
        <p className="text-ink-muted mb-8">
          Your $500 submission fee has been received. Your crowdfunding application 
          has been submitted for review. We'll notify you once it's been reviewed.
        </p>

        <div className="space-y-4">
          <Link
            href={`/crowdfunding/submitted?applicationId=${applicationId}`}
            className="block w-full px-6 py-3 bg-gold-600 hover:bg-gold-700 rounded-lg text-ink font-medium"
          >
            View Application Status
          </Link>
          
          <Link
            href="/dashboard"
            className="block w-full px-6 py-3 bg-surface-overlay hover:bg-border-strong rounded-lg text-ink"
          >
            Go to Dashboard
          </Link>
        </div>

        <p className="text-ink-faint text-sm mt-6">
          Redirecting automatically...
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-sunken flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-gold-400 animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
