'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  CheckCircle, 
  Clock, 
  FileText, 
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface ApplicationStatus {
  id: string;
  name: string;
  status: string;
  submissionCount: number;
  submittedAt: string;
}

function SubmittedContent() {
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const applicationId = searchParams.get('applicationId');

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<ApplicationStatus | null>(null);

  const loadApplication = useCallback(async () => {
    if (!applicationId || !address) return;

    try {
      const response = await fetch(
        `/api/crowdfunding/application?id=${applicationId}&wallet=${address.toLowerCase()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setApplication(data.application);
      }
    } catch (error) {
      console.error('Failed to load application:', error);
    } finally {
      setLoading(false);
    }
  }, [applicationId, address]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle className="w-12 h-12 text-green-400" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">
          Application Submitted!
        </h1>

        <p className="text-gray-400 text-lg mb-8">
          Your crowdfunding project has been submitted for review. 
          Our team will review your application within 2-3 business days.
        </p>

        {/* Status Card */}
        {application && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8 text-left">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">{application.name}</h3>
                <p className="text-gray-500 text-sm">
                  Submitted {new Date(application.submittedAt).toLocaleDateString()}
                  {application.submissionCount > 1 && ` • Submission #${application.submissionCount}`}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 rounded-full">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 text-sm font-medium">Pending Review</span>
              </div>
            </div>
          </div>
        )}

        {/* What's Next */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8 text-left">
          <h3 className="text-lg font-semibold text-white mb-4">What Happens Next?</h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="text-white font-medium">Review Process</h4>
                <p className="text-gray-400 text-sm">
                  Our team reviews your project details, documentation, and milestones.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-gray-400 font-medium flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="text-gray-300 font-medium">Approval & Deployment</h4>
                <p className="text-gray-500 text-sm">
                  Once approved, your project smart contracts will be deployed automatically.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-gray-400 font-medium flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="text-gray-300 font-medium">Go Live</h4>
                <p className="text-gray-500 text-sm">
                  Your project will be live and ready to receive investments.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-300 text-sm text-left">
              You'll receive an email notification when your application status changes. 
              If rejected, you can edit and resubmit without paying the fee again.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard?tab=owner&subtab=crowdfunding"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5" />
          </Link>
          
          <Link
            href="/crowdfunding/submit"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
          >
            Submit Another Project
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SubmittedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    }>
      <SubmittedContent />
    </Suspense>
  );
}
