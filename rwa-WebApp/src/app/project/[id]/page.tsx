// src/app/project/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, useSignMessage, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  TrendingUp,
  Users,
  Coins,
  Settings,
  Pause,
  Play,
  Send,
  BarChart3,
  RefreshCw,
  Globe,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  ChevronDown,
  ChevronUp,
  Store,
  Lock,
  Image as ImageIcon,
} from 'lucide-react';
import { getChainById } from '@/config/chains';

// Token ABI
const RWA_TOKEN_ABI = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'owner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'pause', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'unpause', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'hasRole', type: 'function', stateMutability: 'view', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'DEFAULT_ADMIN_ROLE', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
] as const;

interface Project {
  id: string;
  name: string;
  description: string;
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  escrowAddress: string;
  nftAddress: string;
  status: string;
  category: string;
  targetAmount: string;
  totalSupply: string;
  tokenPrice: string;
  website: string;
  logoUrl: string;
  bannerUrl: string;
  createdAt: string;
  owner: string;
  chainId: number;
  investorSharePercent: number;
  projectedROI: number;
  roiTimelineMonths: number;
  documents: any[];
}

interface Holder {
  address: string;
  balance: string;
  percentage: string;
  isOwner: boolean;
}

interface ListingStatus {
  listed: boolean;
  status?: string;
  tradingPair?: string;
  listingId?: string;
}

// Helper to get explorer URL for a chain
function getExplorerUrl(chainId: number): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    11155111: 'https://sepolia.etherscan.io',
    137: 'https://polygonscan.com',
    80002: 'https://amoy.polygonscan.com',
    43114: 'https://snowtrace.io',
    43113: 'https://testnet.snowtrace.io',
    56: 'https://bscscan.com',
    97: 'https://testnet.bscscan.com',
    42161: 'https://arbiscan.io',
    421614: 'https://sepolia.arbiscan.io',
    10: 'https://optimistic.etherscan.io',
    11155420: 'https://sepolia-optimism.etherscan.io',
    8453: 'https://basescan.org',
    84532: 'https://sepolia.basescan.org',
  };
  return explorers[chainId] || 'https://etherscan.io';
}

function getExplorerName(chainId: number): string {
  const names: Record<number, string> = {
    1: 'Etherscan',
    11155111: 'Etherscan',
    137: 'Polygonscan',
    80002: 'Polygonscan',
    43114: 'Snowtrace',
    43113: 'Snowtrace',
    56: 'BscScan',
    97: 'BscScan',
    42161: 'Arbiscan',
    421614: 'Arbiscan',
    10: 'Optimism Explorer',
    11155420: 'Optimism Explorer',
    8453: 'Basescan',
    84532: 'Basescan',
  };
  return names[chainId] || 'Explorer';
}

// Helper components
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button onClick={handleCopy} className="p-1 hover:bg-white/10 rounded transition-colors">
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
    </button>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  color = 'blue' 
}: { 
  icon: any; 
  label: string; 
  value: string; 
  subValue?: string;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    red: 'bg-red-500/20 text-red-400',
  };
  
  return (
    <div className="bg-[#1a1a2e]/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-gray-300 text-sm">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      {subValue && <div className="text-sm text-gray-400 mt-1">{subValue}</div>}
    </div>
  );
}

