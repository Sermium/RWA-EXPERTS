'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import {
  Coins, Clock, CheckCircle, XCircle, AlertCircle,
  RefreshCw, ChevronRight, Loader2, DollarSign, Target,
  Plus, FileText, Rocket, Edit3, Eye, CreditCard
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface CrowdfundingApplication {
  id: string;
  wallet_address: string;
  chain_id: number;
  project_name: string;
  category: string;
  description: string;
  funding_goal: number;
  local_currency: string;
  token_name: string;
  token_symbol: string;
  total_supply: number;
  token_price: number;
  investor_share_percentage: number;
  projected_roi: number;
  roi_timeline_months: number;
  status: string;
  payment_status: string;
  rejection_reason?: string;
  reviewed_at?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  draft: number;
  pendingPayment: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  deployed: number;
  totalFundingGoal: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = {
  draft: { 
    label: 'Draft', 
    color: 'text-gray-400', 
    bgColor: 'bg-gray-500/20',
    icon: FileText,
    description: 'Not yet submitted'
  },
  pending_payment: { 
    label: 'Awaiting Payment', 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-500/20',
    icon: CreditCard,
    description: 'Pay submission fee to continue'
  },
  pending_review: { 
    label: 'Under Review', 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/20',
    icon: Clock,
    description: 'Being reviewed by admin'
  },
  approved: { 
    label: 'Approved', 
    color: 'text-green-400', 
    bgColor: 'bg-green-500/20',
    icon: CheckCircle,
    description: 'Ready for deployment'
  },
  rejected: { 
    label: 'Rejected', 
    color: 'text-red-400', 
    bgColor: 'bg-red-500/20',
    icon: XCircle,
    description: 'Needs corrections'
  },
  deployed: { 
    label: 'Live', 
    color: 'text-purple-400', 
    bgColor: 'bg-purple-500/20',
    icon: Rocket,
    description: 'Active on blockchain'
  },
};

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// ============================================================================
// APPLICATION CARD COMPONENT
// ============================================================================

interface ApplicationCardProps {
  application: CrowdfundingApplication;
}

const ApplicationCard = ({ application }: ApplicationCardProps) => {
  const config = STATUS_CONFIG[application.status] || STATUS_CONFIG.draft;
  const StatusIcon = config.icon;
  
  const getActionButton = () => {
    switch (application.status) {
      case 'draft':
        return (
          <Link
            href={`/create?edit=${application.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Continue Editing
          </Link>
        );
      case 'pending_payment':
        return (
          <Link
            href={`/create?edit=${application.id}&step=payment`}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-medium transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Complete Payment
          </Link>
        );
      case 'rejected':
        return (
          <Link
            href={`/create?edit=${application.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit & Resubmit
          </Link>
        );
      case 'pending_review':
        return (
          <Link
            href={`/project/application/${application.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Eye className="w-4 h-4" />
            View Application
          </Link>
        );
      case 'approved':
        return (
          <Link
            href={`/project/application/${application.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Eye className="w-4 h-4" />
            View Details
          </Link>
        );
      case 'deployed':
        return (
          <Link
            href={`/projects/${application.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Eye className="w-4 h-4" />
            View Project
          </Link>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50 hover:border-gray-600/50 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {application.logo_url ? (
            <img 
              src={application.logo_url} 
              alt={application.project_name}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
              <Coins className="w-6 h-6 text-gray-500" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white truncate">{application.project_name}</h3>
            <p className="text-sm text-gray-400">{application.token_symbol} · {application.category}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {config.label}
        </div>
      </div>

      {/* Rejection Reason */}
      {application.status === 'rejected' && application.rejection_reason && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400 mb-1">Rejection Reason:</p>
              <p className="text-sm text-red-300/80">{application.rejection_reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
            <Target className="w-3 h-3" />
            Funding Goal
          </div>
          <p className="text-sm font-medium text-white">{formatCurrency(application.funding_goal)}</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
            <DollarSign className="w-3 h-3" />
            Token Price
          </div>
          <p className="text-sm font-medium text-white">${application.token_price?.toFixed(4) || '0.0000'}</p>
        </div>
      </div>

      {/* Description Preview */}
      {application.description && (
        <p className="text-sm text-gray-400 mb-4 line-clamp-2">{application.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span>Created {formatDate(application.created_at)}</span>
        {application.payment_status === 'paid' && (
          <span className="flex items-center gap-1 text-green-400">
            <CheckCircle className="w-3 h-3" />
            Fee Paid
          </span>
        )}
      </div>

      {/* Action Button */}
      <div className="flex gap-2">
        {getActionButton()}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardCrowdfundingSummary() {
  const { address } = useAccount();
  
  const [applications, setApplications] = useState<CrowdfundingApplication[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    draft: 0,
    pendingPayment: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    deployed: 0,
    totalFundingGoal: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchApplications = useCallback(async (showLoading = true) => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/crowdfunding/applications?wallet=${address}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      const apps: CrowdfundingApplication[] = data.applications || [];

      // Sort: rejected first (needs attention), then pending_payment, pending_review, etc.
      const statusPriority: Record<string, number> = {
        rejected: 0,
        pending_payment: 1,
        draft: 2,
        pending_review: 3,
        approved: 4,
        deployed: 5,
      };
      
      apps.sort((a, b) => {
        const priorityA = statusPriority[a.status] ?? 99;
        const priorityB = statusPriority[b.status] ?? 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        // Same priority: sort by updated_at descending
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      setApplications(apps);

      // Calculate stats
      setStats({
        total: apps.length,
        draft: apps.filter(a => a.status === 'draft').length,
        pendingPayment: apps.filter(a => a.status === 'pending_payment').length,
        pendingReview: apps.filter(a => a.status === 'pending_review').length,
        approved: apps.filter(a => a.status === 'approved').length,
        rejected: apps.filter(a => a.status === 'rejected').length,
        deployed: apps.filter(a => a.status === 'deployed').length,
        totalFundingGoal: apps.reduce((sum, a) => sum + (a.funding_goal || 0), 0),
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching crowdfunding applications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          <span className="text-gray-400">Loading your applications...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => fetchApplications()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <FileText className="w-3.5 h-3.5" />
            Total
          </div>
          <div className="text-xl font-bold text-white">{stats.total}</div>
        </div>
        
        {stats.rejected > 0 && (
          <div className="bg-gray-800 rounded-xl p-4 border border-red-500/30">
            <div className="flex items-center gap-2 text-red-400 text-xs mb-1">
              <XCircle className="w-3.5 h-3.5" />
              Rejected
            </div>
            <div className="text-xl font-bold text-red-400">{stats.rejected}</div>
          </div>
        )}
        
        {stats.pendingPayment > 0 && (
          <div className="bg-gray-800 rounded-xl p-4 border border-yellow-500/30">
            <div className="flex items-center gap-2 text-yellow-400 text-xs mb-1">
              <CreditCard className="w-3.5 h-3.5" />
              Awaiting Payment
            </div>
            <div className="text-xl font-bold text-yellow-400">{stats.pendingPayment}</div>
          </div>
        )}
        
        <div className="bg-gray-800 rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center gap-2 text-blue-400 text-xs mb-1">
            <Clock className="w-3.5 h-3.5" />
            Under Review
          </div>
          <div className="text-xl font-bold text-blue-400">{stats.pendingReview}</div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center gap-2 text-green-400 text-xs mb-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Approved
          </div>
          <div className="text-xl font-bold text-green-400">{stats.approved}</div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center gap-2 text-purple-400 text-xs mb-1">
            <Rocket className="w-3.5 h-3.5" />
            Live
          </div>
          <div className="text-xl font-bold text-purple-400">{stats.deployed}</div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <Target className="w-3.5 h-3.5" />
            Total Goal
          </div>
          <div className="text-xl font-bold text-white">{formatCurrency(stats.totalFundingGoal)}</div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Coins className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Crowdfunding Applications</h3>
              <p className="text-sm text-gray-400">
                {applications.length} application{applications.length !== 1 ? 's' : ''}
                {lastUpdated && (
                  <span className="ml-2 text-gray-500">
                    · Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchApplications(false)}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <Link 
              href="/create" 
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Link>
          </div>
        </div>

        {/* Content */}
        {applications.length === 0 ? (
          <div className="p-12 text-center">
            <Coins className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-2">No crowdfunding applications yet</p>
            <p className="text-sm text-gray-500 mb-4">Create your first project to get started</p>
            <Link 
              href="/create" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Create Your First Project <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
