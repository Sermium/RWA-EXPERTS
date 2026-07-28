// src/app/crowdfunding/edit/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import {
  ArrowLeft, Save, Send, Loader2, AlertCircle,
  CheckCircle, XCircle, DollarSign, RefreshCw
} from 'lucide-react';

interface Application {
  id: string;
  name: string;
  description: string;
  category: string;
  tokenName: string;
  tokenSymbol: string;
  fundingGoal: number;
  tokenPrice: number;
  deadlineDays: number;
  minInvestment: number;
  maxInvestment: number;
  investorSharePercent: number;
  projectedROI: number;
  roiTimelineMonths: number;
  milestones: any[];
  documents: any;
  images: string[];
  website: string;
  status: string;
  rejectionReason: string;
  submissionCount: number;
  feePaid: boolean;
  feeAmount: number;
}

export default function EditApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const applicationId = params?.id as string;

  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Application>>({});

  // Load application
  useEffect(() => {
    const fetchApplication = async () => {
      if (!applicationId || !address) return;

      try {
        const response = await fetch(
          `/api/crowdfunding/application?id=${applicationId}&wallet=${address}`
        );

        if (!response.ok) {
          throw new Error('Application not found');
        }

        const data = await response.json();

        if (data.application.status !== 'rejected') {
          setError('Only rejected applications can be edited');
          setIsLoading(false);
          return;
        }

        setApplication(data.application);
        setFormData(data.application);
      } catch (err: any) {
        setError(err.message || 'Failed to load application');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplication();
  }, [applicationId, address]);

  const handleSubmit = async () => {
    if (!application || !address) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/crowdfunding/resubmit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: application.id,
          walletAddress: address,
          updatedData: formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resubmit');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard?tab=owner');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to resubmit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-surface-sunken flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
          <p className="text-ink">Please connect your wallet</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-sunken flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="min-h-screen bg-surface-sunken flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <XCircle className="w-12 h-12 text-danger mx-auto mb-4" />
          <p className="text-ink mb-4">{error}</p>
          <Link href="/dashboard?tab=owner" className="text-gold-400 hover:text-gold-300">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface-sunken flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-ink mb-2">Resubmitted Successfully!</h2>
          <p className="text-ink-muted mb-4">
            Your application has been resubmitted for review. No additional fee was charged.
          </p>
          <p className="text-sm text-ink-faint">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-sunken py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard?tab=owner"
            className="text-ink-muted hover:text-ink flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <h1 className="text-3xl font-bold text-ink mb-2">Edit & Resubmit Application</h1>
          <p className="text-ink-muted">Correct the issues and resubmit for review</p>
        </div>

        {/* No Fee Banner */}
        <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-success/15 rounded-lg">
            <DollarSign className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-success font-medium">No Additional Fee Required</p>
            <p className="text-sm text-success/70">
              Your original ${application?.feeAmount || 500} submission fee covers this resubmission.
              (Submission #{(application?.submissionCount || 0) + 1})
            </p>
          </div>
        </div>

        {/* Rejection Reason */}
        {application?.rejectionReason && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-xl">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-danger font-medium mb-1">Rejection Reason:</p>
                <p className="text-danger">{application.rejectionReason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-danger" />
            <p className="text-danger">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-surface rounded-2xl border border-border p-6 space-y-6">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">Project Name *</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:border-gold-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">Description *</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:border-gold-500 resize-none"
            />
          </div>

          {/* Token Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-2">Token Name *</label>
              <input
                type="text"
                value={formData.tokenName || ''}
                onChange={(e) => setFormData({ ...formData, tokenName: e.target.value })}
                className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-2">Token Symbol *</label>
              <input
                type="text"
                value={formData.tokenSymbol || ''}
                onChange={(e) => setFormData({ ...formData, tokenSymbol: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          {/* Funding Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-2">Funding Goal (USD) *</label>
              <input
                type="number"
                value={formData.fundingGoal || ''}
                onChange={(e) => setFormData({ ...formData, fundingGoal: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-2">Token Price (USD) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.tokenPrice || ''}
                onChange={(e) => setFormData({ ...formData, tokenPrice: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          {/* ROI Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-2">Investor Share (%)</label>
              <input
                type="number"
                value={formData.investorSharePercent || ''}
                onChange={(e) => setFormData({ ...formData, investorSharePercent: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-2">Projected ROI (%)</label>
              <input
                type="number"
                value={formData.projectedROI || ''}
                onChange={(e) => setFormData({ ...formData, projectedROI: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-2">ROI Timeline (months)</label>
              <input
                type="number"
                value={formData.roiTimelineMonths || ''}
                onChange={(e) => setFormData({ ...formData, roiTimelineMonths: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">Website</label>
            <input
              type="url"
              value={formData.website || ''}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://"
              className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:border-gold-500"
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="mt-6 flex gap-4">
          <Link
            href="/dashboard?tab=owner"
            className="flex-1 py-4 bg-surface-overlay hover:bg-border-strong text-ink font-semibold rounded-xl transition-colors text-center"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-4 bg-gold-600 hover:bg-gold-700 disabled:bg-border-strong disabled:cursor-not-allowed text-ink font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Resubmitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Resubmit Application
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
