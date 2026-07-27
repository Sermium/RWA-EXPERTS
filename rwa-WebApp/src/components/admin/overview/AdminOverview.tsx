// src/app/admin/components/AdminOverview.tsx
'use client';

import { useState, useEffect } from 'react';
import { Project, AdminTab, KYCStats, TokenizationStats, TradeStats, DisputeStats, STATUS_COLORS, STATUS_NAMES } from '@/app/admin/constants';
import { formatUSD } from '@/app/admin/helpers';
import {
  FolderKanban,
  DollarSign,
  UserCheck,
  Coins,
  FileCode,
  Settings,
  ArrowRight,
  Clock,
  TrendingUp,
  CheckCircle2,
  Handshake,
  AlertTriangle,
  Scale,
  ShieldAlert,
  Activity,
  Globe,
  Users,
  Banknote,
  Receipt,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface FeeStats {
  total_collected: number;
  crowdfunding_fees: number;
  tokenization_fees: number;
  trading_fees: number;
  dividend_fees: number;
  kyc_fees: number;
  withdrawal_fees: number;
  this_month: number;
  last_month: number;
  this_year: number;
}

interface AdminOverviewProps {
  projects: Project[];
  kycStats: KYCStats;
  tokenizationStats?: TokenizationStats;
  tradeStats?: TradeStats;
  disputeStats?: DisputeStats;
  setActiveTab: (tab: AdminTab) => void;
  chainName: string;
  explorerUrl: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AdminOverview({
  projects,
  kycStats,
  tokenizationStats,
  tradeStats,
  disputeStats,
  setActiveTab,
}: AdminOverviewProps) {
  const [feeStats, setFeeStats] = useState<FeeStats | null>(null);
  const [loadingFees, setLoadingFees] = useState(true);

  // Fetch fee stats
  useEffect(() => {
    const fetchFeeStats = async () => {
      try {
        const response = await fetch('/api/admin/settings/fee/stats');
        const data = await response.json();
        if (data.success && data.stats) {
          setFeeStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch fee stats:', error);
      } finally {
        setLoadingFees(false);
      }
    };

    fetchFeeStats();
  }, []);
  
  useEffect(() => {
    const fetchFeeStats = async () => {
      try {
        const response = await fetch('/api/admin/settings/fee/stats');
        const data = await response.json();
        
        // API returns stats directly at root level
        if (data.total_collected !== undefined) {
          setFeeStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch fee stats:', error);
      } finally {
        setLoadingFees(false);
      }
    };

    fetchFeeStats();
  }, []);

  // Safe defaults
  const safeProjects = projects || [];
  const safeKycStats = kycStats || { total: 0, pending: 0, approved: 0, rejected: 0 };

  // Calculate project stats
  const activeProjects = safeProjects.filter((p) => p.status === 2).length;
  const fundedProjects = safeProjects.filter((p) => p.status >= 3 && p.status <= 5).length;
  const totalRaised = safeProjects.reduce((sum, p) => sum + (p.totalRaised || 0n), 0n);

  // Calculate urgent items
  const urgentItems =
    (safeKycStats.pending || 0) +
    (tokenizationStats?.pending || 0) +
    (disputeStats?.pending || 0) +
    (disputeStats?.inArbitration || 0);

  // Calculate month-over-month change
  const monthChange =
    feeStats && feeStats.last_month > 0
      ? (((feeStats.this_month - feeStats.last_month) / feeStats.last_month) * 100).toFixed(1)
      : '0';
  const isPositiveChange = parseFloat(monthChange) >= 0;

  // Format currency helper
  const formatCurrency = (amount: number): string => {
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(2)}M`;
    }
    if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink">Dashboard Overview</h2>
        {urgentItems > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-danger/10 border border-danger/30 rounded-lg">
            <ShieldAlert className="w-4 h-4 text-danger" />
            <span className="text-danger text-sm font-medium">{urgentItems} items need attention</span>
          </div>
        )}
      </div>

      {/* Fee Revenue Section */}
      <div className="bg-gradient-to-r from-success/10 via-emerald-500/10 to-teal-500/10 border border-success/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/20 rounded-lg">
              <PiggyBank className="w-6 h-6 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">Platform Revenue</h3>
              <p className="text-ink-muted text-sm">Fees collected from all services</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="text-success hover:text-success text-sm flex items-center gap-1"
          >
            Manage Fees <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loadingFees ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-success border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Main Revenue Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-surface/50 rounded-xl p-4">
                <p className="text-ink-muted text-sm">Total Collected</p>
                <p className="text-3xl font-bold text-success">
                  {formatCurrency(feeStats?.total_collected || 0)}
                </p>
                <p className="text-ink-faint text-xs mt-1">All time</p>
              </div>

              <div className="bg-surface/50 rounded-xl p-4">
                <p className="text-ink-muted text-sm">This Month</p>
                <p className="text-3xl font-bold text-ink">
                  {formatCurrency(feeStats?.this_month || 0)}
                </p>
                <div
                  className={`flex items-center gap-1 mt-1 ${
                    isPositiveChange ? 'text-success' : 'text-danger'
                  }`}
                >
                  {isPositiveChange ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  <span className="text-xs">{monthChange}% vs last month</span>
                </div>
              </div>

              <div className="bg-surface/50 rounded-xl p-4">
                <p className="text-ink-muted text-sm">Last Month</p>
                <p className="text-3xl font-bold text-ink-muted">
                  {formatCurrency(feeStats?.last_month || 0)}
                </p>
                <p className="text-ink-faint text-xs mt-1">Previous period</p>
              </div>

              <div className="bg-surface/50 rounded-xl p-4">
                <p className="text-ink-muted text-sm">This Year</p>
                <p className="text-3xl font-bold text-success">
                  {formatCurrency(feeStats?.this_year || 0)}
                </p>
                <p className="text-ink-faint text-xs mt-1">YTD revenue</p>
              </div>
            </div>

            {/* Fee Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-surface/30 rounded-lg p-3 text-center">
                <Receipt className="w-5 h-5 text-gold-400 mx-auto mb-1" />
                <p className="text-ink font-semibold">
                  {formatCurrency(feeStats?.crowdfunding_fees || 0)}
                </p>
                <p className="text-ink-faint text-xs">Crowdfunding</p>
              </div>
              <div className="bg-surface/30 rounded-lg p-3 text-center">
                <Coins className="w-5 h-5 text-gold-400 mx-auto mb-1" />
                <p className="text-ink font-semibold">
                  {formatCurrency(feeStats?.tokenization_fees || 0)}
                </p>
                <p className="text-ink-faint text-xs">Tokenization</p>
              </div>
              <div className="bg-surface/30 rounded-lg p-3 text-center">
                <Handshake className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                <p className="text-ink font-semibold">
                  {formatCurrency(feeStats?.trading_fees || 0)}
                </p>
                <p className="text-ink-faint text-xs">Trading</p>
              </div>
              <div className="bg-surface/30 rounded-lg p-3 text-center">
                <Banknote className="w-5 h-5 text-warning mx-auto mb-1" />
                <p className="text-ink font-semibold">
                  {formatCurrency(feeStats?.dividend_fees || 0)}
                </p>
                <p className="text-ink-faint text-xs">Dividends</p>
              </div>
              <div className="bg-surface/30 rounded-lg p-3 text-center">
                <UserCheck className="w-5 h-5 text-warning mx-auto mb-1" />
                <p className="text-ink font-semibold">
                  {formatCurrency(feeStats?.kyc_fees || 0)}
                </p>
                <p className="text-ink-faint text-xs">KYC</p>
              </div>
              <div className="bg-surface/30 rounded-lg p-3 text-center">
                <DollarSign className="w-5 h-5 text-danger mx-auto mb-1" />
                <p className="text-ink font-semibold">
                  {formatCurrency(feeStats?.withdrawal_fees || 0)}
                </p>
                <p className="text-ink-faint text-xs">Withdrawals</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-gold-500/50 transition-colors"
          onClick={() => setActiveTab('projects')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gold-500/20 rounded-lg">
              <FolderKanban className="w-5 h-5 text-gold-400" />
            </div>
          </div>
          <p className="text-ink-muted text-sm">Total Projects</p>
          <p className="text-3xl font-bold text-ink">{safeProjects.length}</p>
          <p className="text-sm text-success mt-1">{activeProjects} active</p>
        </div>

        <div
          className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-success/50 transition-colors"
          onClick={() => setActiveTab('projects')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-success/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-success" />
            </div>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <p className="text-ink-muted text-sm">Total Raised</p>
          <p className="text-3xl font-bold text-ink">{formatUSD(totalRaised)}</p>
          <p className="text-sm text-gold-400 mt-1">{fundedProjects} funded projects</p>
        </div>

        <div
          className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-warning/50 transition-colors"
          onClick={() => setActiveTab('kyc')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-warning/20 rounded-lg">
              <UserCheck className="w-5 h-5 text-warning" />
            </div>
            {safeKycStats.pending > 0 && (
              <span className="px-2 py-0.5 bg-warning/20 text-warning text-xs rounded-full animate-pulse">
                {safeKycStats.pending} pending
              </span>
            )}
          </div>
          <p className="text-ink-muted text-sm">KYC Applications</p>
          <p className="text-3xl font-bold text-ink">
            {safeKycStats.total || safeKycStats.pending + safeKycStats.approved + safeKycStats.rejected}
          </p>
          <p className="text-sm text-warning mt-1">{safeKycStats.pending} awaiting review</p>
        </div>

        <div
          className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-gold-500/50 transition-colors"
          onClick={() => setActiveTab('tokenization')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gold-500/20 rounded-lg">
              <Coins className="w-5 h-5 text-gold-400" />
            </div>
            {tokenizationStats && tokenizationStats.pending > 0 && (
              <span className="px-2 py-0.5 bg-gold-500/20 text-gold-400 text-xs rounded-full animate-pulse">
                {tokenizationStats.pending} pending
              </span>
            )}
          </div>
          <p className="text-ink-muted text-sm">Tokenization Requests</p>
          <p className="text-3xl font-bold text-ink">{tokenizationStats?.total || 0}</p>
          <p className="text-sm text-success mt-1">{tokenizationStats?.completed || 0} completed</p>
        </div>
      </div>

      {/* Trade & Dispute Stats */}
      {(tradeStats || disputeStats) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-cyan-500/50 transition-colors"
            onClick={() => setActiveTab('trade')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Handshake className="w-5 h-5 text-cyan-400" />
              </div>
              {tradeStats && tradeStats.activeDeals > 0 && (
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                  {tradeStats.activeDeals} active
                </span>
              )}
            </div>
            <p className="text-ink-muted text-sm">Trade Deals</p>
            <p className="text-3xl font-bold text-ink">{tradeStats?.totalDeals || 0}</p>
            <p className="text-sm text-success mt-1">{tradeStats?.completedDeals || 0} completed</p>
          </div>

          <div
            className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-success/50 transition-colors"
            onClick={() => setActiveTab('trade')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-success/20 rounded-lg">
                <Banknote className="w-5 h-5 text-success" />
              </div>
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <p className="text-ink-muted text-sm">Trade Volume</p>
            <p className="text-3xl font-bold text-ink">
              ${tradeStats ? (tradeStats.totalVolume / 1000000).toFixed(1) : '0'}M
            </p>
            <p className="text-sm text-success mt-1">
              ${tradeStats ? (tradeStats.inEscrow / 1000).toFixed(0) : '0'}K in escrow
            </p>
          </div>

          <div
            className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-warning/50 transition-colors"
            onClick={() => setActiveTab('disputes')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-warning/20 rounded-lg">
                <Scale className="w-5 h-5 text-warning" />
              </div>
              {disputeStats && disputeStats.pending + disputeStats.inArbitration > 0 && (
                <span className="px-2 py-0.5 bg-warning/20 text-warning text-xs rounded-full animate-pulse">
                  {disputeStats.pending + disputeStats.inArbitration} active
                </span>
              )}
            </div>
            <p className="text-ink-muted text-sm">Disputes</p>
            <p className="text-3xl font-bold text-ink">{disputeStats?.total || 0}</p>
            <p className="text-sm text-warning mt-1">{disputeStats?.pending || 0} pending review</p>
          </div>

          <div
            className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-danger/50 transition-colors"
            onClick={() => setActiveTab('disputes')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-danger/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-danger" />
              </div>
            </div>
            <p className="text-ink-muted text-sm">Value at Risk</p>
            <p className="text-3xl font-bold text-ink">
              ${disputeStats ? (disputeStats.valueAtRisk / 1000).toFixed(0) : '0'}K
            </p>
            <p className="text-sm text-danger mt-1">{disputeStats?.inArbitration || 0} in arbitration</p>
          </div>
        </div>
      )}

      {/* Quick Action Alerts */}
      {(safeKycStats.pending > 0 ||
        (tokenizationStats && tokenizationStats.pending > 0) ||
        (disputeStats && disputeStats.pending > 0) ||
        (disputeStats && disputeStats.inArbitration > 0)) && (
        <div className="grid md:grid-cols-2 gap-4">
          {safeKycStats.pending > 0 && (
            <button
              onClick={() => setActiveTab('kyc')}
              className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-left hover:bg-warning/20 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/20 rounded-lg">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-warning font-semibold">{safeKycStats.pending} Pending KYC Reviews</p>
                  <p className="text-ink-muted text-sm">Applications awaiting your approval</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-warning group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          {tokenizationStats && tokenizationStats.pending > 0 && (
            <button
              onClick={() => setActiveTab('tokenization')}
              className="bg-gold-500/10 border border-gold-500/30 rounded-xl p-4 text-left hover:bg-gold-500/20 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-500/20 rounded-lg">
                  <Coins className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <p className="text-gold-400 font-semibold">
                    {tokenizationStats.pending} Pending Tokenization
                  </p>
                  <p className="text-ink-muted text-sm">Asset tokenization requests to review</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gold-400 group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          {disputeStats && disputeStats.pending > 0 && (
            <button
              onClick={() => setActiveTab('disputes')}
              className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-left hover:bg-warning/20 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/20 rounded-lg">
                  <Scale className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-warning font-semibold">
                    {disputeStats.pending} Disputes Awaiting Review
                  </p>
                  <p className="text-ink-muted text-sm">New disputes requiring attention</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-warning group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          {disputeStats && disputeStats.inArbitration > 0 && (
            <button
              onClick={() => setActiveTab('disputes')}
              className="bg-danger/10 border border-danger/30 rounded-xl p-4 text-left hover:bg-danger/20 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-danger/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-danger" />
                </div>
                <div>
                  <p className="text-danger font-semibold">
                    {disputeStats.inArbitration} Active Arbitrations
                  </p>
                  <p className="text-ink-muted text-sm">
                    ${(disputeStats.valueAtRisk / 1000).toFixed(0)}K value at risk
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-danger group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-border-strong transition-colors group"
          onClick={() => setActiveTab('trade')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Handshake className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-ink">Trade Platform</h3>
          </div>
          <p className="text-ink-muted text-sm">Manage international trade deals, escrow, and payments.</p>
          <p className="text-cyan-400 text-sm mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">
            Manage <ArrowRight className="w-4 h-4" />
          </p>
        </div>

        <div
          className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-border-strong transition-colors group"
          onClick={() => setActiveTab('disputes')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-warning/20 rounded-lg">
              <Scale className="w-5 h-5 text-warning" />
            </div>
            <h3 className="text-lg font-semibold text-ink">Disputes</h3>
          </div>
          <p className="text-ink-muted text-sm">Review and resolve trade disputes and arbitration cases.</p>
          <p className="text-warning text-sm mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">
            Review <ArrowRight className="w-4 h-4" />
          </p>
        </div>

        <div
          className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-border-strong transition-colors group"
          onClick={() => setActiveTab('tokenization')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gold-500/20 rounded-lg">
              <Coins className="w-5 h-5 text-gold-400" />
            </div>
            <h3 className="text-lg font-semibold text-ink">Tokenization</h3>
          </div>
          <p className="text-ink-muted text-sm">Review asset tokenization applications and manage deployments.</p>
          <p className="text-gold-400 text-sm mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">
            Manage <ArrowRight className="w-4 h-4" />
          </p>
        </div>

        <div
          className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-border-strong transition-colors group"
          onClick={() => setActiveTab('contracts')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gold-500/20 rounded-lg">
              <FileCode className="w-5 h-5 text-gold-400" />
            </div>
            <h3 className="text-lg font-semibold text-ink">Contracts</h3>
          </div>
          <p className="text-ink-muted text-sm">View deployed contract addresses and configurations.</p>
          <p className="text-gold-400 text-sm mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">
            View <ArrowRight className="w-4 h-4" />
          </p>
        </div>

        <div
          className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-border-strong transition-colors group"
          onClick={() => setActiveTab('kyc')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-warning/20 rounded-lg">
              <UserCheck className="w-5 h-5 text-warning" />
            </div>
            <h3 className="text-lg font-semibold text-ink">KYC Management</h3>
          </div>
          <p className="text-ink-muted text-sm">Review and approve KYC submissions from investors.</p>
          <p className="text-warning text-sm mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">
            Manage <ArrowRight className="w-4 h-4" />
          </p>
        </div>

        <div
          className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-border-strong transition-colors group"
          onClick={() => setActiveTab('offchain')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-success/20 rounded-lg">
              <Globe className="w-5 h-5 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-ink">Off-Chain Payments</h3>
          </div>
          <p className="text-ink-muted text-sm">Process bank transfers and fiat payment verifications.</p>
          <p className="text-success text-sm mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">
            Process <ArrowRight className="w-4 h-4" />
          </p>
        </div>

        <div
          className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-border-strong transition-colors group"
          onClick={() => setActiveTab('users')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-ink">Users</h3>
          </div>
          <p className="text-ink-muted text-sm">Manage user accounts and admin permissions.</p>
          <p className="text-indigo-400 text-sm mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">
            Manage <ArrowRight className="w-4 h-4" />
          </p>
        </div>

        <div
          className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-border-strong transition-colors group"
          onClick={() => setActiveTab('settings')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-surface-overlay rounded-lg">
              <Settings className="w-5 h-5 text-ink-muted" />
            </div>
            <h3 className="text-lg font-semibold text-ink">Settings</h3>
          </div>
          <p className="text-ink-muted text-sm">Configure fees, recipients, and platform parameters.</p>
          <p className="text-ink-muted text-sm mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">
            Configure <ArrowRight className="w-4 h-4" />
          </p>
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-ink">Recent Launchpad Projects</h3>
            <button
              onClick={() => setActiveTab('projects')}
              className="text-gold-400 hover:text-gold-300 text-sm flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {safeProjects.length === 0 ? (
            <div className="text-center py-8">
              <FolderKanban className="w-10 h-10 text-ink-faint mx-auto mb-2" />
              <p className="text-ink-faint">No projects yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {safeProjects.slice(0, 4).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 bg-surface-overlay/50 rounded-lg hover:bg-surface-overlay transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-ink font-medium truncate">
                      {project.name || `Project #${project.id}`}
                    </p>
                    <p className="text-ink-muted text-sm">{formatUSD(project.totalRaised)} raised</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium text-ink ${
                      STATUS_COLORS[project.status]
                    }`}
                  >
                    {STATUS_NAMES[project.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trade Summary */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-ink">Trade Summary</h3>
            <button
              onClick={() => setActiveTab('trade')}
              className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {!tradeStats || tradeStats.totalDeals === 0 ? (
            <div className="text-center py-8">
              <Handshake className="w-10 h-10 text-ink-faint mx-auto mb-2" />
              <p className="text-ink-faint">No trade deals yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-overlay/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-cyan-400">{tradeStats.activeDeals}</p>
                  <p className="text-ink-muted text-sm">Active</p>
                </div>
                <div className="bg-surface-overlay/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-success">{tradeStats.completedDeals}</p>
                  <p className="text-ink-muted text-sm">Completed</p>
                </div>
                <div className="bg-surface-overlay/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-warning">{tradeStats.disputedDeals || 0}</p>
                  <p className="text-ink-muted text-sm">Disputed</p>
                </div>
                <div className="bg-surface-overlay/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-ink">{tradeStats.totalDeals}</p>
                  <p className="text-ink-muted text-sm">Total</p>
                </div>
              </div>

              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted text-sm">In Escrow</span>
                  <span className="text-cyan-400 font-semibold">
                    ${(tradeStats.inEscrow / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tokenization Summary */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-ink">Tokenization Summary</h3>
            <button
              onClick={() => setActiveTab('tokenization')}
              className="text-gold-400 hover:text-gold-300 text-sm flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {!tokenizationStats || tokenizationStats.total === 0 ? (
            <div className="text-center py-8">
              <Coins className="w-10 h-10 text-ink-faint mx-auto mb-2" />
              <p className="text-ink-faint">No tokenization requests yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-overlay/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-warning">{tokenizationStats.pending}</p>
                  <p className="text-ink-muted text-sm">Pending</p>
                </div>
                <div className="bg-surface-overlay/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gold-400">{tokenizationStats.approved}</p>
                  <p className="text-ink-muted text-sm">In Progress</p>
                </div>
                <div className="bg-surface-overlay/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-success">{tokenizationStats.completed}</p>
                  <p className="text-ink-muted text-sm">Completed</p>
                </div>
                <div className="bg-surface-overlay/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-ink">{tokenizationStats.total}</p>
                  <p className="text-ink-muted text-sm">Total</p>
                </div>
              </div>

              {tokenizationStats.completed > 0 && (
                <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <p className="text-success text-sm">
                    {tokenizationStats.completed} assets successfully tokenized
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Platform Health Indicator */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-success" />
          <h3 className="text-lg font-semibold text-ink">Platform Health</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/20 mb-2">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <p className="text-ink font-semibold">Contracts</p>
            <p className="text-success text-sm">Operational</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/20 mb-2">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <p className="text-ink font-semibold">KYC Service</p>
            <p className="text-success text-sm">Active</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/20 mb-2">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <p className="text-ink font-semibold">Escrow</p>
            <p className="text-success text-sm">Secured</p>
          </div>
          <div className="text-center">
            <div
              className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                disputeStats && disputeStats.inArbitration > 2 ? 'bg-warning/20' : 'bg-success/20'
              }`}
            >
              {disputeStats && disputeStats.inArbitration > 2 ? (
                <AlertTriangle className="w-6 h-6 text-warning" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-success" />
              )}
            </div>
            <p className="text-ink font-semibold">Disputes</p>
            <p
              className={`text-sm ${
                disputeStats && disputeStats.inArbitration > 2 ? 'text-warning' : 'text-success'
              }`}
            >
              {disputeStats && disputeStats.inArbitration > 2 ? 'Needs Attention' : 'Under Control'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
