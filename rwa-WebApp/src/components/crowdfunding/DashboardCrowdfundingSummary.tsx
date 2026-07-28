'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Loader2,
  ChevronRight,
  RefreshCw,
  Rocket,
  Calendar,
  Target,
  Coins,
  X,
} from 'lucide-react';
import { StepDeploy } from './create/StepDeploy';

// ============================================================================
// TYPES
// ============================================================================

interface CrowdfundingApplication {
  id: string;
  project_name: string;
  description: string;
  category: string;
  status: string;
  funding_goal: number;
  token_name: string;
  token_symbol: string;
  token_price: number;
  total_supply: number;
  investor_share_percentage: number;
  projected_roi: number;
  roi_timeline_months: number;
  revenue_model: string;
  milestones: any[];
  logo_url: string;
  banner_url: string;
  pitch_deck_url: string;
  legal_documents: any[];
  images: string[];
  video_url: string;
  company_name: string;
  jurisdiction: string;
  website: string;
  wallet_address: string;
  chain_id: number;
  platform_fee: number;
  local_currency: string;
  exchange_rate: number;
  created_at: string;
  updated_at: string;
  payment_status: string;
  rejection_reason?: string;
  // Activation fields
  activated_at?: string;
  raise_end_date?: string;
  deadline_days?: number;
  escrow_vault_address?: string;
  security_token_address?: string;
  funded_amount?: number;
}

interface Stats {
  total: number;
  draft: number;
  pending_payment: number;
  pending_review: number;
  approved: number;
  active: number;
  funded: number;
  rejected: number;
  totalFundingGoal: number;
  totalRaised: number;
}

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

