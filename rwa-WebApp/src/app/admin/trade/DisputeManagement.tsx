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

const DISPUTE_TYPES: Record<string, { label: string; icon: string }> = {
  // Trade disputes
  quality_issue: { label: 'Quality Issue', icon: '⚠️' },
  quantity_discrepancy: { label: 'Quantity Discrepancy', icon: '📦' },
  late_delivery: { label: 'Late Delivery', icon: '⏰' },
  documentation_issue: { label: 'Documentation Issue', icon: '📄' },
  payment_dispute: { label: 'Payment Dispute', icon: '💰' },
  fraud_suspected: { label: 'Fraud Suspected', icon: '🚨' },
  contract_breach: { label: 'Contract Breach', icon: '📝' },
  // Crowdfunding disputes
  milestone_dispute: { label: 'Milestone Dispute', icon: '🎯' },
  fund_misuse: { label: 'Fund Misuse', icon: '💸' },
  project_abandonment: { label: 'Project Abandonment', icon: '🚪' },
  false_claims: { label: 'False Claims', icon: '❌' },
  investor_complaint: { label: 'Investor Complaint', icon: '👥' },
  other: { label: 'Other', icon: '❓' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  // Off-chain statuses
  submitted: { label: 'Submitted', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  under_review: { label: 'Under Review', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  evidence_requested: { label: 'Evidence Requested', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  mediation: { label: 'In Mediation', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  arbitration: { label: 'In Arbitration', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  resolved_buyer: { label: 'Resolved - Buyer', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  resolved_seller: { label: 'Resolved - Seller', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  resolved_split: { label: 'Resolved - Split', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  resolved_refund: { label: 'Resolved - Refund', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  resolved_dismissed: { label: 'Dismissed', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  withdrawn: { label: 'Withdrawn', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  // On-chain statuses (from DisputeManager contract)
  '0': { label: 'None', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  '1': { label: 'Open', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  '2': { label: 'Under Review', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  '3': { label: 'Resolved - Dismissed', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  '4': { label: 'Resolved - Refund', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  '5': { label: 'Resolved - Partial', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
};

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  trade: { label: 'Trade', icon: <Ship className="h-4 w-4" />, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  crowdfunding: { label: 'Crowdfunding', icon: <Coins className="h-4 w-4" />, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

// =============================================================================
// COMPONENTS
// =============================================================================

function StatsGrid({ stats }: { stats: DisputeStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Total</span>
          <AlertTriangle className="h-5 w-5 text-gray-400" />
        </div>
        <p className="text-2xl font-bold text-white">{stats.total}</p>
      </div>

      <div className="bg-gray-800 border border-cyan-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Trade</span>
          <Ship className="h-5 w-5 text-cyan-400" />
        </div>
        <p className="text-2xl font-bold text-cyan-400">{stats.tradeDisputes}</p>
      </div>

      <div className="bg-gray-800 border border-purple-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Crowdfunding</span>
          <Coins className="h-5 w-5 text-purple-400" />
        </div>
        <p className="text-2xl font-bold text-purple-400">{stats.crowdfundingDisputes}</p>
      </div>

      <div className="bg-gray-800 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Pending</span>
          <Clock className="h-5 w-5 text-blue-400" />
        </div>
        <p className="text-2xl font-bold text-blue-400">{stats.pending}</p>
      </div>

      <div className="bg-gray-800 border border-orange-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Mediation</span>
          <Users className="h-5 w-5 text-orange-400" />
        </div>
        <p className="text-2xl font-bold text-orange-400">{stats.inMediation}</p>
      </div>

      <div className="bg-gray-800 border border-green-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Resolved</span>
          <CheckCircle2 className="h-5 w-5 text-green-400" />
        </div>
        <p className="text-2xl font-bold text-green-400">{stats.resolved}</p>
      </div>

      <div className="bg-gray-800 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Value at Risk</span>
          <DollarSign className="h-5 w-5 text-yellow-400" />
        </div>
        <p className="text-2xl font-bold text-yellow-400">
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
    <tr className="border-b border-gray-800 hover:bg-gray-800/30">
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          {isUrgent && !isResolved && (
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
          <div>
            <p className="text-white font-medium">
              #{dispute.onChainId ?? dispute.id.slice(0, 8)}
            </p>
            <p className="text-xs text-gray-400">
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
          <span>{typeInfo.icon}</span>
          <span className="text-white text-sm">{typeInfo.label}</span>
        </div>
      </td>

      <td className="py-4 px-4">
        <div>
          {dispute.source === 'crowdfunding' ? (
            <>
              <p className="text-white text-sm">{dispute.projectName || `Project #${dispute.projectId}`}</p>
              <p className="text-xs text-gray-400">{dispute.totalInvestors} investors</p>
            </>
          ) : (
            <>
              <p className="text-white text-sm">{dispute.initiatorCompany}</p>
              <p className="text-xs text-gray-400">vs {dispute.respondentCompany}</p>
            </>
          )}
        </div>
      </td>

      <td className="py-4 px-4">
        <p className="text-white font-medium">
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
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          {canResolve && (
            <>
              <button
                onClick={onDismiss}
                className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
                title="Dismiss Dispute"
              >
                <Ban className="h-4 w-4" />
              </button>
              <button
                onClick={onResolve}
                className="p-2 text-gray-400 hover:text-green-400 transition-colors"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{typeInfo.icon}</div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">
                  Dispute #{dispute.onChainId ?? dispute.id.slice(0, 8)}
                </h2>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sourceConfig.color}`}>
                  {sourceConfig.icon}
                  {sourceConfig.label}
                </span>
              </div>
              <p className="text-gray-400">
                {dispute.source === 'crowdfunding'
                  ? `Project #${dispute.projectId} - ${dispute.projectName}`
                  : `${dispute.dealReference} - ${typeInfo.label}`
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveSection('details')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeSection === 'details'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Details
          </button>
          {!isResolved && (
            <button
              onClick={() => setActiveSection('resolve')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeSection === 'resolve'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
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
                    className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
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
                    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                      <p className="text-sm text-gray-400 mb-2">Project Owner</p>
                      <p className="text-white font-medium">{dispute.projectName}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">{dispute.projectOwner}</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                      <p className="text-sm text-gray-400 mb-2">Dispute Initiator</p>
                      <p className="text-white font-medium">Investor</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">{dispute.initiator}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                      <p className="text-sm text-gray-400 mb-2">Initiator (Claimant)</p>
                      <p className="text-white font-medium">{dispute.initiatorCompany}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">{dispute.initiator}</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                      <p className="text-sm text-gray-400 mb-2">Respondent</p>
                      <p className="text-white font-medium">{dispute.respondentCompany}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">{dispute.respondent}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Crowdfunding specific info */}
              {dispute.source === 'crowdfunding' && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                    <p className="text-sm text-gray-400 mb-2">Total Investors</p>
                    <p className="text-2xl font-bold text-white">{dispute.totalInvestors || 0}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                    <p className="text-sm text-gray-400 mb-2">Total Raised</p>
                    <p className="text-2xl font-bold text-green-400">
                      ${dispute.totalRaised ? Number(formatUnits(dispute.totalRaised, 6)).toLocaleString() : 0}
                    </p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                    <p className="text-sm text-gray-400 mb-2">Refundable</p>
                    <p className={`text-2xl font-bold ${dispute.refundable ? 'text-green-400' : 'text-red-400'}`}>
                      {dispute.refundable ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              )}

              {/* Claimed Amount */}
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                <p className="text-sm text-gray-400 mb-2">
                  {dispute.source === 'crowdfunding' ? 'Amount at Risk' : 'Claimed Amount'}
                </p>
                <p className="text-3xl font-bold text-white">
                  ${dispute.claimedAmount.toLocaleString()}
                </p>
              </div>

              {/* Description / Reason */}
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                <p className="text-sm text-gray-400 mb-2">
                  {dispute.source === 'crowdfunding' ? 'Dispute Reason' : 'Description'}
                </p>
                <p className="text-gray-300 whitespace-pre-wrap">
                  {dispute.reason || dispute.description}
                </p>
              </div>

              {/* Timeline */}
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                <p className="text-sm text-gray-400 mb-3">Timeline</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Filed</span>
                    <span className="text-white">{new Date(dispute.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Updated</span>
                    <span className="text-white">{new Date(dispute.updatedAt).toLocaleString()}</span>
                  </div>
                  {dispute.deadline && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Deadline</span>
                      <span className="text-white">{new Date(dispute.deadline).toLocaleDateString()}</span>
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
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
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
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-yellow-400 text-sm font-medium">⚠️ Final Resolution</p>
                <p className="text-gray-400 text-sm mt-1">
                  This action is irreversible. Choose the resolution carefully.
                </p>
              </div>

              {/* Resolution Options */}
              {dispute.source === 'crowdfunding' && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-300">Resolution Type</p>

                  <label className="flex items-start gap-3 p-4 bg-gray-900/50 rounded-xl border border-gray-700 cursor-pointer hover:border-gray-600 transition-colors">
                    <input
                      type="radio"
                      name="resolution"
                      checked={!refundInvestors}
                      onChange={() => setRefundInvestors(false)}
                      className="mt-1 text-blue-500 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-white font-medium flex items-center gap-2">
                        <Ban className="h-4 w-4 text-gray-400" />
                        Dismiss Dispute
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Dismiss the dispute as unjustified. Project continues normally.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 bg-gray-900/50 rounded-xl border border-gray-700 cursor-pointer hover:border-gray-600 transition-colors">
                    <input
                      type="radio"
                      name="resolution"
                      checked={refundInvestors}
                      onChange={() => setRefundInvestors(true)}
                      className="mt-1 text-blue-500 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-white font-medium flex items-center gap-2">
                        <Undo2 className="h-4 w-4 text-green-400" />
                        Refund All Investors
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Cancel the project and enable refunds for all {dispute.totalInvestors} investors.
                        Total refund: ${dispute.totalRaised ? Number(formatUnits(dispute.totalRaised, 6)).toLocaleString() : 0}
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Reasoning */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Resolution Reasoning *
                </label>
                <textarea
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  rows={4}
                  placeholder="Provide detailed reasoning for this decision..."
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onDismiss}
                  disabled={isProcessing || !reasoning.trim()}
                  className="flex-1 py-3 bg-gray-700 text-white font-medium rounded-xl hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                  className="flex-1 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

        <div className="p-6 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
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
        <div className={`p-4 rounded-xl ${result.success ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {result.message}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-1 gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search disputes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 outline-none"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <option value="all">All Sources</option>
            <option value="trade">Trade</option>
            <option value="crowdfunding">Crowdfunding</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
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
          className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Dispute</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Source</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Parties</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
                    Loading disputes...
                  </td>
                </tr>
              ) : disputes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Scale className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p>No disputes found</p>
                    <p className="text-sm text-gray-500 mt-1">All clear!</p>
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
          <div className="p-4 border-t border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {disputes.length} of {stats.total} disputes
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 hover:bg-gray-600 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-white px-3">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 hover:bg-gray-600 transition-colors"
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