function formatNumber(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(2) + 'K';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { writeContract, data: txHash, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // State
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'holders' | 'settings'>('overview');
  const [holders, setHolders] = useState<Holder[]>([]);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [listingStatus, setListingStatus] = useState<ListingStatus | null>(null);
  const [listingLoading, setListingLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [documentsExpanded, setDocumentsExpanded] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  // Chain info
  const chainInfo = project?.chainId ? getChainById(project.chainId) : null;
  const explorerUrl = project?.chainId ? getExplorerUrl(project.chainId) : '';
  const explorerName = project?.chainId ? getExplorerName(project.chainId) : 'Explorer';
  const isWrongChain = !!(project?.chainId && currentChainId !== project.chainId);

  // On-chain reads
  const { data: tokenName } = useReadContract({
    address: project?.tokenAddress as `0x${string}`,
    abi: RWA_TOKEN_ABI,
    functionName: 'name',
    query: { enabled: !!project?.tokenAddress && !isWrongChain },
  });

  const { data: tokenSymbol } = useReadContract({
    address: project?.tokenAddress as `0x${string}`,
    abi: RWA_TOKEN_ABI,
    functionName: 'symbol',
    query: { enabled: !!project?.tokenAddress && !isWrongChain },
  });

  const { data: totalSupply } = useReadContract({
    address: project?.tokenAddress as `0x${string}`,
    abi: RWA_TOKEN_ABI,
    functionName: 'totalSupply',
    query: { enabled: !!project?.tokenAddress && !isWrongChain },
  });

  const { data: decimals } = useReadContract({
    address: project?.tokenAddress as `0x${string}`,
    abi: RWA_TOKEN_ABI,
    functionName: 'decimals',
    query: { enabled: !!project?.tokenAddress && !isWrongChain },
  });

  const { data: userBalance } = useReadContract({
    address: project?.tokenAddress as `0x${string}`,
    abi: RWA_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!project?.tokenAddress && !!address && !isWrongChain },
  });

  const { data: tokenOwner } = useReadContract({
    address: project?.tokenAddress as `0x${string}`,
    abi: RWA_TOKEN_ABI,
    functionName: 'owner',
    query: { enabled: !!project?.tokenAddress && !isWrongChain },
  });

  const { data: adminRole } = useReadContract({
    address: project?.tokenAddress as `0x${string}`,
    abi: RWA_TOKEN_ABI,
    functionName: 'DEFAULT_ADMIN_ROLE',
    query: { enabled: !!project?.tokenAddress && !isWrongChain },
  });

  const { data: hasAdminRole } = useReadContract({
    address: project?.tokenAddress as `0x${string}`,
    abi: RWA_TOKEN_ABI,
    functionName: 'hasRole',
    args: adminRole && address ? [adminRole, address] : undefined,
    query: { enabled: !!project?.tokenAddress && !!adminRole && !!address && !isWrongChain },
  });

  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: project?.tokenAddress as `0x${string}`,
    abi: RWA_TOKEN_ABI,
    functionName: 'paused',
    query: { enabled: !!project?.tokenAddress && !isWrongChain },
  });

  // Check ownership - either via owner() or hasRole(DEFAULT_ADMIN_ROLE) or project.owner
  const isOwner = address && (
    (tokenOwner && address.toLowerCase() === (tokenOwner as string).toLowerCase()) ||
    hasAdminRole === true ||
    (project?.owner && address.toLowerCase() === project.owner.toLowerCase())
  );

  // Fetch project data
  useEffect(() => {
    async function fetchProject() {
      if (!projectId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`/api/project/${projectId}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load project');
        }
        
        setProject(data.project);
        console.log('[ProjectPage] Loaded project:', data.project);
        console.log('[ProjectPage] Banner URL:', data.project?.bannerUrl);
        console.log('[ProjectPage] Logo URL:', data.project?.logoUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProject();
  }, [projectId]);

  // Check listing status
  const checkListingStatus = useCallback(async () => {
    if (!project?.tokenAddress) return;
    
    try {
      const res = await fetch(`/api/exchange/check?tokenAddress=${project.tokenAddress}&chainId=${project.chainId}`);
      const data = await res.json();
      setListingStatus(data);
    } catch (err) {
      console.error('Failed to check listing status:', err);
    }
  }, [project?.tokenAddress, project?.chainId]);

  useEffect(() => {
    if (project?.tokenAddress) {
      checkListingStatus();
    }
  }, [project?.tokenAddress, checkListingStatus]);

  // Fetch holders - generate from on-chain data if API fails
  const fetchHolders = useCallback(async () => {
    console.log('[ProjectPage] fetchHolders called', { 
      tokenAddress: project?.tokenAddress, 
      chainId: project?.chainId 
    });
    
    if (!project?.tokenAddress || !project?.chainId) {
      console.log('[ProjectPage] fetchHolders: missing data, returning');
      return;
    }
    
    console.log('[ProjectPage] fetchHolders: starting...');
    setHoldersLoading(true);
    
    try {
      const url = `/api/token/${project.tokenAddress}/holders?chainId=${project.chainId}`;
      console.log('[ProjectPage] fetchHolders: fetching', url);
      
      const res = await fetch(url);
      const data = await res.json();
      
      console.log('[ProjectPage] fetchHolders: got response', data);
      
      if (data.holders && Array.isArray(data.holders)) {
        console.log('[ProjectPage] fetchHolders: setting', data.holders.length, 'holders');
        setHolders(data.holders);
      } else {
        console.log('[ProjectPage] fetchHolders: no holders in response');
        setHolders([]);
      }
    } catch (err) {
      console.error('[ProjectPage] fetchHolders: error', err);
      setHolders([]);
    } finally {
      setHoldersLoading(false);
      console.log('[ProjectPage] fetchHolders: done');
    }
  }, [project?.tokenAddress, project?.chainId]);

  // 2. Update the useEffect to log when it triggers
  useEffect(() => {
    console.log('[ProjectPage] Holders useEffect triggered', { 
      activeTab, 
      tokenAddress: project?.tokenAddress,
      chainId: project?.chainId 
    });
    
    if (project?.tokenAddress && project?.chainId) {
      console.log('[ProjectPage] Fetching holders on project load');
      fetchHolders();
    }
  }, [activeTab, project?.tokenAddress, project?.chainId, fetchHolders]);
  // List on exchange
  const handleListOnExchange = async () => {
    if (!project || !address) return;
    
    setListingLoading(true);
    try {
      const timestamp = Date.now().toString();
      const message = `List token on RWA Exchange\nToken: ${project.tokenAddress}\nTimestamp: ${timestamp}`;
      
      const signature = await signMessageAsync({ message });
      
      const res = await fetch('/api/exchange/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: project.tokenAddress,
          tokenSymbol: project.tokenSymbol,
          tokenName: project.tokenName,
          ownerAddress: address,
          signature,
          timestamp,
          chainId: project.chainId,
          initialPrice: project.tokenPrice,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        await checkListingStatus();
        alert('Token successfully listed on exchange!');
      } else {
        throw new Error(data.error || 'Failed to list token');
      }
    } catch (err) {
      console.error('Listing error:', err);
      alert(err instanceof Error ? err.message : 'Failed to list token');
    } finally {
      setListingLoading(false);
    }
  };

  // Pause/Unpause token
  const handleTogglePause = async () => {
    if (!project?.tokenAddress) return;
    
    try {
      writeContract({
        address: project.tokenAddress as `0x${string}`,
        abi: RWA_TOKEN_ABI,
        functionName: isPaused ? 'unpause' : 'pause',
      });
    } catch (err) {
      console.error('Toggle pause error:', err);
    }
  };

  // Transfer tokens
  const handleTransfer = async () => {
    if (!project?.tokenAddress || !transferTo || !transferAmount) return;
    
    try {
      const amount = parseUnits(transferAmount, decimals || 18);
      writeContract({
        address: project.tokenAddress as `0x${string}`,
        abi: RWA_TOKEN_ABI,
        functionName: 'transfer',
        args: [transferTo as `0x${string}`, amount],
      });
    } catch (err) {
      console.error('Transfer error:', err);
    }
  };

  // Refetch paused status after tx
  useEffect(() => {
    if (txSuccess) {
      refetchPaused();
      setShowTransferModal(false);
      setTransferTo('');
      setTransferAmount('');
    }
  }, [txSuccess, refetchPaused]);

  // Format values
 const formattedTotalSupply = totalSupply && decimals 
  ? formatNumber(formatUnits(totalSupply, decimals)) 
  : project?.totalSupply || '0';
  
  const formattedUserBalance = userBalance && decimals
    ? formatUnits(userBalance, decimals)
    : '0';

  const userBalanceFormatted = formatNumber(formattedUserBalance);

  const userPercentage = totalSupply && userBalance && totalSupply > 0n
    ? ((Number(userBalance) / Number(totalSupply)) * 100).toFixed(2)
    : '0';

  // Calculate total asset value (supply × price)
  const totalSupplyNum = totalSupply && decimals 
    ? parseFloat(formatUnits(totalSupply, decimals))
    : parseFloat(project?.totalSupply || '0');

  const tokenPrice = parseFloat(project?.tokenPrice || '0');

  const totalAssetValue = totalSupplyNum * tokenPrice;

  // Calculate user's holdings value
  const userHoldingsValue = userBalance && decimals && tokenPrice
    ? parseFloat(formatUnits(userBalance, decimals)) * tokenPrice
    : 0;

  // Get banner URL - check multiple possible fields
  const bannerUrl = project?.bannerUrl || (project as any)?.banner_url || (project as any)?.banner;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Project Not Found</h1>
          <p className="text-gray-400 mb-4">{error || 'The requested project could not be found.'}</p>
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      {/* Hero Section with Banner */}
      <div className="relative min-h-[420px]">
        {/* Banner Background */}
        <div className="absolute inset-x-0 top-0 h-[320px] overflow-hidden">
          {bannerUrl && !bannerError ? (
            <img 
              src={bannerUrl} 
              alt=""
              className="w-full h-full object-cover"
              onError={() => {
                console.error('[ProjectPage] Banner failed to load:', bannerUrl);
                setBannerError(true);
              }}
              onLoad={() => console.log('[ProjectPage] Banner loaded successfully')}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-900/40 via-purple-900/40 to-indigo-900/40" />
          )}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a14]/60 via-[#0a0a14]/40 to-[#0a0a14]" />
        </div>

        {/* Content over banner */}
        <div className="relative z-10 pt-4">
          {/* Top Navigation */}
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link 
                href="/dashboard" 
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a2e]/80 backdrop-blur-sm rounded-lg hover:bg-[#1a1a2e] transition-colors border border-gray-700/50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </Link>

              <div className="flex items-center gap-3">
                {/* Chain Badge */}
                {chainInfo && (
                  <div className="px-3 py-2 bg-[#1a1a2e]/80 backdrop-blur-sm rounded-lg text-sm flex items-center gap-2 border border-gray-700/50">
                    <div className={`w-2 h-2 rounded-full ${chainInfo.testnet ? 'bg-yellow-400' : 'bg-green-400'}`} />
                    <span>{chainInfo.name}</span>
                  </div>
                )}

                {/* Status badge */}
                <div className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 backdrop-blur-sm border border-gray-700/50 ${
                  project.status === 'completed' || project.status === 'deployed' || project.status === 'live'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {project.status === 'completed' || project.status === 'deployed' || project.status === 'live' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  <span className="capitalize font-medium">{project.status === 'completed' ? 'Live' : project.status}</span>
                </div>

                {/* Paused badge */}
                {isPaused && (
                  <div className="px-3 py-2 rounded-lg text-sm bg-red-500/20 text-red-400 flex items-center gap-2 backdrop-blur-sm border border-red-500/30">
                    <Pause className="w-4 h-4" />
                    <span className="font-medium">Paused</span>
                  </div>
                )}

                {/* Exchange listing badge */}
                {listingStatus?.listed && (
                  <div className="px-3 py-2 rounded-lg text-sm bg-purple-500/20 text-purple-400 flex items-center gap-2 backdrop-blur-sm border border-purple-500/30">
                    <Store className="w-4 h-4" />
                    <span className="font-medium">Listed</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Project Info */}
          <div className="max-w-7xl mx-auto px-4 pt-12 pb-6">
            <div className="flex items-start gap-6">
              {/* Logo */}
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-[#1a1a2e] border-4 border-[#0a0a14] shadow-xl flex-shrink-0">
                {project.logoUrl ? (
                  <img 
                    src={project.logoUrl} 
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
                    <span className="text-3xl font-bold">{project.name?.charAt(0) || '?'}</span>
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div className="flex-1 pt-2">
                <h1 className="text-4xl font-bold mb-2">{project.name}</h1>
                <div className="flex items-center gap-4 text-gray-300">
                  <span className="text-xl font-medium text-blue-400">{tokenSymbol || project.tokenSymbol}</span>
                  <span className="text-gray-600">•</span>
                  <span className="capitalize">{project.category}</span>
                  {project.website && (
                    <>
                      <span className="text-gray-600">•</span>
                      <a 
                        href={project.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                      >
                        <Globe className="w-4 h-4" />
                        Website
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="max-w-7xl mx-auto px-4 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={Coins}
                label="Total Supply"
                value={formattedTotalSupply}
                subValue={tokenSymbol || project.tokenSymbol}
                color="blue"
              />
              <StatCard
                icon={DollarSign}
                label="Total Asset Value"
                value={`$${formatNumber(totalAssetValue)}`}
                subValue={`$${project.tokenPrice} per token`}
                color="green"
              />
              <StatCard
                icon={TrendingUp}
                label="Your Holdings"
                value={userBalanceFormatted}
                subValue={`$${formatNumber(userHoldingsValue)} (${userPercentage}%)`}
                color="purple"
              />
              <StatCard
                icon={Users}
                label="Holders"
                value={holdersLoading ? '...' : holders.length.toString()}
                color="yellow"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Wrong Chain Warning */}
      {isWrongChain && (
        <div className="max-w-7xl mx-auto px-4 mb-6">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-yellow-400 font-medium">Wrong Network</p>
              <p className="text-sm text-gray-400">
                This project is on {chainInfo?.name || `Chain ${project.chainId}`}. 
                Please switch your wallet to interact with this project.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800 pb-4">
          {(['overview', 'holders', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                console.log('[ProjectPage] Tab clicked:', tab);
                setActiveTab(tab);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1a1a2e] text-gray-400 hover:text-white hover:bg-[#252542]'
              }`}
            >
              {tab === 'overview' && <BarChart3 className="w-4 h-4" />}
              {tab === 'holders' && <Users className="w-4 h-4" />}
              {tab === 'settings' && <Settings className="w-4 h-4" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'settings' && isOwner && (
                <span className="w-2 h-2 bg-green-400 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-4">About</h2>
                <p className="text-gray-300 leading-relaxed">{project.description || 'No description provided.'}</p>
              </div>

              {/* Investment Details */}
              <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-4">Investment Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Investor Share</p>
                    <p className="text-white font-medium">{project.investorSharePercent || 0}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Projected ROI</p>
                    <p className="text-green-400 font-medium">{project.projectedROI || 0}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">ROI Timeline</p>
                    <p className="text-white font-medium">{project.roiTimelineMonths || 0} months</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Token Price</p>
                    <p className="text-white font-medium">${project.tokenPrice}</p>
                  </div>
                </div>
              </div>

              {/* Documents - Collapsible */}
              {project.documents && Array.isArray(project.documents) && project.documents.length > 0 && (
                <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 overflow-hidden">
                  <button
                    onClick={() => setDocumentsExpanded(!documentsExpanded)}
                    className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <h2 className="text-lg font-semibold">Documents</h2>
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-sm rounded-full">
                        {project.documents.length}
                      </span>
                    </div>
                    {documentsExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  {documentsExpanded && (
                    <div className="px-6 pb-6 space-y-2">
                      {project.documents.map((doc: any, i: number) => (
                        <a
                          key={i}
                          href={typeof doc === 'string' ? doc : doc.url || doc.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-[#0d0d1a] rounded-lg hover:bg-white/5 transition-colors group"
                        >
                          <FileText className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
                          <span className="text-gray-300 flex-1">
                            {typeof doc === 'string' ? `Document ${i + 1}` : doc.name || `Document ${i + 1}`}
                          </span>
                          <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-gray-300" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Smart Contract Info */}
              <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-4">Smart Contracts</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Token Address</p>
                    <div className="flex items-center gap-2 bg-[#0d0d1a] p-2 rounded-lg">
                      <code className="text-sm text-gray-300 flex-1 truncate">{project.tokenAddress}</code>
                      <CopyButton text={project.tokenAddress} />
                      <a 
                        href={`${explorerUrl}/address/${project.tokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-white/10 rounded"
                        title={`View on ${explorerName}`}
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </a>
                    </div>
                  </div>

                  {project.nftAddress && (
                    <div>
                      <p className="text-gray-400 text-sm mb-1">NFT Contract</p>
                      <div className="flex items-center gap-2 bg-[#0d0d1a] p-2 rounded-lg">
                        <code className="text-sm text-gray-300 flex-1 truncate">{project.nftAddress}</code>
                        <CopyButton text={project.nftAddress} />
                        <a 
                          href={`${explorerUrl}/address/${project.nftAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-white/10 rounded"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </a>
                      </div>
                    </div>
                  )}

                  {project.escrowAddress && (
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Escrow Contract</p>
                      <div className="flex items-center gap-2 bg-[#0d0d1a] p-2 rounded-lg">
                        <code className="text-sm text-gray-300 flex-1 truncate">{project.escrowAddress}</code>
                        <CopyButton text={project.escrowAddress} />
                        <a 
                          href={`${explorerUrl}/address/${project.escrowAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-white/10 rounded"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </a>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 pt-2 border-t border-gray-800">
                    View on {explorerName} • {chainInfo?.name || `Chain ${project.chainId}`}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  {project.website && (
                    <a
                      href={project.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 w-full p-3 bg-[#0d0d1a] rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <Globe className="w-4 h-4 text-blue-400" />
                      <span>Visit Website</span>
                      <ExternalLink className="w-4 h-4 text-gray-500 ml-auto" />
                    </a>
                  )}

                  <a
                    href={`${explorerUrl}/token/${project.tokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full p-3 bg-[#0d0d1a] rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4 text-green-400" />
                    <span>View on {explorerName}</span>
                    <ExternalLink className="w-4 h-4 text-gray-500 ml-auto" />
                  </a>

                  {listingStatus?.listed && (
                    <Link
                      href="/exchange"
                      className="flex items-center gap-2 w-full p-3 bg-purple-600/20 rounded-lg hover:bg-purple-600/30 transition-colors text-purple-400"
                    >
                      <Store className="w-4 h-4" />
                      <span>Trade on Exchange</span>
                      <ExternalLink className="w-4 h-4 ml-auto" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Owner Actions - List on Exchange */}
              {isOwner && !listingStatus?.listed && (
                <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    Owner Actions
                  </h2>
                  
                  <button
                    onClick={handleListOnExchange}
                    disabled={listingLoading || isWrongChain}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    {listingLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Store className="w-4 h-4" />
                    )}
                    List on Exchange
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Enable trading of your token on the RWA Exchange.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'holders' && (
          <div className="bg-[#1a1a2e] rounded-xl border border-gray-800">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Token Holders</h2>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-sm rounded-full">
                  {holders.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`${explorerUrl}/token/${project.tokenAddress}#balances`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-[#0d0d1a] text-gray-300 rounded-lg hover:bg-white/5 transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on {explorerName}
                </a>
                <button
                  onClick={() => fetchHolders()}
                  disabled={holdersLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${holdersLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {holdersLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                <p className="text-gray-400">Loading holders...</p>
              </div>
            ) : holders.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No holder data available</p>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  Holder data may not be indexed yet for new tokens.
                </p>
                <a
                  href={`${explorerUrl}/token/${project.tokenAddress}#balances`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Holders on {explorerName}
                </a>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {holders.map((holder, i) => (
                  <div key={holder.address} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 w-8 text-center font-mono">#{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                        {holder.address.slice(2, 4).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-sm text-gray-300 font-mono">{truncateAddress(holder.address)}</code>
                          <CopyButton text={holder.address} />
                          <a 
                            href={`${explorerUrl}/address/${holder.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            <ExternalLink className="w-3 h-3 text-gray-500" />
                          </a>
                          {holder.isOwner && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded font-medium">Owner</span>
                          )}
                          {holder.address.toLowerCase() === address?.toLowerCase() && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded font-medium">You</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">
                        {holder.balance} <span className="text-gray-400 text-sm">{tokenSymbol || project.tokenSymbol}</span>
                      </p>
                      <p className="text-sm text-gray-500">{holder.percentage}% of supply</p>
                    </div>
                  </div>
                ))}
                
                <div className="p-4 text-center border-t border-gray-800">
                  <a
                    href={`${explorerUrl}/token/${project.tokenAddress}#balances`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                  >
                    View all holders on {explorerName}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {!isConnected ? (
              <div className="bg-[#1a1a2e] rounded-xl p-8 border border-gray-800 text-center">
                <Lock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Connect Wallet</h3>
                <p className="text-gray-400">Please connect your wallet to access settings.</p>
              </div>
            ) : !isOwner ? (
              <div className="bg-[#1a1a2e] rounded-xl p-8 border border-gray-800 text-center">
                <Lock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Owner Access Required</h3>
                <p className="text-gray-400 mb-4">Only the token owner can access these settings.</p>
                <div className="text-sm text-gray-500 space-y-1 bg-[#0d0d1a] p-4 rounded-lg inline-block text-left">
                  <p><span className="text-gray-400">Your address:</span> {truncateAddress(address || '')}</p>
                  {tokenOwner && <p><span className="text-gray-400">Token owner:</span> {truncateAddress(tokenOwner as string)}</p>}
                  {project.owner && <p><span className="text-gray-400">Project owner:</span> {truncateAddress(project.owner)}</p>}
                  <p><span className="text-gray-400">Has admin role:</span> {hasAdminRole ? 'Yes' : 'No'}</p>
                </div>
              </div>
            ) : isWrongChain ? (
              <div className="bg-[#1a1a2e] rounded-xl p-8 border border-gray-800 text-center">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Wrong Network</h3>
                <p className="text-gray-400">
                  Please switch to {chainInfo?.name || `Chain ${project.chainId}`} to manage your token.
                </p>
              </div>
            ) : (
              <>
                {/* Token Controls */}
                <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    Token Controls
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Pause/Unpause */}
                    <div className="p-4 bg-[#0d0d1a] rounded-lg border border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isPaused ? <Play className="w-5 h-5 text-green-400" /> : <Pause className="w-5 h-5 text-yellow-400" />}
                          <span className="font-medium">{isPaused ? 'Resume Token' : 'Pause Token'}</span>
                        </div>
                        {isPaused && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">PAUSED</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-3">
                        {isPaused 
                          ? 'Token is currently paused. Resume to enable transfers.' 
                          : 'Pause all token transfers. Use in emergency situations.'}
                      </p>
                      <button
                        onClick={handleTogglePause}
                        disabled={isWriting || isConfirming}
                        className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg transition-colors font-medium ${
                          isPaused 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-yellow-600 hover:bg-yellow-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isWriting || isConfirming ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isPaused ? (
                          <Play className="w-4 h-4" />
                        ) : (
                          <Pause className="w-4 h-4" />
                        )}
                        {isPaused ? 'Resume Token' : 'Pause Token'}
                      </button>
                    </div>

                    {/* Transfer Tokens */}
                    <div className="p-4 bg-[#0d0d1a] rounded-lg border border-gray-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Send className="w-5 h-5 text-blue-400" />
                        <span className="font-medium">Transfer Tokens</span>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">
                        Send tokens from your balance to another address.
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        Your balance: {userBalanceFormatted} {tokenSymbol || project.tokenSymbol}
                      </p>
                      <button
                        onClick={() => setShowTransferModal(true)}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
                      >
                        <Send className="w-4 h-4" />
                        Transfer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Exchange Settings */}
                <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Store className="w-5 h-5 text-purple-400" />
                    Exchange Settings
                  </h2>
                  
                  {listingStatus?.listed ? (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="font-medium text-green-400">Listed on Exchange</span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Trading pair: {listingStatus.tradingPair || `${project.tokenSymbol}/USDC`}
                      </p>
                      <Link 
                        href="/exchange"
                        className="inline-flex items-center gap-2 mt-3 text-sm text-purple-400 hover:text-purple-300"
                      >
                        Go to Exchange <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#0d0d1a] rounded-lg border border-gray-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Store className="w-5 h-5 text-gray-400" />
                        <span className="font-medium">Not Listed</span>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">
                        List your token on the exchange to enable trading.
                      </p>
                      <button
                        onClick={handleListOnExchange}
                        disabled={listingLoading}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors font-medium"
                      >
                        {listingLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Store className="w-4 h-4" />
                        )}
                        List on Exchange
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-400" />
              Transfer Tokens
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Recipient Address</label>
                <input
                  type="text"
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-3 bg-[#0d0d1a] border border-gray-700 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-3 bg-[#0d0d1a] border border-gray-700 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none pr-24"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      onClick={() => setTransferAmount(formattedUserBalance)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1 rounded hover:bg-blue-500/10"
                    >
                      MAX
                    </button>
                    <span className="text-gray-500 text-sm">
                      {tokenSymbol || project.tokenSymbol}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Available: {userBalanceFormatted} {tokenSymbol || project.tokenSymbol}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferTo('');
                  setTransferAmount('');
                }}
                className="flex-1 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={!transferTo || !transferAmount || isWriting || isConfirming}
                className="flex-1 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
              >
                {isWriting || isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isWriting ? 'Confirm in wallet...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Transfer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
