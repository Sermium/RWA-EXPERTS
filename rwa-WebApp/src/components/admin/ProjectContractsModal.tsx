// src/app/admin/components/ProjectContractsModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { Address } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import { RWALaunchpadFactoryABI } from '@/config/abis';
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Loader2, 
  Shield, 
  Wallet, 
  FileCheck, 
  Coins, 
  Scale, 
  Lock,
  AlertTriangle,
  Info,
  Clock,
  User,
  Activity
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Project {
  id: number | bigint;
  name?: string;
  securityToken?: string;
  escrowVault?: string;
  status?: number;
  owner?: string;
}

interface DeploymentRecord {
  projectId: bigint;
  securityToken: Address;
  escrowVault: Address;
  compliance: Address;
  dividendDistributor: Address;
  maxBalanceModule: Address;
  lockupModule: Address;
  deployer: Address;
  deployedAt: bigint;
  active: boolean;
}

interface ProjectContractsModalProps {
  project: Project;
  onClose: () => void;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface NetworkBadgeProps {
  chainName: string;
  isTestnet: boolean;
}

function NetworkBadge({ chainName, isTestnet }: NetworkBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
      isTestnet
        ? 'bg-warning/10 text-warning border border-warning/40'
        : 'bg-success/10 text-success border border-success/40'
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full ${isTestnet ? 'bg-warning' : 'bg-success'}`} />
      {chainName}
      {isTestnet && <span className="opacity-70">(Testnet)</span>}
    </div>
  );
}

interface ContractRowProps {
  label: string;
  address: Address | string | undefined;
  type: 'core' | 'module' | 'info';
  explorerUrl: string;
  icon?: React.ReactNode;
}

function ContractRow({ label, address, type, explorerUrl, icon }: ContractRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const isZeroAddress = !address || address === '0x0000000000000000000000000000000000000000';

  const typeStyles = {
    core: {
      bg: 'bg-gold-500/10',
      border: 'border-gold-500/20',
      label: 'text-gold-400',
      badge: 'bg-gold-500/20 text-gold-300'
    },
    module: {
      bg: 'bg-gold-500/10',
      border: 'border-gold-500/20',
      label: 'text-gold-400',
      badge: 'bg-gold-500/20 text-gold-300'
    },
    info: {
      bg: 'bg-gray-500/10',
      border: 'border-gray-500/20',
      label: 'text-ink-muted',
      badge: 'bg-gray-500/20 text-ink-muted'
    }
  };

  const styles = typeStyles[type];

  if (isZeroAddress) {
    return (
      <div className={`${styles.bg} ${styles.border} border rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && <div className={styles.label}>{icon}</div>}
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${styles.label}`}>{label}</span>
                <span className={`px-1.5 py-0.5 text-xs rounded ${styles.badge}`}>
                  {type === 'core' ? 'Core' : 'Module'}
                </span>
              </div>
              <p className="text-ink-faint text-sm mt-1">Not deployed</p>
            </div>
          </div>
          <AlertTriangle className="w-4 h-4 text-ink-faint" />
        </div>
      </div>
    );
  }

  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-4 hover:bg-opacity-20 transition-colors`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && <div className={styles.label}>{icon}</div>}
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${styles.label}`}>{label}</span>
              <span className={`px-1.5 py-0.5 text-xs rounded ${styles.badge}`}>
                {type === 'core' ? 'Core' : 'Module'}
              </span>
            </div>
            <p className="text-ink font-mono text-sm mt-1">{truncatedAddress}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-surface-overlay/50 rounded-lg transition-colors"
            title="Copy address"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4 text-ink-muted" />
            )}
          </button>
          <a
            href={`${explorerUrl}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-surface-overlay/50 rounded-lg transition-colors"
            title="View on explorer"
          >
            <ExternalLink className="w-4 h-4 text-ink-muted" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProjectContractsModal({ project, onClose }: ProjectContractsModalProps) {
  const publicClient = usePublicClient();
  
  const {
    chainId,
    chainName,
    contracts,
    explorerUrl,
    nativeCurrency,
    isTestnet,
    isDeployed
  } = useChainConfig();

  const factoryAddress = contracts?.RWALaunchpadFactory as Address | undefined;

  const [deployment, setDeployment] = useState<DeploymentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch deployment data
  useEffect(() => {
    const fetchDeployment = async () => {
      if (!publicClient || !factoryAddress) {
        setLoading(false);
        setError('Factory contract not available');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data = await publicClient.readContract({
          address: factoryAddress,
          abi: RWALaunchpadFactoryABI,
          functionName: 'getDeployment',
          args: [BigInt(project.id)],
        });

        setDeployment(data as DeploymentRecord);
      } catch (err) {
        console.error('Error fetching deployment:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch deployment data');
      } finally {
        setLoading(false);
      }
    };

    fetchDeployment();
  }, [project.id, publicClient, factoryAddress, chainId]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Format date
  const formatDate = (timestamp: bigint): string => {
    if (timestamp === 0n) return 'N/A';
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  // Truncate address
  const truncateAddress = (address: string): string => {
    if (!address || address.length < 10) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div 
      className="fixed inset-0 bg-surface-sunken/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-border shadow-panel">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl font-bold text-ink">
                  {project.name || `Project #${project.id}`}
                </h3>
                <NetworkBadge chainName={chainName} isTestnet={isTestnet} />
              </div>
              <p className="text-ink-muted text-sm">
                Deployed Contract Addresses on {chainName}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-surface-overlay rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-ink-muted" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gold-400 animate-spin mb-4" />
              <p className="text-ink-muted">Loading contracts from {chainName}...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-danger mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-danger font-medium">Failed to load deployment</p>
                  <p className="text-red-300/70 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Factory Not Deployed */}
          {!loading && !error && !factoryAddress && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-warning font-medium">Factory not deployed</p>
                  <p className="text-yellow-300/70 text-sm mt-1">
                    The RWALaunchpadFactory contract is not deployed on {chainName}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contract List */}
          {!loading && !error && factoryAddress && (
            <div className="space-y-3">
              {/* Core Contracts */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-ink-muted mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Core Contracts
                </h4>
                <div className="space-y-2">
                  <ContractRow 
                    label="Security Token" 
                    address={deployment?.securityToken || project.securityToken} 
                    type="core"
                    explorerUrl={explorerUrl}
                    icon={<Shield className="w-4 h-4" />}
                  />
                  <ContractRow 
                    label="Escrow Vault" 
                    address={deployment?.escrowVault || project.escrowVault} 
                    type="core"
                    explorerUrl={explorerUrl}
                    icon={<Wallet className="w-4 h-4" />}
                  />
                </div>
              </div>

              {/* Module Contracts */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-ink-muted mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Module Contracts
                </h4>
                <div className="space-y-2">
                  <ContractRow 
                    label="Compliance" 
                    address={deployment?.compliance} 
                    type="module"
                    explorerUrl={explorerUrl}
                    icon={<FileCheck className="w-4 h-4" />}
                  />
                  <ContractRow 
                    label="Dividend Distributor" 
                    address={deployment?.dividendDistributor} 
                    type="module"
                    explorerUrl={explorerUrl}
                    icon={<Coins className="w-4 h-4" />}
                  />
                  <ContractRow 
                    label="Max Balance Module" 
                    address={deployment?.maxBalanceModule} 
                    type="module"
                    explorerUrl={explorerUrl}
                    icon={<Scale className="w-4 h-4" />}
                  />
                  <ContractRow 
                    label="Lockup Module" 
                    address={deployment?.lockupModule} 
                    type="module"
                    explorerUrl={explorerUrl}
                    icon={<Lock className="w-4 h-4" />}
                  />
                </div>
              </div>

              {/* Deployment Info */}
              {deployment && deployment.deployedAt > 0n && (
                <div className="mt-6 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-ink-muted mb-4 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Deployment Information
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Deployer */}
                    <div className="bg-surface/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-ink-muted" />
                        <p className="text-ink-muted text-sm">Deployed by</p>
                      </div>
                      <a 
                        href={`${explorerUrl}/address/${deployment.deployer}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-gold-400 hover:text-gold-300 font-mono text-sm flex items-center gap-1"
                      >
                        {truncateAddress(deployment.deployer)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Deployed At */}
                    <div className="bg-surface/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-ink-muted" />
                        <p className="text-ink-muted text-sm">Deployed at</p>
                      </div>
                      <p className="text-ink text-sm">{formatDate(deployment.deployedAt)}</p>
                    </div>

                    {/* Status */}
                    <div className="bg-surface/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-ink-muted" />
                        <p className="text-ink-muted text-sm">Status</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                        deployment.active 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${deployment.active ? 'bg-success' : 'bg-danger'}`} />
                        {deployment.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Network */}
                    <div className="bg-surface/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-ink-muted" />
                        <p className="text-ink-muted text-sm">Network</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-ink text-sm">{chainName}</span>
                        {isTestnet && (
                          <span className="px-1.5 py-0.5 text-xs bg-warning/10 text-warning rounded">
                            Testnet
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* No Deployment Found */}
              {(!deployment || deployment.deployedAt === 0n) && (
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="bg-surface/50 rounded-lg p-4 text-center">
                    <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-2" />
                    <p className="text-ink-muted font-medium">No deployment record found</p>
                    <p className="text-ink-faint text-sm mt-1">
                      This project may not have been deployed through the factory on {chainName}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface/30">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-ink-muted">
              <span>Chain ID: {chainId}</span>
              <span>â€¢</span>
              <span>Currency: {nativeCurrency?.symbol || 'ETH'}</span>
            </div>
            {factoryAddress && (
              <a
                href={`${explorerUrl}/address/${factoryAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-400 hover:text-gold-300 flex items-center gap-1"
              >
                Factory: {truncateAddress(factoryAddress)}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
