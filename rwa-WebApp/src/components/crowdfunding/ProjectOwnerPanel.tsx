// src/components/crowdfunding/ProjectOwnerPanel.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { formatUnits } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import { RWAEscrowVaultABI } from '@/config/abis';
import {
  Play, CheckCircle, XCircle, Clock, AlertCircle,
  Loader2, DollarSign, Target, TrendingUp, FileText,
  ExternalLink, Info, Upload, Link as LinkIcon, Send,
  Eye, Edit3, X, Plus, Trash2
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectOwnerPanelProps {
  projectId: string;
  escrowAddress: string;
  projectState: number;
  totalRaised: bigint;
  fundingGoal: bigint;
  onRefresh: () => void;
}

interface MilestoneData {
  description: string;
  amount: bigint;
  deadline: bigint;
  state: number;
  releasedAt: bigint;
  approvedAt: bigint;
}

interface MilestoneProof {
  id: string;
  milestoneIndex: number;
  projectId: string;
  title: string;
  description: string;
  documents: string[];
  links: string[];
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PROJECT_STATE = {
  INACTIVE: 0,
  ACTIVE: 1,
  FUNDED: 2,
  EXECUTING: 3,
  CANCELLED: 4,
  COMPLETED: 5,
};

const PROJECT_STATE_LABELS: Record<number, string> = {
  0: 'Inactive',
  1: 'Active',
  2: 'Funded',
  3: 'Executing',
  4: 'Cancelled',
  5: 'Completed',
};

const PROJECT_STATE_COLORS: Record<number, string> = {
  0: 'bg-border-strong/20 text-ink-muted',
  1: 'bg-gold-500/20 text-gold-400',
  2: 'bg-success/10 text-success',
  3: 'bg-gold-500/20 text-gold-400',
  4: 'bg-danger/10 text-danger',
  5: 'bg-emerald-500/20 text-emerald-400',
};

const MILESTONE_STATE = {
  PENDING: 0,
  SUBMITTED: 1, // Owner submitted proof, waiting for admin review
  APPROVED: 2,
  RELEASED: 3,
  DISPUTED: 4,
  REJECTED: 5,
};

const MILESTONE_STATE_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Under Review',
  2: 'Approved',
  3: 'Released',
  4: 'Disputed',
  5: 'Rejected',
};

const MILESTONE_STATE_COLORS: Record<number, string> = {
  0: 'bg-border-strong/20 text-ink-muted',
  1: 'bg-gold-500/20 text-gold-400',
  2: 'bg-warning/10 text-warning',
  3: 'bg-success/10 text-success',
  4: 'bg-warning/10 text-warning',
  5: 'bg-danger/10 text-danger',
};

// ============================================================================
// SUBMIT PROOF MODAL
// ============================================================================

interface SubmitProofModalProps {
  milestone: MilestoneData;
  milestoneIndex: number;
  projectId: string;
  onClose: () => void;
  onSubmit: (proof: { 
    title: string; 
    description: string; 
    documents: string[]; 
    links: string[] 
  }) => Promise<void>;
  existingProof?: MilestoneProof | null;
}

function SubmitProofModal({ 
  milestone, 
  milestoneIndex, 
  projectId, 
  onClose, 
  onSubmit,
  existingProof 
}: SubmitProofModalProps) {
  const [title, setTitle] = useState(existingProof?.title || '');
  const [description, setDescription] = useState(existingProof?.description || '');
  const [documents, setDocuments] = useState<string[]>(existingProof?.documents || ['']);
  const [links, setLinks] = useState<string[]>(existingProof?.links || ['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddDocument = () => setDocuments([...documents, '']);
  const handleAddLink = () => setLinks([...links, '']);
  
  const handleRemoveDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };
  
  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Please provide a title for this submission');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a description of the completed work');
      return;
    }

    const validDocs = documents.filter(d => d.trim());
    const validLinks = links.filter(l => l.trim());

    if (validDocs.length === 0 && validLinks.length === 0) {
      setError('Please provide at least one document or link as proof');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        documents: validDocs,
        links: validLinks,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to submit proof');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatUSD = (value: bigint): string => {
    const num = Number(formatUnits(value, 6));
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  return (
    <div className="fixed inset-0 bg-surface-sunken/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-ink">Submit Milestone Proof</h3>
            <p className="text-sm text-ink-muted mt-1">
              Milestone {milestoneIndex + 1}: {milestone.description || 'Untitled'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-overlay rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-ink-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Milestone Info */}
          <div className="bg-surface-overlay/50 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-ink-muted">Amount to Release:</span>
                <span className="text-ink font-semibold ml-2">{formatUSD(milestone.amount)}</span>
              </div>
              {milestone.deadline > 0n && (
                <div>
                  <span className="text-ink-muted">Deadline:</span>
                  <span className="text-ink ml-2">
                    {new Date(Number(milestone.deadline) * 1000).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
              <p className="text-danger text-sm">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Submission Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Phase 1 Completion - Development Done"
              className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:border-gold-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Description of Completed Work *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what was accomplished, KPIs met, deliverables completed..."
              rows={4}
              className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:border-gold-500 resize-none"
            />
          </div>

          {/* Documents */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-ink-muted">
                Documents (IPFS/URL)
              </label>
              <button
                onClick={handleAddDocument}
                className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Document
              </button>
            </div>
            <div className="space-y-2">
              {documents.map((doc, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                    <input
                      type="text"
                      value={doc}
                      onChange={(e) => {
                        const newDocs = [...documents];
                        newDocs[index] = e.target.value;
                        setDocuments(newDocs);
                      }}
                      placeholder="ipfs://... or https://..."
                      className="w-full pl-10 pr-4 py-2 bg-surface-overlay border border-border-strong rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:border-gold-500 text-sm"
                    />
                  </div>
                  {documents.length > 1 && (
                    <button
                      onClick={() => handleRemoveDocument(index)}
                      className="p-2 hover:bg-danger/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-danger" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-faint mt-1">
              Upload reports, invoices, receipts, or other proof documents
            </p>
          </div>

          {/* Links */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-ink-muted">
                Reference Links
              </label>
              <button
                onClick={handleAddLink}
                className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Link
              </button>
            </div>
            <div className="space-y-2">
              {links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1 relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                    <input
                      type="text"
                      value={link}
                      onChange={(e) => {
                        const newLinks = [...links];
                        newLinks[index] = e.target.value;
                        setLinks(newLinks);
                      }}
                      placeholder="https://..."
                      className="w-full pl-10 pr-4 py-2 bg-surface-overlay border border-border-strong rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:border-gold-500 text-sm"
                    />
                  </div>
                  {links.length > 1 && (
                    <button
                      onClick={() => handleRemoveLink(index)}
                      className="p-2 hover:bg-danger/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-danger" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-faint mt-1">
              GitHub repos, demo sites, news articles, or other relevant links
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-surface-overlay hover:bg-border-strong text-ink font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-gold-600 hover:bg-gold-700 disabled:bg-border-strong disabled:cursor-not-allowed text-ink font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="w-5 h-5" /> Submit for Review</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// VIEW PROOF MODAL
// ============================================================================

interface ViewProofModalProps {
  proof: MilestoneProof;
  milestone: MilestoneData;
  onClose: () => void;
}

function ViewProofModal({ proof, milestone, onClose }: ViewProofModalProps) {
  const formatUSD = (value: bigint): string => {
    const num = Number(formatUnits(value, 6));
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success/10 text-success';
      case 'rejected': return 'bg-danger/10 text-danger';
      default: return 'bg-gold-500/20 text-gold-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-surface-sunken/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-ink">{proof.title}</h3>
            <p className="text-sm text-ink-muted mt-1">
              Submitted {new Date(proof.submittedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(proof.status)}`}>
              {proof.status}
            </span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-overlay rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-ink-muted" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Milestone Info */}
          <div className="bg-surface-overlay/50 rounded-xl p-4">
            <p className="text-sm text-ink-muted mb-1">Milestone Amount</p>
            <p className="text-xl font-bold text-ink">{formatUSD(milestone.amount)}</p>
          </div>

          {/* Admin Notes (if rejected) */}
          {proof.status === 'rejected' && proof.adminNotes && (
            <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg">
              <p className="text-sm font-medium text-danger mb-1">Rejection Reason:</p>
              <p className="text-danger/80">{proof.adminNotes}</p>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-sm font-medium text-ink-muted mb-2">Description</h4>
            <p className="text-ink-muted whitespace-pre-wrap">{proof.description}</p>
          </div>

          {/* Documents */}
          {proof.documents.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-ink-muted mb-2">Documents</h4>
              <div className="space-y-2">
                {proof.documents.map((doc, index) => (
                  <a
                    key={index}
                    href={doc.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${doc.replace('ipfs://', '')}` : doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-surface-overlay/50 rounded-lg hover:bg-surface-overlay transition-colors"
                  >
                    <FileText className="w-4 h-4 text-gold-400" />
                    <span className="text-gold-400 text-sm truncate flex-1">{doc}</span>
                    <ExternalLink className="w-4 h-4 text-ink-faint" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {proof.links.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-ink-muted mb-2">Reference Links</h4>
              <div className="space-y-2">
                {proof.links.map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-surface-overlay/50 rounded-lg hover:bg-surface-overlay transition-colors"
                  >
                    <LinkIcon className="w-4 h-4 text-gold-400" />
                    <span className="text-gold-400 text-sm truncate flex-1">{link}</span>
                    <ExternalLink className="w-4 h-4 text-ink-faint" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-3 bg-surface-overlay hover:bg-border-strong text-ink font-medium rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProjectOwnerPanel({
  projectId,
  escrowAddress,
  projectState,
  totalRaised,
  fundingGoal,
  onRefresh,
}: ProjectOwnerPanelProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { explorerUrl } = useChainConfig();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [milestoneProofs, setMilestoneProofs] = useState<Record<number, MilestoneProof>>({});
  const [releasedFunds, setReleasedFunds] = useState<bigint>(0n);

  // Modal state
  const [submitProofModal, setSubmitProofModal] = useState<{ milestone: MilestoneData; index: number } | null>(null);
  const [viewProofModal, setViewProofModal] = useState<{ proof: MilestoneProof; milestone: MilestoneData } | null>(null);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadData = useCallback(async () => {
    if (!publicClient || !escrowAddress) return;

    try {
      // Load milestones from contract
      const milestonesData = await publicClient.readContract({
        address: escrowAddress as `0x${string}`,
        abi: RWAEscrowVaultABI,
        functionName: 'getMilestones',
        args: [BigInt(projectId)],
      }) as MilestoneData[];

      setMilestones(milestonesData);

      // Calculate released funds
      const released = milestonesData
        .filter(m => m.state === MILESTONE_STATE.RELEASED)
        .reduce((sum, m) => sum + m.amount, 0n);
      setReleasedFunds(released);

      // Load milestone proofs from API
      try {
        const response = await fetch(`/api/milestones/proofs?projectId=${projectId}`);
        if (response.ok) {
          const data = await response.json();
          const proofsMap: Record<number, MilestoneProof> = {};
          (data.proofs || []).forEach((proof: MilestoneProof) => {
            proofsMap[proof.milestoneIndex] = proof;
          });
          setMilestoneProofs(proofsMap);
        }
      } catch (e) {
        console.log('No milestone proofs found');
      }
    } catch (e) {
      console.error('Failed to load owner panel data:', e);
    }
  }, [publicClient, escrowAddress, projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleActivateProject = async () => {
    if (!walletClient || !address) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const hash = await walletClient.writeContract({
        address: escrowAddress as `0x${string}`,
        abi: RWAEscrowVaultABI,
        functionName: 'activateProject',
        args: [BigInt(projectId)],
      });

      await publicClient?.waitForTransactionReceipt({ hash });
      setSuccess('Project activated successfully!');
      onRefresh();
      loadData();
    } catch (e: any) {
      console.error('Activate error:', e);
      setError(e.message || 'Failed to activate project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitProof = async (
    milestoneIndex: number,
    proof: { title: string; description: string; documents: string[]; links: string[] }
  ) => {
    const response = await fetch('/api/milestones/proofs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        milestoneIndex,
        ownerAddress: address,
        ...proof,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to submit proof');
    }

    setSuccess('Milestone proof submitted for review!');
    loadData();
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const formatUSD = (value: bigint): string => {
    const num = Number(formatUnits(value, 6));
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const progressPercent = fundingGoal > 0n
    ? Number((totalRaised * 100n) / fundingGoal)
    : 0;

  const canSubmitProof = (milestone: MilestoneData, index: number): boolean => {
    // Can submit if:
    // - Project is funded or executing
    // - Milestone is pending or was rejected
    // - No pending proof exists
    const proof = milestoneProofs[index];
    const isFundedOrExecuting = projectState === PROJECT_STATE.FUNDED || projectState === PROJECT_STATE.EXECUTING;
    const milestoneIsPending = milestone.state === MILESTONE_STATE.PENDING;
    const proofWasRejected = proof?.status === 'rejected';
    const noProofPending = !proof || proof.status !== 'pending';

    return isFundedOrExecuting && (milestoneIsPending || proofWasRejected) && noProofPending;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink">Project Owner Dashboard</h2>
              <p className="text-sm text-ink-muted">Manage your crowdfunding project</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${PROJECT_STATE_COLORS[projectState]}`}>
            {PROJECT_STATE_LABELS[projectState]}
          </span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-danger/10 border border-danger/30 rounded-lg flex items-center gap-3">
          <XCircle className="w-5 h-5 text-danger flex-shrink-0" />
          <p className="text-danger">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-danger" />
          </button>
        </div>
      )}

      {success && (
        <div className="mx-6 mt-4 p-4 bg-success/10 border border-success/30 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          <p className="text-success">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X className="w-4 h-4 text-success" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-overlay/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-ink-muted text-sm mb-1">
            <Target className="w-4 h-4" />
            Funding Goal
          </div>
          <p className="text-xl font-bold text-ink">{formatUSD(fundingGoal)}</p>
        </div>

        <div className="bg-surface-overlay/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-ink-muted text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Total Raised
          </div>
          <p className="text-xl font-bold text-success">{formatUSD(totalRaised)}</p>
          <p className="text-xs text-ink-faint mt-1">{progressPercent.toFixed(1)}% of goal</p>
        </div>

        <div className="bg-surface-overlay/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-ink-muted text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            Released to You
          </div>
          <p className="text-xl font-bold text-gold-400">{formatUSD(releasedFunds)}</p>
          <p className="text-xs text-ink-faint mt-1">Via milestones</p>
        </div>

        <div className="bg-surface-overlay/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-ink-muted text-sm mb-1">
            <Clock className="w-4 h-4" />
            Pending Release
          </div>
          <p className="text-xl font-bold text-warning">{formatUSD(totalRaised - releasedFunds)}</p>
          <p className="text-xs text-ink-faint mt-1">Locked in escrow</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mx-6 mb-4 p-4 bg-gold-500/10 border border-gold-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gold-300">
            <p className="font-medium mb-1">How to release funds:</p>
            <ol className="list-decimal list-inside text-gold-400/80 space-y-1">
              <li>Complete the work for a milestone</li>
              <li>Click "Submit Proof" and provide documents/links as evidence</li>
              <li>Platform admin reviews your submission</li>
              <li>If approved, admin releases the funds to your wallet</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Activate Button (only for inactive projects) */}
      {projectState === PROJECT_STATE.INACTIVE && (
        <div className="px-6 pb-4">
          <button
            onClick={handleActivateProject}
            disabled={isLoading}
            className="w-full py-3 bg-gold-600 hover:bg-gold-700 disabled:bg-border-strong disabled:cursor-not-allowed text-ink font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Activating...</>
            ) : (
              <><Play className="w-5 h-5" /> Activate Project</>
            )}
          </button>
        </div>
      )}

      {/* Milestones */}
      <div className="p-6 border-t border-border">
        <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gold-400" />
          Milestones
          <span className="text-sm font-normal text-ink-muted">
            ({milestones.filter(m => m.state === MILESTONE_STATE.RELEASED).length}/{milestones.length} released)
          </span>
        </h3>

        {milestones.length === 0 ? (
          <div className="text-center py-8 text-ink-faint">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No milestones configured</p>
          </div>
        ) : (
          <div className="space-y-3">
            {milestones.map((milestone, index) => {
              const proof = milestoneProofs[index];
              const canSubmit = canSubmitProof(milestone, index);

              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border transition-colors ${
                    milestone.state === MILESTONE_STATE.RELEASED
                      ? 'bg-success/10 border-success/30'
                      : milestone.state === MILESTONE_STATE.APPROVED
                      ? 'bg-warning/10 border-warning/30'
                      : proof?.status === 'pending'
                      ? 'bg-gold-500/10 border-gold-500/30'
                      : proof?.status === 'rejected'
                      ? 'bg-danger/10 border-danger/30'
                      : 'bg-surface-overlay/50 border-border-strong'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        milestone.state === MILESTONE_STATE.RELEASED
                          ? 'bg-success text-ink'
                          : milestone.state === MILESTONE_STATE.APPROVED
                          ? 'bg-warning text-ink'
                          : 'bg-border-strong text-ink-muted'
                      }`}>
                        {milestone.state === MILESTONE_STATE.RELEASED ? '✓' : index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-ink font-medium">
                          {milestone.description || `Milestone ${index + 1}`}
                        </p>
                        <p className="text-sm text-ink-muted mt-1">
                          Amount: {formatUSD(milestone.amount)}
                        </p>
                        {milestone.deadline > 0n && (
                          <p className="text-xs text-ink-faint mt-1">
                            Deadline: {new Date(Number(milestone.deadline) * 1000).toLocaleDateString()}
                          </p>
                        )}

                        {/* Proof Status */}
                        {proof && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              proof.status === 'approved' ? 'bg-success/10 text-success' :
                              proof.status === 'rejected' ? 'bg-danger/10 text-danger' :
                              'bg-gold-500/20 text-gold-400'
                            }`}>
                              Proof: {proof.status}
                            </span>
                            <button
                              onClick={() => setViewProofModal({ proof, milestone })}
                              className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" /> View
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${MILESTONE_STATE_COLORS[milestone.state]}`}>
                        {MILESTONE_STATE_LABELS[milestone.state]}
                      </span>

                      {/* Submit Proof Button */}
                      {canSubmit && (
                        <button
                          onClick={() => setSubmitProofModal({ milestone, index })}
                          className="px-3 py-1.5 bg-gold-600 hover:bg-gold-700 text-ink text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          {proof?.status === 'rejected' ? 'Resubmit' : 'Submit Proof'}
                        </button>
                      )}

                      {/* Released info */}
                      {milestone.state === MILESTONE_STATE.RELEASED && milestone.releasedAt > 0n && (
                        <span className="text-xs text-ink-faint">
                          {new Date(Number(milestone.releasedAt) * 1000).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border bg-surface/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-faint">Escrow Contract</span>
          <a
            href={`${explorerUrl}/address/${escrowAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-400 hover:text-gold-300 flex items-center gap-1"
          >
            {escrowAddress.slice(0, 6)}...{escrowAddress.slice(-4)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Modals */}
      {submitProofModal && (
        <SubmitProofModal
          milestone={submitProofModal.milestone}
          milestoneIndex={submitProofModal.index}
          projectId={projectId}
          existingProof={milestoneProofs[submitProofModal.index]}
          onClose={() => setSubmitProofModal(null)}
          onSubmit={(proof) => handleSubmitProof(submitProofModal.index, proof)}
        />
      )}

      {viewProofModal && (
        <ViewProofModal
          proof={viewProofModal.proof}
          milestone={viewProofModal.milestone}
          onClose={() => setViewProofModal(null)}
        />
      )}
    </div>
  );
}
