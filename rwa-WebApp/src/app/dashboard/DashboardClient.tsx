// src/app/dashboard/DashboardClient.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useChainId, useSwitchChain } from 'wagmi';
import { useChainConfig } from '@/hooks/useChainConfig';
import { useKYC, KYCTier } from '@/contexts/KYCContext';
import { getChainById, isValidChainId } from '@/config/chains';
import Link from 'next/link';
import DashboardCrowdfundingSummary from '@/components/crowdfunding/DashboardCrowdfundingSummary';
import { 
  Wallet, TrendingUp, DollarSign, Shield, Plus,
  ChevronRight, AlertCircle, FileText, Briefcase, 
  CheckCircle, XCircle, Loader2, PieChart, ArrowUpRight,
  ArrowDownRight, Coins, Users, BarChart3, Award, Banknote,
  Settings, Copy, Check, Link as LinkIcon, Share2, Clock,
  ExternalLink, ChevronDown, RefreshCw, Eye, AlertTriangle, 
  Calendar, ChevronUp, ArrowRight, Gift
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
  chainId?: number;
}

interface UserProject {
  id: string;
  name: string;
  type?: 'tokenize' | 'crowdfund' | 'trade' | 'ERC20' | 'ERC721' | 'ERC1155';
  status: string;
  submittedAt?: string;
  tokenName?: string;
  tokenSymbol?: string;
  category?: string;
  totalRaised?: number;
  targetAmount?: number | string;
  totalSupply?: number | string;
  tokensSold?: number;
  currentValue?: number;
  roi?: number;
  age?: number;
  performanceScore?: number;
  dividendsDistributed?: number;
  escrowBalance?: number;
  rejectionReason?: string;
  tokenAddress?: string;
  escrowAddress?: string;
  nftAddress?: string;
  logoUrl?: string;
  website?: string;
  description?: string;
  tokenPrice?: number | string;
  chainId?: number;
  createdAt?: string;
  deployedAt?: string;
  location?: string;
  country?: string;
  currency?: string;
  legalEntity?: string;
  metadataUri?: string;
  isListed?: boolean;
  listingId?: string;
  tradingPair?: string;
  listingStatus?: string;
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

interface LinkedWallet {
  address: string;
  isPrimary: boolean;
  linkedAt: string;
  label?: string;
}

const MAX_LINKED_WALLETS = 10;

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

const ChainBadge = ({ chainId, currentChainId }: { chainId?: number; currentChainId?: number }) => {
  const chain = chainId ? getChainById(chainId) : null;
  const isWrongChain = chainId && currentChainId && chainId !== currentChainId;
  
  if (!chain) return null;
  
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
      isWrongChain 
        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
        : 'bg-gold-500/20 text-gold-300'
    }`}>
      {isWrongChain && <AlertTriangle className="w-3 h-3" />}
      {chain.name}
    </span>
  );
};

const ChainGatedActions = ({ 
  projectChainId, 
  currentChainId,
  onSwitchChain,
  children,
}: { 
  projectChainId?: number;
  currentChainId?: number;
  onSwitchChain: (chainId: number) => void;
  children: React.ReactNode;
}) => {
  const targetChainId = projectChainId || 80002;
  const isWrongChain = currentChainId && targetChainId !== currentChainId;
  const chainConfig = getChainById(targetChainId);

  if (isWrongChain) {
    return (
      <button
        onClick={() => onSwitchChain(targetChainId)}
        className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-ink rounded-lg text-sm transition-colors flex items-center justify-center gap-1"
      >
        <RefreshCw className="w-4 h-4" />
        Switch to {chainConfig?.name || 'Polygon Amoy'}
      </button>
    );
  }

  return <>{children}</>;
};

// ============================================================================
// PROJECT CARD COMPONENT
// ============================================================================

const ProjectCard = ({ 
  project, 
  onSwitchChain,
  currentChainId 
}: { 
  project: UserProject; 
  onSwitchChain: (chainId: number) => void;
  currentChainId: number | undefined;
}) => {
  const isDeployed = project.status === 'deployed';
  const isRejected = project.status === 'rejected';
  const needsChainSwitch = project.chainId && currentChainId !== project.chainId;
  const chainInfo = project.chainId ? getChainById(project.chainId) : null;

  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'deployed':
        return 'bg-green-500/20 text-green-400';
      case 'approved':
        return 'bg-gold-500/20 text-gold-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      case 'draft':
        return 'bg-gray-500/20 text-ink-muted';
      default:
        return 'bg-gray-500/20 text-ink-muted';
    }
  };

  const formatCurrency = (value: number | string | undefined): string => {
    if (value === undefined || value === null) return '0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  };

  return (
    <div className={`bg-surface/50 rounded-xl p-5 border transition-all ${
      isRejected 
        ? 'border-red-500/30 hover:border-red-500/50' 
        : 'border-border/50 hover:border-border-strong/50'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-ink truncate">{project.name}</h3>
          <p className="text-sm text-ink-muted truncate">{project.tokenName} ({project.tokenSymbol})</p>
        </div>
        {project.logoUrl && (
          <img src={project.logoUrl} alt={project.name} className="w-10 h-10 rounded-lg object-cover ml-3" />
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(project.status)}`}>
          {project.status}
        </span>
        {project.type && (
          <span className="px-2 py-0.5 rounded text-xs bg-gold-500/20 text-gold-400">
            {project.type}
          </span>
        )}
        <ChainBadge chainId={project.chainId} currentChainId={currentChainId} />
        
        {isDeployed && (
          project.isListed ? (
            <Link 
              href={`/exchange?token=${project.tokenAddress}`}
              className="px-2 py-0.5 rounded text-xs bg-gold-500/20 text-gold-400 hover:bg-gold-light/30 flex items-center gap-1 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <BarChart3 className="w-3 h-3" />
              Trading
              {project.tradingPair && <span className="opacity-70">({project.tradingPair})</span>}
            </Link>
          ) : (
            <span className="px-2 py-0.5 rounded text-xs bg-border-strong/30 text-ink-faint">
              Not Listed
            </span>
          )
        )}
      </div>

      {/* Rejection Reason Banner */}
      {isRejected && project.rejectionReason && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-red-400 mb-1">Rejection Reason:</p>
              <p className="text-xs text-ink-muted line-clamp-2">{project.rejectionReason}</p>
            </div>
          </div>
        </div>
      )}

      {project.tokenAddress && (
        <div className="mb-4 p-2 bg-surface-sunken/50 rounded-lg">
          <p className="text-xs text-ink-faint mb-1">Token Address</p>
          <p className="text-xs text-ink-muted font-mono truncate">{project.tokenAddress}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-ink-faint">Target</p>
          <p className="text-sm font-medium text-ink">${formatCurrency(project.targetAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">Token Price</p>
          <p className="text-sm font-medium text-ink">${project.tokenPrice}</p>
        </div>
      </div>

      {needsChainSwitch && chainInfo && (
        <div className="mb-4 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-xs text-yellow-400">
            Switch to {chainInfo.name} to manage this project
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {isRejected ? (
          <>
            <Link
              href={`/tokenization/${project.id}`}
              className="flex-1 text-center py-2 px-3 bg-border-strong hover:bg-border-strong rounded-lg text-sm font-medium transition-colors"
            >
              View Details
            </Link>
            <Link
              href={`/tokenize/edit/${project.id}`}
              className="flex-1 text-center py-2 px-3 bg-gold hover:bg-gold-light rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Edit & Resubmit
            </Link>
          </>
        ) : (
          <>
            <Link
              href={`/tokenization/${project.id}`}
              className="flex-1 text-center py-2 px-3 bg-gold hover:bg-gold-light rounded-lg text-sm font-medium transition-colors"
            >
              View Project
            </Link>
            
            {needsChainSwitch && chainInfo && (
              <button
                onClick={() => onSwitchChain(project.chainId!)}
                className="py-2 px-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Switch
              </button>
            )}
            
            {isDeployed && !project.isListed && !needsChainSwitch && (
              <Link
                href={`/tokenization/${project.id}?tab=settings`}
                className="py-2 px-3 bg-gold hover:bg-gold-light rounded-lg text-sm font-medium transition-colors"
              >
                List
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
};


// ============================================================================
// INVESTMENT CARD COMPONENT
// ============================================================================

interface InvestmentCardProps {
  investment: Investment;
  currentChainId?: number;
  onSwitchChain: (chainId: number) => void;
}

function InvestmentCard({ investment, currentChainId, onSwitchChain }: InvestmentCardProps) {
  const investmentChainId = investment.chainId || 80002;
  const isWrongChain = currentChainId && investmentChainId !== currentChainId;
  const chainConfig = getChainById(investmentChainId);

  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) return '$0.00';
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  const formatNumber = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return value.toLocaleString();
  };

  // Safe access with defaults
  const tokens = investment.tokens ?? 0;
  const amount = investment.amount ?? 0;
  const currentValue = investment.currentValue ?? 0;
  const roi = investment.roi ?? 0;

  return (
    <tr className={`hover:bg-surface-overlay/30 transition-colors ${isWrongChain ? 'opacity-60' : ''}`}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div>
            <p className="font-medium text-ink">{investment.projectName || 'Unknown Project'}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-ink-muted">{investment.tokenSymbol || 'N/A'}</p>
              <ChainBadge chainId={investmentChainId} currentChainId={currentChainId} />
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-ink-muted">{formatNumber(tokens)}</td>
      <td className="px-6 py-4 text-ink-muted">{formatCurrency(amount)}</td>
      <td className="px-6 py-4 text-ink font-medium">{formatCurrency(currentValue)}</td>
      <td className={`px-6 py-4 font-medium ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
      </td>
      <td className="px-6 py-4">
        {isWrongChain ? (
          <button
            onClick={() => onSwitchChain(investmentChainId)}
            className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs flex items-center gap-1 hover:bg-yellow-500/30 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Switch
          </button>
        ) : (
          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
            {investment.status || 'active'}
          </span>
        )}
      </td>
    </tr>
  );
}

function TokenAllocationsSection({ address }: { address: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [showVesting, setShowVesting] = useState(false);

  useEffect(() => {
    if (address) {
      fetch(`/api/user/allocations?wallet=${address}`)
        .then(res => res.json())
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [address]);

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="h-20 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || !data.summary || data.summary.totalTokens === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-gold-400" />
          Token Allocations
        </h3>
        <div className="text-center py-8 text-slate-400">
          <Coins className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p>No token allocations yet</p>
          <Link href="/raise" className="text-gold-400 hover:text-gold-300 mt-2 inline-block">
            Invest now →
          </Link>
        </div>
      </div>
    );
  }

  const { summary, vestingMonths, vestingSchedule, allocations } = data;
  const TGE_PRICE = 0.01;
  const valueAtTGE = summary.totalTokens * TGE_PRICE;

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Coins className="w-5 h-5 text-gold-400" />
        Token Allocations
      </h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Total Tokens</div>
          <div className="text-xl font-bold text-gold-400">
            {summary.totalTokens.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">RWA</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Purchased</div>
          <div className="text-xl font-bold text-gold-400">
            {summary.purchasedTokens.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">RWA</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Bonus Tokens</div>
          <div className="text-xl font-bold text-green-400">
            {summary.bonusTokens.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">From referrals</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Value at TGE</div>
          <div className="text-xl font-bold text-emerald-400">
            ${valueAtTGE.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">@ $0.01/token</div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="flex flex-wrap gap-2 mb-4">
        {summary.confirmedTokens > 0 && (
          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            {summary.confirmedTokens.toLocaleString()} Confirmed
          </span>
        )}
        {summary.pendingTokens > 0 && (
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {summary.pendingTokens.toLocaleString()} Pending
          </span>
        )}
        {summary.distributedTokens > 0 && (
          <span className="px-3 py-1 bg-gold-500/20 text-gold-400 rounded-full text-sm flex items-center gap-1">
            <ArrowRight className="w-4 h-4" />
            {summary.distributedTokens.toLocaleString()} Distributed
          </span>
        )}
      </div>

      {/* Vesting Info */}
      {vestingMonths > 0 && (
        <div className="border-t border-slate-700 pt-4 mt-4">
          <button
            onClick={() => setShowVesting(!showVesting)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Vesting Schedule ({vestingMonths} months, no cliff)
            </span>
            {showVesting ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showVesting && vestingSchedule && (
            <div className="mt-4 space-y-2">
              <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-gold-500 to-gold-light-500"
                  style={{ width: '0%' }} // Update based on actual vesting progress
                />
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs text-slate-400 mt-4">
                <div>Month 1: {(summary.confirmedTokens / vestingMonths).toLocaleString()} RWA</div>
                <div>Month {Math.floor(vestingMonths/4)}: {((summary.confirmedTokens / vestingMonths) * Math.floor(vestingMonths/4)).toLocaleString()} RWA</div>
                <div>Month {Math.floor(vestingMonths/2)}: {((summary.confirmedTokens / vestingMonths) * Math.floor(vestingMonths/2)).toLocaleString()} RWA</div>
                <div>Month {vestingMonths}: {summary.confirmedTokens.toLocaleString()} RWA (100%)</div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Linear vesting: ~{(summary.confirmedTokens / vestingMonths).toLocaleString()} tokens unlock each month starting at TGE.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recent Allocations */}
      {allocations && allocations.length > 0 && (
        <div className="border-t border-slate-700 pt-4 mt-4">
          <h4 className="font-medium mb-3">Recent Allocations</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {allocations.slice(0, 10).map((alloc: any) => (
              <div key={alloc.id} className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    alloc.type === 'purchase' ? 'bg-gold-500/20 text-gold-400' :
                    alloc.type === 'referral_bonus' ? 'bg-green-500/20 text-green-400' :
                    'bg-gold-500/20 text-gold-400'
                  }`}>
                    {alloc.type === 'purchase' ? 'Purchase' : alloc.type === 'referral_bonus' ? 'Referral' : 'Bonus'}
                  </span>
                  <span className="text-slate-400">{alloc.fundraising_rounds?.display_name}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{parseFloat(alloc.tokens_amount).toLocaleString()} RWA</div>
                  <div className="text-xs text-slate-500">${parseFloat(alloc.tokens_usd_value).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Referral Stats Component
function ReferralStatsSection({ address }: { address: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (address) {
      fetch(`/api/user/referral-stats?wallet=${address}`)
        .then(res => res.json())
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [address]);

  const copyCode = () => {
    if (data?.code) {
      navigator.clipboard.writeText(data.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyLink = () => {
    if (data?.code) {
      navigator.clipboard.writeText(`${window.location.origin}/raise?ref=${data.code}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="h-20 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data?.hasCode) {
    return null; // Don't show if user doesn't have a referral code
  }

  const { code, stats, referrals, isActive } = data;

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Gift className="w-5 h-5 text-gold-400" />
        Referral Program
        {!isActive && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Inactive</span>}
      </h3>

      {/* Referral Code & Link */}
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Your Referral Code</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-slate-900 rounded-lg font-mono text-lg font-bold text-gold-400 tracking-wider">
              {code}
            </div>
            <button
              onClick={copyCode}
              className="p-2 bg-gold hover:bg-gold-light rounded-lg transition-colors"
            >
              {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Referral Link</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-slate-900 rounded-lg text-sm text-slate-400 truncate">
              {typeof window !== 'undefined' ? `${window.location.origin}/raise?ref=${code}` : ''}
            </div>
            <button
              onClick={copyLink}
              className="p-2 bg-gold hover:bg-gold-light rounded-lg transition-colors"
            >
              {copiedLink ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gold-400">{stats?.totalReferrals || 0}</div>
          <div className="text-xs text-slate-500">Referrals</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">
            ${(stats?.totalInvestmentAmount || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">Total Invested</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gold-400">
            {(stats?.totalBonusTokens || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">Bonus Tokens</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">
            ${((stats?.totalBonusTokens || 0) * 0.01).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">Value at TGE</div>
        </div>
      </div>

      {/* Pending/Confirmed breakdown */}
      {(stats?.pendingBonusTokens > 0 || stats?.confirmedBonusTokens > 0) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {stats.confirmedBonusTokens > 0 && (
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              {stats.confirmedBonusTokens.toLocaleString()} Confirmed
            </span>
          )}
          {stats.pendingBonusTokens > 0 && (
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {stats.pendingBonusTokens.toLocaleString()} Pending
            </span>
          )}
        </div>
      )}

      {/* Referrals List */}
      {referrals && referrals.length > 0 && (
        <div className="border-t border-slate-700 pt-4 mt-4">
          <h4 className="font-medium mb-3">Your Referrals ({referrals.length})</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {referrals.map((ref: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-gold-400" />
                  </div>
                  <div>
                    <div className="font-mono text-sm">
                      {ref.wallet_address.slice(0, 6)}...{ref.wallet_address.slice(-4)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {ref.investments?.length || 0} investment(s) • Joined {new Date(ref.first_investment).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-green-400">+{(ref.total_tokens * 0.05).toLocaleString()} RWA</div>
                  <div className="text-xs text-slate-500">5% of {ref.total_tokens.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No referrals yet */}
      {(!referrals || referrals.length === 0) && (
        <div className="text-center py-4 text-slate-400">
          <p>No referrals yet. Share your code to start earning!</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardClient() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { contracts } = useChainConfig();
  
  // Use the unified KYC context
  const { 
    kycData, 
    tier,
    tierInfo, 
    tierLimits, 
    isVerified,
    isLoading: isLoadingKYC,
    investmentLimit,
    remainingLimit,
    generateLinkCode,
    useLinkCode,
    linkError: contextLinkError,
    refreshKYC
  } = useKYC();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'investor' | 'owner' | 'settings'>('investor');
  
  // Wallet linking state
  const [linkCode, setLinkCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);
  
  // Referral state
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [copiedReferralCode, setCopiedReferralCode] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState<{
    totalReferrals: number;
    totalInvestmentAmount: number;
    totalBonusTokens: number;
  } | null>(null);
  const [isLoadingReferral, setIsLoadingReferral] = useState(false);
  
  // Data states
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);
  const tokenizationProjects = userProjects.filter(p => p.type !== 'crowdfund');
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
  const [ownerSubTab, setOwnerSubTab] = useState<'crowdfunding' | 'tokenization'>('crowdfunding');
  const hasKYC = isVerified && tier !== 'None';
  const [tokenAllocations, setTokenAllocations] = useState<any>(null);
  const [isLoadingAllocations, setIsLoadingAllocations] = useState(false);

  // Read user's on-chain projects
  const { data: onChainProjectIds } = useReadContract({
    address: contracts?.RWAProjectNFT as `0x${string}`,
    abi: RWAProjectNFTABI,
    functionName: 'getOwnerProjects',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contracts?.RWAProjectNFT },
  });

  // Helper to convert values to numbers
  const toNumber = (value: string | number | undefined | null): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return value;
  };

  // Handle chain switch
  const handleSwitchChain = useCallback((targetChainId: number) => {
    if (switchChain) {
      switchChain({ chainId: targetChainId });
    }
  }, [switchChain]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchReferralCode = async () => {
      if (!address || !hasKYC) return;
      
      const eligibleTiers = ['Gold', 'Diamond'];
      if (!tier || !eligibleTiers.includes(tier)) return;
      
      setIsLoadingReferral(true);
      try {
        const response = await fetch(`/api/referrals/code?wallet=${address}`);
        
        if (response.ok) {
          const data = await response.json();
          setReferralCode(data.code);
          setReferralStats({
            totalReferrals: data.total_referrals || 0,
            totalInvestmentAmount: data.total_investment_amount || 0,
            totalBonusTokens: data.total_bonus_tokens || 0
          });
        } else if (response.status === 404) {
          // Create new code - ensure proper headers and body
          const createResponse = await fetch('/api/referrals/code', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ wallet: address })
          });
          
          if (createResponse.ok) {
            const data = await createResponse.json();
            setReferralCode(data.code);
            setReferralStats({
              totalReferrals: 0,
              totalInvestmentAmount: 0,
              totalBonusTokens: 0
            });
          } else {
            const errorData = await createResponse.json();
            console.error('Failed to create referral code:', errorData);
          }
        }
      } catch (error) {
        console.error('Error fetching referral code:', error);
      } finally {
        setIsLoadingReferral(false);
      }
    };

    fetchReferralCode();
  }, [address, hasKYC, tier]);

  // Fetch linked wallets
  const fetchLinkedWallets = useCallback(async () => {
    if (!address) return;
    
    try {
      const response = await fetch(`/api/kyc/link/list?wallet=${address}`)
      const data = await response.json();
      
      if (data.success && data.wallets) {
        setLinkedWallets(data.wallets);
      }
    } catch (error) {
      console.error('Failed to fetch linked wallets:', error);
    }
  }, [address]);

  // Load linked wallets on mount
  useEffect(() => {
    if (isConnected && address) {
      fetchLinkedWallets();
    }
  }, [isConnected, address, fetchLinkedWallets]);

  // Sync context link error
  useEffect(() => {
    if (contextLinkError) {
      setLinkError(contextLinkError);
    }
  }, [contextLinkError]);

  // Countdown timer for link code
  useEffect(() => {
    if (!linkCode) return;

    const updateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const expiresAtTimestamp = Math.floor(new Date(linkCode.expiresAt).getTime() / 1000);
      const remaining = expiresAtTimestamp - now;
      setTimeLeft(Math.max(0, remaining));
      
      if (remaining <= 0) {
        setLinkCode(null);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [linkCode]);

  // Check if link code has been used
  useEffect(() => {
    if (!linkCode || !address) return;
    if (timeLeft <= 0) {
      setLinkCode(null);
      return;
    }

    const checkIfCodeUsed = async () => {
      try {
        const res = await fetch(
          `/api/kyc/link/check?code=${encodeURIComponent(linkCode.code)}&wallet=${encodeURIComponent(address)}`
        );
        
        if (!res.ok) return;
        
        const data = await res.json();

        if (data.used) {
          setLinkCode(null);
          setTimeLeft(0);
          setLinkSuccess(true);
          fetchLinkedWallets();
          setTimeout(() => setLinkSuccess(false), 5000);
        } else if (data.notFound || data.expired) {
          setLinkCode(null);
          setTimeLeft(0);
        }
      } catch (error) {
        console.error("Error checking link code status:", error);
      }
    };

    checkIfCodeUsed();
    const interval = setInterval(checkIfCodeUsed, 3000);
    return () => clearInterval(interval);
  }, [linkCode, address, timeLeft, fetchLinkedWallets]);

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
      const success = await useLinkCode(codeInput.toUpperCase());
      if (success) {
        setLinkSuccess(true);
        setCodeInput('');
        await fetchLinkedWallets();
        await refreshKYC();
        setTimeout(() => setLinkSuccess(false), 5000);
      } else {
        if (!contextLinkError) {
          setLinkError("Failed to link wallet");
        }
      }
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : "Failed to link wallet");
    } finally {
      setIsLinking(false);
    }
  }, [codeInput, useLinkCode, fetchLinkedWallets, refreshKYC, contextLinkError]);

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
  
  const isPrimaryWallet = linkedWallets.some(
    (w) => w.address.toLowerCase() === address?.toLowerCase() && w.isPrimary
  );

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
          const allProjects = data.projects || [];
          setUserProjects(allProjects);
          
          const deployedProjects = allProjects.filter((p: UserProject) => 
            p.status === 'deployed' || p.status === 'completed' || p.status === 'live'
          );
          
          const totalTokenized = deployedProjects.reduce((sum: number, p: UserProject) => 
            sum + toNumber(p.targetAmount), 0);
          const totalRaised = deployedProjects.reduce((sum: number, p: UserProject) => 
            sum + toNumber(p.totalRaised), 0);
          const dividendsDistributed = deployedProjects.reduce((sum: number, p: UserProject) => 
            sum + toNumber(p.dividendsDistributed), 0);
          const currentValue = deployedProjects.reduce((sum: number, p: UserProject) => 
            sum + toNumber(p.currentValue), 0);
          
          setOwnerStats({
            totalTokenized,
            totalRaised,
            totalOwned: totalTokenized - totalRaised,
            currentValue,
            totalYield: totalRaised > 0 ? (dividendsDistributed / totalRaised) * 100 : 0,
            dividendsDistributed,
            projectCount: allProjects.length,
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

  useEffect(() => {
    const fetchAllocations = async () => {
      if (!address) return;
      
      setIsLoadingAllocations(true);
      try {
        const res = await fetch(`/api/user/allocations?wallet=${address}`);
        if (res.ok) {
          const data = await res.json();
          setTokenAllocations(data);
        }
      } catch (error) {
        console.error('Error fetching allocations:', error);
      } finally {
        setIsLoadingAllocations(false);
      }
    };

    fetchAllocations();
  }, [address]);

  // KYC tier config
  const getKYCConfig = () => {
    const configs: Record<string, { color: string; icon: typeof Shield }> = {
      'None': { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
      'Bronze': { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Shield },
      'Silver': { color: 'bg-gold-500/20 text-gold-400 border-gold-500/30', icon: Shield },
      'Gold': { color: 'bg-gold-500/20 text-gold-400 border-gold-500/30', icon: Award },
      'Diamond': { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
    };
    return configs[tier] || configs['None'];
  };

  const kycConfig = getKYCConfig();
  const currentChainConfig = chainId ? getChainById(chainId) : null;
  const currentChainName = currentChainConfig?.name || 'Unknown';

  const projectsOnCurrentChain = userProjects.filter((p: UserProject) => {
    const isDeployed = p.status === 'deployed' || p.status === 'completed' || p.status === 'live';
    if (!isDeployed) return true;
    return !p.chainId || p.chainId === chainId;
  }).length;

  const projectsOnOtherChains = userProjects.filter((p: UserProject) => {
    const isDeployed = p.status === 'deployed' || p.status === 'completed' || p.status === 'live';
    return isDeployed && p.chainId && p.chainId !== chainId;
  }).length;

  // Format helpers
  const formatCurrency = (value: number) => {
    if (value === Infinity) return 'Unlimited';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-surface-sunken flex items-center justify-center p-4">
        <div className="text-center p-8 bg-surface rounded-2xl border border-border max-w-md">
          <Wallet className="w-16 h-16 text-ink-faint mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-ink mb-2">Connect Your Wallet</h2>
          <p className="text-ink-muted">Connect your wallet to access your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-sunken py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ink">Dashboard</h1>
            <p className="text-ink-muted mt-1">Manage your investments and projects</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-lg border border-border">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-ink-muted">{currentChainName}</span>
          </div>
        </div>

        {/* KYC Banner */}
        {tier === 'None' && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-ink font-medium">KYC Verification Required</p>
                <p className="text-sm text-ink-muted">Complete verification to start investing</p>
              </div>
            </div>
            <Link href="/kyc" className="px-4 py-2 bg-red-500 hover:bg-red-600 text-ink rounded-lg text-sm font-medium transition-colors">
              Verify Now
            </Link>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-surface rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('investor')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'investor' ? 'bg-gold text-ink' : 'text-ink-muted hover:text-ink'
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
              activeTab === 'owner' ? 'bg-gold text-ink' : 'text-ink-muted hover:text-ink'
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
              activeTab === 'settings' ? 'bg-border-strong text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </span>
          </button>
        </div>

        {/* INVESTOR TAB */}
        {activeTab === 'investor' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface rounded-xl p-5 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-ink-muted text-sm">Total Invested</span>
                  <DollarSign className="w-5 h-5 text-gold-400" />
                </div>
                <p className="text-2xl font-bold text-ink mb-2">{formatCurrency(investorStats.totalInvested)}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-faint">Limit ({tier})</span>
                    <span className="text-ink-muted">{formatCurrency(investmentLimit)}</span>
                  </div>
                  {investmentLimit !== Infinity && investmentLimit > 0 && (
                    <>
                      <div className="w-full bg-surface-overlay rounded-full h-1.5">
                        <div className="bg-gold-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (investorStats.totalInvested / investmentLimit) * 100)}%` }} />
                      </div>
                      <p className="text-xs text-ink-faint">{formatCurrency(Math.max(0, investmentLimit - investorStats.totalInvested))} remaining</p>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-surface rounded-xl p-5 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-ink-muted text-sm">Current Value</span>
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-2xl font-bold text-ink mb-2">{formatCurrency(investorStats.currentValue)}</p>
                <div className={`flex items-center gap-1 text-sm ${investorStats.totalReturns >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {investorStats.totalReturns >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {formatCurrency(Math.abs(investorStats.totalReturns))} <span className="text-ink-faint">returns</span>
                </div>
              </div>

              <div className="bg-surface rounded-xl p-5 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-ink-muted text-sm">Global ROI</span>
                  <PieChart className="w-5 h-5 text-gold-400" />
                </div>
                <p className={`text-2xl font-bold ${investorStats.globalROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {investorStats.globalROI >= 0 ? '+' : ''}{investorStats.globalROI.toFixed(2)}%
                </p>
                <p className="text-xs text-ink-faint mt-2">Since first investment</p>
              </div>

              <div className="bg-surface rounded-xl p-5 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-ink-muted text-sm">Pending Dividends</span>
                  <Banknote className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-2xl font-bold text-ink mb-1">{formatCurrency(investorStats.pendingDividends)}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-400">+{investorStats.pendingYield.toFixed(2)}% yield</span>
                  {investorStats.pendingDividends > 0 && (
                    <button className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors">Claim</button>
                  )}
                </div>
              </div>
            </div>

            {/* Portfolio Chart */}
            <div className="bg-surface rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-ink">Portfolio Evolution</h3>
                <div className="flex gap-2">
                  {['7D', '1M', '3M', '1Y', 'ALL'].map((period) => (
                    <button key={period} className="px-3 py-1 text-xs rounded-lg bg-surface-overlay text-ink-muted hover:text-ink hover:bg-border-strong transition-colors">{period}</button>
                  ))}
                </div>
              </div>
              
              {portfolioHistory.length > 0 && investorStats.currentValue > 0 ? (
                <div className="h-48 flex items-end gap-1">
                  {portfolioHistory.map((point, idx) => {
                    const maxValue = Math.max(...portfolioHistory.map(p => p.value));
                    const height = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
                    return (
                      <div key={idx} className="flex-1 bg-gold-500/50 hover:bg-gold-light rounded-t transition-colors cursor-pointer group relative" style={{ height: `${Math.max(5, height)}%` }}>
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-surface-sunken px-2 py-1 rounded text-xs text-ink whitespace-nowrap z-10">
                          {formatCurrency(point.value)}<br /><span className="text-ink-muted">{point.date}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-ink-faint">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No portfolio data yet</p>
                  </div>
                </div>
              )}
            </div>

            {/* Investments Table */}
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-gold-400" />
                  My Investments
                </h3>
                <Link href="/projects" className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1">
                  Browse Projects <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              
              {investments.length === 0 ? (
                <div className="p-12 text-center">
                  <Wallet className="w-12 h-12 text-ink-faint mx-auto mb-3" />
                  <p className="text-ink-muted mb-4">No investments yet</p>
                  <Link href="/projects" className="inline-flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-light text-ink rounded-lg text-sm transition-colors">
                    Start Investing <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-sunken/50">
                      <tr className="text-left text-xs text-ink-muted uppercase">
                        <th className="px-6 py-3">Project</th>
                        <th className="px-6 py-3">Tokens</th>
                        <th className="px-6 py-3">Invested</th>
                        <th className="px-6 py-3">Current Value</th>
                        <th className="px-6 py-3">ROI</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {investments.map((inv, idx) => (
                        <InvestmentCard 
                          key={idx} 
                          investment={inv} 
                          currentChainId={chainId}
                          onSwitchChain={handleSwitchChain}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Token Allocations (RWA Platform Investment) */}
        {tokenAllocations && tokenAllocations.summary && tokenAllocations.summary.totalTokens > 0 && (
          <div className="bg-surface rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
                <Coins className="w-5 h-5 text-gold-400" />
                RWA Token Allocations
              </h3>
              <Link href="/raise" className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1">
                Invest More <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-surface-overlay/50 rounded-lg p-4">
                <div className="text-xs text-ink-faint mb-1">Total Tokens</div>
                <div className="text-xl font-bold text-gold-400">
                  {tokenAllocations.summary.totalTokens.toLocaleString()}
                </div>
                <div className="text-xs text-ink-faint">RWA</div>
              </div>
              <div className="bg-surface-overlay/50 rounded-lg p-4">
                <div className="text-xs text-ink-faint mb-1">Purchased</div>
                <div className="text-xl font-bold text-gold-400">
                  {tokenAllocations.summary.purchasedTokens.toLocaleString()}
                </div>
                <div className="text-xs text-ink-faint">RWA</div>
              </div>
              <div className="bg-surface-overlay/50 rounded-lg p-4">
                <div className="text-xs text-ink-faint mb-1">Referral Bonus</div>
                <div className="text-xl font-bold text-green-400">
                  {tokenAllocations.summary.bonusTokens.toLocaleString()}
                </div>
                <div className="text-xs text-ink-faint">RWA</div>
              </div>
              <div className="bg-surface-overlay/50 rounded-lg p-4">
                <div className="text-xs text-ink-faint mb-1">Value at TGE</div>
                <div className="text-xl font-bold text-emerald-400">
                  ${(tokenAllocations.summary.totalTokens * 0.01).toLocaleString()}
                </div>
                <div className="text-xs text-ink-faint">@ $0.01/token</div>
              </div>
            </div>

            {/* Status Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {tokenAllocations.summary.confirmedTokens > 0 && (
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  {tokenAllocations.summary.confirmedTokens.toLocaleString()} Confirmed
                </span>
              )}
              {tokenAllocations.summary.pendingTokens > 0 && (
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {tokenAllocations.summary.pendingTokens.toLocaleString()} Pending
                </span>
              )}
              {tokenAllocations.summary.distributedTokens > 0 && (
                <span className="px-3 py-1 bg-gold-500/20 text-gold-400 rounded-full text-sm flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4" />
                  {tokenAllocations.summary.distributedTokens.toLocaleString()} Distributed
                </span>
              )}
            </div>

            {/* Vesting Info */}
            {tokenAllocations.vestingMonths > 0 && (
              <div className="p-4 bg-surface-overlay/30 rounded-lg border border-border-strong">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-ink-muted" />
                  <span className="text-sm font-medium text-ink">
                    Vesting: {tokenAllocations.vestingMonths} months (no cliff)
                  </span>
                </div>
                <p className="text-xs text-ink-muted">
                  Linear vesting: ~{Math.round(tokenAllocations.summary.confirmedTokens / tokenAllocations.vestingMonths).toLocaleString()} tokens unlock each month starting at TGE.
                </p>
              </div>
            )}

            {/* Recent Allocations */}
            {tokenAllocations.allocations && tokenAllocations.allocations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="font-medium text-ink mb-3">Recent Allocations</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tokenAllocations.allocations.slice(0, 5).map((alloc: any) => (
                    <div key={alloc.id} className="flex items-center justify-between p-3 bg-surface-overlay/30 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          alloc.type === 'purchase' ? 'bg-gold-500/20 text-gold-400' :
                          alloc.type === 'referral_bonus' ? 'bg-green-500/20 text-green-400' :
                          'bg-gold-500/20 text-gold-400'
                        }`}>
                          {alloc.type === 'purchase' ? 'Purchase' : alloc.type === 'referral_bonus' ? 'Referral' : 'Bonus'}
                        </span>
                        <span className="text-ink-muted">{alloc.fundraising_rounds?.display_name || 'Unknown Round'}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-ink">{parseFloat(alloc.tokens_amount).toLocaleString()} RWA</div>
                        <div className="text-xs text-ink-faint">${parseFloat(alloc.tokens_usd_value || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No allocations - CTA to invest */}
        {(!tokenAllocations || !tokenAllocations.summary || tokenAllocations.summary.totalTokens === 0) && !isLoadingAllocations && (
          <div className="bg-gradient-to-r from-gold-900/30 to-gold-light-900/30 rounded-xl border border-gold-500/30 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gold-500/20 rounded-xl">
                  <Coins className="w-8 h-8 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Invest in RWA Platform</h3>
                  <p className="text-ink-muted text-sm">Get RWA tokens at the best pre-sale price with up to 3.75x ROI at TGE</p>
                </div>
              </div>
              <Link href="/raise" className="px-6 py-3 bg-gold hover:bg-gold-light text-ink rounded-lg font-medium transition-colors flex items-center gap-2">
                Invest Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* OWNER TAB */}
        {activeTab === 'owner' && (
          <div className="space-y-6">
            {/* Sub-tabs for Owner */}
            <div className="flex gap-2 p-1 bg-surface-overlay/50 rounded-xl w-fit">
              <button
                onClick={() => setOwnerSubTab('crowdfunding')}
                className={`px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  ownerSubTab === 'crowdfunding' 
                    ? 'bg-gold text-ink' 
                    : 'text-ink-muted hover:text-ink hover:bg-surface-overlay'
                }`}
              >
                <Coins className="w-4 h-4" />
                Crowdfunding
              </button>
              <button
                onClick={() => setOwnerSubTab('tokenization')}
                className={`px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  ownerSubTab === 'tokenization' 
                    ? 'bg-gold text-ink' 
                    : 'text-ink-muted hover:text-ink hover:bg-surface-overlay'
                }`}
              >
                <FileText className="w-4 h-4" />
                Tokenization
              </button>
            </div>

            {/* Crowdfunding Section */}
            {ownerSubTab === 'crowdfunding' && (
              <DashboardCrowdfundingSummary />
            )}

            {/* Tokenization Section */}
            {ownerSubTab === 'tokenization' && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-surface rounded-xl p-5 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-ink-muted text-sm">Total Tokenized</span>
                      <Coins className="w-5 h-5 text-gold-400" />
                    </div>
                    <p className="text-2xl font-bold text-ink">
                      {formatCurrency(
                        userProjects
                          .filter(p => ['deployed', 'live', 'completed'].includes(p.status) && p.type !== 'crowdfund')
                          .reduce((sum, p) => sum + toNumber(p.targetAmount), 0)
                      )}
                    </p>
                    <p className="text-xs text-ink-faint mt-2">
                      {userProjects.filter(p => ['deployed', 'live', 'completed'].includes(p.status) && p.type !== 'crowdfund').length} deployed project{userProjects.filter(p => ['deployed', 'live', 'completed'].includes(p.status) && p.type !== 'crowdfund').length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="bg-surface rounded-xl p-5 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-ink-muted text-sm">Total Raised</span>
                      <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                    <p className="text-2xl font-bold text-ink">{formatCurrency(ownerStats.totalRaised)}</p>
                    <p className="text-xs text-ink-faint mt-2">From token sales</p>
                  </div>

                  <div className="bg-surface rounded-xl p-5 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-ink-muted text-sm">Current Value</span>
                      <BarChart3 className="w-5 h-5 text-gold-400" />
                    </div>
                    <p className="text-2xl font-bold text-ink">{formatCurrency(ownerStats.currentValue)}</p>
                    <p className="text-xs text-green-400 mt-2">+{ownerStats.totalYield.toFixed(2)}% yield</p>
                  </div>

                  <div className="bg-surface rounded-xl p-5 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-ink-muted text-sm">Dividends Distributed</span>
                      <Users className="w-5 h-5 text-yellow-400" />
                    </div>
                    <p className="text-2xl font-bold text-ink">{formatCurrency(ownerStats.dividendsDistributed)}</p>
                    <p className="text-xs text-ink-faint mt-2">To investors</p>
                  </div>
                </div>

                {/* Chain Info Banner */}
                {projectsOnOtherChains > 0 && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      <div>
                        <p className="text-ink font-medium">
                          {projectsOnOtherChains} project{projectsOnOtherChains !== 1 ? 's' : ''} on other chains
                        </p>
                        <p className="text-sm text-ink-muted">
                          Switch networks to interact with projects on different chains
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tokenization Projects Grid */}
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                  <div className="p-6 border-b border-border flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gold-500/20 rounded-lg">
                        <FileText className="w-5 h-5 text-gold-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-ink">Tokenization Projects</h3>
                        <p className="text-sm text-ink-muted">
                          {tokenizationProjects.length} project{tokenizationProjects.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Link href="/tokenize" className="flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-light text-ink rounded-lg text-sm font-medium transition-colors">
                      <Plus className="w-4 h-4" />
                      New Project
                    </Link>
                  </div>

                  {isLoading ? (
                    <div className="p-12 flex justify-center">
                      <Loader2 className="w-8 h-8 text-ink-faint animate-spin" />
                    </div>
                  ) : tokenizationProjects.length === 0 ? (
                    <div className="p-12 text-center">
                      <FileText className="w-12 h-12 text-ink-faint mx-auto mb-3" />
                      <p className="text-ink-muted mb-4">No tokenization projects yet</p>
                      <Link href="/tokenize" className="inline-flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-light text-ink rounded-lg text-sm transition-colors">
                        Tokenize Asset <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ) : (
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {tokenizationProjects.map((project) => (
                        <ProjectCard 
                          key={project.id} 
                          project={project} 
                          currentChainId={chainId}
                          onSwitchChain={handleSwitchChain}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            
            {/* KYC Status Card */}
            <div className="bg-surface rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gold-400" />
                  KYC Status
                </h3>
                <div className={`px-3 py-1.5 rounded-lg text-sm border ${kycConfig.color} flex items-center gap-2`}>
                  {React.createElement(kycConfig.icon, { className: "w-4 h-4" })}
                  {tier}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface-overlay/50 rounded-lg p-4">
                  <p className="text-sm text-ink-muted">Investment Limit</p>
                  <p className="text-xl font-bold text-ink mt-1">{formatCurrency(investmentLimit)}</p>
                </div>
                <div className="bg-surface-overlay/50 rounded-lg p-4">
                  <p className="text-sm text-ink-muted">Total Invested</p>
                  <p className="text-xl font-bold text-ink mt-1">{formatCurrency(investorStats.totalInvested)}</p>
                </div>
                <div className="bg-surface-overlay/50 rounded-lg p-4">
                  <p className="text-sm text-ink-muted">Remaining</p>
                  <p className="text-xl font-bold text-ink mt-1">
                    {investmentLimit === Infinity ? 'Unlimited' : formatCurrency(Math.max(0, investmentLimit - investorStats.totalInvested))}
                  </p>
                </div>
              </div>
              
              {tier === 'None' && (
                <Link href="/kyc" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-light text-ink rounded-lg text-sm transition-colors">
                  Complete KYC Verification <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {/* Linked Wallets */}
            <div className="bg-surface rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-gold-400" />
                    Linked Wallets
                  </h3>
                  <p className="text-sm text-ink-muted mt-1">
                    Link up to {MAX_LINKED_WALLETS} wallets to your KYC profile
                  </p>
                </div>
                <span className="text-sm text-ink-muted">{linkedWallets.length} / {MAX_LINKED_WALLETS}</span>
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
                  Wallet linked successfully! The new wallet now shares your KYC verification.
                </div>
              )}

              {/* Linked Wallets List */}
              <div className="space-y-3 mb-6">
                {linkedWallets.map((wallet) => (
                  <div
                    key={wallet.address}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                      wallet.address.toLowerCase() === address?.toLowerCase()
                        ? "bg-gold-500/10 border-gold-500/30"
                        : "bg-surface-overlay/50 border-border-strong"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        wallet.isPrimary ? "bg-amber-500/20" : "bg-border-strong"
                      }`}>
                        {wallet.isPrimary ? "ðŸ‘‘" : "ðŸ‘›"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-ink">{formatAddress(wallet.address)}</p>
                          {wallet.address.toLowerCase() === address?.toLowerCase() && (
                            <span className="px-2 py-0.5 bg-gold-500/20 text-gold-400 text-xs rounded-full">Current</span>
                          )}
                          {wallet.isPrimary && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">Primary</span>
                          )}
                        </div>
                        <p className="text-xs text-ink-faint">Linked {new Date(wallet.linkedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {linkedWallets.length === 0 && (
                  <div className="text-center py-6 text-ink-faint">
                    <Wallet className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No wallets linked yet</p>
                  </div>
                )}
              </div>

              {/* Generate Code Section (for verified users) */}
              {hasKYC && isPrimaryWallet && (
                <div className="border-t border-border pt-6">
                  <h4 className="text-ink font-medium mb-3">Generate Link Code</h4>
                  <p className="text-sm text-ink-muted mb-4">Generate a one-time code to link another wallet</p>
                  
                  {linkCode && timeLeft > 0 ? (
                    <div className="bg-surface-sunken rounded-lg p-4 text-center">
                      <p className="text-ink-faint text-sm mb-2">Your Link Code</p>
                      <div className="flex items-center justify-center gap-3">
                        <p className="text-3xl font-mono font-bold text-ink tracking-widest">{linkCode.code}</p>
                        <button onClick={copyCode} className="p-2 hover:bg-surface-overlay rounded-lg transition-colors">
                          {copiedCode ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-ink-muted" />}
                        </button>
                      </div>
                      <p className="text-ink-faint text-sm mt-3 flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4" />
                        Expires in <span className={timeLeft < 60 ? "text-red-400" : "text-ink"}>{formatTime(timeLeft)}</span>
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerateCode}
                      disabled={isGenerating}
                      className="w-full py-3 bg-gold hover:bg-gold-light disabled:bg-border-strong disabled:cursor-not-allowed rounded-lg text-ink font-medium transition-colors flex items-center justify-center gap-2"
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
                <div className="border-t border-border pt-6">
                  <h4 className="text-ink font-medium mb-3">Link to Existing KYC</h4>
                  <p className="text-sm text-ink-muted mb-4">Enter a link code from your verified wallet</p>
                  
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                      placeholder="Enter 8-character code"
                      className="flex-1 px-4 py-3 bg-surface-sunken border border-border rounded-lg text-ink text-center font-mono tracking-widest focus:outline-none focus:border-gold-500 uppercase"
                      maxLength={8}
                    />
                    <button
                      onClick={handleUseLinkCode}
                      disabled={codeInput.length !== 8 || isLinking}
                      className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-border-strong disabled:cursor-not-allowed rounded-lg text-ink font-medium transition-colors flex items-center gap-2"
                    >
                      {isLinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      Link
                    </button>
                  </div>
                </div>
              )}

              {/* Link to full page */}
              <div className="mt-4 pt-4 border-t border-border">
                <Link href="/kyc/link" className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1">
                  Advanced wallet management <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Referral Code */}
            <div className="bg-surface rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-green-400" />
                  Referral Program
                </h3>
                {referralStats && referralStats.totalReferrals > 0 && (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                    {referralStats.totalReferrals} referral{referralStats.totalReferrals !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              {hasKYC ? (
                ['Gold', 'Diamond'].includes(tier) ? (
                  <div className="space-y-4">
                    {/* Referral Stats */}
                    {referralStats && referralStats.totalReferrals > 0 && (
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-surface-overlay/50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-ink">{referralStats.totalReferrals}</p>
                          <p className="text-xs text-ink-muted">Referrals</p>
                        </div>
                        <div className="bg-surface-overlay/50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-ink">{formatCurrency(referralStats.totalInvestmentAmount)}</p>
                          <p className="text-xs text-ink-muted">Invested</p>
                        </div>
                        <div className="bg-surface-overlay/50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-green-400">{referralStats.totalBonusTokens.toLocaleString()}</p>
                          <p className="text-xs text-ink-muted">Bonus Tokens</p>
                        </div>
                      </div>
                    )}

                    {/* Referral Link */}
                    <div className="p-4 bg-surface-overlay/50 rounded-lg">
                      <p className="text-sm text-ink-muted mb-2">Your Referral Link</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 p-3 bg-surface-sunken rounded-lg">
                          <p className="text-sm font-mono text-ink truncate">
                            {typeof window !== 'undefined' ? `${window.location.origin}/raise?ref=${referralCode || address?.slice(0, 8)}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/raise?ref=${referralCode || address?.slice(0, 8)}`);
                            setCopiedReferral(true);
                            setTimeout(() => setCopiedReferral(false), 2000);
                          }}
                          className="px-4 py-3 bg-green-600 hover:bg-green-700 text-ink rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                          {copiedReferral ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copiedReferral ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    {/* Referral Code */}
                    <div className="p-4 bg-surface-overlay/50 rounded-lg">
                      <p className="text-sm text-ink-muted mb-2">Your Referral Code</p>
                      {isLoadingReferral ? (
                        <div className="flex items-center justify-center py-3">
                          <Loader2 className="w-5 h-5 animate-spin text-ink-muted" />
                        </div>
                      ) : referralCode ? (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 p-3 bg-surface-sunken rounded-lg text-center">
                            <p className="text-2xl font-mono font-bold text-ink tracking-widest">{referralCode}</p>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(referralCode);
                              setCopiedReferralCode(true);
                              setTimeout(() => setCopiedReferralCode(false), 2000);
                            }}
                            className="px-4 py-3 bg-gold hover:bg-gold-light text-ink rounded-lg text-sm transition-colors flex items-center gap-2"
                          >
                            {copiedReferralCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copiedReferralCode ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      ) : (
                        <p className="text-ink-faint text-center py-3">Unable to load referral code</p>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3 bg-gold-500/10 border border-gold-500/30 rounded-lg">
                      <p className="text-sm text-gold-400 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                          Share your referral link or code with friends. When they invest using your referral, 
                          you&apos;ll receive 5% of their purchased tokens as a bonus.
                        </span>
                      </p>
                    </div>

                    {/* View Details Link */}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Award className="w-12 h-12 text-ink-faint mx-auto mb-3" />
                    <p className="text-ink font-medium mb-2">Upgrade to Gold or Diamond</p>
                    <p className="text-ink-muted text-sm mb-4">
                      Referral program is available for Gold and Diamond tier members
                    </p>
                    <Link href="/kyc" className="inline-flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-light text-ink rounded-lg text-sm transition-colors">
                      Upgrade KYC Tier <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )
              ) : (
                <div className="text-center py-6">
                  <Share2 className="w-12 h-12 text-ink-faint mx-auto mb-3" />
                  <p className="text-ink-muted mb-4">Complete KYC to access the referral program</p>
                  <Link href="/kyc" className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-ink rounded-lg text-sm transition-colors">
                    Get Started <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/projects" className="flex items-center justify-between p-4 bg-surface hover:bg-gray-750 rounded-xl border border-border transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gold-500/20 rounded-lg"><TrendingUp className="w-5 h-5 text-gold-400" /></div>
              <span className="text-ink font-medium">Browse Projects</span>
            </div>
            <ChevronRight className="w-5 h-5 text-ink-faint group-hover:text-ink transition-colors" />
          </Link>
          
          <Link href="/kyc" className="flex items-center justify-between p-4 bg-surface hover:bg-gray-750 rounded-xl border border-border transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg"><Shield className="w-5 h-5 text-green-400" /></div>
              <span className="text-ink font-medium">KYC Verification</span>
            </div>
            <ChevronRight className="w-5 h-5 text-ink-faint group-hover:text-ink transition-colors" />
          </Link>
          
          <Link href="/exchange" className="flex items-center justify-between p-4 bg-surface hover:bg-gray-750 rounded-xl border border-border transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gold-500/20 rounded-lg"><BarChart3 className="w-5 h-5 text-gold-400" /></div>
              <span className="text-ink font-medium">Trade Tokens</span>
            </div>
            <ChevronRight className="w-5 h-5 text-ink-faint group-hover:text-ink transition-colors" />
          </Link>
        </div>

      </div>
    </div>
  );
}
