// src/app/tokenization/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
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
  pending: { label: 'Pending Review', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Eye },
  approved: { label: 'Approved', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
  completed: { label: 'Deployed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: XCircle },
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  real_estate: 'Real Estate',
  commercial_property: 'Commercial Property',
  residential_property: 'Residential Property',
  art: 'Art & Collectibles',
  commodities: 'Commodities',
  securities: 'Securities',
  infrastructure: 'Infrastructure',
  private_equity: 'Private Equity',
  debt: 'Debt Instruments',
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
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-white">{value}</p>
        {subValue && <p className="text-slate-400 text-sm mt-1">{subValue}</p>}
        <p className="text-slate-500 text-sm mt-1">{label}</p>
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
      className="p-1.5 hover:bg-slate-700 rounded transition"
      title={`Copy ${label || 'address'}`}
    >
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
    </button>
  );
}

function AddressDisplay({ address, explorerUrl, label }: { address: string; explorerUrl: string; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm text-white">{truncateAddress(address)}</span>
      <CopyButton text={address} label={label} />
      <a
        href={`${explorerUrl}/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 hover:bg-slate-700 rounded transition"
        title="View on explorer"
      >
        <ExternalLink className="w-4 h-4 text-slate-400" />
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
    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition">
      <div className="flex items-center gap-4">
        <span className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm font-medium text-white">
          {rank}
        </span>
        <div>
          <AddressDisplay address={holder.address} explorerUrl={explorerUrl} />
          {holder.isContract && (
            <span className="text-xs text-purple-400 mt-1">Contract</span>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-white font-medium">
          {formatTokenAmount(holder.balance, decimals)} {tokenSymbol}
        </p>
        <p className="text-slate-400 text-sm">{holder.percentage.toFixed(2)}%</p>
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
      className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition group"
    >
      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
        <FileText className="w-5 h-5 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{name}</p>
        {(type || size) && (
          <p className="text-slate-400 text-sm">
            {type && <span>{type}</span>}
            {type && size && <span> • </span>}
            {size && <span>{(size / 1024).toFixed(1)} KB</span>}
          </p>
        )}
      </div>
      <Download className="w-5 h-5 text-slate-400 group-hover:text-white transition" />
    </a>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function TokenizationProjectPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { explorerUrl, chainName, isTestnet } = useChainConfig();

  const [project, setProject] = useState<TokenizationProject | null>(null);
  const [tokenMetrics, setTokenMetrics] = useState<TokenMetrics | null>(null);
  const [holders, setHolders] = useState<TokenHolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'holders' | 'documents' | 'settings'>('overview');
  const [copied, setCopied] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch project from database (public endpoint)
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

  // Fetch on-chain token data
  const fetchTokenData = useCallback(async (tokenAddress: string) => {
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

      setTokenMetrics({
        totalSupply: totalSupply as bigint,
        circulatingSupply: totalSupply as bigint,
        holdersCount: holders.length,
        isPaused: isPaused as boolean,
        decimals: decimals as number,
        owner: owner as string,
      });

      // Fetch owner balance as primary holder
      if (owner && owner !== '0x0000000000000000000000000000000000000000') {
        const ownerBalance = await publicClient.readContract({
          address: tokenAddress as Address,
          abi: TOKEN_ABI,
          functionName: 'balanceOf',
          args: [owner as Address],
        });

        const total = totalSupply as bigint;
        const balance = ownerBalance as bigint;
        const percentage = total > 0n ? Number((balance * 10000n) / total) / 100 : 0;

        setHolders([{
          address: owner as string,
          balance,
          percentage,
          isContract: false,
        }]);
      }
    } catch (err) {
      console.error('[TokenizationPage] Failed to fetch token data:', err);
    }
  }, [publicClient, holders.length]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const proj = await fetchProject();
      if (proj?.token_address) {
        await fetchTokenData(proj.token_address);
      }
      setLoading(false);
    };
    load();
  }, [fetchProject, fetchTokenData]);

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    const proj = await fetchProject();
    if (proj?.token_address) {
      await fetchTokenData(proj.token_address);
    }
    setRefreshing(false);
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading project...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Project Not Found</h1>
          <p className="text-slate-400 mb-6">{error || 'This project does not exist or has been removed.'}</p>
          <Link
            href="/tokenization"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
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
  const isDeployed = project.status === 'completed' && project.token_address;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
        {project.banner_url && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${project.banner_url})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
        
        {/* Back button */}
        <div className="absolute top-6 left-6">
          <Link
            href="/tokenization"
            className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 backdrop-blur-sm rounded-lg text-white hover:bg-slate-900/70 transition"
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
            className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 backdrop-blur-sm rounded-lg text-white hover:bg-slate-900/70 transition"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => copyToClipboard(window.location.href, 'url')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 backdrop-blur-sm rounded-lg text-white hover:bg-slate-900/70 transition"
          >
            {copied === 'url' ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            Share
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 pb-12">
        {/* Project Header Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Logo */}
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              {project.logo_url ? (
                <img src={project.logo_url} alt={project.asset_name} className="w-full h-full rounded-xl object-cover" />
              ) : (
                <Building2 className="w-10 h-10 text-white" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{project.asset_name}</h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig.label}
                </span>
                {isDeployed && tokenMetrics?.isPaused && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                    <Lock className="w-4 h-4" />
                    Paused
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-4">
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
                <span className={`flex items-center gap-1 ${isTestnet ? 'text-yellow-400' : 'text-green-400'}`}>
                  <Activity className="w-4 h-4" />
                  {chainName}
                </span>
              </div>

              <p className="text-slate-300 line-clamp-2">{project.asset_description}</p>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-col gap-2 md:text-right">
              <div>
                <p className="text-slate-400 text-sm">Estimated Value</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(project.estimated_value)}</p>
              </div>
              {isDeployed && tokenMetrics && (
                <div>
                  <p className="text-slate-400 text-sm">Total Supply</p>
                  <p className="text-lg font-semibold text-white">
                    {formatTokenAmount(tokenMetrics.totalSupply, tokenMetrics.decimals)} {project.token_symbol}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Token Address */}
          {isDeployed && project.token_address && (
            <div className="mt-6 pt-6 border-t border-slate-700">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">Token:</span>
                  <AddressDisplay address={project.token_address} explorerUrl={explorerUrl} label="token address" />
                </div>
                {project.escrow_address && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">Escrow:</span>
                    <AddressDisplay address={project.escrow_address} explorerUrl={explorerUrl} label="escrow address" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-800 rounded-lg p-1 overflow-x-auto">
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
                  ? 'bg-blue-600 text-white'
                  : (tab as any).disabled
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
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
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">About This Asset</h2>
                    <p className="text-slate-300 whitespace-pre-wrap">{project.asset_description}</p>
                  </div>

                  {/* Token Details */}
                  {(project.token_name || project.token_symbol) && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                      <h2 className="text-lg font-semibold text-white mb-4">Token Information</h2>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-700/50 rounded-lg">
                          <p className="text-slate-400 text-sm">Token Name</p>
                          <p className="text-white font-medium">{project.token_name || 'TBD'}</p>
                        </div>
                        <div className="p-4 bg-slate-700/50 rounded-lg">
                          <p className="text-slate-400 text-sm">Token Symbol</p>
                          <p className="text-white font-medium">{project.token_symbol || 'TBD'}</p>
                        </div>
                        <div className="p-4 bg-slate-700/50 rounded-lg">
                          <p className="text-slate-400 text-sm">Total Supply</p>
                          <p className="text-white font-medium">{project.token_supply ? formatNumber(project.token_supply) : 'TBD'}</p>
                        </div>
                        <div className="p-4 bg-slate-700/50 rounded-lg">
                          <p className="text-slate-400 text-sm">Use Case</p>
                          <p className="text-white font-medium">{project.use_case?.replace(/_/g, ' ') || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Features</h2>
                    <div className="flex flex-wrap gap-3">
                      {project.needs_escrow && (
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-lg border border-green-500/30">
                          <Lock className="w-4 h-4" />
                          Trade Escrow
                        </span>
                      )}
                      {project.needs_dividends && (
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-400 rounded-lg border border-yellow-500/30">
                          <TrendingUp className="w-4 h-4" />
                          Dividend Distribution
                        </span>
                      )}
                      {!project.needs_escrow && !project.needs_dividends && (
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-500/10 text-slate-400 rounded-lg border border-slate-500/30">
                          <Coins className="w-4 h-4" />
                          Base Token
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Deployment Info */}
                  {isDeployed && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                      <h2 className="text-lg font-semibold text-white mb-4">Deployment Information</h2>
                      <div className="space-y-4">
                        {project.token_address && (
                          <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                            <div>
                              <p className="text-slate-400 text-sm">Token Contract</p>
                              <AddressDisplay address={project.token_address} explorerUrl={explorerUrl} />
                            </div>
                          </div>
                        )}
                        {project.escrow_address && (
                          <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                            <div>
                              <p className="text-slate-400 text-sm">Escrow Contract</p>
                              <AddressDisplay address={project.escrow_address} explorerUrl={explorerUrl} />
                            </div>
                          </div>
                        )}
                        {project.deployment_tx_hash && (
                          <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                            <div>
                              <p className="text-slate-400 text-sm">Deployment Transaction</p>
                              <a
                                href={`${explorerUrl}/tx/${project.deployment_tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 font-mono text-sm flex items-center gap-2"
                              >
                                {truncateAddress(project.deployment_tx_hash)}
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                            <p className="text-slate-400 text-sm">{formatDate(project.deployed_at)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Company Info */}
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Company Information</h2>
                    <div className="space-y-4">
                      <div>
                        <p className="text-slate-400 text-sm">Legal Entity</p>
                        <p className="text-white font-medium">{project.legal_entity_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Contact</p>
                        <p className="text-white font-medium">{project.contact_name || 'N/A'}</p>
                      </div>
                      {project.website && (
                        <a
                          href={project.website.startsWith('http') ? project.website : `https://${project.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition"
                        >
                          <Globe className="w-4 h-4" />
                          {project.website}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Owner Info */}
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Owner</h2>
                    <AddressDisplay address={project.user_address} explorerUrl={explorerUrl} />
                    {isOwner && (
                      <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
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
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Token Holders</h2>
                <span className="text-slate-400">{holders.length} holder{holders.length !== 1 ? 's' : ''}</span>
              </div>
              
              {holders.length > 0 ? (
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
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No holders data available</p>
                  <p className="text-slate-500 text-sm mt-1">Holder data requires an indexer integration</p>
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Documents</h2>
              
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
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No documents uploaded</p>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab (Owner Only) */}
          {activeTab === 'settings' && isOwner && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Project Settings</h2>
              
              <div className="space-y-6">
                {isDeployed && (
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <h3 className="text-white font-medium mb-4">Token Controls</h3>
                    <div className="flex flex-wrap gap-3">
                      <button className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition">
                        {tokenMetrics?.isPaused ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        {tokenMetrics?.isPaused ? 'Unpause Token' : 'Pause Token'}
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">
                        <Edit className="w-4 h-4" />
                        Update Metadata
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h3 className="text-white font-medium mb-4">Project Information</h3>
                  <p className="text-slate-400 text-sm">
                    Contact support to update project information or documents.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
