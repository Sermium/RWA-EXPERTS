// src/app/tokenization/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAccount, usePublicClient } from 'wagmi';
import { formatUnits, type Address } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Coins,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  Globe,
  Mail,
  Phone,
  Shield,
  Clock,
  DollarSign,
  PieChart,
  BarChart3,
  Activity,
  Wallet,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Share2,
  Settings,
  Lock,
  Unlock,
  Eye,
  Edit,
  RotateCcw,
  AlertTriangle,
  Rocket,
  X,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface TokenizationProject {
  id: string;
  user_address: string;
  status: string;
  asset_name: string;
  asset_type: string;
  asset_description: string;
  asset_country: string;
  estimated_value: number;
  legal_entity_name: string;
  contact_name: string;
  website: string;
  use_case: string;
  token_name: string;
  token_symbol: string;
  token_supply: number;
  token_address: string | null;
  nft_address: string | null;
  nft_token_id: number | null;
  escrow_address: string | null;
  deployment_tx_hash: string | null;
  deployed_at: string | null;
  needs_escrow: boolean;
  needs_dividends: boolean;
  documents: any;
  created_at: string;
  updated_at: string;
  chain_id: number;
  logo_url: string | null;
  banner_url: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
}

interface TokenHolder {
  address: string;
  balance: bigint;
  percentage: number;
  isContract: boolean;
}

interface TokenMetrics {
  totalSupply: bigint;
  circulatingSupply: bigint;
  holdersCount: number;
  isPaused: boolean;
  decimals: number;
  owner: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending Review', color: 'bg-warning/20 text-warning border-warning/30', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-gold-500/20 text-gold-400 border-gold-500/30', icon: Eye },
  approved: { label: 'Approved', color: 'bg-success/20 text-success border-success/30', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-danger/20 text-danger border-danger/30', icon: XCircle },
  deployed: { label: 'Deployed', color: 'bg-success/20 text-success border-success/30', icon: CheckCircle2 },
  completed: { label: 'Deployed', color: 'bg-success/20 text-success border-success/30', icon: CheckCircle2 },
  active: { label: 'Active', color: 'bg-success/20 text-success border-success/30', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-ink-faint/20 text-ink-muted border-ink-faint/30', icon: XCircle },
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  real_estate: 'Real Estate',
  commercial_property: 'Commercial Property',
  residential_property: 'Residential Property',
  art: 'Art & Collectibles',
  art_collectibles: 'Art & Collectibles',
  commodities: 'Commodities',
  securities: 'Securities',
  infrastructure: 'Infrastructure',
  private_equity: 'Private Equity',
  business_equity: 'Business Equity',
  debt: 'Debt Instruments',
  revenue_based: 'Revenue Based',
  vehicles_equipment: 'Vehicles & Equipment',
  intellectual_property: 'Intellectual Property',
  other: 'Other',
};

const TOKEN_ABI = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'owner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number | bigint, decimals = 2): string {
  const num = typeof value === 'bigint' ? Number(value) : value;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}

function formatTokenAmount(value: bigint, decimals: number = 18): string {
  const num = Number(formatUnits(value, decimals));
  return formatNumber(num);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: any;
  color?: string;
}

function StatCard({ label, value, subValue, icon: Icon, color = 'blue' }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-gold-500/20 text-gold-400',
    green: 'bg-success/20 text-success',
    purple: 'bg-gold-500/20 text-gold-400',
    yellow: 'bg-warning/20 text-warning',
    cyan: 'bg-gold/20 text-gold',
  };

  return (
    <div className="bg-surface-overlay border border-surface-overlay rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-ink">{value}</p>
        {subValue && <p className="text-surface-overlay text-sm mt-1">{subValue}</p>}
        <p className="text-surface-overlay text-sm mt-1">{label}</p>
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 hover:bg-surface-overlay rounded transition"
      title={`Copy ${label || 'address'}`}
    >
      {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-surface-overlay" />}
    </button>
  );
}