const statusConfig: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
  description: string;
}> = {
  draft: {
    label: 'Draft',
    color: 'text-ink-muted',
    bgColor: 'bg-ink-faint/20',
    icon: FileText,
    description: 'Continue editing your application',
  },
  pending_payment: {
    label: 'Pending Payment',
    color: 'text-warning',
    bgColor: 'bg-warning/20',
    icon: DollarSign,
    description: 'Complete payment to submit for review',
  },
  pending_review: {
    label: 'Under Review',
    color: 'text-gold-400',
    bgColor: 'bg-gold-500/20',
    icon: Clock,
    description: 'Your application is being reviewed',
  },
  approved: {
    label: 'Approved',
    color: 'text-success',
    bgColor: 'bg-success/20',
    icon: CheckCircle,
    description: 'Ready to activate your fundraise',
  },
  active: {
    label: 'Active',
    color: 'text-success',
    bgColor: 'bg-success/20',
    icon: Rocket,
    description: 'Fundraise is live and accepting investments',
  },
  funded: {
    label: 'Funded',
    color: 'text-gold-400',
    bgColor: 'bg-gold-500/20',
    icon: TrendingUp,
    description: 'Funding goal reached',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-danger',
    bgColor: 'bg-danger/20',
    icon: XCircle,
    description: 'Application was not approved',
  },
  deployed: {
    label: 'Deployed',
    color: 'text-gold',
    bgColor: 'bg-gold/20',
    icon: CheckCircle,
    description: 'Contracts deployed on-chain',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ============================================================================
// APPLICATION CARD COMPONENT
// ============================================================================

interface ApplicationCardProps {
  application: CrowdfundingApplication;
  onActivate: (application: CrowdfundingApplication) => void;
  onRefresh: () => void;
}

function ApplicationCard({ application, onActivate, onRefresh }: ApplicationCardProps) {
  const config = statusConfig[application.status] || statusConfig.draft;
  const StatusIcon = config.icon;

  const fundingProgress = application.funded_amount && application.funding_goal
    ? Math.min(100, (application.funded_amount / application.funding_goal) * 100)
    : 0;

  const daysRemaining = application.raise_end_date
    ? getDaysRemaining(application.raise_end_date)
    : null;

  const renderActionButton = () => {
    switch (application.status) {
      case 'draft':
        return (
          <Link
            href={`/crowdfunding/apply?draft=${application.id}`}
            className="flex-1 text-center py-2.5 px-4 bg-gold-600 hover:bg-gold-700 text-ink rounded-lg text-sm font-medium transition-colors"
          >
            Continue Editing
          </Link>
        );

      case 'pending_payment':
        return (
          <Link
            href={`/crowdfunding/apply?id=${application.id}&step=payment`}
            className="flex-1 text-center py-2.5 px-4 bg-warning hover:bg-warning text-ink rounded-lg text-sm font-medium transition-colors"
          >
            Complete Payment
          </Link>
        );

      case 'pending_review':
        return (
          <div className="flex-1 text-center py-2.5 px-4 bg-surface-overlay text-ink-muted rounded-lg text-sm font-medium cursor-not-allowed">
            Under Review
          </div>
        );

      case 'approved':
        return (
          <button
            onClick={() => onActivate(application)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-success to-success hover:from-success hover:to-success text-ink rounded-lg text-sm font-medium transition-all"
          >
            <Rocket className="w-4 h-4" />
            Activate Raise
          </button>
        );

      case 'active':
        return (
          <div className="flex gap-2 flex-1">
            <Link
              href={`/projects/${application.id}`}
              className="flex-1 text-center py-2.5 px-4 bg-gold-600 hover:bg-gold-700 text-ink rounded-lg text-sm font-medium transition-colors"
            >
              View Project
            </Link>
            <Link
              href={`/projects/${application.id}?tab=investments`}
              className="py-2.5 px-4 bg-surface-overlay hover:bg-border-strong text-ink rounded-lg text-sm font-medium transition-colors"
            >
              Manage
            </Link>
          </div>
        );

      case 'funded':
      case 'deployed':
        return (
          <Link
            href={`/projects/${application.id}`}
            className="flex-1 text-center py-2.5 px-4 bg-gold-600 hover:bg-gold-700 text-ink rounded-lg text-sm font-medium transition-colors"
          >
            View Project
          </Link>
        );

      case 'rejected':
        return (
          <Link
            href={`/crowdfunding/apply?resubmit=${application.id}`}
            className="flex-1 text-center py-2.5 px-4 bg-border-strong hover:bg-ink-faint text-ink rounded-lg text-sm font-medium transition-colors"
          >
            Resubmit Application
          </Link>
        );

      default:
        return (
          <Link
            href={`/projects/${application.id}`}
            className="flex-1 text-center py-2.5 px-4 bg-surface-overlay hover:bg-border-strong text-ink rounded-lg text-sm font-medium transition-colors"
          >
            View Details
          </Link>
        );
    }
  };

  return (
    <div className="bg-surface/50 rounded-xl border border-border/50 overflow-hidden hover:border-border-strong/50 transition-all">
      {/* Header with Logo and Status */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-overlay flex-shrink-0">
            {application.logo_url ? (
              <img
                src={application.logo_url}
                alt={application.project_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gold-600 to-gold-light-600">
                <span className="text-xl font-bold text-ink">
                  {application.project_name?.charAt(0) || '?'}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-ink truncate">{application.project_name}</h3>
                <p className="text-sm text-ink-muted capitalize">{application.category}</p>
              </div>
              
              {/* Status Badge */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {config.label}
              </div>
            </div>

            {/* Description Preview */}
            {application.description && (
              <p className="text-sm text-ink-faint mt-2 line-clamp-2">
                {application.description}
              </p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-surface-overlay/30 rounded-lg p-3">
            <p className="text-xs text-ink-faint">Funding Goal</p>
            <p className="text-sm font-semibold text-ink">{formatCurrency(application.funding_goal)}</p>
          </div>
          <div className="bg-surface-overlay/30 rounded-lg p-3">
            <p className="text-xs text-ink-faint">Token Price</p>
            <p className="text-sm font-semibold text-ink">${application.token_price}</p>
          </div>
          <div className="bg-surface-overlay/30 rounded-lg p-3">
            <p className="text-xs text-ink-faint">Token</p>
            <p className="text-sm font-semibold text-ink">{application.token_symbol}</p>
          </div>
          <div className="bg-surface-overlay/30 rounded-lg p-3">
            <p className="text-xs text-ink-faint">Created</p>
            <p className="text-sm font-semibold text-ink">{formatDate(application.created_at)}</p>
          </div>
        </div>

        {/* Active Project Progress */}
        {application.status === 'active' && (
          <div className="mt-4 p-4 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-success font-medium">Fundraise Progress</span>
              <span className="text-sm text-ink font-semibold">{fundingProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-surface-overlay rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-success to-success rounded-full transition-all"
                style={{ width: `${fundingProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-ink-muted">
                {formatCurrency(application.funded_amount || 0)} raised
              </span>
              {daysRemaining !== null && (
                <span className="text-ink-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {daysRemaining} days left
                </span>
              )}
            </div>
            {application.activated_at && (
              <div className="mt-3 pt-3 border-t border-success/20 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-ink-faint">Started:</span>
                  <span className="text-ink-muted ml-1">{formatDateTime(application.activated_at)}</span>
                </div>
                {application.raise_end_date && (
                  <div>
                    <span className="text-ink-faint">Ends:</span>
                    <span className="text-ink-muted ml-1">{formatDateTime(application.raise_end_date)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Rejection Reason */}
        {application.status === 'rejected' && application.rejection_reason && (
          <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-lg">
            <p className="text-sm text-danger">
              <span className="font-medium">Reason:</span> {application.rejection_reason}
            </p>
          </div>
        )}

        {/* Payment Status for pending_payment */}
        {application.status === 'pending_payment' && (
          <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            <p className="text-sm text-warning">
              Complete payment to submit your application for review
            </p>
          </div>
        )}

        {/* Approved - Ready to Activate */}
        {application.status === 'approved' && (
          <div className="mt-4 p-4 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Rocket className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-success font-medium">Ready to Launch!</p>
                <p className="text-xs text-ink-muted mt-1">
                  Your application has been approved. Click "Activate Raise" to deploy your smart contracts and start accepting investments.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="px-5 pb-5">
        <div className="flex gap-2">
          {renderActionButton()}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardCrowdfundingSummary() {
  const { address, isConnected } = useAccount();
  
  const [applications, setApplications] = useState<CrowdfundingApplication[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    draft: 0,
    pending_payment: 0,
    pending_review: 0,
    approved: 0,
    active: 0,
    funded: 0,
    rejected: 0,
    totalFundingGoal: 0,
    totalRaised: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Activation modal state
  const [activatingApplication, setActivatingApplication] = useState<CrowdfundingApplication | null>(null);
  const [showActivationModal, setShowActivationModal] = useState(false);

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/crowdfunding/applications?wallet=${address}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch applications');
      }

      const apps = data.applications || [];
      setApplications(apps);

      // Calculate stats
      const newStats: Stats = {
        total: apps.length,
        draft: apps.filter((a: CrowdfundingApplication) => a.status === 'draft').length,
        pending_payment: apps.filter((a: CrowdfundingApplication) => a.status === 'pending_payment').length,
        pending_review: apps.filter((a: CrowdfundingApplication) => a.status === 'pending_review').length,
        approved: apps.filter((a: CrowdfundingApplication) => a.status === 'approved').length,
        active: apps.filter((a: CrowdfundingApplication) => a.status === 'active').length,
        funded: apps.filter((a: CrowdfundingApplication) => a.status === 'funded').length,
        rejected: apps.filter((a: CrowdfundingApplication) => a.status === 'rejected').length,
        totalFundingGoal: apps.reduce((sum: number, a: CrowdfundingApplication) => sum + (a.funding_goal || 0), 0),
        totalRaised: apps.reduce((sum: number, a: CrowdfundingApplication) => sum + (a.funded_amount || 0), 0),
      };
      setStats(newStats);

    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchApplications();
    }
  }, [isConnected, address, fetchApplications]);

  // Handle activation
  const handleActivate = (application: CrowdfundingApplication) => {
    setActivatingApplication(application);
    setShowActivationModal(true);
  };

  // Handle activation success
  const handleActivationSuccess = () => {
    setShowActivationModal(false);
    setActivatingApplication(null);
    // Refresh the list
    fetchApplications();
  };

  // Sort applications: approved first, then by date
  const sortedApplications = [...applications].sort((a, b) => {
    const statusPriority: Record<string, number> = {
      approved: 0,
      active: 1,
      pending_review: 2,
      pending_payment: 3,
      draft: 4,
      funded: 5,
      rejected: 6,
    };
    
    const priorityA = statusPriority[a.status] ?? 99;
    const priorityB = statusPriority[b.status] ?? 99;
    
    if (priorityA !== priorityB) return priorityA - priorityB;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (!isConnected) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8 text-center">
        <AlertCircle className="w-12 h-12 text-ink-faint mx-auto mb-3" />
        <p className="text-ink-muted">Connect your wallet to view your crowdfunding applications</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold-500/20 rounded-lg">
              <Coins className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">Crowdfunding Applications</h3>
              <p className="text-sm text-ink-muted">{stats.total} application{stats.total !== 1 ? 's' : ''}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={fetchApplications}
              disabled={isLoading}
              className="p-2 bg-surface-overlay hover:bg-border-strong rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-ink-muted ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/crowdfunding/apply"
              className="flex items-center gap-2 px-4 py-2 bg-gold-600 hover:bg-gold-700 text-ink rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Application
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        {stats.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface/50 rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-gold-400" />
                <span className="text-sm text-ink-muted">Total Goal</span>
              </div>
              <p className="text-xl font-bold text-ink">{formatCurrency(stats.totalFundingGoal)}</p>
            </div>
            <div className="bg-surface/50 rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-sm text-ink-muted">Total Raised</span>
              </div>
              <p className="text-xl font-bold text-ink">{formatCurrency(stats.totalRaised)}</p>
            </div>
            <div className="bg-surface/50 rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Rocket className="w-4 h-4 text-success" />
                <span className="text-sm text-ink-muted">Active Raises</span>
              </div>
              <p className="text-xl font-bold text-ink">{stats.active}</p>
            </div>
            <div className="bg-surface/50 rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-warning" />
                <span className="text-sm text-ink-muted">Ready to Activate</span>
              </div>
              <p className="text-xl font-bold text-ink">{stats.approved}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
            <p className="text-danger">{error}</p>
            <button
              onClick={fetchApplications}
              className="ml-auto px-3 py-1 bg-danger/20 hover:bg-danger/30 text-danger rounded-lg text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-ink-faint animate-spin" />
          </div>
        ) : applications.length === 0 ? (
          /* Empty State */
          <div className="bg-surface/50 rounded-xl border border-border/50 p-12 text-center">
            <FileText className="w-16 h-16 text-ink-faint mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-ink mb-2">No Applications Yet</h3>
            <p className="text-ink-muted mb-6 max-w-md mx-auto">
              Start your crowdfunding journey by creating your first application. 
              Get your project funded by the community.
            </p>
            <Link
              href="/crowdfunding/apply"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold-600 hover:bg-gold-700 text-ink rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Application
            </Link>
          </div>
        ) : (
          /* Applications Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedApplications.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onActivate={handleActivate}
                onRefresh={fetchApplications}
              />
            ))}
          </div>
        )}
      </div>

      {/* Activation Modal */}
      {showActivationModal && activatingApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowActivationModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-surface-sunken rounded-2xl border border-border shadow-2xl">
            {/* Close Button */}
            <button
              onClick={() => setShowActivationModal(false)}
              className="absolute top-4 right-4 p-2 bg-surface hover:bg-surface-overlay rounded-lg transition-colors z-20"
            >
              <X className="w-5 h-5 text-ink-muted" />
            </button>
            
            {/* StepDeploy Component */}
            <StepDeploy
              application={activatingApplication}
              deadlineDays={30}
              onBack={() => setShowActivationModal(false)}
              onClose={() => setShowActivationModal(false)}
              onSuccess={handleActivationSuccess}
            />
          </div>
        </div>
      )}
    </>
  );
}
