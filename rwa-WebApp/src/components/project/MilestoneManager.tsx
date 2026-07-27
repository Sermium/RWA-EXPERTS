// src/components/project/MilestoneManager.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { Address } from 'viem';
import { RWAEscrowVaultABI } from '@/config/abis';
import { useChainConfig } from '@/hooks/useChainConfig';

const MILESTONE_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Pending', color: 'bg-gray-500/20 text-ink-muted' },
  1: { label: 'Approved', color: 'bg-success/20 text-success' },
  2: { label: 'Released', color: 'bg-success/20 text-success' },
  3: { label: 'Disputed', color: 'bg-warning/20 text-warning' },
  4: { label: 'Cancelled', color: 'bg-danger/20 text-danger' },
  5: { label: 'Rejected', color: 'bg-danger/20 text-danger' },
};

// Matches the ABI's getMilestones output
interface Milestone {
  id: bigint;
  description: string;
  targetAmount: bigint;
  releasedAmount: bigint;
  deadline: bigint;
  status: number;
  proofURI: string;
}

// Matches the contract's Project struct from getProject
interface ProjectData {
  projectId: bigint;
  projectOwner: string;
  securityToken: string;
  paymentToken: string;
  priceFeed: string;
  fundingGoal: bigint;
  totalRaised: bigint;
  deadline: bigint;
  state: number;
  createdAt: bigint;
  platformFeeBps: bigint;
  maxPriceAge: bigint;
}

interface MilestoneManagerProps {
  projectId: number;
  escrowVault: string;
  isOwner: boolean;
}

