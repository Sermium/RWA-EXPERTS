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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">Payment Successful!</h1>
        
        <p className="text-gray-400 mb-8">
          Your $500 submission fee has been received. Your crowdfunding application 
          has been submitted for review. We'll notify you once it's been reviewed.
        </p>

        <div className="space-y-4">
          <Link
            href={`/crowdfunding/submitted?applicationId=${applicationId}`}
            className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
          >
            View Application Status
          </Link>
          
          <Link
            href="/dashboard"
            className="block w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
          >
            Go to Dashboard
          </Link>
        </div>

        <p className="text-gray-500 text-sm mt-6">
          Redirecting automatically...
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
