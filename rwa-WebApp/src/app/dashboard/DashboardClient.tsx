// src/app/dashboard/DashboardClient.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useChainConfig } from '@/hooks/useChainConfig';
import { useKYC as useKYCContext, KYCTier } from '@/contexts/KYCContext';
import { useKYC, LinkedWallet, WalletLinkCode } from '@/hooks/useKYC';
import Link from 'next/link';
import { 
  Wallet, TrendingUp, DollarSign, Shield, 
  ChevronRight, AlertCircle, FileText, Briefcase, 
  CheckCircle, XCircle, Loader2, PieChart, ArrowUpRight,
  ArrowDownRight, Coins, Users, BarChart3, Award, Banknote,
  Settings, Copy, Check, Link as LinkIcon, Share2, Clock,
  ExternalLink, ChevronDown, RefreshCw, Eye
} from 'lucide-react';
import { RWAProjectNFTABI } from '@/config/abis';

// ============================================================================
// TYPES
// ============================================================================

interface Investment {
  projectId: string;
  projectName: string;
  tokenSymbol: string;
  tokenAddress: string;
  amount: number;
  tokens: number;
  currentValue: number;
  purchaseDate: string;
  priceAtPurchase: number;
  currentPrice: number;
  roi: number;
  status: 'active' | 'pending' | 'completed';
}

interface UserProject {
  id: string;
  name: string;
  type: 'tokenize' | 'crowdfund' | 'trade' | 'ERC20' | 'ERC721' | 'ERC1155';
  status: 'pending' | 'approved' | 'rejected' | 'payment_pending' | 'deploying' | 'deployed' | 'live' | 'funded' | 'completed';
  submittedAt: string;
  tokenSymbol?: string;
  category: string;
  totalRaised: number;
  targetAmount: number;
  totalSupply: number;
  tokensSold: number;
  currentValue: number;
  roi: number;
  age: number;
  performanceScore: number;
  dividendsDistributed: number;
  escrowBalance: number;
  // New fields
  rejectionReason?: string;
  tokenAddress?: string;
  escrowAddress?: string;
  nftAddress?: string;
  logoUrl?: string;
  website?: string;
  description?: string;
}

interface InvestorStats {
  totalInvested: number;
  investmentLimit: number;
  remainingLimit: number;
  currentValue: number;
  totalReturns: number;
  globalROI: number;
  pendingDividends: number;
  pendingYield: number;
}

interface OwnerStats {
  totalTokenized: number;
  totalRaised: number;
  totalOwned: number;
  currentValue: number;
  totalYield: number;
  dividendsDistributed: number;
  projectCount: number;
}

interface PortfolioHistory {
  date: string;
  value: number;
}

const MAX_LINKED_WALLETS = 10;

interface ProjectCardProps {
  project: UserProject;
}

