'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Image,
  Link as LinkIcon,
  Clock,
  DollarSign,
  Target,
  Filter
} from 'lucide-react';

interface MilestoneProof {
  id: string;
  chainId: number;
  projectId: number;
  milestoneIndex: number;
  ownerAddress: string;
  title: string;
  description: string;
  documents: string[];
  links: string[];
  kpisAchieved: Record<string, unknown>[];
  submittedAt: string;
  status: string;
  submissionCount: number;
  projectName?: string;
  milestoneTitle?: string;
  percentageOfFunds?: number;
  releaseAmount?: number;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function MilestoneReviewPanel() {
  const { address } = useAccount();
  const [proofs, setProofs] = useState<MilestoneProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProofs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/crowdfunding/admin/milestone-proofs?status=${statusFilter}`);
      
      if (!response.ok) {
        throw new Error('Failed to load proofs');
      }

      const data = await response.json();
      setProofs(data.proofs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadProofs();
  }, [loadProofs]);

  const handleReview = async (proof: MilestoneProof, action: 'approve' | 'reject') => {
    if (!address) return;
    if (action === 'reject' && !rejectionNotes.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/crowdfunding/admin/milestone-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId: proof.chainId,
          projectId: proof.projectId,
          milestoneIndex: proof.milestoneIndex,
          action,
          adminNotes: action === 'reject' ? rejectionNotes : undefined,
          adminAddress: address.toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Review failed');
      }

      // Refresh the list
      await loadProofs();
      setReviewingId(null);
      setReviewAction(null);
      setRejectionNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: typeof Clock }> = {
      pending: { color: 'warning', icon: Clock },
      approved: { color: 'success', icon: CheckCircle },
      rejected: { color: 'danger', icon: XCircle },
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-${config.color}/10 text-${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Milestone Proof Review</h2>
          <p className="text-ink-muted">Review and approve milestone completion proofs</p>
        </div>
        
        <button
          onClick={loadProofs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-surface-overlay hover:bg-border-strong rounded-lg text-ink"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5 text-ink-faint" />
        <div className="flex bg-surface rounded-lg p-1">
          {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-gold-600 text-ink'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-danger/80 hover:text-danger">
            Dismiss
          </button>
        </div>
      )}

      {/* Proofs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gold-400 animate-spin" />
        </div>
      ) : proofs.length === 0 ? (
        <div className="text-center py-12 bg-surface/50 border border-border rounded-xl">
          <Target className="w-12 h-12 text-ink-faint mx-auto mb-4" />
          <p className="text-ink-muted">No milestone proofs to review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {proofs.map((proof) => {
            const isExpanded = expandedId === proof.id;

            return (
              <div
                key={proof.id}
                className="bg-surface/50 border border-border rounded-xl overflow-hidden"
              >
                {/* Proof Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-surface/70 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : proof.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-ink">{proof.title}</h3>
                        {getStatusBadge(proof.status)}
                        {proof.submissionCount > 1 && (
                          <span className="px-2 py-0.5 bg-gold-500/20 text-gold-400 rounded-full text-xs">
                            Resubmission #{proof.submissionCount}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted">
                        <span>{proof.projectName || `Project #${proof.projectId}`}</span>
                        <span>•</span>
                        <span>Milestone {proof.milestoneIndex + 1}</span>
                        <span>•</span>
                        <span>Chain {proof.chainId}</span>
                        <span>•</span>
                        <span>{formatDate(proof.submittedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {proof.releaseAmount && (
                        <div className="text-right">
                          <p className="text-lg font-bold text-success">
                            {formatCurrency(proof.releaseAmount)}
                          </p>
                          <p className="text-xs text-ink-faint">
                            {proof.percentageOfFunds}% of funds
                          </p>
                        </div>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-ink-muted" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-ink-muted" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4">
                    {/* Owner Info */}
                    <div className="flex items-center gap-4 p-3 bg-surface-sunken/50 rounded-lg">
                      <div className="p-2 bg-gold-500/20 rounded-lg">
                        <DollarSign className="w-5 h-5 text-gold-400" />
                      </div>
                      <div>
                        <p className="text-ink-faint text-sm">Submitted by</p>
                        <p className="text-ink font-mono">{formatAddress(proof.ownerAddress)}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h4 className="text-sm font-medium text-ink-muted mb-2">Description</h4>
                      <p className="text-ink-muted bg-surface-sunken/50 rounded-lg p-4">
                        {proof.description}
                      </p>
                    </div>

                    {/* Documents */}
                    {proof.documents && proof.documents.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-ink-muted mb-2">
                          Documents ({proof.documents.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {proof.documents.map((doc, idx) => (
                            <a
                              key={idx}
                              href={doc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 bg-surface-overlay hover:bg-border-strong rounded-lg text-sm text-ink"
                            >
                              {doc.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <Image className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                              Document {idx + 1}
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Links */}
                    {proof.links && proof.links.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-ink-muted mb-2">
                          Supporting Links ({proof.links.length})
                        </h4>
                        <div className="space-y-2">
                          {proof.links.map((link, idx) => (
                            <a
                              key={idx}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 bg-surface-sunken/50 hover:bg-surface-sunken rounded-lg text-sm group"
                            >
                              <LinkIcon className="w-4 h-4 text-gold-400" />
                              <span className="text-gold-400 group-hover:underline flex-1 truncate">
                                {link}
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 text-ink-faint" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* KPIs Achieved */}
                    {proof.kpisAchieved && proof.kpisAchieved.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-ink-muted mb-2">KPIs Achieved</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {proof.kpisAchieved.map((kpi, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-3 bg-surface-sunken/50 rounded-lg">
                              <CheckCircle className="w-4 h-4 text-success" />
                              <span className="text-ink-muted text-sm">
                                {typeof kpi === 'string' ? kpi : JSON.stringify(kpi)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Review Actions */}
                    {proof.status === 'pending' && (
                      <div className="pt-4 border-t border-border">
                        {reviewingId === proof.id && reviewAction === 'reject' ? (
                          <div className="space-y-3">
                            <label className="block text-sm font-medium text-ink-muted">
                              Rejection Notes *
                            </label>
                            <textarea
                              value={rejectionNotes}
                              onChange={(e) => setRejectionNotes(e.target.value)}
                              placeholder="Explain what needs to be improved or corrected..."
                              rows={3}
                              className="w-full px-4 py-3 bg-surface-sunken border border-border rounded-lg text-ink resize-none"
                            />
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleReview(proof, 'reject')}
                                disabled={!rejectionNotes.trim() || isSubmitting}
                                className="flex-1 px-4 py-2 bg-danger hover:bg-danger/90 disabled:bg-danger/40 disabled:cursor-not-allowed rounded-lg text-ink font-medium"
                              >
                                {isSubmitting ? 'Submitting...' : 'Confirm Rejection'}
                              </button>
                              <button
                                onClick={() => {
                                  setReviewingId(null);
                                  setReviewAction(null);
                                  setRejectionNotes('');
                                }}
                                className="px-4 py-2 bg-surface-overlay hover:bg-border-strong rounded-lg text-ink"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                              <p className="text-warning text-sm">
                                <strong>Warning:</strong> Approving this milestone will release{' '}
                                {proof.releaseAmount ? formatCurrency(proof.releaseAmount) : 'funds'} to the project owner.
                              </p>
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleReview(proof, 'approve')}
                                disabled={isSubmitting}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-success hover:bg-success/90 rounded-lg text-ink font-medium"
                              >
                                {isSubmitting ? (
                                  <RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-5 h-5" />
                                )}
                                Approve & Release Funds
                              </button>
                              <button
                                onClick={() => {
                                  setReviewingId(proof.id);
                                  setReviewAction('reject');
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-danger hover:bg-danger/90 rounded-lg text-ink font-medium"
                              >
                                <XCircle className="w-5 h-5" />
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
