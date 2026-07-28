// src/app/admin/trade/DisputeManagement.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { Address, formatUnits } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import { DisputeManagerABI, RWAEscrowVaultABI } from '@/config/abis';
import { DEPLOYMENTS } from '@/config/deployments';
import { SupportedChainId } from '@/config/chains';
import {
  Search,
  Filter,
  Eye,
  Scale,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  DollarSign,
  Users,
  MessageSquare,
  FileText,
  Loader2,
  X,
  UserCheck,
  Gavel,
  Send,
  Coins,
  Ship,
  Undo2,
  Ban,
  ExternalLink,
  Package,
  ShieldAlert,
  FileWarning,
  Target,
  Banknote,
  DoorOpen,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface DisputeStats {
  total: number;
  pending: number;
  inMediation: number;
  inArbitration: number;
  resolved: number;
  totalValue: number;
  // Crowdfunding specific
  crowdfundingDisputes: number;
  tradeDisputes: number;
}

interface Dispute {
  id: string;
  onChainId?: number; // For on-chain disputes
  source: 'trade' | 'crowdfunding';
  dealId?: string;
  projectId?: number;
  dealReference?: string;
  projectName?: string;
  type: string;
  status: string;
  initiator: string;
  initiatorCompany?: string;
  respondent?: string;
  respondentCompany?: string;
  projectOwner?: string;
  claimedAmount: number;
  description: string;
  reason?: string;
  arbiter?: string;
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date;
  // Crowdfunding specific
  totalInvestors?: number;
  totalRaised?: bigint;
  refundable?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DISPUTE_TYPES: Record<string, { label: string; icon: LucideIcon }> = {
  // Trade disputes
  quality_issue: { label: 'Quality Issue', icon: AlertTriangle },
  quantity_discrepancy: { label: 'Quantity Discrepancy', icon: Package },
  late_delivery: { label: 'Late Delivery', icon: Clock },
  documentation_issue: { label: 'Documentation Issue', icon: FileText },
  payment_dispute: { label: 'Payment Dispute', icon: DollarSign },
  fraud_suspected: { label: 'Fraud Suspected', icon: ShieldAlert },
  contract_breach: { label: 'Contract Breach', icon: FileWarning },
  // Crowdfunding disputes
  milestone_dispute: { label: 'Milestone Dispute', icon: Target },
  fund_misuse: { label: 'Fund Misuse', icon: Banknote },
  project_abandonment: { label: 'Project Abandonment', icon: DoorOpen },
  false_claims: { label: 'False Claims', icon: XCircle },
  investor_complaint: { label: 'Investor Complaint', icon: Users },
  other: { label: 'Other', icon: HelpCircle },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  // Off-chain statuses
  submitted: { label: 'Submitted', color: 'bg-gold-500/10 text-gold-400 border-gold-500/20' },
  under_review: { label: 'Under Review', color: 'bg-gold-500/10 text-gold-400 border-gold-500/20' },
  evidence_requested: { label: 'Evidence Requested', color: 'bg-warning/10 text-warning border-warning/20' },
  mediation: { label: 'In Mediation', color: 'bg-warning/10 text-warning border-warning/20' },
  arbitration: { label: 'In Arbitration', color: 'bg-danger/10 text-danger border-danger/20' },
  resolved_buyer: { label: 'Resolved - Buyer', color: 'bg-success/10 text-success border-success/20' },
  resolved_seller: { label: 'Resolved - Seller', color: 'bg-success/10 text-success border-success/20' },
  resolved_split: { label: 'Resolved - Split', color: 'bg-success/10 text-success border-success/20' },
  resolved_refund: { label: 'Resolved - Refund', color: 'bg-success/10 text-success border-success/20' },
  resolved_dismissed: { label: 'Dismissed', color: 'bg-ink-faint/10 text-ink-muted border-ink-faint/20' },
  withdrawn: { label: 'Withdrawn', color: 'bg-ink-faint/10 text-ink-muted border-ink-faint/20' },
  // On-chain statuses (from DisputeManager contract)
  '0': { label: 'None', color: 'bg-ink-faint/10 text-ink-muted border-ink-faint/20' },
  '1': { label: 'Open', color: 'bg-gold-500/10 text-gold-400 border-gold-500/20' },
  '2': { label: 'Under Review', color: 'bg-gold-500/10 text-gold-400 border-gold-500/20' },
  '3': { label: 'Resolved - Dismissed', color: 'bg-ink-faint/10 text-ink-muted border-ink-faint/20' },
  '4': { label: 'Resolved - Refund', color: 'bg-success/10 text-success border-success/20' },
  '5': { label: 'Resolved - Partial', color: 'bg-success/10 text-success border-success/20' },
};

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  trade: { label: 'Trade', icon: <Ship className="h-4 w-4" />, color: 'bg-ink-muted/10 text-ink-muted border-ink-muted/30' },
  crowdfunding: { label: 'Crowdfunding', icon: <Coins className="h-4 w-4" />, color: 'bg-gold/10 text-gold border-gold/30' },
};

// =============================================================================
// COMPONENTS
// =============================================================================

function StatsGrid({ stats }: { stats: DisputeStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-ink-muted">Total</span>
          <AlertTriangle className="h-5 w-5 text-ink-muted" />
        </div>
        <p className="text-2xl font-bold text-ink">{stats.total}</p>
      </div>

      <div className="bg-surface border border-gold/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-ink-muted">Trade</span>
          <Ship className="h-5 w-5 text-gold" />
        </div>
        <p className="text-2xl font-bold text-gold">{stats.tradeDisputes}</p>
      </div>

      <div className="bg-surface border border-gold-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-ink-muted">Crowdfunding</span>
          <Coins className="h-5 w-5 text-gold-400" />
        </div>
        <p className="text-2xl font-bold text-gold-400">{stats.crowdfundingDisputes}</p>
      </div>

      <div className="bg-surface border border-gold-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-ink-muted">Pending</span>
          <Clock className="h-5 w-5 text-gold-400" />
        </div>
        <p className="text-2xl font-bold text-gold-400">{stats.pending}</p>
      </div>

      <div className="bg-surface border border-warning/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-ink-muted">Mediation</span>
          <Users className="h-5 w-5 text-warning" />
        </div>
        <p className="text-2xl font-bold text-warning">{stats.inMediation}</p>
      </div>

      <div className="bg-surface border border-success/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-ink-muted">Resolved</span>
          <CheckCircle2 className="h-5 w-5 text-success" />
        </div>
        <p className="text-2xl font-bold text-success">{stats.resolved}</p>
      </div>

      <div className="bg-surface border border-warning/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-ink-muted">Value at Risk</span>
          <DollarSign className="h-5 w-5 text-warning" />
        </div>
        <p className="text-2xl font-bold text-warning">
          ${(stats.totalValue / 1_000).toFixed(0)}K
        </p>
      </div>
    </div>
  );
}

function DisputeRow({
  dispute,
  onView,
  onDismiss,
  onResolve,
  explorerUrl,
}: {
  dispute: Dispute;
  onView: () => void;
  onDismiss: () => void;
  onResolve: () => void;
  explorerUrl: string;
}) {
  const typeInfo = DISPUTE_TYPES[dispute.type] || DISPUTE_TYPES.other;
  const statusConfig = STATUS_CONFIG[dispute.status] || STATUS_CONFIG.submitted;
  const sourceConfig = SOURCE_CONFIG[dispute.source];
  const isResolved = dispute.status.startsWith('resolved') || dispute.status === '3' || dispute.status === '4' || dispute.status === '5';
  const isUrgent = dispute.deadline && new Date(dispute.deadline) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const canResolve = !isResolved && (dispute.status === 'arbitration' || dispute.status === '1' || dispute.status === '2');

  return (
    <tr className="border-b border-border hover:bg-surface/30">
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          {isUrgent && !isResolved && (
            <span className="w-2 h-2 bg-danger rounded-full animate-pulse" />
          )}
          <div>
            <p className="text-ink font-medium">
              #{dispute.onChainId ?? dispute.id.slice(0, 8)}
            </p>
            <p className="text-xs text-ink-muted">
              {dispute.source === 'crowdfunding' 
                ? `Project #${dispute.projectId}` 
                : dispute.dealReference
              }
            </p>
          </div>
        </div>
      </td>

      <td className="py-4 px-4">
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${sourceConfig.color}`}>
          {sourceConfig.icon}
          {sourceConfig.label}
        </span>
      </td>

      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <typeInfo.icon className="w-4 h-4 text-ink-muted" />
          <span className="text-ink text-sm">{typeInfo.label}</span>
        </div>
      </td>

      <td className="py-4 px-4">
        <div>
          {dispute.source === 'crowdfunding' ? (
            <>
              <p className="text-ink text-sm">{dispute.projectName || `Project #${dispute.projectId}`}</p>
              <p className="text-xs text-ink-muted">{dispute.totalInvestors} investors</p>
            </>
          ) : (
            <>
              <p className="text-ink text-sm">{dispute.initiatorCompany}</p>
              <p className="text-xs text-ink-muted">vs {dispute.respondentCompany}</p>
            </>
          )}
        </div>
      </td>

      <td className="py-4 px-4">
        <p className="text-ink font-medium">
          ${dispute.claimedAmount.toLocaleString()}
        </p>
      </td>

      <td className="py-4 px-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </td>

      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="p-2 text-ink-muted hover:text-ink transition-colors"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          {canResolve && (
            <>
              <button
                onClick={onDismiss}
                className="p-2 text-ink-muted hover:text-warning transition-colors"
                title="Dismiss Dispute"
              >
                <Ban className="h-4 w-4" />
              </button>
              <button
                onClick={onResolve}
                className="p-2 text-ink-muted hover:text-success transition-colors"
                title="Resolve Dispute"
              >
                <Gavel className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function DisputeDetailModal({
  dispute,
  onClose,
  onDismiss,
  onResolve,
  onUpdateStatus,
  isProcessing,
  explorerUrl,
}: {
  dispute: Dispute;
  onClose: () => void;
  onDismiss: () => void;
  onResolve: (refundInvestors: boolean, reasoning: string) => void;
  onUpdateStatus: (status: string) => void;
  isProcessing: boolean;
  explorerUrl: string;
}) {
  const [refundInvestors, setRefundInvestors] = useState(false);
  const [reasoning, setReasoning] = useState('');
  const [activeSection, setActiveSection] = useState<'details' | 'resolve'>('details');

  const typeInfo = DISPUTE_TYPES[dispute.type] || DISPUTE_TYPES.other;
  const statusConfig = STATUS_CONFIG[dispute.status] || STATUS_CONFIG.submitted;
  const sourceConfig = SOURCE_CONFIG[dispute.source];
  const isResolved = dispute.status.startsWith('resolved') || dispute.status === '3' || dispute.status === '4' || dispute.status === '5';

  return (
    <div className="fixed inset-0 bg-surface-sunken/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <typeInfo.icon className="w-6 h-6 text-ink-muted" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-ink">
                  Dispute #{dispute.onChainId ?? dispute.id.slice(0, 8)}
                </h2>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sourceConfig.color}`}>
                  {sourceConfig.icon}
                  {sourceConfig.label}
                </span>
              </div>
              <p className="text-ink-muted">
                {dispute.source === 'crowdfunding'
                  ? `Project #${dispute.projectId} - ${dispute.projectName}`
                  : `${dispute.dealReference} - ${typeInfo.label}`
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-ink-muted hover:text-ink transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveSection('details')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeSection === 'details'
                ? 'text-gold-400 border-b-2 border-gold-400'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Details
          </button>
          {!isResolved && (
            <button
              onClick={() => setActiveSection('resolve')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeSection === 'resolve'
                  ? 'text-gold-400 border-b-2 border-gold-400'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Resolve
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          {/* Details Section */}
          {activeSection === 'details' && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                {!isResolved && (
                  <select
                    value={dispute.status}
                    onChange={(e) => onUpdateStatus(e.target.value)}
                    className="px-3 py-1 bg-surface-sunken border border-border rounded-lg text-ink text-sm"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="evidence_requested">Evidence Requested</option>
                    <option value="mediation">Mediation</option>
                    <option value="arbitration">Arbitration</option>
                  </select>
                )}
              </div>

              {/* Parties */}
              <div className="grid md:grid-cols-2 gap-4">
                {dispute.source === 'crowdfunding' ? (
                  <>
                    <div className="bg-surface-sunken/50 rounded-xl p-4 border border-border/50">
                      <p className="text-sm text-ink-muted mb-2">Project Owner</p>
                      <p className="text-ink font-medium">{dispute.projectName}</p>
                      <p className="text-xs text-ink-faint font-mono mt-1">{dispute.projectOwner}</p>
                    </div>
                    <div className="bg-surface-sunken/50 rounded-xl p-4 border border-border/50">
                      <p className="text-sm text-ink-muted mb-2">Dispute Initiator</p>
                      <p className="text-ink font-medium">Investor</p>
                      <p className="text-xs text-ink-faint font-mono mt-1">{dispute.initiator}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-surface-sunken/50 rounded-xl p-4 border border-border/50">
                      <p className="text-sm text-ink-muted mb-2">Initiator (Claimant)</p>
                      <p className="text-ink font-medium">{dispute.initiatorCompany}</p>
                      <p className="text-xs text-ink-faint font-mono mt-1">{dispute.initiator}</p>
                    </div>
                    <div className="bg-surface-sunken/50 rounded-xl p-4 border border-border/50">
                      <p className="text-sm text-ink-muted mb-2">Respondent</p>
                      <p className="text-ink font-medium">{dispute.respondentCompany}</p>
                      <p className="text-xs text-ink-faint font-mono mt-1">{dispute.respondent}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Crowdfunding specific info */}
              {dispute.source === 'crowdfunding' && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-surface-sunken/50 rounded-xl p-4 border border-border/50">
                    <p className="text-sm text-ink-muted mb-2">Total Investors</p>
                    <p className="text-2xl font-bold text-ink">{dispute.totalInvestors || 0}</p>
                  </div>
                  <div className="bg-surface-sunken/50 rounded-xl p-4 border border-border/50">
                    <p className="text-sm text-ink-muted mb-2">Total Raised</p>
                    <p className="text-2xl font-bold text-success">
                      ${dispute.totalRaised ? Number(formatUnits(dispute.totalRaised, 6)).toLocaleString() : 0}
                    </p>
                  </div>
                  <div className="bg-surface-sunken/50 rounded-xl p-4 border border-border/50">
                    <p className="text-sm text-ink-muted mb-2">Refundable</p>
                    <p className={`text-2xl font-bold ${dispute.refundable ? 'text-success' : 'text-danger'}`}>
                      {dispute.refundable ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              )}

              {/* Claimed Amount */}
              <div className="bg-surface-sunken/50 rounded-xl p-4 border border-border/50">
                <p className="text-sm text-ink-muted mb-2">
                  {dispute.source === 'crowdfunding' ? 'Amount at Risk' : 'Claimed Amount'}
                </p>
                <p className="text-3xl font-bold text-ink">
                  ${dispute.claimedAmount.toLocaleString()}
                </p>
              </div>

              {/* Description / Reason */}
              <div className="bg-surface-sunken/50 rounded-xl p-4 border border-border/50">
                <p className="text-sm text-ink-muted mb-2">
                  {dispute.source === 'crowdfunding' ? 'Dispute Reason' : 'Description'}
                </p>
                <p className="text-ink-muted whitespace-pre-wrap">
                  {dispute.reason || dispute.description}
                </p>
              </div>

              {/* Timeline */}
              <div className="bg-surface-sunken/50 rounded-xl p-4 border border-border/50">
                <p className="text-sm text-ink-muted mb-3">Timeline</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Filed</span>
                    <span className="text-ink">{new Date(dispute.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Last Updated</span>
                    <span className="text-ink">{new Date(dispute.updatedAt).toLocaleString()}</span>
                  </div>
                  {dispute.deadline && (
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Deadline</span>
                      <span className="text-ink">{new Date(dispute.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* On-chain link */}
              {dispute.onChainId !== undefined && (
                <a
                  href={`${explorerUrl}/address/${dispute.projectOwner}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gold-400 hover:text-gold-300 text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Explorer
                </a>
              )}
            </div>
          )}

          {/* Resolve Section */}
          {activeSection === 'resolve' && (
            <div className="space-y-6">
              <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
                <p className="text-warning text-sm font-medium flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Final Resolution</p>
                <p className="text-ink-muted text-sm mt-1">
                  This action is irreversible. Choose the resolution carefully.
                </p>
              </div>

              {/* Resolution Options */}
              {dispute.source === 'crowdfunding' && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-ink-muted">Resolution Type</p>

                  <label className="flex items-start gap-3 p-4 bg-surface-sunken/50 rounded-xl border border-border cursor-pointer hover:border-border-strong transition-colors">
                    <input
                      type="radio"
                      name="resolution"
                      checked={!refundInvestors}
                      onChange={() => setRefundInvestors(false)}
                      className="mt-1 text-gold-500 focus:ring-gold-500"
                    />
                    <div>
                      <p className="text-ink font-medium flex items-center gap-2">
                        <Ban className="h-4 w-4 text-ink-muted" />
                        Dismiss Dispute
                      </p>
                      <p className="text-ink-muted text-sm mt-1">
                        Dismiss the dispute as unjustified. Project continues normally.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 bg-surface-sunken/50 rounded-xl border border-border cursor-pointer hover:border-border-strong transition-colors">
                    <input
                      type="radio"
                      name="resolution"
                      checked={refundInvestors}
                      onChange={() => setRefundInvestors(true)}
                      className="mt-1 text-gold-500 focus:ring-gold-500"
                    />
                    <div>
                      <p className="text-ink font-medium flex items-center gap-2">
                        <Undo2 className="h-4 w-4 text-success" />
                        Refund All Investors
                      </p>
                      <p className="text-ink-muted text-sm mt-1">
                        Cancel the project and enable refunds for all {dispute.totalInvestors} investors.
                        Total refund: ${dispute.totalRaised ? Number(formatUnits(dispute.totalRaised, 6)).toLocaleString() : 0}
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Reasoning */}
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Resolution Reasoning *
                </label>
                <textarea
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  rows={4}
                  placeholder="Provide detailed reasoning for this decision..."
                  className="w-full px-4 py-3 bg-surface-sunken border border-border rounded-xl text-ink placeholder-ink-faint focus:border-gold-500 outline-none resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onDismiss}
                  disabled={isProcessing || !reasoning.trim()}
                  className="flex-1 py-3 bg-surface-raised text-ink font-medium rounded-xl hover:bg-surface-overlay transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Ban className="h-5 w-5" />
                      Dismiss
                    </>
                  )}
                </button>
                <button
                  onClick={() => onResolve(refundInvestors, reasoning)}
                  disabled={isProcessing || !reasoning.trim()}
                  className="flex-1 py-3 bg-success text-ink font-medium rounded-xl hover:bg-success transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Gavel className="h-5 w-5" />
                      {refundInvestors ? 'Resolve & Refund' : 'Resolve'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-raised text-ink rounded-lg hover:bg-surface-overlay transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface DisputeManagementProps {
  onRefresh?: () => void;
}

export default function DisputeManagement({ onRefresh }: DisputeManagementProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { chainId, explorerUrl } = useChainConfig();

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<DisputeStats>({
    total: 0,
    pending: 0,
    inMediation: 0,
    inArbitration: 0,
    resolved: 0,
    totalValue: 0,
    crowdfundingDisputes: 0,
    tradeDisputes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const deployment = DEPLOYMENTS[chainId as SupportedChainId];
  const disputeManagerAddress = deployment?.contracts?.DisputeManager as Address | undefined;
  const escrowVaultAddress = deployment?.contracts?.RWAEscrowVault as Address | undefined;

  // Fetch disputes (both off-chain API and on-chain)
  const fetchDisputes = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      const allDisputes: Dispute[] = [];

      // 1. Fetch off-chain disputes from API (trade disputes)
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '50',
          ...(statusFilter !== 'all' && { status: statusFilter }),
          ...(searchQuery && { search: searchQuery }),
        });

        const response = await fetch(`/api/admin/trade/disputes?${params}`, {
          headers: { 
            'x-wallet-address': address,
            'x-chain-id': chainId?.toString() || '',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const tradeDisputes = data.disputes.map((d: any) => ({
            id: d.id,
            source: 'trade' as const,
            dealId: d.deal_id,
            dealReference: d.deal_reference,
            type: d.type,
            status: d.status,
            initiator: d.initiator,
            initiatorCompany: d.initiator_company,
            respondent: d.respondent,
            respondentCompany: d.respondent_company,
            claimedAmount: d.claimed_amount,
            description: d.description,
            arbiter: d.arbiter,
            createdAt: new Date(d.created_at),
            updatedAt: new Date(d.updated_at),
            deadline: d.deadline ? new Date(d.deadline) : undefined,
          }));
          allDisputes.push(...tradeDisputes);
        }
      } catch (e) {
        console.error('Error fetching trade disputes:', e);
      }

      // 2. Fetch on-chain crowdfunding disputes
      if (publicClient && disputeManagerAddress && escrowVaultAddress) {
        try {
          // Get total disputes from contract
          const totalOnChainDisputes = await publicClient.readContract({
            address: disputeManagerAddress,
            abi: DisputeManagerABI,
            functionName: 'totalDisputes',
          }) as bigint;

          for (let i = 1; i <= Number(totalOnChainDisputes); i++) {
            try {
              const disputeData = await publicClient.readContract({
                address: disputeManagerAddress,
                abi: DisputeManagerABI,
                functionName: 'getDispute',
                args: [BigInt(i)],
              }) as any;

              if (disputeData.projectId > 0) {
                // Fetch project details
                let projectName = `Project #${disputeData.projectId}`;
                let totalRaised = 0n;
                let totalInvestors = 0;

                try {
                  const fundingData = await publicClient.readContract({
                    address: escrowVaultAddress,
                    abi: RWAEscrowVaultABI,
                    functionName: 'getProjectFunding',
                    args: [disputeData.projectId],
                  }) as any;
                  totalRaised = fundingData.totalRaised || 0n;
                  totalInvestors = Number(fundingData.investorCount || 0);
                } catch (e) {
                  console.error('Error fetching project funding:', e);
                }

                allDisputes.push({
                  id: `onchain-${i}`,
                  onChainId: i,
                  source: 'crowdfunding',
                  projectId: Number(disputeData.projectId),
                  projectName,
                  type: 'investor_complaint',
                  status: disputeData.status.toString(),
                  initiator: disputeData.initiator,
                  projectOwner: disputeData.projectOwner,
                  claimedAmount: Number(formatUnits(totalRaised, 6)),
                  description: disputeData.reason || '',
                  reason: disputeData.reason,
                  createdAt: new Date(Number(disputeData.createdAt) * 1000),
                  updatedAt: new Date(Number(disputeData.updatedAt) * 1000),
                  totalInvestors,
                  totalRaised,
                  refundable: disputeData.status === 1 || disputeData.status === 2,
                });
              }
            } catch (e) {
              console.error(`Error fetching dispute ${i}:`, e);
            }
          }
        } catch (e) {
          console.error('Error fetching on-chain disputes:', e);
        }
      }

      // Apply source filter
      const filteredDisputes = sourceFilter === 'all' 
        ? allDisputes 
        : allDisputes.filter(d => d.source === sourceFilter);

      setDisputes(filteredDisputes);
      setTotalPages(Math.ceil(filteredDisputes.length / 20));

      // Calculate stats
      setStats({
        total: allDisputes.length,
        pending: allDisputes.filter(d => 
          d.status === 'submitted' || d.status === 'under_review' || d.status === '1' || d.status === '2'
        ).length,
        inMediation: allDisputes.filter(d => d.status === 'mediation').length,
        inArbitration: allDisputes.filter(d => d.status === 'arbitration').length,
        resolved: allDisputes.filter(d => 
          d.status.startsWith('resolved') || d.status === '3' || d.status === '4' || d.status === '5'
        ).length,
        totalValue: allDisputes.reduce((sum, d) => sum + d.claimedAmount, 0),
        crowdfundingDisputes: allDisputes.filter(d => d.source === 'crowdfunding').length,
        tradeDisputes: allDisputes.filter(d => d.source === 'trade').length,
      });
    } catch (error) {
      console.error('Error fetching disputes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, page, statusFilter, searchQuery, sourceFilter, publicClient, disputeManagerAddress, escrowVaultAddress]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  // Handle dismiss dispute (on-chain)
  const handleDismissDispute = async (dispute: Dispute) => {
    if (!walletClient || !disputeManagerAddress || dispute.onChainId === undefined) {
      // Off-chain dispute - use API
      await handleUpdateStatus(dispute.id, 'resolved_dismissed');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const hash = await walletClient.writeContract({
        address: disputeManagerAddress,
        abi: DisputeManagerABI,
        functionName: 'dismissDispute',
        args: [BigInt(dispute.onChainId)],
      });

      await publicClient?.waitForTransactionReceipt({ hash });
      setResult({ success: true, message: `Dispute #${dispute.onChainId} dismissed!` });
      setSelectedDispute(null);
      fetchDisputes();
      onRefresh?.();
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Failed to dismiss dispute' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle resolve dispute (on-chain)
  const handleResolveDispute = async (dispute: Dispute, refundInvestors: boolean, reasoning: string) => {
    if (!walletClient || !disputeManagerAddress || dispute.onChainId === undefined) {
      // Off-chain dispute - use API
      const status = refundInvestors ? 'resolved_refund' : 'resolved_dismissed';
      await handleUpdateStatus(dispute.id, status);
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const hash = await walletClient.writeContract({
        address: disputeManagerAddress,
        abi: DisputeManagerABI,
        functionName: 'resolveDispute',
        args: [BigInt(dispute.onChainId), refundInvestors],
      });

      await publicClient?.waitForTransactionReceipt({ hash });
      setResult({ 
        success: true, 
        message: `Dispute #${dispute.onChainId} resolved! ${refundInvestors ? 'Refunds enabled for investors.' : ''}` 
      });
      setSelectedDispute(null);
      fetchDisputes();
      onRefresh?.();
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Failed to resolve dispute' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle status update (off-chain API)
  const handleUpdateStatus = async (disputeId: string, status: string) => {
    if (!address) return;

    try {
      const response = await fetch(`/api/admin/trade/disputes/${disputeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setDisputes(disputes.map(d =>
          d.id === disputeId ? { ...d, status } : d
        ));
        setResult({ success: true, message: 'Status updated!' });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatsGrid stats={stats} />

      {/* Result Message */}
      {result && (
        <div className={`p-4 rounded-xl ${result.success ? 'bg-success/10 border border-success/20 text-success' : 'bg-danger/10 border border-danger/20 text-danger'}`}>
          {result.message}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-1 gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-muted" />
            <input
              type="text"
              placeholder="Search disputes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-ink placeholder-ink-faint focus:border-gold-500 outline-none"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-ink"
          >
            <option value="all">All Sources</option>
            <option value="trade">Trade</option>
            <option value="crowdfunding">Crowdfunding</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-ink"
          >
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="mediation">In Mediation</option>
            <option value="arbitration">In Arbitration</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <button
          onClick={() => {
            fetchDisputes();
            onRefresh?.();
          }}
          disabled={isLoading}
          className="p-2 bg-surface text-ink rounded-lg hover:bg-surface-raised transition-colors border border-border"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-sunken/50 border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-ink-muted">Dispute</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-ink-muted">Source</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-ink-muted">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-ink-muted">Parties</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-ink-muted">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-ink-muted">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-muted">
                    <Loader2 className="h-8 w-8 text-gold-500 animate-spin mx-auto mb-2" />
                    Loading disputes...
                  </td>
                </tr>
              ) : disputes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-muted">
                    <Scale className="h-12 w-12 text-ink-faint mx-auto mb-3" />
                    <p>No disputes found</p>
                    <p className="text-sm text-ink-faint mt-1">All clear!</p>
                  </td>
                </tr>
              ) : (
                disputes.map((dispute) => (
                  <DisputeRow
                    key={dispute.id}
                    dispute={dispute}
                    onView={() => setSelectedDispute(dispute)}
                    onDismiss={() => handleDismissDispute(dispute)}
                    onResolve={() => setSelectedDispute(dispute)}
                    explorerUrl={explorerUrl}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {disputes.length > 0 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-ink-muted">
              Showing {disputes.length} of {stats.total} disputes
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-surface-raised text-ink rounded-lg disabled:opacity-50 hover:bg-surface-overlay transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-ink px-3">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-surface-raised text-ink rounded-lg disabled:opacity-50 hover:bg-surface-overlay transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedDispute && (
        <DisputeDetailModal
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onDismiss={() => handleDismissDispute(selectedDispute)}
          onResolve={(refund, reasoning) => handleResolveDispute(selectedDispute, refund, reasoning)}
          onUpdateStatus={(status) => handleUpdateStatus(selectedDispute.id, status)}
          isProcessing={isProcessing}
          explorerUrl={explorerUrl}
        />
      )}
    </div>
  );
}