function AddressDisplay({ address, explorerUrl, label }: { address: string; explorerUrl: string; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm text-ink">{truncateAddress(address)}</span>
      <CopyButton text={address} label={label} />
      <a
        href={`${explorerUrl}/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 hover:bg-surface-overlay rounded transition"
        title="View on explorer"
      >
        <ExternalLink className="w-4 h-4 text-surface-overlay" />
      </a>
    </div>
  );
}

function HolderRow({ holder, rank, explorerUrl, tokenSymbol, decimals }: { 
  holder: TokenHolder; 
  rank: number; 
  explorerUrl: string; 
  tokenSymbol: string; 
  decimals: number 
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-surface-overlay/30 rounded-lg hover:bg-surface-overlay/50 transition">
      <div className="flex items-center gap-4">
        <span className="w-8 h-8 rounded-full bg-surface-overlay flex items-center justify-center text-sm font-medium text-ink">
          {rank}
        </span>
        <div>
          <AddressDisplay address={holder.address} explorerUrl={explorerUrl} />
          {holder.isContract && (
            <span className="text-xs text-gold-400 mt-1 block">Contract</span>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-ink font-medium">
          {formatTokenAmount(holder.balance, decimals)} {tokenSymbol}
        </p>
        <p className="text-surface-overlay text-sm">{holder.percentage.toFixed(2)}%</p>
      </div>
    </div>
  );
}

function DocumentCard({ name, url, type, size }: { name: string; url: string; type?: string; size?: number }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-4 bg-surface-overlay/50 rounded-lg hover:bg-surface-overlay transition group"
    >
      <div className="w-10 h-10 rounded-lg bg-gold-500/20 flex items-center justify-center">
        <FileText className="w-5 h-5 text-gold-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-ink font-medium truncate">{name}</p>
        {(type || size) && (
          <p className="text-surface-overlay text-sm">
            {type && <span>{type}</span>}
            {type && size && <span> • </span>}
            {size && <span>{(size / 1024).toFixed(1)} KB</span>}
          </p>
        )}
      </div>
      <Download className="w-5 h-5 text-surface-overlay group-hover:text-ink transition" />
    </a>
  );
}

// ============================================================================
// REJECTION BANNER COMPONENT
// ============================================================================

interface RejectionBannerProps {
  rejectionReason: string | null;
  rejectedAt: string | null;
  projectId: string;
  isOwner: boolean;
}

function RejectionBanner({ rejectionReason, rejectedAt, projectId, isOwner }: RejectionBannerProps) {
  return (
    <div className="bg-danger/10 border border-danger/30 rounded-xl p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-danger" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-danger mb-2">Application Rejected</h3>
          {rejectedAt && (
            <p className="text-surface-overlay text-sm mb-3">
              Rejected on {formatDate(rejectedAt)}
            </p>
          )}
          {rejectionReason && (
            <div className="bg-surface-overlay/50 rounded-lg p-4 mb-4">
              <p className="text-surface-overlay text-sm font-medium mb-1">Reason:</p>
              <p className="text-ink">{rejectionReason}</p>
            </div>
          )}
          {isOwner && (
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/tokenize/edit/${projectId}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-600 hover:bg-gold-500 text-ink rounded-lg font-medium transition"
              >
                <Edit className="w-4 h-4" />
                Edit & Resubmit Application
              </Link>
              <p className="text-surface-overlay text-sm self-center">
                Your original payment is still valid – no additional fee required.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// APPROVED BANNER WITH DEPLOY BUTTON
// ============================================================================

interface ApprovedBannerProps {
  project: TokenizationProject;
  isOwner: boolean;
  onDeploy: () => void;
}

function ApprovedBanner({ project, isOwner, onDeploy }: ApprovedBannerProps) {
  return (
    <div className="bg-success/10 border border-success/30 rounded-xl p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-6 h-6 text-success" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-success mb-2">Application Approved!</h3>
          <p className="text-surface-overlay text-sm mb-4">
            Your tokenization application has been approved. You can now deploy your security token to the blockchain.
          </p>
          
          <div className="bg-surface-overlay/50 rounded-lg p-4 mb-4">
            <h4 className="text-ink font-medium mb-2">Deployment will create:</h4>
            <ul className="space-y-2 text-sm text-surface-overlay">
              <li className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-gold-400" />
                ERC-3643 Security Token ({project.token_name} - {project.token_symbol})
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gold-400" />
                Project NFT with metadata & legal documents
              </li>
              {project.needs_escrow && (
                <li className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-success" />
                  Trade Escrow Contract
                </li>
              )}
              {project.needs_dividends && (
                <li className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-warning" />
                  Dividend Distributor Contract
                </li>
              )}
            </ul>
          </div>

          {isOwner ? (
            <button
              onClick={onDeploy}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-success to-success hover:from-success hover:to-success text-ink rounded-lg font-medium transition shadow-lg shadow-green-500/25"
            >
              <Rocket className="w-5 h-5" />
              Deploy Token
            </button>
          ) : (
            <p className="text-surface-overlay text-sm italic">
              Only the project owner can deploy the token.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DEPLOYMENT MODAL
// ============================================================================

interface DeploymentModalProps {
  project: TokenizationProject;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function DeploymentModal({ project, isOpen, onClose, onSuccess }: DeploymentModalProps) {
  const [DeploymentWizard, setDeploymentWizard] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      import('@/components/tokenization/deploy/DeploymentWizard').then((mod) => {
        setDeploymentWizard(() => mod.DeploymentWizard);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-surface-overlay border border-surface-overlay rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {DeploymentWizard ? (
          <DeploymentWizard
            application={project}
            onBack={onClose}
            onClose={onClose}
            onSuccess={() => {
              onSuccess();
              onClose();
            }}
          />
        ) : (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-gold-500 animate-spin mx-auto mb-4" />
            <p className="text-surface-overlay">Loading deployment wizard...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function TokenizationProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { explorerUrl, chainName, isTestnet } = useChainConfig();

  const [project, setProject] = useState<TokenizationProject | null>(null);
  const [tokenMetrics, setTokenMetrics] = useState<TokenMetrics | null>(null);
  const [holders, setHolders] = useState<TokenHolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'holders' | 'documents' | 'settings'>('overview');
  const [copied, setCopied] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);

  // Fetch project from database
  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/tokenization/public/${projectId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Project not found');
        }
        throw new Error('Failed to fetch project');
      }
      const data = await response.json();
      setProject(data.project);
      return data.project;
    } catch (err: any) {
      console.error('[TokenizationPage] Fetch error:', err);
      setError(err.message || 'Failed to load project');
      return null;
    }
  }, [projectId]);

  // Fetch token holders via API
  const fetchHolders = useCallback(async (tokenAddress: string, chainId: number, totalSupply: bigint, decimals: number) => {
    setHoldersLoading(true);
    try {
      const response = await fetch(
        `/api/token/${tokenAddress}/holders?chainId=${chainId}`
      );
      
      if (!response.ok) {
        console.error('Failed to fetch holders:', await response.text());
        return;
      }
      
      const data = await response.json();
      
      if (data.holders && Array.isArray(data.holders)) {
        const holderList: TokenHolder[] = data.holders.map((h: any) => {
          // Parse the balance - it comes as a formatted string like "1,234.5678"
          const balanceStr = h.balance.replace(/,/g, '');
          const balanceNum = parseFloat(balanceStr);
          // Convert back to wei for internal use
          const balanceWei = BigInt(Math.floor(balanceNum * Math.pow(10, decimals)));
          
          return {
            address: h.address,
            balance: balanceWei,
            percentage: parseFloat(h.percentage),
            isContract: h.isOwner || false, // Using isOwner as a proxy, or add isContract to API
          };
        });
        
        setHolders(holderList);
      }
    } catch (err) {
      console.error('Failed to fetch holders:', err);
    } finally {
      setHoldersLoading(false);
    }
  }, []);

  // Update fetchTokenData to pass decimals
  const fetchTokenData = useCallback(async (tokenAddress: string, chainId: number) => {
    if (!publicClient || !tokenAddress) return;

    try {
      const [totalSupply, decimals, isPaused, owner] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress as Address,
          abi: TOKEN_ABI,
          functionName: 'totalSupply',
        }),
        publicClient.readContract({
          address: tokenAddress as Address,
          abi: TOKEN_ABI,
          functionName: 'decimals',
        }),
        publicClient.readContract({
          address: tokenAddress as Address,
          abi: TOKEN_ABI,
          functionName: 'paused',
        }).catch(() => false),
        publicClient.readContract({
          address: tokenAddress as Address,
          abi: TOKEN_ABI,
          functionName: 'owner',
        }).catch(() => '0x0000000000000000000000000000000000000000'),
      ]);

      const supply = totalSupply as bigint;
      const tokenDecimals = decimals as number;

      setTokenMetrics({
        totalSupply: supply,
        circulatingSupply: supply,
        holdersCount: 0,
        isPaused: isPaused as boolean,
        decimals: tokenDecimals,
        owner: owner as string,
      });

      // Fetch holders via API
      await fetchHolders(tokenAddress, chainId, supply, tokenDecimals);

    } catch (err) {
      console.error('[TokenizationPage] Failed to fetch token data:', err);
    }
  }, [publicClient, fetchHolders]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const proj = await fetchProject();
      if (proj?.token_address && proj?.chain_id) {
        await fetchTokenData(proj.token_address, proj.chain_id);
      }
      setLoading(false);
    };
    load();
  }, [fetchProject, fetchTokenData]);

  // Update holders count when holders change
  useEffect(() => {
    if (tokenMetrics && holders.length !== tokenMetrics.holdersCount) {
      setTokenMetrics(prev => prev ? { ...prev, holdersCount: holders.length } : null);
    }
  }, [holders.length, tokenMetrics]);

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    const proj = await fetchProject();
    if (proj?.token_address && proj?.chain_id) {
      await fetchTokenData(proj.token_address, proj.chain_id);
    }
    setRefreshing(false);
  };

  // Handle successful deployment
  const handleDeploymentSuccess = () => {
    handleRefresh();
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  // Parse documents
  const documents = useMemo(() => {
    if (!project?.documents) return [];
    try {
      const parsed = typeof project.documents === 'string' 
        ? JSON.parse(project.documents) 
        : project.documents;
      return parsed?.files || (Array.isArray(parsed) ? parsed : []);
    } catch {
      return [];
    }
  }, [project?.documents]);

  // Check if user is owner
  const isOwner = project?.user_address?.toLowerCase() === address?.toLowerCase();

  // Check statuses
  const isRejected = project?.status === 'rejected';
  const isApproved = project?.status === 'approved';
  const isDeployed = ['deployed', 'completed', 'active'].includes(project?.status || '') && project?.token_address;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-overlay flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-gold-500 animate-spin mx-auto mb-4" />
          <p className="text-surface-overlay">Loading project...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="min-h-screen bg-surface-overlay flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-danger mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-ink mb-2">Project Not Found</h1>
          <p className="text-surface-overlay mb-6">{error || 'This project does not exist or has been removed.'}</p>
          <Link
            href="/tokenization"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gold-600 hover:bg-gold-500 text-ink rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-surface-overlay">
      {/* Header Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-gold-600 via-gold-light to-gold">
        {project.banner_url && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${project.banner_url})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-overlay via-surface-overlay/50 to-transparent" />
        
        {/* Back button */}
        <div className="absolute top-6 left-6">
          <Link
            href="/tokenization"
            className="flex items-center gap-2 px-4 py-2 bg-surface-overlay/50 backdrop-blur-sm rounded-lg text-ink hover:bg-surface-overlay/70 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>

        {/* Actions */}
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-surface-overlay/50 backdrop-blur-sm rounded-lg text-ink hover:bg-surface-overlay/70 transition"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => copyToClipboard(window.location.href, 'url')}
            className="flex items-center gap-2 px-4 py-2 bg-surface-overlay/50 backdrop-blur-sm rounded-lg text-ink hover:bg-surface-overlay/70 transition"
          >
            {copied === 'url' ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            Share
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 pb-12">
        {/* Project Header Card */}
        <div className="bg-surface-overlay border border-surface-overlay rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Logo */}
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gold-500 to-gold-light-600 flex items-center justify-center flex-shrink-0">
              {project.logo_url ? (
                <img src={project.logo_url} alt={project.asset_name} className="w-full h-full rounded-xl object-cover" />
              ) : (
                <Building2 className="w-10 h-10 text-ink" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-ink">{project.asset_name}</h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig.label}
                </span>
                {isDeployed && tokenMetrics?.isPaused && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-danger/20 text-danger border border-danger/30">
                    <Lock className="w-4 h-4" />
                    Paused
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-surface-overlay mb-4">
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {ASSET_TYPE_LABELS[project.asset_type] || project.asset_type}
                </span>
                {project.asset_country && (
                  <span className="flex items-center gap-1">
                    <Globe className="w-4 h-4" />
                    {project.asset_country}
                  </span>
                )}
                {project.token_symbol && (
                  <span className="flex items-center gap-1">
                    <Coins className="w-4 h-4" />
                    ${project.token_symbol}
                  </span>
                )}
                <span className={`flex items-center gap-1 ${isTestnet ? 'text-warning' : 'text-success'}`}>
                  <Activity className="w-4 h-4" />
                  {chainName}
                </span>
              </div>

              <p className="text-surface-overlay line-clamp-2">{project.asset_description}</p>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-col gap-2 md:text-right">
              <div>
                <p className="text-surface-overlay text-sm">Estimated Value</p>
                <p className="text-2xl font-bold text-ink">{formatCurrency(project.estimated_value)}</p>
              </div>
              {isDeployed && tokenMetrics && (
                <div>
                  <p className="text-surface-overlay text-sm">Total Supply</p>
                  <p className="text-lg font-semibold text-ink">
                    {formatTokenAmount(tokenMetrics.totalSupply, tokenMetrics.decimals)} {project.token_symbol}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Token Address */}
          {isDeployed && project.token_address && (
            <div className="mt-6 pt-6 border-t border-surface-overlay">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-surface-overlay text-sm">Token:</span>
                  <AddressDisplay address={project.token_address} explorerUrl={explorerUrl} label="token address" />
                </div>
                {project.escrow_address && (
                  <div className="flex items-center gap-2">
                    <span className="text-surface-overlay text-sm">Escrow:</span>
                    <AddressDisplay address={project.escrow_address} explorerUrl={explorerUrl} label="escrow address" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rejection Banner */}
        {isRejected && (
          <RejectionBanner
            rejectionReason={project.rejection_reason}
            rejectedAt={project.rejected_at}
            projectId={project.id}
            isOwner={isOwner}
          />
        )}

        {/* Approved Banner with Deploy Button */}
        {isApproved && (
          <ApprovedBanner
            project={project}
            isOwner={isOwner}
            onDeploy={() => setShowDeployModal(true)}
          />
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-surface-overlay rounded-lg p-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'holders', label: 'Holders', icon: Users, disabled: !isDeployed },
            { id: 'documents', label: 'Documents', icon: FileText },
            ...(isOwner ? [{ id: 'settings', label: 'Settings', icon: Settings }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => !(tab as any).disabled && setActiveTab(tab.id as any)}
              disabled={(tab as any).disabled}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gold-600 text-ink'
                  : (tab as any).disabled
                  ? 'text-surface-overlay cursor-not-allowed'
                  : 'text-surface-overlay hover:text-ink hover:bg-surface-overlay'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Estimated Value"
                  value={formatCurrency(project.estimated_value)}
                  icon={DollarSign}
                  color="green"
                />
                <StatCard
                  label="Token Supply"
                  value={project.token_supply ? formatNumber(project.token_supply) : 'TBD'}
                  subValue={project.token_symbol ? `$${project.token_symbol}` : undefined}
                  icon={Coins}
                  color="purple"
                />
                <StatCard
                  label="Holders"
                  value={isDeployed ? holders.length.toString() : '-'}
                  icon={Users}
                  color="blue"
                />
                <StatCard
                  label="Created"
                  value={getTimeAgo(project.created_at)}
                  subValue={formatDate(project.created_at)}
                  icon={Calendar}
                  color="cyan"
                />
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Project Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Description */}
                  <div className="bg-surface-overlay border border-surface-overlay rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-ink mb-4">About This Asset</h2>
                    <p className="text-surface-overlay whitespace-pre-wrap">{project.asset_description}</p>
                  </div>

                  {/* Token Details */}
                  {(project.token_name || project.token_symbol) && (
                    <div className="bg-surface-overlay border border-surface-overlay rounded-xl p-6">
                      <h2 className="text-lg font-semibold text-ink mb-4">Token Information</h2>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-surface-overlay/50 rounded-lg">
                          <p className="text-surface-overlay text-sm">Token Name</p>
                          <p className="text-ink font-medium">{project.token_name || 'TBD'}</p>
                        </div>
                        <div className="p-4 bg-surface-overlay/50 rounded-lg">
                          <p className="text-surface-overlay text-sm">Token Symbol</p>
                          <p className="text-ink font-medium">{project.token_symbol || 'TBD'}</p>
                        </div>
                        <div className="p-4 bg-surface-overlay/50 rounded-lg">
                          <p className="text-surface-overlay text-sm">Total Supply</p>
                          <p className="text-ink font-medium">{project.token_supply ? formatNumber(project.token_supply) : 'TBD'}</p>
                        </div>
                        <div className="p-4 bg-surface-overlay/50 rounded-lg">
                          <p className="text-surface-overlay text-sm">Use Case</p>
                          <p className="text-ink font-medium">{project.use_case?.replace(/_/g, ' ') || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  <div className="bg-surface-overlay border border-surface-overlay rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-ink mb-4">Features</h2>
                    <div className="flex flex-wrap gap-3">
                      {project.needs_escrow && (
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-lg border border-success/30">
                          <Lock className="w-4 h-4" />
                          Trade Escrow
                        </span>
                      )}
                      {project.needs_dividends && (
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-warning/10 text-warning rounded-lg border border-warning/30">
                          <TrendingUp className="w-4 h-4" />
                          Dividend Distribution
                        </span>
                      )}
                      {!project.needs_escrow && !project.needs_dividends && (
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-surface-overlay/10 text-surface-overlay rounded-lg border border-surface-overlay/30">
                          <Coins className="w-4 h-4" />
                          Base Token
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Deployment Info */}
                  {isDeployed && (
                    <div className="bg-surface-overlay border border-surface-overlay rounded-xl p-6">
                      <h2 className="text-lg font-semibold text-ink mb-4">Deployment Information</h2>
                      <div className="space-y-4">
                        {project.token_address && (
                          <div className="flex items-center justify-between p-4 bg-surface-overlay/50 rounded-lg">
                            <div>
                              <p className="text-surface-overlay text-sm">Token Contract</p>
                              <AddressDisplay address={project.token_address} explorerUrl={explorerUrl} />
                            </div>
                          </div>
                        )}
                        {project.escrow_address && (
                          <div className="flex items-center justify-between p-4 bg-surface-overlay/50 rounded-lg">
                            <div>
                              <p className="text-surface-overlay text-sm">Escrow Contract</p>
                              <AddressDisplay address={project.escrow_address} explorerUrl={explorerUrl} />
                            </div>
                          </div>
                        )}
                        {project.deployment_tx_hash && (
                          <div className="flex items-center justify-between p-4 bg-surface-overlay/50 rounded-lg">
                            <div>
                              <p className="text-surface-overlay text-sm">Deployment Transaction</p>
                              <a
                                href={`${explorerUrl}/tx/${project.deployment_tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gold-400 hover:text-gold-300 font-mono text-sm flex items-center gap-2"
                              >
                                {truncateAddress(project.deployment_tx_hash)}
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                            <p className="text-surface-overlay text-sm">{formatDate(project.deployed_at)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Company Info */}
                  <div className="bg-surface-overlay border border-surface-overlay rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-ink mb-4">Company Information</h2>
                    <div className="space-y-4">
                      <div>
                        <p className="text-surface-overlay text-sm">Legal Entity</p>
                        <p className="text-ink font-medium">{project.legal_entity_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-surface-overlay text-sm">Contact</p>
                        <p className="text-ink font-medium">{project.contact_name || 'N/A'}</p>
                      </div>
                      {project.website && (
                        <a
                          href={project.website.startsWith('http') ? project.website : `https://${project.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-gold-400 hover:text-gold-300 transition"
                        >
                          <Globe className="w-4 h-4" />
                          {project.website}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Owner Info */}
                  <div className="bg-surface-overlay border border-surface-overlay rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-ink mb-4">Owner</h2>
                    <AddressDisplay address={project.user_address} explorerUrl={explorerUrl} />
                    {isOwner && (
                      <p className="text-success text-sm mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        This is your project
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Holders Tab */}
          {activeTab === 'holders' && isDeployed && (
            <div className="bg-surface-overlay border border-surface-overlay rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-ink">Token Holders</h2>
                <div className="flex items-center gap-3">
                  <span className="text-surface-overlay">{holders.length} holder{holders.length !== 1 ? 's' : ''}</span>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing || holdersLoading}
                    className="p-2 hover:bg-surface-overlay rounded-lg transition"
                    title="Refresh holders"
                  >
                    <RefreshCw className={`w-4 h-4 text-surface-overlay ${(refreshing || holdersLoading) ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              
              {holdersLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-gold-500 animate-spin mx-auto mb-3" />
                  <p className="text-surface-overlay">Loading holders...</p>
                </div>
              ) : holders.length > 0 ? (
                <div className="space-y-3">
                  {holders.map((holder, index) => (
                    <HolderRow
                      key={holder.address}
                      holder={holder}
                      rank={index + 1}
                      explorerUrl={explorerUrl}
                      tokenSymbol={project.token_symbol || 'TOKEN'}
                      decimals={tokenMetrics?.decimals || 18}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-surface-overlay mx-auto mb-3" />
                  <p className="text-surface-overlay">No holders found</p>
                  <p className="text-surface-overlay text-sm mt-1">Tokens may not have been distributed yet</p>
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="bg-surface-overlay border border-surface-overlay rounded-xl p-6">
              <h2 className="text-lg font-semibold text-ink mb-6">Documents</h2>
              
              {documents.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {documents.map((doc: any, index: number) => (
                    <DocumentCard
                      key={index}
                      name={doc.name || `Document ${index + 1}`}
                      url={doc.url}
                      type={doc.type}
                      size={doc.size}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-surface-overlay mx-auto mb-3" />
                  <p className="text-surface-overlay">No documents uploaded</p>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab (Owner Only) */}
          {activeTab === 'settings' && isOwner && (
            <div className="bg-surface-overlay border border-surface-overlay rounded-xl p-6">
              <h2 className="text-lg font-semibold text-ink mb-6">Project Settings</h2>
              
              <div className="space-y-6">
                {/* Deploy Option for Approved Projects */}
                {isApproved && (
                  <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                    <h3 className="text-ink font-medium mb-2 flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-success" />
                      Ready to Deploy
                    </h3>
                    <p className="text-surface-overlay text-sm mb-4">
                      Your application has been approved. Deploy your token to make it live on the blockchain.
                    </p>
                    <button
                      onClick={() => setShowDeployModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-success hover:bg-success text-ink rounded-lg transition"
                    >
                      <Rocket className="w-4 h-4" />
                      Deploy Token
                    </button>
                  </div>
                )}

                {/* Resubmit Option for Rejected Projects */}
                {isRejected && (
                  <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg">
                    <h3 className="text-ink font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-danger" />
                      Application Rejected
                    </h3>
                    <p className="text-surface-overlay text-sm mb-4">
                      {project.rejection_reason || 'Your application was rejected. You can edit and resubmit it.'}
                    </p>
                    <Link
                      href={`/tokenize/edit/${project.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gold-600 hover:bg-gold-500 text-ink rounded-lg transition"
                    >
                      <Edit className="w-4 h-4" />
                      Edit & Resubmit
                    </Link>
                  </div>
                )}

                {isDeployed && (
                  <div className="p-4 bg-surface-overlay/50 rounded-lg">
                    <h3 className="text-ink font-medium mb-4">Token Controls</h3>
                    <div className="flex flex-wrap gap-3">
                      <button className="flex items-center gap-2 px-4 py-2 bg-warning hover:bg-warning text-ink rounded-lg transition">
                        {tokenMetrics?.isPaused ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        {tokenMetrics?.isPaused ? 'Unpause Token' : 'Pause Token'}
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-gold-600 hover:bg-gold-500 text-ink rounded-lg transition">
                        <Edit className="w-4 h-4" />
                        Update Metadata
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-surface-overlay/50 rounded-lg">
                  <h3 className="text-ink font-medium mb-4">Project Information</h3>
                  <p className="text-surface-overlay text-sm">
                    {isRejected 
                      ? 'Edit your application to fix any issues and resubmit for review.'
                      : isApproved
                      ? 'Deploy your token to make it live. You can distribute tokens during deployment.'
                      : 'Contact support to update project information or documents.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deployment Modal */}
      <DeploymentModal
        project={project}
        isOpen={showDeployModal}
        onClose={() => setShowDeployModal(false)}
        onSuccess={handleDeploymentSuccess}
      />
    </div>
  );
}