export default function MilestoneManager({ projectId, escrowVault, isOwner }: MilestoneManagerProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  
  const {
    chainId,
    chainName,
    isDeployed,
    explorerUrl,
    getTxUrl,
  } = useChainConfig();

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { writeContract: releaseMilestone, data: releaseHash, error: releaseError } = useWriteContract();
  const { isSuccess: releaseSuccess, isLoading: releasePending } = useWaitForTransactionReceipt({ hash: releaseHash });

  const escrowVaultAddress = useMemo(() => {
    if (!escrowVault || escrowVault === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    return escrowVault as Address;
  }, [escrowVault]);

  const loadData = async () => {
    if (!publicClient || !escrowVaultAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const [milestonesData, project] = await Promise.all([
        publicClient.readContract({
          address: escrowVaultAddress,
          abi: RWAEscrowVaultABI,
          functionName: 'getMilestones',
          args: [BigInt(projectId)],
        }),
        publicClient.readContract({
          address: escrowVaultAddress,
          abi: RWAEscrowVaultABI,
          functionName: 'getProject',
          args: [BigInt(projectId)],
        }),
      ]);

      // Convert readonly array to mutable array with proper typing
      const milestonesArray = (milestonesData as readonly {
        id: bigint;
        description: string;
        targetAmount: bigint;
        releasedAmount: bigint;
        deadline: bigint;
        status: number;
        proofURI: string;
      }[]).map(m => ({
        id: m.id,
        description: m.description,
        targetAmount: m.targetAmount,
        releasedAmount: m.releasedAmount,
        deadline: m.deadline,
        status: m.status,
        proofURI: m.proofURI,
      }));

      setMilestones(milestonesArray);
      setProjectData(project as unknown as ProjectData);
    } catch (err) {
      console.error('Failed to load milestones:', err);
      setError('Failed to load milestone data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (escrowVaultAddress && publicClient) {
      loadData();
    }
  }, [escrowVaultAddress, projectId, chainId, publicClient]);

  useEffect(() => {
    if (releaseSuccess) {
      loadData();
    }
  }, [releaseSuccess]);

  const handleReleaseMilestone = (milestoneId: bigint) => {
    if (!escrowVaultAddress) return;
    
    releaseMilestone({
      address: escrowVaultAddress,
      abi: RWAEscrowVaultABI,
      functionName: 'releaseMilestoneFunds',
      args: [BigInt(projectId), milestoneId],
    });
  };

  // Calculate totals
  const totalTargetAmount = milestones.reduce((sum, m) => sum + Number(m.targetAmount), 0);
  const totalReleasedAmount = milestones.reduce((sum, m) => sum + Number(m.releasedAmount), 0);

  const totalRaisedUSD = projectData ? Number(projectData.totalRaised) / 1e6 : 0;
  const fundingGoalUSD = projectData ? Number(projectData.fundingGoal) / 1e6 : 0;
  const totalReleasedUSD = totalReleasedAmount / 1e6;
  const totalTargetUSD = totalTargetAmount / 1e6;
  
  // Project states: INACTIVE=0, ACTIVE=1, FUNDED=2, COMPLETED=3, CANCELLED=4, DISPUTED=5
  const isFunded = projectData?.state === 2 || projectData?.state === 3;
  const projectStateLabel = ['Inactive', 'Active', 'Funded', 'Completed', 'Cancelled', 'Disputed'][projectData?.state ?? 0];

  if (!isDeployed) {
    return (
      <div className="bg-surface rounded-xl p-6 border border-border">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-ink mb-2">Not Available</h3>
          <p className="text-ink-muted">
            Milestone management is not available on {chainName || 'this network'}.
          </p>
        </div>
      </div>
    );
  }

  if (!escrowVaultAddress) {
    return (
      <div className="bg-surface rounded-xl p-6 border border-border">
        <div className="text-center py-8">
          <p className="text-ink-muted">No escrow vault configured for this project.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-surface rounded-xl p-6 border border-border">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface rounded-xl p-6 border border-border">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-ink mb-2">Error Loading Data</h3>
          <p className="text-ink-muted mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gold-600 hover:bg-gold-500 text-ink rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl p-6 border border-border">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-ink">Milestone Management</h2>
          <p className="text-ink-muted text-sm mt-1">
            Raised: ${totalRaisedUSD.toLocaleString()} / ${fundingGoalUSD.toLocaleString()} |
            Released: ${totalReleasedUSD.toLocaleString()} / ${totalTargetUSD.toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {chainName && (
              <span className="text-ink-faint text-xs">Network: {chainName}</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded ${
              isFunded ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
            }`}>
              {projectStateLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Funding Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-ink-muted">Funding Progress</span>
          <span className="text-ink">
            {fundingGoalUSD > 0 ? ((totalRaisedUSD / fundingGoalUSD) * 100).toFixed(1) : 0}%
          </span>
        </div>
        <div className="h-3 bg-surface-overlay rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold-500 to-gold-light-500 rounded-full transition-all"
            style={{ width: `${fundingGoalUSD > 0 ? Math.min((totalRaisedUSD / fundingGoalUSD) * 100, 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Release Progress Bar */}
      {totalTargetUSD > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-ink-muted">Funds Released</span>
            <span className="text-ink">
              {((totalReleasedUSD / totalTargetUSD) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-surface-overlay rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all"
              style={{ width: `${Math.min((totalReleasedUSD / totalTargetUSD) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Escrow Contract Link */}
      {explorerUrl && (
        <div className="mb-4 p-3 bg-surface-overlay/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-ink-muted text-sm">Escrow Contract</span>
            <a
              href={`${explorerUrl}/address/${escrowVaultAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-400 hover:text-gold-300 text-sm flex items-center gap-1"
            >
              {escrowVaultAddress.slice(0, 6)}...{escrowVaultAddress.slice(-4)}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Milestones List */}
      {milestones.length === 0 ? (
        <div className="text-center py-8 bg-surface-overlay/30 rounded-lg">
          <p className="text-ink-muted mb-2">No milestones configured for this project</p>
          <p className="text-ink-faint text-sm">
            Milestones are set during project creation
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {milestones.map((milestone, index) => {
            const targetUSD = Number(milestone.targetAmount) / 1e6;
            const releasedUSD = Number(milestone.releasedAmount) / 1e6;
            const isFullyReleased = milestone.releasedAmount >= milestone.targetAmount;
            const isApproved = milestone.status === 1;
            const canRelease = isOwner && isApproved && !isFullyReleased && isFunded;

            return (
              <div
                key={milestone.id.toString()}
                className="bg-surface-overlay/50 rounded-lg p-4 border border-border-strong"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-ink font-medium">
                        Milestone {index + 1}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${MILESTONE_STATUS[milestone.status]?.color || 'bg-gray-500/20 text-ink-muted'}`}>
                        {MILESTONE_STATUS[milestone.status]?.label || 'Unknown'}
                      </span>
                    </div>
                    <p className="text-ink-muted">{milestone.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-ink-muted">
                        Target: <span className="text-ink">${targetUSD.toLocaleString()}</span>
                      </span>
                      <span className="text-ink-muted">
                        Released: <span className={releasedUSD > 0 ? 'text-emerald-400' : 'text-ink'}>${releasedUSD.toLocaleString()}</span>
                      </span>
                      <span className="text-ink-faint">
                        Deadline: {new Date(Number(milestone.deadline) * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Release button for approved milestones */}
                  {canRelease && (
                    <button
                      onClick={() => handleReleaseMilestone(milestone.id)}
                      disabled={releasePending}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-surface-overlay text-ink text-sm rounded-lg transition"
                    >
                      {releasePending ? 'Releasing...' : 'Release Funds'}
                    </button>
                  )}
                </div>

                {/* Progress within milestone */}
                {targetUSD > 0 && (
                  <div className="mt-3">
                    <div className="h-2 bg-surface-overlay rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isFullyReleased ? 'bg-emerald-500' : 'bg-gold-500'}`}
                        style={{ width: `${Math.min((releasedUSD / targetUSD) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Proof URI if available */}
                {milestone.proofURI && (
                  <div className="mt-3 p-2 bg-surface rounded">
                    <p className="text-ink-muted text-xs mb-1">Proof:</p>
                    <a
                      href={milestone.proofURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold-400 hover:text-gold-300 text-sm break-all"
                    >
                      {milestone.proofURI}
                    </a>
                  </div>
                )}

                {/* Fully released indicator */}
                {isFullyReleased && (
                  <div className="mt-3 p-2 bg-success/10 border border-success/30 rounded">
                    <p className="text-success text-sm flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Fully Released
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Transaction Status */}
      {releaseHash && (
        <div className="mt-4 p-3 bg-surface-overlay/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-ink-muted text-sm">
              {releasePending ? 'Releasing funds...' : releaseSuccess ? 'Funds released!' : 'Transaction pending'}
            </span>
            <a
              href={getTxUrl(releaseHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-400 hover:text-gold-300 text-sm"
            >
              View TX
            </a>
          </div>
        </div>
      )}

      {/* Error display */}
      {releaseError && (
        <div className="mt-4 p-3 bg-danger/10 border border-danger/30 rounded-lg">
          <p className="text-danger text-sm">
            {releaseError.message || 'Transaction failed'}
          </p>
        </div>
      )}
    </div>
  );
}
