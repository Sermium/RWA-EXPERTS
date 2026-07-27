'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useKYC, KYCTier, getTierInfo, meetsMinimumTier } from '@/contexts/KYCContext';
import { Link2, Clock, XCircle, Lock, ArrowRight } from 'lucide-react';

interface KYCGateProps {
  children: ReactNode;
  requiredTier?: KYCTier;
  requireApproved?: boolean;
  action?: string; // Description of what the user is trying to do
}

export default function KYCGate({ 
  children, 
  requiredTier = 'Bronze',
  requireApproved = true,
  action = 'access this feature'
}: KYCGateProps) {
  const { isConnected } = useAccount();
  const { kycData, tierInfo } = useKYC();

  // Not connected - show connect prompt
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Link2 className="w-12 h-12 text-ink-faint mb-4" />
        <h2 className="text-2xl font-display font-medium text-ink mb-2">Connect Your Wallet</h2>
        <p className="text-ink-muted text-center mb-6">
          Please connect your wallet to {action}.
        </p>
      </div>
    );
  }

  // Loading KYC status
  if (kycData.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-ink-muted">Checking KYC status...</p>
      </div>
    );
  }

  // KYC not approved
  if (requireApproved && kycData.status !== 'Approved') {
    const isPending = ['Pending', 'AutoVerifying', 'ManualReview'].includes(kycData.status);
    const StatusIcon = isPending ? Clock : kycData.status === 'Rejected' ? XCircle : Lock;

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="max-w-md text-center">
          <StatusIcon className="w-12 h-12 text-gold mx-auto mb-4" />
          <h2 className="text-2xl font-display font-medium text-ink mb-2">
            {isPending ? 'Verification In Progress' :
             kycData.status === 'Rejected' ? 'Verification Failed' :
             'KYC Required'}
          </h2>
          <p className="text-ink-muted mb-6">
            {isPending
              ? `Your KYC verification is being processed. Please wait for approval to ${action}.`
              : kycData.status === 'Rejected'
              ? `Your KYC application was rejected. Please resubmit with correct information to ${action}.`
              : `You need to complete KYC verification to ${action}.`
            }
          </p>
          <Link
            href="/kyc"
            className="inline-block px-6 py-3 bg-gold hover:bg-gold-light text-surface-sunken font-medium rounded-lg transition-colors duration-200"
          >
            {isPending ? 'View Status' : 'Start Verification'}
          </Link>
        </div>
      </div>
    );
  }

  // Check tier requirement
  if (!meetsMinimumTier(kycData.tier, requiredTier)) {
    const requiredTierInfo = getTierInfo(requiredTier);

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <tierInfo.icon className={`w-9 h-9 ${tierInfo.color}`} />
            <ArrowRight className="w-5 h-5 text-ink-faint" />
            <requiredTierInfo.icon className={`w-9 h-9 ${requiredTierInfo.color}`} />
          </div>
          <h2 className="text-2xl font-display font-medium text-ink mb-2">
            {requiredTierInfo.label} Tier Required
          </h2>
          <p className="text-ink-muted mb-4">
            You need <span className={requiredTierInfo.color}>{requiredTierInfo.label}</span> tier
            or higher to {action}.
          </p>
          <div className="bg-surface-raised border border-border rounded-lg p-4 mb-6">
            <div className="text-sm text-ink-faint mb-2">Your Current Tier</div>
            <div className="flex items-center justify-center gap-2">
              <tierInfo.icon className={`w-6 h-6 ${tierInfo.color}`} />
              <span className={`text-xl font-semibold ${tierInfo.color}`}>{tierInfo.label}</span>
            </div>
            <div className="text-sm text-ink-muted mt-1">
              Limit: {tierInfo.limit}
            </div>
          </div>
          <Link
            href="/kyc"
            className="inline-block px-6 py-3 bg-gold hover:bg-gold-light text-surface-sunken font-medium rounded-lg transition-colors duration-200"
          >
            Upgrade to {requiredTierInfo.label}
          </Link>
        </div>
      </div>
    );
  }

  // All checks passed - render children
  return <>{children}</>;
}
