// src/app/admin/projects/ProjectManagement.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ZERO_ADDRESS } from '@/config/contracts';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { RWAEscrowVaultABI } from '@/config/abis';
import { publicClient } from '../client';
import {
  Project,
  Milestone,
  TokenBalance,
  STATUS_NAMES,
  STATUS_COLORS,
  MILESTONE_STATUS,
} from '../constants';
import {
  formatUSD,
  formatTokenAmount,
  getTokenSymbol,
} from '../helpers';
import { ProjectContractsModal } from '../components';
import { ScrollText, AlertTriangle } from 'lucide-react';

interface ProjectManagementProps {
  projects: Project[];
  onRefresh: () => void;
}

export default function ProjectManagement({ projects, onRefresh }: ProjectManagementProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showContractsModal, setShowContractsModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState<number | null>(null);
  const [escrowFunding, setEscrowFunding] = useState<any>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusMilestoneIndex, setStatusMilestoneIndex] = useState<number | null>(null);
  const [newMilestoneStatus, setNewMilestoneStatus] = useState<number>(0);

  const { writeContract, data: txHash, reset: resetTx } = useWriteContract();
  const { isSuccess: txSuccess, isLoading: txLoading } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txSuccess && selectedProject) {
      setProcessing(false);
      setResult({ success: true, message: 'Transaction confirmed!' });
      setTimeout(() => {
        loadMilestones();
        loadEscrowFunding();
        onRefresh();
      }, 2000);
      resetTx();
    }
  }, [txSuccess]);

  const loadMilestones = useCallback(async () => {
    if (!selectedProject || selectedProject.escrowVault === ZERO_ADDRESS) return;

    setMilestonesLoading(true);
    try {
      const data = await publicClient.readContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: RWAEscrowVaultABI,
        functionName: 'getMilestones',
        args: [BigInt(selectedProject.id)],
      });
      setMilestones(data as Milestone[]);
    } catch (error) {
      console.error('Error loading milestones:', error);
      setMilestones([]);
    } finally {
      setMilestonesLoading(false);
    }
  }, [selectedProject]);

  const loadEscrowFunding = useCallback(async () => {
    if (!selectedProject || selectedProject.escrowVault === ZERO_ADDRESS) return;

    try {
      const data = await publicClient.readContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: RWAEscrowVaultABI,
        functionName: 'getProjectFunding',
        args: [BigInt(selectedProject.id)],
      });
      setEscrowFunding(data);
    } catch (error) {
      console.error('Error loading escrow funding:', error);
      setEscrowFunding(null);
    }
  }, [selectedProject]);

  const loadTokenBalances = useCallback(async () => {
    if (!selectedProject || selectedProject.escrowVault === ZERO_ADDRESS) return;

    try {
      const tokens = await publicClient.readContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: RWAEscrowVaultABI,
        functionName: 'getProjectTokens',
        args: [BigInt(selectedProject.id)],
      });

      const balances: TokenBalance[] = [];
      for (const token of tokens as string[]) {
        try {
          const balance = await publicClient.readContract({
            address: selectedProject.escrowVault as `0x${string}`,
            abi: RWAEscrowVaultABI,
            functionName: 'getTokenBalance',
            args: [BigInt(selectedProject.id), token as `0x${string}`],
          });
          const [deposited, released, available] = balance as [bigint, bigint, bigint];
          balances.push({
            token,
            symbol: getTokenSymbol(token),
            deposited,
            released,
            available,
          });
        } catch (e) {
          console.error('Error loading token balance:', e);
        }
      }
      setTokenBalances(balances);
    } catch (error) {
      console.error('Error loading token balances:', error);
      setTokenBalances([]);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject && showDetailModal) {
      loadMilestones();
      loadEscrowFunding();
      loadTokenBalances();
    }
  }, [selectedProject, showDetailModal, loadMilestones, loadEscrowFunding, loadTokenBalances]);

  const openDetailModal = (project: Project) => {
    setSelectedProject(project);
    setShowDetailModal(true);
    setResult(null);
    setMilestones([]);
    setEscrowFunding(null);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedProject(null);
    setMilestones([]);
    setEscrowFunding(null);
    setResult(null);
  };

  const openContractsModal = (project: Project) => {
    setSelectedProject(project);
    setShowContractsModal(true);
  };

  const handleSetMilestoneStatus = async () => {
    if (!selectedProject || selectedProject.escrowVault === ZERO_ADDRESS || statusMilestoneIndex === null) return;
    setProcessing(true);
    setResult(null);

    try {
      writeContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: RWAEscrowVaultABI,
        functionName: 'setMilestoneStatus',
        args: [BigInt(selectedProject.id), BigInt(statusMilestoneIndex), newMilestoneStatus],
      });
      setShowStatusModal(false);
    } catch (error) {
      setResult({ success: false, message: 'Failed to set milestone status' });
      setProcessing(false);
    }
  };

  const handleApproveMilestone = async (milestoneIndex: number) => {
    if (!selectedProject || selectedProject.escrowVault === ZERO_ADDRESS) return;
    setProcessing(true);
    setResult(null);

    try {
      writeContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: RWAEscrowVaultABI,
        functionName: 'approveMilestone',
        args: [BigInt(selectedProject.id), BigInt(milestoneIndex)],
      });
    } catch (error) {
      setResult({ success: false, message: 'Failed to approve milestone' });
      setProcessing(false);
    }
  };

  const handleRejectMilestone = async () => {
    if (!selectedProject || selectedProject.escrowVault === ZERO_ADDRESS || selectedMilestoneIndex === null) return;
    setProcessing(true);
    setResult(null);

    try {
      writeContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: RWAEscrowVaultABI,
        functionName: 'rejectMilestone',
        args: [BigInt(selectedProject.id), BigInt(selectedMilestoneIndex), rejectReason],
      });
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error) {
      setResult({ success: false, message: 'Failed to reject milestone' });
      setProcessing(false);
    }
  };

  const handleReleaseFunds = async (milestoneIndex: number) => {
    if (!selectedProject || selectedProject.escrowVault === ZERO_ADDRESS) return;
    setProcessing(true);
    setResult(null);

    try {
      writeContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: RWAEscrowVaultABI,
        functionName: 'releaseMilestoneFunds',
        args: [BigInt(selectedProject.id), BigInt(milestoneIndex)],
      });
    } catch (error) {
      setResult({ success: false, message: 'Failed to release funds' });
      setProcessing(false);
    }
  };

  const handleRefreshMilestones = () => {
    loadMilestones();
    loadEscrowFunding();
    loadTokenBalances();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-ink">Project Management</h2>
        <button onClick={onRefresh} className="px-4 py-2 bg-gold-600 hover:bg-gold-700 rounded-lg text-ink text-sm">
          Refresh
        </button>
      </div>

      <div className="bg-surface rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-raised">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Raised</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Goal</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Refunds</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {projects.map(project => (
              <tr key={project.id} className="hover:bg-surface-raised/50">
                <td className="px-4 py-4 text-ink">#{project.id}</td>
                <td className="px-4 py-4 text-ink">{project.name || `Project ${project.id}`}</td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium text-ink ${STATUS_COLORS[project.status]}`}>
                    {STATUS_NAMES[project.status]}
                  </span>
                </td>
                <td className="px-4 py-4 text-ink">{formatUSD(project.totalRaised)}</td>
                <td className="px-4 py-4 text-ink-muted">{formatUSD(project.fundingGoal)}</td>
                <td className="px-4 py-4">
                  {project.refundsEnabled ? (
                    <span className="text-success text-sm">Enabled</span>
                  ) : (
                    <span className="text-ink-faint text-sm">Disabled</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openDetailModal(project)}
                      className="px-3 py-1 bg-gold-600 hover:bg-gold-700 rounded text-xs text-ink"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => openContractsModal(project)}
                      className="px-3 py-1 bg-gold-600 hover:bg-gold-700 rounded text-xs text-ink"
                    >
                      Contracts
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedProject && (
        <div className="fixed inset-0 bg-surface-sunken/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-ink">{selectedProject.name || `Project #${selectedProject.id}`}</h3>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium text-ink ${STATUS_COLORS[selectedProject.status]}`}>
                    {STATUS_NAMES[selectedProject.status]}
                  </span>
                </div>
                <button onClick={closeDetailModal} className="text-ink-muted hover:text-ink text-2xl">×</button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-surface-raised rounded-lg p-4">
                  <p className="text-ink-muted text-sm">Funding Goal</p>
                  <p className="text-ink text-lg font-semibold">
                    {escrowFunding ? formatUSD(escrowFunding.fundingGoal) : formatUSD(selectedProject.fundingGoal)}
                  </p>
                </div>
                <div className="bg-surface-raised rounded-lg p-4">
                  <p className="text-ink-muted text-sm">Total Raised</p>
                  <p className="text-ink text-lg font-semibold">
                    {escrowFunding ? formatUSD(escrowFunding.totalRaised) : formatUSD(selectedProject.totalRaised)}
                  </p>
                </div>
              </div>

              {/* Quick Contracts Link */}
              <div className="mb-6">
                <button
                  onClick={() => {
                    closeDetailModal();
                    openContractsModal(selectedProject);
                  }}
                  className="w-full p-4 bg-gold-600/20 border border-gold-500/30 rounded-lg hover:bg-gold-600/30 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <ScrollText className="w-6 h-6 text-gold-300" />
                    <div className="text-left">
                      <p className="text-ink font-medium">View All Deployed Contracts</p>
                      <p className="text-gold-300 text-sm">Security Token, Escrow, Compliance, Modules...</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Token Balances */}
              {tokenBalances.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-ink-muted uppercase tracking-wide mb-3">Token Balances</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {tokenBalances.map((tb, index) => (
                      <div key={index} className="bg-surface-raised rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-ink font-medium">{tb.symbol}</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-ink-muted">Deposited:</span>
                            <span className="text-ink">{formatTokenAmount(tb.deposited, tb.token)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-muted">Available:</span>
                            <span className="text-success font-medium">{formatTokenAmount(tb.available, tb.token)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestones */}
              {selectedProject.escrowVault !== ZERO_ADDRESS && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-medium text-ink-muted uppercase tracking-wide">Milestones</h4>
                    <button
                      onClick={handleRefreshMilestones}
                      disabled={milestonesLoading}
                      className="px-3 py-1 bg-surface-overlay hover:bg-ink-faint disabled:opacity-50 rounded text-xs text-ink"
                    >
                      {milestonesLoading ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>

                  {milestonesLoading ? (
                    <div className="bg-surface-raised rounded-lg p-4">
                      <p className="text-ink-muted">Loading milestones...</p>
                    </div>
                  ) : milestones.length === 0 ? (
                    <div className="bg-surface-raised rounded-lg p-4">
                      <p className="text-ink-muted">No milestones created yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {milestones.map((milestone, index) => {
                        const statusInfo = MILESTONE_STATUS[milestone.status] || { label: 'Unknown', color: 'bg-ink-faint' };
                        return (
                          <div key={index} className="bg-surface-raised rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-ink font-medium">{milestone.description || `Milestone ${index + 1}`}</p>
                                <p className="text-ink-muted text-sm">{Number(milestone.percentage) / 100}% of funds</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium text-ink ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </div>

                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => {
                                  setStatusMilestoneIndex(index);
                                  setNewMilestoneStatus(milestone.status);
                                  setShowStatusModal(true);
                                }}
                                disabled={processing || txLoading}
                                className="px-3 py-1 bg-surface-overlay hover:bg-ink-faint disabled:opacity-50 rounded text-xs text-ink"
                              >
                                Change Status
                              </button>

                              {milestone.status === 1 && (
                                <>
                                  <button
                                    onClick={() => handleApproveMilestone(index)}
                                    disabled={processing || txLoading}
                                    className="px-3 py-1 bg-success hover:bg-success disabled:opacity-50 rounded text-xs text-ink"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedMilestoneIndex(index);
                                      setShowRejectModal(true);
                                    }}
                                    disabled={processing || txLoading}
                                    className="px-3 py-1 bg-danger hover:bg-danger disabled:opacity-50 rounded text-xs text-ink"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {milestone.status === 2 && (
                                <button
                                  onClick={() => handleReleaseFunds(index)}
                                  disabled={processing || txLoading}
                                  className="px-3 py-1 bg-gold-600 hover:bg-gold-700 disabled:opacity-50 rounded text-xs text-ink"
                                >
                                  Release Funds
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {(processing || txLoading) && (
                <div className="p-4 rounded-lg bg-gold-900/50 text-gold-400 mb-4">
                  Processing transaction... Please confirm in your wallet.
                </div>
              )}

              {result && (
                <div className={`p-4 rounded-lg ${result.success ? 'bg-success-muted text-success' : 'bg-danger-muted text-danger'}`}>
                  {result.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Project Contracts Modal */}
      {showContractsModal && selectedProject && (
        <ProjectContractsModal
          project={selectedProject}
          onClose={() => {
            setShowContractsModal(false);
            setSelectedProject(null);
          }}
        />
      )}

      {/* Reject Milestone Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-surface-sunken/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-ink mb-4">Reject Milestone</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full p-3 bg-surface-raised border border-border-strong rounded-lg text-ink placeholder-ink-faint mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedMilestoneIndex(null);
                }}
                className="flex-1 px-4 py-2 bg-surface-overlay hover:bg-surface-raised rounded-lg text-ink"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectMilestone}
                disabled={processing || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-danger hover:bg-danger disabled:opacity-50 rounded-lg text-ink"
              >
                {processing ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-surface-sunken/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-ink mb-4">Change Milestone Status</h3>
            <p className="text-warning text-sm mb-4 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Admin override - use with caution</p>
            <div className="mb-4">
              <label className="block text-ink-muted text-sm mb-2">New Status</label>
              <select
                value={newMilestoneStatus}
                onChange={(e) => setNewMilestoneStatus(Number(e.target.value))}
                className="w-full p-3 bg-surface-raised border border-border-strong rounded-lg text-ink"
              >
                <option value={0}>0 - Pending</option>
                <option value={1}>1 - Submitted</option>
                <option value={2}>2 - Approved</option>
                <option value={3}>3 - Rejected</option>
                <option value={4}>4 - Disputed</option>
                <option value={5}>5 - Released</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setStatusMilestoneIndex(null);
                }}
                className="flex-1 px-4 py-2 bg-surface-overlay hover:bg-surface-raised rounded-lg text-ink"
              >
                Cancel
              </button>
              <button
                onClick={handleSetMilestoneStatus}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-gold-600 hover:bg-gold-700 disabled:opacity-50 rounded-lg text-ink"
              >
                {processing ? 'Processing...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
