// src/app/admin/projects/ProjectsClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useChainConfig } from '@/hooks/useChainConfig';
import Link from 'next/link';
import { ZERO_ADDRESS } from '@/config/contracts';
import { RWAProjectNFTABI, RWAEscrowVaultABI } from '@/config/abis';
import MilestoneAdmin from '@/components/admin/MilestoneAdmin';
import { STATUS_NAMES } from '../constants';
import {
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Globe,
  Wallet,
  X,
  Eye,
  Ban,
  RotateCcw,
  Play,
  Archive,
  FolderOpen
} from 'lucide-react';

// ============================================
// INTERFACES
// ============================================

interface Project {
  id: number;
  owner: string;
  metadataURI: string;
  fundingGoal: bigint;
  totalRaised: bigint;
  minInvestment: bigint;
  maxInvestment: bigint;
  deadline: number;
  status: number;
  securityToken: string;
  escrowVault: string;
  createdAt: number;
  refundsEnabled?: boolean;
}

interface ProjectMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}

// ============================================
// CONSTANTS
// ============================================

const LOCAL_STATUS_COLORS: Record<number, string> = {
  0: 'bg-ink-faint/20 text-ink-muted',
  1: 'bg-warning/20 text-warning',
  2: 'bg-gold-500/20 text-gold-400',
  3: 'bg-success/20 text-success',
  4: 'bg-gold-500/20 text-gold-400',
  5: 'bg-success/20 text-success',
  6: 'bg-danger/20 text-danger',
  7: 'bg-warning/20 text-warning',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const convertIPFSUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    return `https://gateway.pinata.cloud/ipfs/${url.replace('ipfs://', '')}`;
  }
  return url;
};

const formatUSD = (value: bigint): string => {
  return '$' + Number(value).toLocaleString();
};