function ProjectCard({ project }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bgColor: string; icon: React.ReactNode; label: string }> = {
      pending: { 
        color: 'text-yellow-400', 
        bgColor: 'bg-yellow-500/20', 
        icon: <Clock className="w-4 h-4" />,
        label: 'Pending Review'
      },
      approved: { 
        color: 'text-blue-400', 
        bgColor: 'bg-blue-500/20', 
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Approved - Ready to Deploy'
      },
      rejected: { 
        color: 'text-red-400', 
        bgColor: 'bg-red-500/20', 
        icon: <XCircle className="w-4 h-4" />,
        label: 'Rejected'
      },
      payment_pending: { 
        color: 'text-orange-400', 
        bgColor: 'bg-orange-500/20', 
        icon: <Banknote className="w-4 h-4" />,
        label: 'Awaiting Payment'
      },
      deploying: { 
        color: 'text-purple-400', 
        bgColor: 'bg-purple-500/20', 
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        label: 'Deploying...'
      },
      deployed: { 
        color: 'text-green-400', 
        bgColor: 'bg-green-500/20', 
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Live'
      },
      live: { 
        color: 'text-green-400', 
        bgColor: 'bg-green-500/20', 
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Live'
      },
    };
    return configs[status] || configs.pending;
  };

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { color: string; label: string }> = {
      tokenize: { color: 'bg-purple-500/20 text-purple-400', label: 'Tokenization' },
      crowdfund: { color: 'bg-blue-500/20 text-blue-400', label: 'Crowdfunding' },
      trade: { color: 'bg-green-500/20 text-green-400', label: 'Trade' },
      ERC20: { color: 'bg-purple-500/20 text-purple-400', label: 'ERC-20' },
      ERC721: { color: 'bg-indigo-500/20 text-indigo-400', label: 'NFT (ERC-721)' },
      ERC1155: { color: 'bg-pink-500/20 text-pink-400', label: 'Multi-Token' },
    };
    return configs[type] || configs.tokenize;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  };

  const statusConfig = getStatusConfig(project.status);
  const typeConfig = getTypeConfig(project.type);
  const isDeployed = project.status === 'deployed' || project.status === 'completed' || project.status === 'live';
  const isApproved = project.status === 'approved'
  const isPending = project.status === 'pending'
  const isRejected = project.status === 'rejected';

  return (
    <div className={`bg-gray-900 rounded-xl border transition-all ${
      isRejected ? 'border-red-500/30' : 
      isDeployed ? 'border-green-500/30' : 
      isApproved ? 'border-blue-500/30' : 
      'border-gray-700'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-white truncate">{project.name}</h4>
              {project.tokenSymbol && (
                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
                  ${project.tokenSymbol}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-xs ${typeConfig.color}`}>
                {typeConfig.label}
              </span>
              <span className="text-xs text-gray-500 capitalize">
                {project.category?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${statusConfig.bgColor} ${statusConfig.color}`}>
            {statusConfig.icon}
            <span className="hidden sm:inline">{statusConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500">Target Value</p>
          <p className="text-sm font-medium text-white">{formatCurrency(project.targetAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Token Supply</p>
          <p className="text-sm font-medium text-white">{project.totalSupply?.toLocaleString() || '—'}</p>
        </div>
        {isDeployed && (
          <>
            <div>
              <p className="text-xs text-gray-500">Raised</p>
              <p className="text-sm font-medium text-green-400">{formatCurrency(project.totalRaised)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">ROI</p>
              <p className={`text-sm font-medium ${project.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {project.roi >= 0 ? '+' : ''}{project.roi.toFixed(1)}%
              </p>
            </div>
          </>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-700 pt-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Submitted</p>
              <p className="text-gray-300">{project.submittedAt}</p>
            </div>
            {project.age > 0 && (
              <div>
                <p className="text-xs text-gray-500">Age</p>
                <p className="text-gray-300">{project.age} days</p>
              </div>
            )}
            {isDeployed && (
              <>
                <div>
                  <p className="text-xs text-gray-500">Performance</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full">
                      <div 
                        className={`h-full rounded-full ${
                          project.performanceScore >= 80 ? 'bg-green-500' :
                          project.performanceScore >= 60 ? 'bg-blue-500' :
                          project.performanceScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${project.performanceScore}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{project.performanceScore}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Dividends Paid</p>
                  <p className="text-gray-300">{formatCurrency(project.dividendsDistributed)}</p>
                </div>
              </>
            )}
          </div>

          {/* Rejection Reason */}
          {isRejected && project.rejectionReason && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-xs text-red-400 font-medium mb-1">Rejection Reason:</p>
              <p className="text-sm text-gray-300">{project.rejectionReason}</p>
            </div>
          )}

          {/* Contract Addresses */}
          {isDeployed && project.tokenAddress && (
            <div className="p-3 bg-gray-800 rounded-lg space-y-2">
              <p className="text-xs text-gray-500 font-medium">Contract Addresses</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Token:</span>
                <a 
                  href={`https://polygonscan.com/address/${project.tokenAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                >
                  {project.tokenAddress?.slice(0, 8)}...{project.tokenAddress?.slice(-6)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {project.escrowAddress && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Escrow:</span>
                  <a 
                    href={`https://polygonscan.com/address/${project.escrowAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                  >
                    {project.escrowAddress?.slice(0, 8)}...{project.escrowAddress?.slice(-6)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-gray-700 flex items-center gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors flex items-center justify-center gap-1"
        >
          {expanded ? 'Show Less' : 'Show More'}
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {/* Action buttons based on status */}
        {isRejected && (
          <Link
            href={`/tokenize/edit/${project.id}?resubmit=true&from=dashboard`}
            className="flex-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Resubmit
          </Link>
        )}

        {isPending && (
          <Link
            href={`/tokenize/application/${project.id}?from=dashboard`}
            className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-1"
          >
            <Eye className="w-4 h-4" />
            View
          </Link>
        )}

        {isApproved && (
          <Link
            href={`/tokenize/create/${project.id}?from=dashboard`}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-1"
          >
            <Coins className="w-4 h-4" />
            Deploy
          </Link>
        )}

        {isDeployed && (
          <Link
            href={`/projects/${project.id}`}
            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-1"
          >
            <ExternalLink className="w-4 h-4" />
            View Live
          </Link>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DashboardClient() {
  const { address, isConnected } = useAccount();
  const { contracts } = useChainConfig();
  const { kycData, tierInfo, tierLimits } = useKYCContext();
  const {status, linkedWallets, isLoading: isLoadingKYC, generateLinkCode, useLinkCode, getLinkedWallets,} = useKYC();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'investor' | 'owner' | 'settings'>('investor');
  
  // Wallet linking state
  const [linkCode, setLinkCode] = useState<WalletLinkCode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  
  // Referral state
  const [copiedReferral, setCopiedReferral] = useState(false);
  
  // Data states
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);
  const [investorStats, setInvestorStats] = useState<InvestorStats>({
    totalInvested: 0,
    investmentLimit: 0,
    remainingLimit: 0,
    currentValue: 0,
    totalReturns: 0,
    globalROI: 0,
    pendingDividends: 0,
    pendingYield: 0,
  });
  const [ownerStats, setOwnerStats] = useState<OwnerStats>({
    totalTokenized: 0,
    totalRaised: 0,
    totalOwned: 0,
    currentValue: 0,
    totalYield: 0,
    dividendsDistributed: 0,
    projectCount: 0,
  });
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Read user's on-chain projects
  const { data: onChainProjectIds } = useReadContract({
    address: contracts?.RWAProjectNFT as `0x${string}`,
    abi: RWAProjectNFTABI,
    functionName: 'getProjectsByOwner',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contracts?.RWAProjectNFT },
  });

  useEffect(() => {
  window.scrollTo(0, 0);
}, []);

  // Load linked wallets on mount
  useEffect(() => {
    if (isConnected && address) {
      getLinkedWallets();
    }
  }, [isConnected, address, getLinkedWallets]);

  // Countdown timer for link code
  useEffect(() => {
    if (!linkCode) return;

    const updateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = linkCode.expiresAt - now;
      setTimeLeft(Math.max(0, remaining));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [linkCode]);

  // Handle generate link code
  const handleGenerateCode = useCallback(async () => {
    setIsGenerating(true);
    setLinkError(null);

    try {
      const code = await generateLinkCode();
      if (code) {
        setLinkCode(code);
      } else {
        setLinkError("Failed to generate link code. Make sure you have approved KYC.");
      }
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : "Failed to generate code");
    } finally {
      setIsGenerating(false);
    }
  }, [generateLinkCode]);

  // Handle use link code
  const handleUseLinkCode = useCallback(async () => {
    if (codeInput.length !== 8) return;
    
    setIsLinking(true);
    setLinkError(null);

    try {
      const result = await useLinkCode(codeInput.toUpperCase());
      if (result.success) {
        setLinkSuccess(true);
        setCodeInput('');
        await getLinkedWallets();
      } else {
        setLinkError(result.error || "Failed to link wallet");
      }
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : "Failed to link wallet");
    } finally {
      setIsLinking(false);
    }
  }, [codeInput, useLinkCode, getLinkedWallets]);

  // Copy helpers
  const copyCode = useCallback(() => {
    if (!linkCode) return;
    navigator.clipboard.writeText(linkCode.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, [linkCode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // KYC status checks
  const hasKYC = status?.applicationStatus === "approved" && !status?.isExpired;
  const isPrimaryWallet = linkedWallets.some(
    (w) => w.address.toLowerCase() === address?.toLowerCase() && w.isPrimary
  );

  // Get investment limit from KYC context
  const investmentLimit = kycData?.investmentLimit || tierLimits?.[kycData?.tier || 'None'] || 0;

  // Fetch investor data
  useEffect(() => {
    const fetchInvestorData = async () => {
      if (!address) return;
      
      try {
        const investRes = await fetch(`/api/investments/user?wallet=${address}`);
        if (investRes.ok) {
          const data = await investRes.json();
          setInvestments(data.investments || []);
          
          const totalInvested = data.investments?.reduce((sum: number, inv: Investment) => 
            sum + inv.amount, 0) || 0;
          const currentValue = data.investments?.reduce((sum: number, inv: Investment) => 
            sum + inv.currentValue, 0) || 0;
          const totalReturns = currentValue - totalInvested;
          const globalROI = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;
          
          setInvestorStats({
            totalInvested,
            investmentLimit: investmentLimit === Infinity ? Infinity : investmentLimit,
            remainingLimit: Math.max(0, (investmentLimit === Infinity ? Infinity : investmentLimit) - totalInvested),
            currentValue,
            totalReturns,
            globalROI,
            pendingDividends: data.pendingDividends || 0,
            pendingYield: data.pendingYield || 0,
          });
          
          // Generate portfolio history
          const history: PortfolioHistory[] = [];
          const now = new Date();
          for (let i = 30; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            history.push({
              date: date.toISOString().split('T')[0],
              value: currentValue > 0 ? currentValue * (0.85 + Math.random() * 0.3) : 0,
            });
          }
          setPortfolioHistory(history);
        }
      } catch (error) {
        console.error('Error fetching investor data:', error);
      }
    };

    fetchInvestorData();
  }, [address, investmentLimit]);

  // Fetch owner data
  useEffect(() => {
    const fetchOwnerData = async () => {
      if (!address) return;
      
      setIsLoading(true);
      try {
        const tokenRes = await fetch(`/api/tokenization/user?wallet=${address}`);
        if (tokenRes.ok) {
          const data = await tokenRes.json();
          setUserProjects(data.projects || []);
          
          const projects = data.projects || [];
          
          // Only count deployed/live projects for totals
          const deployedProjects = projects.filter((p: UserProject) => 
            p.status === 'deployed' || 
            p.status === 'completed' ||
            p.status === 'live'
          );
          
          const totalTokenized = deployedProjects.reduce((sum: number, p: UserProject) => 
            sum + p.targetAmount, 0);
          const totalRaised = deployedProjects.reduce((sum: number, p: UserProject) => 
            sum + p.totalRaised, 0);
          const dividendsDistributed = deployedProjects.reduce((sum: number, p: UserProject) => 
            sum + p.dividendsDistributed, 0);
          const currentValue = deployedProjects.reduce((sum: number, p: UserProject) => 
            sum + p.currentValue, 0);
          
          setOwnerStats({
            totalTokenized,
            totalRaised,
            totalOwned: totalTokenized - totalRaised,
            currentValue,
            totalYield: totalRaised > 0 ? (dividendsDistributed / totalRaised) * 100 : 0,
            dividendsDistributed,
            projectCount: projects.length, // Show total count of all projects
          });
        }
      } catch (error) {
        console.error('Error fetching owner data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOwnerData();
  }, [address, onChainProjectIds]);

  // KYC tier config
  const getKYCConfig = () => {
    const tier = kycData?.tier || 'None';
    const configs: Record<string, { color: string; icon: typeof Shield }> = {
      'None': { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
      'Bronze': { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Shield },
      'Silver': { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Shield },
      'Gold': { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Award },
      'Diamond': { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
    };
    return configs[tier] || configs['None'];
  };

  const kycConfig = getKYCConfig();

  // Format helpers
  const formatCurrency = (value: number) => {
    if (value === Infinity) return 'Unlimited';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'deployed':
      case 'completed':
      case 'active':
      case 'live':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Live</span>;
      case 'approved':
      case 'creation_ready':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">Ready to Deploy</span>;
      case 'pending':
      case 'submitted':
      case 'under_review':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">Pending</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">Rejected</span>;
      default:
        return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs">{status}</span>;
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-gray-800 rounded-2xl border border-gray-700 max-w-md">
          <Wallet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Connect your wallet to access your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Manage your investments and projects</p>
        </div>

        {/* KYC Banner */}
        {(!kycData?.tier || kycData.tier === 'None') && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-white font-medium">KYC Verification Required</p>
                <p className="text-sm text-gray-400">Complete verification to start investing</p>
              </div>
            </div>
            <Link href="/kyc" className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">
              Verify Now
            </Link>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-gray-800 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('investor')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'investor' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Investor
            </span>
          </button>
          <button
            onClick={() => setActiveTab('owner')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'owner' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Owner
            </span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'settings' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </span>
          </button>
        </div>

        {/* ================================================================== */}
        {/* INVESTOR TAB */}
        {/* ================================================================== */}
        {activeTab === 'investor' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">Total Invested</span>
                  <DollarSign className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-white mb-2">{formatCurrency(investorStats.totalInvested)}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Limit ({kycData?.tier || 'None'})</span>
                    <span className="text-gray-400">{formatCurrency(investmentLimit)}</span>
                  </div>
                  {investmentLimit !== Infinity && investmentLimit > 0 && (
                    <>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (investorStats.totalInvested / investmentLimit) * 100)}%` }} />
                      </div>
                      <p className="text-xs text-gray-500">{formatCurrency(Math.max(0, investmentLimit - investorStats.totalInvested))} remaining</p>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">Current Value</span>
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-2xl font-bold text-white mb-2">{formatCurrency(investorStats.currentValue)}</p>
                <div className={`flex items-center gap-1 text-sm ${investorStats.totalReturns >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {investorStats.totalReturns >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {formatCurrency(Math.abs(investorStats.totalReturns))} <span className="text-gray-500">returns</span>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">Global ROI</span>
                  <PieChart className="w-5 h-5 text-purple-400" />
                </div>
                <p className={`text-2xl font-bold ${investorStats.globalROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {investorStats.globalROI >= 0 ? '+' : ''}{investorStats.globalROI.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500 mt-2">Since first investment</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">Pending Dividends</span>
                  <Banknote className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-2xl font-bold text-white mb-1">{formatCurrency(investorStats.pendingDividends)}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-400">+{investorStats.pendingYield.toFixed(2)}% yield</span>
                  {investorStats.pendingDividends > 0 && (
                    <button className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors">Claim</button>
                  )}
                </div>
              </div>
            </div>

            {/* Portfolio Chart */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Portfolio Evolution</h3>
                <div className="flex gap-2">
                  {['7D', '1M', '3M', '1Y', 'ALL'].map((period) => (
                    <button key={period} className="px-3 py-1 text-xs rounded-lg bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600 transition-colors">{period}</button>
                  ))}
                </div>
              </div>
              
              {portfolioHistory.length > 0 && investorStats.currentValue > 0 ? (
                <div className="h-48 flex items-end gap-1">
                  {portfolioHistory.map((point, idx) => {
                    const maxValue = Math.max(...portfolioHistory.map(p => p.value));
                    const height = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
                    return (
                      <div key={idx} className="flex-1 bg-blue-500/50 hover:bg-blue-500 rounded-t transition-colors cursor-pointer group relative" style={{ height: `${Math.max(5, height)}%` }}>
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 px-2 py-1 rounded text-xs text-white whitespace-nowrap z-10">
                          {formatCurrency(point.value)}<br /><span className="text-gray-400">{point.date}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No portfolio data yet</p>
                  </div>
                </div>
              )}
            </div>

            {/* Investments Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-blue-400" />
                  My Investments
                </h3>
                <Link href="/projects" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  Browse Projects <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              
              {investments.length === 0 ? (
                <div className="p-12 text-center">
                  <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-4">No investments yet</p>
                  <Link href="/projects" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
                    Start Investing <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900/50">
                      <tr className="text-left text-xs text-gray-400 uppercase">
                        <th className="px-6 py-3">Project</th>
                        <th className="px-6 py-3">Tokens</th>
                        <th className="px-6 py-3">Invested</th>
                        <th className="px-6 py-3">Current Value</th>
                        <th className="px-6 py-3">ROI</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {investments.map((inv, idx) => (
                        <tr key={idx} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-medium text-white">{inv.projectName}</p>
                            <p className="text-xs text-gray-400">{inv.tokenSymbol}</p>
                          </td>
                          <td className="px-6 py-4 text-gray-300">{inv.tokens.toLocaleString()}</td>
                          <td className="px-6 py-4 text-gray-300">{formatCurrency(inv.amount)}</td>
                          <td className="px-6 py-4 text-white font-medium">{formatCurrency(inv.currentValue)}</td>
                          <td className={`px-6 py-4 font-medium ${inv.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {inv.roi >= 0 ? '+' : ''}{inv.roi.toFixed(2)}%
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(inv.status)}`}>{inv.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* OWNER TAB */}
        {/* ================================================================== */}
        {activeTab === 'owner' && (
          <div className="space-y-6">
            {/* Stats Cards - Only count deployed projects */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">Total Tokenized</span>
                  <Coins className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(
                    userProjects
                      .filter(p => p.status === 'deployed' || p.status === 'live')
                      .reduce((sum, p) => sum + p.targetAmount, 0)
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {userProjects.filter(p => p.status === 'deployed' || p.status === 'live').length} deployed project{userProjects.filter(p => p.status === 'deployed' || p.status === 'live').length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">Total Raised</span>
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-2xl font-bold text-white">{formatCurrency(ownerStats.totalRaised)}</p>
                <p className="text-xs text-gray-500 mt-2">From token sales</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">Current Value</span>
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-white">{formatCurrency(ownerStats.currentValue)}</p>
                <p className="text-xs text-green-400 mt-2">+{ownerStats.totalYield.toFixed(2)}% yield</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">Dividends Distributed</span>
                  <Users className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-2xl font-bold text-white">{formatCurrency(ownerStats.dividendsDistributed)}</p>
                <p className="text-xs text-gray-500 mt-2">To investors</p>
              </div>
            </div>

            {/* Projects Grid */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-400" />
                  My Projects
                </h3>
                <Link href="/tokenize" className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  New Project <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {isLoading ? (
                <div className="p-12 flex justify-center">
                  <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
                </div>
              ) : userProjects.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-4">No projects yet</p>
                  <Link href="/tokenize" className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                    Tokenize Asset <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {userProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SETTINGS TAB */}
        {/* ================================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            
            {/* KYC Status Card */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  KYC Status
                </h3>
                <div className={`px-3 py-1.5 rounded-lg text-sm border ${kycConfig.color} flex items-center gap-2`}>
                  {React.createElement(kycConfig.icon, { className: "w-4 h-4" })}
                  {kycData?.tier || 'Not Verified'}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400">Investment Limit</p>
                  <p className="text-xl font-bold text-white mt-1">{formatCurrency(investmentLimit)}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400">Total Invested</p>
                  <p className="text-xl font-bold text-white mt-1">{formatCurrency(investorStats.totalInvested)}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400">Remaining</p>
                  <p className="text-xl font-bold text-white mt-1">
                    {investmentLimit === Infinity ? 'Unlimited' : formatCurrency(Math.max(0, investmentLimit - investorStats.totalInvested))}
                  </p>
                </div>
              </div>
              
              {(!kycData?.tier || kycData.tier === 'None') && (
                <Link href="/kyc" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
                  Complete KYC Verification <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {/* Linked Wallets */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-purple-400" />
                    Linked Wallets
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Link up to {MAX_LINKED_WALLETS} wallets to your KYC profile
                  </p>
                </div>
                <span className="text-sm text-gray-400">{linkedWallets.length} / {MAX_LINKED_WALLETS}</span>
              </div>

              {linkError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {linkError}
                </div>
              )}

              {linkSuccess && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  Wallet linked successfully!
                </div>
              )}

              {/* Linked Wallets List */}
              <div className="space-y-3 mb-6">
                {linkedWallets.map((wallet) => (
                  <div
                    key={wallet.address}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                      wallet.address.toLowerCase() === address?.toLowerCase()
                        ? "bg-blue-500/10 border-blue-500/30"
                        : "bg-gray-700/50 border-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        wallet.isPrimary ? "bg-amber-500/20" : "bg-gray-600"
                      }`}>
                        {wallet.isPrimary ? "👑" : "👛"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-white">{formatAddress(wallet.address)}</p>
                          {wallet.address.toLowerCase() === address?.toLowerCase() && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">Current</span>
                          )}
                          {wallet.isPrimary && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">Primary</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">Linked {new Date(wallet.linkedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {linkedWallets.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <Wallet className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No wallets linked yet</p>
                  </div>
                )}
              </div>

              {/* Generate Code Section (for verified users) */}
              {hasKYC && isPrimaryWallet && (
                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-white font-medium mb-3">Generate Link Code</h4>
                  <p className="text-sm text-gray-400 mb-4">Generate a one-time code to link another wallet</p>
                  
                  {linkCode && timeLeft > 0 ? (
                    <div className="bg-gray-900 rounded-lg p-4 text-center">
                      <p className="text-gray-500 text-sm mb-2">Your Link Code</p>
                      <div className="flex items-center justify-center gap-3">
                        <p className="text-3xl font-mono font-bold text-white tracking-widest">{linkCode.code}</p>
                        <button onClick={copyCode} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                          {copiedCode ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-gray-400" />}
                        </button>
                      </div>
                      <p className="text-gray-500 text-sm mt-3 flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4" />
                        Expires in <span className={timeLeft < 60 ? "text-red-400" : "text-white"}>{formatTime(timeLeft)}</span>
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerateCode}
                      disabled={isGenerating}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>
                      ) : (
                        <><LinkIcon className="w-5 h-5" /> Generate Link Code</>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Use Code Section (for non-verified users) */}
              {!hasKYC && (
                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-white font-medium mb-3">Link to Existing KYC</h4>
                  <p className="text-sm text-gray-400 mb-4">Enter a link code from your verified wallet</p>
                  
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                      placeholder="Enter 8-character code"
                      className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-center font-mono tracking-widest focus:outline-none focus:border-blue-500 uppercase"
                      maxLength={8}
                    />
                    <button
                      onClick={handleUseLinkCode}
                      disabled={codeInput.length !== 8 || isLinking}
                      className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                    >
                      {isLinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      Link
                    </button>
                  </div>
                </div>
              )}

              {/* Link to full page */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <Link href="/kyc/link" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  Advanced wallet management <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Referral Code */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-green-400" />
                  Referral Program
                </h3>
              </div>
              
              {hasKYC ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm text-gray-400 mb-1">Your Referral Link</p>
                      <p className="text-sm font-mono text-white truncate">
                        {typeof window !== 'undefined' ? `${window.location.origin}?ref=${address?.slice(0, 8)}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}?ref=${address?.slice(0, 8)}`);
                        setCopiedReferral(true);
                        setTimeout(() => setCopiedReferral(false), 2000);
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                    >
                      {copiedReferral ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedReferral ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Share2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-4">Complete KYC to access the referral program</p>
                  <Link href="/kyc" className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
                    Get Started <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/projects" className="flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-750 rounded-xl border border-gray-700 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg"><TrendingUp className="w-5 h-5 text-blue-400" /></div>
              <span className="text-white font-medium">Browse Projects</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
          </Link>
          
          <Link href="/kyc" className="flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-750 rounded-xl border border-gray-700 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg"><Shield className="w-5 h-5 text-green-400" /></div>
              <span className="text-white font-medium">KYC Verification</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
          </Link>
          
          <Link href="/exchange" className="flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-750 rounded-xl border border-gray-700 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg"><BarChart3 className="w-5 h-5 text-purple-400" /></div>
              <span className="text-white font-medium">Trade Tokens</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
          </Link>
        </div>

      </div>
    </div>
  );
}