const formatUSDC = (value: bigint): string => {
  return '$' + (Number(value) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ============================================
// NETWORK BADGE COMPONENT
// ============================================

function NetworkBadge({ 
  chainName, 
  isTestnet 
}: { 
  chainName: string; 
  isTestnet: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-raised/50 rounded-lg">
      <div className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-warning' : 'bg-success'}`} />
      <span className="text-sm text-ink-muted">{chainName}</span>
      {isTestnet && (
        <span className="text-xs px-1.5 py-0.5 bg-warning/20 text-warning rounded">
          Testnet
        </span>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProjectsClient() {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  
  const {
    chainId,
    chainName,
    contracts,
    explorerUrl,
    nativeCurrency,
    isTestnet,
    isDeployed,
    switchToChain,
    isSwitching,
    deployedChains
  } = useChainConfig();

  const projectNFTAddress = contracts?.RWAProjectNFT as `0x${string}` | undefined;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  
  const [processing, setProcessing] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [result, setResult] = useState<any>(null);

  const getExplorerAddressUrl = (address: string) => {
    return explorerUrl ? `${explorerUrl}/address/${address}` : '#';
  };

  const getExplorerTxUrl = (hash: string) => {
    return explorerUrl ? `${explorerUrl}/tx/${hash}` : '#';
  };

  const handleSwitchNetwork = async (targetChainId: number) => {
    if (switchToChain) {
      await switchToChain(targetChainId);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [chainId, projectNFTAddress, publicClient]);

  const fetchProjects = async () => {
    if (!projectNFTAddress || !publicClient) {
      setLoading(false);
      setProjects([]);
      return;
    }

    try {
      setLoading(true);
      
      const total = await publicClient.readContract({
        address: projectNFTAddress,
        abi: RWAProjectNFTABI,
        functionName: 'totalProjects',
      }) as bigint;

      const projectList: Project[] = [];

      for (let i = 1; i <= Number(total); i++) {
        try {
          const data = await publicClient.readContract({
            address: projectNFTAddress,
            abi: RWAProjectNFTABI,
            functionName: 'getProject',
            args: [BigInt(i)],
          }) as any;

          let refundsEnabled = false;
          if (data.escrowVault && data.escrowVault !== ZERO_ADDRESS) {
            try {
              const funding = await publicClient.readContract({
                address: data.escrowVault as `0x${string}`,
                abi: RWAEscrowVaultABI,
                functionName: 'getProjectFunding',
                args: [BigInt(i)],
              }) as any;
              refundsEnabled = funding.refundsEnabled;
            } catch (e) {
              console.error(`[${chainName}] Error checking refunds for project ${i}:`, e);
            }
          }

          projectList.push({
            id: i,
            owner: data.owner,
            metadataURI: data.metadataURI,
            fundingGoal: data.fundingGoal,
            totalRaised: data.totalRaised,
            minInvestment: data.minInvestment,
            maxInvestment: data.maxInvestment,
            deadline: Number(data.deadline),
            status: Number(data.status),
            securityToken: data.securityToken,
            escrowVault: data.escrowVault,
            createdAt: Number(data.createdAt),
            refundsEnabled,
          });
        } catch (e) {
          console.error(`[${chainName}] Error fetching project ${i}:`, e);
        }
      }

      setProjects(projectList);
    } catch (error) {
      console.error(`[${chainName}] Error fetching projects:`, error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async (metadataURI: string) => {
    try {
      const url = convertIPFSUrl(metadataURI);
      const response = await fetch(url);
      const data = await response.json();
      setProjectMetadata(data);
    } catch (error) {
      console.error('Error fetching metadata:', error);
      setProjectMetadata(null);
    }
  };

  const openDetailModal = async (project: Project) => {
    setSelectedProject(project);
    setProjectMetadata(null);
    setShowDetailModal(true);
    setResult(null);
    if (project.metadataURI) {
      await fetchMetadata(project.metadataURI);
    }
  };

  const openCancelModal = (project: Project) => {
    setSelectedProject(project);
    setCancelReason('Project cancelled by admin');
    setShowCancelModal(true);
    setResult(null);
  };

  const openRefundModal = (project: Project) => {
    setSelectedProject(project);
    setShowRefundModal(true);
    setResult(null);
  };

  const handleActivate = async () => {
    if (!selectedProject || !chainId) return;
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch(`/api/admin/projects/${selectedProject.id}/activate?chainId=${chainId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-chain-id': chainId.toString(),
        },
      });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        await fetchProjects();
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedProject || !chainId) return;
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch(`/api/admin/projects/${selectedProject.id}/cancel?chainId=${chainId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-chain-id': chainId.toString(),
        },
        body: JSON.stringify({
          reason: cancelReason,
          enableRefunds: true,
          chainId,
        }),
      });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        await fetchProjects();
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleEnableRefunds = async () => {
    if (!selectedProject || !chainId) return;
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch(`/api/admin/projects/${selectedProject.id}/refund?chainId=${chainId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-chain-id': chainId.toString(),
        },
        body: JSON.stringify({ chainId }),
      });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        await fetchProjects();
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const activeStatuses = [0, 1, 2, 3, 4];
  const archivedStatuses = [5, 6, 7];
  
  const activeProjects = projects.filter(p => activeStatuses.includes(p.status));
  const archivedProjects = projects.filter(p => archivedStatuses.includes(p.status));
  const displayedProjects = showArchived ? archivedProjects : activeProjects;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-surface-sunken">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <Wallet className="w-16 h-16 text-ink-faint mx-auto mb-4" />
          <p className="text-ink-muted">Please connect your wallet to access admin features.</p>
        </div>
      </div>
    );
  }

  if (!projectNFTAddress) {
    return (
      <div className="min-h-screen bg-surface-sunken">
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-ink">Project Management</h1>
            <div className="flex items-center gap-3">
              <NetworkBadge chainName={chainName || 'Unknown'} isTestnet={isTestnet} />
              <Link
                href="/admin"
                className="px-4 py-2 bg-surface-raised hover:bg-surface-overlay text-ink rounded-lg transition"
              >
                Back to Admin
              </Link>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-8 text-center border border-border">
            <AlertCircle className="w-16 h-16 text-warning mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-ink mb-2">Project NFT Not Deployed</h3>
            <p className="text-ink-muted mb-6">
              RWAProjectNFT contract is not configured for {chainName}.
            </p>
            
            {deployedChains.length > 0 && (
              <div>
                <p className="text-ink-faint text-sm mb-3">Switch to a network with contracts deployed:</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {deployedChains
                    .filter(chain => chain.id !== chainId)
                    .map((chain) => (
                      <button
                        key={chain.id}
                        onClick={() => handleSwitchNetwork(chain.id)}
                        disabled={isSwitching}
                        className="px-4 py-2 bg-gold-600 hover:bg-gold-500 text-ink rounded-lg transition disabled:opacity-50"
                      >
                        {isSwitching ? <RefreshCw className="w-4 h-4 animate-spin" /> : chain.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-sunken">

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-ink">Project Management</h1>
          <div className="flex items-center gap-3">
            <NetworkBadge chainName={chainName || 'Unknown'} isTestnet={isTestnet} />
            <Link
              href="/admin"
              className="px-4 py-2 bg-surface-raised hover:bg-surface-overlay text-ink rounded-lg transition"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        {deployedChains.length > 1 && (
          <div className="bg-surface/50 border border-border rounded-xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gold-400" />
                <span className="text-ink-muted">Manage projects on:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {deployedChains.map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => handleSwitchNetwork(chain.id)}
                    disabled={chain.id === chainId || isSwitching}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      chain.id === chainId
                        ? 'bg-gold-500/20 text-gold-400 cursor-default'
                        : 'bg-surface-raised text-ink-muted hover:bg-surface-overlay hover:text-ink'
                    } disabled:opacity-50`}
                  >
                    {isSwitching ? <RefreshCw className="w-3 h-3 animate-spin" /> : chain.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              !showArchived 
                ? 'bg-gold-600 text-ink' 
                : 'bg-surface-raised text-ink-muted hover:bg-surface-overlay'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Active Projects ({activeProjects.length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              showArchived 
                ? 'bg-gold-600 text-ink' 
                : 'bg-surface-raised text-ink-muted hover:bg-surface-overlay'
            }`}
          >
            <Archive className="w-4 h-4" />
            Archived ({archivedProjects.length})
          </button>
          <button
            onClick={fetchProjects}
            className="px-4 py-2 bg-surface-raised hover:bg-surface-overlay text-ink-muted rounded-lg transition flex items-center gap-2 ml-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-ink-muted mt-4">Loading projects from {chainName}...</p>
          </div>
        ) : displayedProjects.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-xl border border-border">
            <p className="text-ink-muted">
              {showArchived ? `No archived projects on ${chainName}` : `No active projects on ${chainName}`}
            </p>
          </div>
        ) : (
          <div className="bg-surface rounded-xl overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-raised">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-ink-muted">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-ink-muted">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-ink-muted">Raised</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-ink-muted">Goal</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-ink-muted">Deadline</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-ink-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayedProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-750">
                      <td className="px-6 py-4 text-ink font-mono">#{project.id}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${LOCAL_STATUS_COLORS[project.status]}`}>
                          {STATUS_NAMES[project.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-ink">{formatUSDC(project.totalRaised)}</td>
                      <td className="px-6 py-4 text-ink-muted">{formatUSD(project.fundingGoal)}</td>
                      <td className="px-6 py-4 text-ink-muted">
                        {new Date(project.deadline * 1000).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openDetailModal(project)}
                            className="px-3 py-1.5 bg-surface-overlay hover:bg-ink-faint text-ink text-sm rounded-lg transition flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>

                          {activeStatuses.includes(project.status) && (
                            <button
                              onClick={() => openCancelModal(project)}
                              className="px-3 py-1.5 bg-danger hover:bg-danger text-ink text-sm rounded-lg transition flex items-center gap-1"
                            >
                              <Ban className="w-3 h-3" />
                              Cancel
                            </button>
                          )}

                          {archivedStatuses.includes(project.status) && 
                           project.totalRaised > 0n && 
                           !project.refundsEnabled && (
                            <button
                              onClick={() => openRefundModal(project)}
                              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-ink text-sm rounded-lg transition flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Refunds
                            </button>
                          )}

                          {project.refundsEnabled && (
                            <span className="px-3 py-1.5 bg-success/20 text-success text-sm rounded-lg flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Refunds On
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 bg-surface/30 border border-border rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-4 text-ink-faint flex-wrap">
              <span>Network: <span className="text-ink-muted">{chainName}</span></span>
              <span>•</span>
              <span>Projects: <span className="text-ink-muted">{projects.length}</span></span>
              <span>•</span>
              <span>Contract: <span className="text-ink-muted font-mono text-xs">{projectNFTAddress?.slice(0, 10)}...</span></span>
            </div>
            {explorerUrl && (
              <a
                href={getExplorerAddressUrl(projectNFTAddress || '')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-gold-400 hover:text-gold-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View Contract
              </a>
            )}
          </div>
        </div>

        {showDetailModal && selectedProject && (
          <div className="fixed inset-0 bg-surface-sunken/70 flex items-center justify-center z-50 overflow-y-auto py-8">
            <div className="bg-surface rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-border">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-ink">
                    Project #{selectedProject.id}
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${LOCAL_STATUS_COLORS[selectedProject.status]}`}>
                      {STATUS_NAMES[selectedProject.status]}
                    </span>
                    <span className="text-ink-faint text-sm">on {chainName}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-ink-muted hover:text-ink transition p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {projectMetadata ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-ink mb-3">
                    {projectMetadata.name || 'Unnamed Project'}
                  </h3>
                  {projectMetadata.image && (
                    <img 
                      src={convertIPFSUrl(projectMetadata.image)} 
                      alt={projectMetadata.name}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  {projectMetadata.description && (
                    <p className="text-ink-muted text-sm mb-4">{projectMetadata.description}</p>
                  )}
                  {projectMetadata.attributes && projectMetadata.attributes.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {projectMetadata.attributes.map((attr, i) => (
                        <div key={i} className="bg-surface-raised rounded-lg p-2">
                          <p className="text-ink-muted text-xs">{attr.trait_type}</p>
                          <p className="text-ink text-sm">{attr.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : selectedProject.metadataURI ? (
                <div className="mb-6 text-center py-4">
                  <RefreshCw className="w-6 h-6 text-gold-500 animate-spin mx-auto" />
                  <p className="text-ink-muted text-sm mt-2">Loading metadata...</p>
                </div>
              ) : null}

              <div className="space-y-4 mb-6">
                <h4 className="text-sm font-medium text-ink-muted uppercase tracking-wide">Funding Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-raised rounded-lg p-4">
                    <p className="text-ink-muted text-sm">Funding Goal</p>
                    <p className="text-ink text-lg font-bold">{formatUSD(selectedProject.fundingGoal)}</p>
                  </div>
                  <div className="bg-surface-raised rounded-lg p-4">
                    <p className="text-ink-muted text-sm">Total Raised</p>
                    <p className="text-ink text-lg font-bold">{formatUSDC(selectedProject.totalRaised)}</p>
                  </div>
                  <div className="bg-surface-raised rounded-lg p-4">
                    <p className="text-ink-muted text-sm">Min Investment</p>
                    <p className="text-ink">{formatUSDC(selectedProject.minInvestment)}</p>
                  </div>
                  <div className="bg-surface-raised rounded-lg p-4">
                    <p className="text-ink-muted text-sm">Max Investment</p>
                    <p className="text-ink">{formatUSDC(selectedProject.maxInvestment)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-raised rounded-lg p-4">
                    <p className="text-ink-muted text-sm">Deadline</p>
                    <p className="text-ink">{new Date(selectedProject.deadline * 1000).toLocaleString()}</p>
                  </div>
                  <div className="bg-surface-raised rounded-lg p-4">
                    <p className="text-ink-muted text-sm">Created</p>
                    <p className="text-ink">{new Date(selectedProject.createdAt * 1000).toLocaleString()}</p>
                  </div>
                </div>

                <h4 className="text-sm font-medium text-ink-muted uppercase tracking-wide mt-6">Contracts</h4>
                <div className="space-y-2">
                  <div className="bg-surface-raised rounded-lg p-3">
                    <p className="text-ink-muted text-xs">Owner</p>
                    <p className="text-ink font-mono text-sm break-all">{selectedProject.owner}</p>
                  </div>
                  {selectedProject.securityToken !== ZERO_ADDRESS && (
                    <div className="bg-surface-raised rounded-lg p-3">
                      <p className="text-ink-muted text-xs">Security Token</p>
                      {explorerUrl ? (
                        <a 
                          href={getExplorerAddressUrl(selectedProject.securityToken)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold-400 font-mono text-sm break-all hover:underline flex items-center gap-1"
                        >
                          {selectedProject.securityToken}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <p className="text-ink font-mono text-sm break-all">{selectedProject.securityToken}</p>
                      )}
                    </div>
                  )}
                  {selectedProject.escrowVault !== ZERO_ADDRESS && (
                    <div className="bg-surface-raised rounded-lg p-3">
                      <p className="text-ink-muted text-xs">Escrow Vault</p>
                      {explorerUrl ? (
                        <a 
                          href={getExplorerAddressUrl(selectedProject.escrowVault)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold-400 font-mono text-sm break-all hover:underline flex items-center gap-1"
                        >
                          {selectedProject.escrowVault}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <p className="text-ink font-mono text-sm break-all">{selectedProject.escrowVault}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedProject.status >= 3 && selectedProject.escrowVault !== ZERO_ADDRESS && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-ink-muted uppercase tracking-wide mb-4">
                    Milestone Management
                  </h4>
                  <MilestoneAdmin
                    projectId={selectedProject.id}
                    escrowVault={selectedProject.escrowVault}
                    onUpdate={fetchProjects}
                  />
                </div>
              )}

              {result && (
                <div className={`mb-4 rounded-lg p-4 flex items-center gap-3 ${
                  result.success 
                    ? 'bg-success/10 border border-success/30' 
                    : 'bg-danger/10 border border-danger/30'
                }`}>
                  {result.success ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      <div>
                        <p className="text-success">{result.message || `Action completed successfully on ${chainName}!`}</p>
                        {result.transaction?.url && (
                          <a 
                            href={result.transaction.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-success/60 text-xs hover:underline flex items-center gap-1 mt-1"
                          >
                            View transaction <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
                      <p className="text-danger">{result.error}</p>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 px-4 py-2 bg-surface-raised hover:bg-surface-overlay text-ink rounded-lg transition"
                >
                  Close
                </button>

                {selectedProject.status === 1 && (
                  <button
                    onClick={handleActivate}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-success hover:bg-success disabled:bg-surface-overlay text-ink rounded-lg transition flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Activating...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Activate Project
                      </>
                    )}
                  </button>
                )}

                {[0, 1, 2, 3, 4].includes(selectedProject.status) && (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openCancelModal(selectedProject);
                    }}
                    className="flex-1 px-4 py-2 bg-danger hover:bg-danger text-ink rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Cancel Project
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showCancelModal && selectedProject && (
          <div className="fixed inset-0 bg-surface-sunken/70 flex items-center justify-center z-50">
            <div className="bg-surface rounded-xl p-6 max-w-lg w-full mx-4 border border-border">
              <h2 className="text-xl font-bold text-ink mb-2">
                Cancel Project #{selectedProject.id}
              </h2>
              <p className="text-ink-muted text-sm mb-4">on {chainName}</p>

              <div className="space-y-4 mb-6">
                <div className="bg-surface-raised rounded-lg p-4">
                  <p className="text-ink-muted text-sm">Total Raised</p>
                  <p className="text-ink text-lg font-bold">{formatUSDC(selectedProject.totalRaised)}</p>
                </div>

                <div>
                  <label className="block text-ink-muted text-sm mb-2">Cancellation Reason</label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-surface-raised border border-border-strong rounded-lg px-4 py-2 text-ink"
                    placeholder="Enter reason..."
                  />
                </div>

                <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-lg p-4">
                  <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-warning font-medium">Warning</p>
                    <p className="text-warning/80 text-sm">
                      This will cancel the project on {chainName} and enable refunds for all investors. This action cannot be undone.
                    </p>
                  </div>
                </div>

                {result && (
                  <div className={`rounded-lg p-4 ${
                    result.success 
                      ? 'bg-success/10 border border-success/30' 
                      : 'bg-danger/10 border border-danger/30'
                  }`}>
                    {result.success ? (
                      <div>
                        <div className="flex items-center gap-2 text-success font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Project Cancelled Successfully!
                        </div>
                        {result.transactions?.map((tx: any, i: number) => (
                          <p key={i} className="text-success/60 text-xs mt-1 font-mono">
                            {tx.action}: {tx.hash?.slice(0, 10)}...
                          </p>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-danger">
                        <AlertCircle className="w-4 h-4" />
                        {result.error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 bg-surface-raised hover:bg-surface-overlay text-ink rounded-lg transition"
                >
                  Close
                </button>
                {!result?.success && (
                  <button
                    onClick={handleCancel}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-danger hover:bg-danger disabled:bg-surface-overlay text-ink rounded-lg transition flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Confirm Cancel'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showRefundModal && selectedProject && (
          <div className="fixed inset-0 bg-surface-sunken/70 flex items-center justify-center z-50">
            <div className="bg-surface rounded-xl p-6 max-w-lg w-full mx-4 border border-border">
              <h2 className="text-xl font-bold text-ink mb-2">
                Enable Refunds - Project #{selectedProject.id}
              </h2>
              <p className="text-ink-muted text-sm mb-4">on {chainName}</p>

              <div className="space-y-4 mb-6">
                <div className="bg-surface-raised rounded-lg p-4">
                  <p className="text-ink-muted text-sm">Total to Refund</p>
                  <p className="text-ink text-lg font-bold">{formatUSDC(selectedProject.totalRaised)}</p>
                </div>

                <div className="flex items-start gap-3 bg-gold-500/10 border border-gold-500/30 rounded-lg p-4">
                  <AlertCircle className="w-5 h-5 text-gold-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gold-400 font-medium">Information</p>
                    <p className="text-gold-400/80 text-sm">
                      This will enable investors on {chainName} to claim their refunds from the escrow vault.
                    </p>
                  </div>
                </div>

                {result && (
                  <div className={`rounded-lg p-4 ${
                    result.success 
                      ? 'bg-success/10 border border-success/30' 
                      : 'bg-danger/10 border border-danger/30'
                  }`}>
                    {result.success ? (
                      <div className="flex items-center gap-2 text-success font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        Refunds Enabled Successfully!
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-danger">
                        <AlertCircle className="w-4 h-4" />
                        {result.error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 px-4 py-2 bg-surface-raised hover:bg-surface-overlay text-ink rounded-lg transition"
                >
                  Close
                </button>
                {!result?.success && (
                  <button
                    onClick={handleEnableRefunds}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-surface-overlay text-ink rounded-lg transition flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Enable Refunds'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
