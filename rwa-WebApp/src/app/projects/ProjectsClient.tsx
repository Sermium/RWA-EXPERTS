'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useChainId, useAccount } from 'wagmi';
import { useChainConfig } from '@/hooks/useChainConfig';
import { isValidChainId } from '@/config/chains';
import { TrendingUp, TrendingDown, Timer, Clock, Percent, BarChart3, Coins, Calendar, Flame, Globe2, Search, AlertTriangle, CheckCircle2, type LucideIcon } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: {
    category?: string;
    projected_roi?: number;
    company_name?: string;
  };
}

interface Milestone {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected';
  percentage: number;
}

interface Project {
  id: string | number;
  owner: string;
  fundingGoal: bigint;
  totalRaised: bigint;
  deadline: bigint;
  status: string;
  securityToken: string;
  escrowVault: string;
  createdAt: bigint;
  metadata?: ProjectMetadata;
  tokenName?: string;
  tokenSymbol?: string;
  cliffPeriod?: number;
  vestingPeriod?: number;
  expectedROI?: number;
  dividendYield?: number;
  images?: string[];
  category?: string;
  milestones?: Milestone[];
  activatedAt?: string;
  raiseEndDate?: string;
}

interface APIProject {
  id: string | number;
  owner: string;
  fundingGoal: string;
  totalRaised: string;
  deadline: string;
  status: string;
  securityToken: string;
  escrowVault: string;
  createdAt: string;
  metadata?: ProjectMetadata;
  tokenName?: string;
  tokenSymbol?: string;
  cliffPeriod?: number;
  vestingPeriod?: number;
  expectedROI?: number;
  dividendYield?: number;
  images?: string[];
  category?: string;
  milestones?: Milestone[];
  activatedAt?: string;
  raiseEndDate?: string;
}

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

// Statuses visible to investors on the projects page
const INVESTOR_VISIBLE_STATUSES = ['active', 'funded', 'in_progress', 'completed'];

// Database status labels and colors
const DB_STATUS_CONFIG: Record<string, { label: string; color: string; priority: number; investorLabel?: string }> = {
  'active': {
    label: 'Active',
    color: 'bg-success/10 text-success border-success/30',
    priority: 0,
    investorLabel: 'Open for Investment'
  },
  'funded': {
    label: 'Funded',
    color: 'bg-success/10 text-success border-success/30',
    priority: 1,
    investorLabel: 'Fully Funded'
  },
  'in_progress': {
    label: 'In Progress',
    color: 'bg-gold/10 text-gold border-gold/30',
    priority: 2,
    investorLabel: 'Project Running'
  },
  'completed': {
    label: 'Completed',
    color: 'bg-gold/10 text-gold border-gold/30',
    priority: 3,
    investorLabel: 'Milestones in Review'
  },
  'archived': {
    label: 'Archived',
    color: 'bg-ink-muted/10 text-ink-muted border-ink-muted/20',
    priority: 10,
    investorLabel: 'Archived'
  },
  // These should NOT appear on the projects page but keeping for reference
  'draft': { label: 'Draft', color: 'bg-ink-muted/10 text-ink-muted border-ink-muted/20', priority: 99 },
  'pending_review': { label: 'Pending Review', color: 'bg-warning/10 text-warning border-warning/30', priority: 99 },
  'pending_payment': { label: 'Pending Payment', color: 'bg-warning/10 text-warning border-warning/30', priority: 99 },
  'approved': { label: 'Approved', color: 'bg-success/10 text-success border-success/30', priority: 99 },
  'rejected': { label: 'Rejected', color: 'bg-danger/10 text-danger border-danger/30', priority: 99 },
  'cancelled': { label: 'Cancelled', color: 'bg-danger/10 text-danger border-danger/30', priority: 99 },
  'failed': { label: 'Failed', color: 'bg-danger/10 text-danger border-danger/30', priority: 99 },
};

const getStatusConfig = (status: string) => {
  return DB_STATUS_CONFIG[status] || { label: status, color: 'bg-ink-muted/10 text-ink-muted border-ink-muted/20', priority: 99 };
};

// ============================================================================
// LOCAL CACHE
// ============================================================================

const LOCAL_CACHE_KEY_PREFIX = 'rwa_projects_v4_';
const LOCAL_CACHE_DURATION = 5 * 60 * 1000;

interface LocalCache {
  projects: Project[];
  timestamp: number;
}

function getLocalCache(chainId: number): LocalCache | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(`${LOCAL_CACHE_KEY_PREFIX}${chainId}`);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const projects = data.projects.map((p: APIProject) => ({
      ...p,
      fundingGoal: BigInt(p.fundingGoal || '0'),
      totalRaised: BigInt(p.totalRaised || '0'),
      deadline: BigInt(p.deadline || '0'),
      createdAt: BigInt(p.createdAt || '0'),
    }));
    
    return { projects, timestamp: data.timestamp };
  } catch {
    return null;
  }
}

function setLocalCache(chainId: number, projects: Project[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    const serializable = projects.map(p => ({
      ...p,
      fundingGoal: p.fundingGoal.toString(),
      totalRaised: p.totalRaised.toString(),
      deadline: p.deadline.toString(),
      createdAt: p.createdAt.toString(),
    }));
    
    localStorage.setItem(`${LOCAL_CACHE_KEY_PREFIX}${chainId}`, JSON.stringify({
      projects: serializable,
      timestamp: Date.now(),
    }));
  } catch {
    // Ignore storage errors
  }
}

function isLocalCacheValid(cache: LocalCache | null): boolean {
  if (!cache) return false;
  return Date.now() - cache.timestamp < LOCAL_CACHE_DURATION;
}

// ============================================================================
// PAGINATION & SORTING CONFIG
// ============================================================================

const PROJECTS_PER_PAGE = 30;

type SortOption = 'newest' | 'oldest' | 'most_raised' | 'least_raised' | 'most_funded' | 'least_funded' | 'status' | 'ending_soon' | 'highest_roi';

interface SortConfig {
  value: SortOption;
  label: string;
  icon: LucideIcon;
}

const SORT_OPTIONS: SortConfig[] = [
  { value: 'newest', label: 'Newest First', icon: Clock },
  { value: 'ending_soon', label: 'Ending Soon', icon: Timer },
  { value: 'highest_roi', label: 'Highest ROI', icon: TrendingUp },
  { value: 'most_funded', label: 'Most % Funded', icon: BarChart3 },
  { value: 'least_funded', label: 'Least % Funded', icon: TrendingDown },
  { value: 'most_raised', label: 'Most Raised', icon: Coins },
  { value: 'oldest', label: 'Oldest First', icon: Calendar },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a project should be archived (all milestones validated)
 */
const shouldArchiveProject = (project: Project): boolean => {
  // If status is completed and all milestones are approved/completed, it can be archived
  if (project.status === 'completed' && project.milestones && project.milestones.length > 0) {
    const allMilestonesCompleted = project.milestones.every(
      m => m.status === 'approved' || m.status === 'completed'
    );
    return allMilestonesCompleted;
  }
  return false;
};

/**
 * Check if project is visible to investors
 */
const isVisibleToInvestors = (project: Project): boolean => {
  // Must be in an investor-visible status
  if (!INVESTOR_VISIBLE_STATUSES.includes(project.status)) {
    return false;
  }
  
  // If completed, only show if milestones are still being validated
  if (project.status === 'completed') {
    return !shouldArchiveProject(project);
  }
  
  return true;
};

const formatUSD = (amount: bigint): string => {
  return (Number(amount) / 1e6).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const formatUSDC = (amount: bigint): string => {
  return (Number(amount) / 1e6).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const isValidIPFSHash = (uri: string): boolean => {
  if (!uri) return false;
  if (uri.startsWith('ipfs://')) {
    const hash = uri.replace('ipfs://', '');
    return hash.length >= 46;
  }
  return uri.startsWith('http');
};

const getFundingPercentage = (project: Project): number => {
  const goal = Number(project.fundingGoal);
  if (goal === 0) return 0;
  return (Number(project.totalRaised) / goal) * 100;
};

const getStatusPriority = (status: string): number => {
  return getStatusConfig(status).priority;
};

const sortProjects = (projects: Project[], sortBy: SortOption): Project[] => {
  const sorted = [...projects];
  
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => Number(b.createdAt - a.createdAt));
    case 'oldest':
      return sorted.sort((a, b) => Number(a.createdAt - b.createdAt));
    case 'highest_roi':
      return sorted.sort((a, b) => (b.expectedROI || 0) - (a.expectedROI || 0));
    case 'most_raised':
      return sorted.sort((a, b) => Number(b.totalRaised - a.totalRaised));
    case 'least_raised':
      return sorted.sort((a, b) => Number(a.totalRaised - b.totalRaised));
    case 'most_funded':
      return sorted.sort((a, b) => getFundingPercentage(b) - getFundingPercentage(a));
    case 'least_funded':
      return sorted.sort((a, b) => getFundingPercentage(a) - getFundingPercentage(b));
    case 'status':
      return sorted.sort((a, b) => getStatusPriority(a.status) - getStatusPriority(b.status));
    case 'ending_soon':
      return sorted.sort((a, b) => {
        // Active projects with deadlines first
        const aDeadline = a.raiseEndDate ? new Date(a.raiseEndDate).getTime() : (a.deadline > 0n ? Number(a.deadline) * 1000 : Infinity);
        const bDeadline = b.raiseEndDate ? new Date(b.raiseEndDate).getTime() : (b.deadline > 0n ? Number(b.deadline) * 1000 : Infinity);
        return aDeadline - bDeadline;
      });
    default:
      return sorted;
  }
};

// ============================================================================
// SORT DROPDOWN COMPONENT
// ============================================================================

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentOption = SORT_OPTIONS.find(opt => opt.value === value) || SORT_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-surface-overlay border border-border-strong rounded-lg text-ink hover:bg-border-strong transition-colors min-w-[180px]"
      >
        <svg className="w-4 h-4 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        <span className="flex-1 flex items-center gap-2 text-left text-sm">
          <currentOption.icon className="w-4 h-4 text-ink-faint" /> {currentOption.label}
        </span>
        <svg 
          className={`w-4 h-4 text-ink-faint transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-surface border border-border rounded-lg shadow-panel z-50 overflow-hidden">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                value === option.value
                  ? 'bg-gold text-surface-sunken'
                  : 'text-ink-muted hover:bg-surface-overlay'
              }`}
            >
              <option.icon className="w-4 h-4" />
              <span>{option.label}</span>
              {value === option.value && (
                <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PAGINATION COMPONENT
// ============================================================================

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-4 py-2 bg-surface border border-border rounded-lg text-ink-muted hover:text-ink hover:bg-surface-overlay disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="hidden sm:inline">Previous</span>
      </button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => (
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-3 py-2 text-ink-faint">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition-colors ${
                currentPage === page
                  ? 'bg-gold text-surface-sunken'
                  : 'bg-surface border border-border text-ink-muted hover:text-ink hover:bg-surface-overlay'
              }`}
            >
              {page}
            </button>
          )
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 px-4 py-2 bg-surface border border-border rounded-lg text-ink-muted hover:text-ink hover:bg-surface-overlay disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span className="hidden sm:inline">Next</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// ============================================================================
// PROJECT CARD COMPONENT
// ============================================================================

interface ProjectCardProps {
  project: Project;
  chainName: string;
  isTestnet: boolean;
}

function ProjectCard({ project, chainName, isTestnet }: ProjectCardProps) {
  const statusConfig = getStatusConfig(project.status);
  
  const fundingGoalNum = Number(project.fundingGoal) / 1e6;
  const totalRaisedNum = Number(project.totalRaised) / 1e6;
  const progress = fundingGoalNum > 0 ? (totalRaisedNum / fundingGoalNum) * 100 : 0;

  // Use raiseEndDate if available, otherwise fall back to deadline
  const endDate = project.raiseEndDate 
    ? new Date(project.raiseEndDate) 
    : (project.deadline > 0n ? new Date(Number(project.deadline) * 1000) : null);
  
  const isExpired = endDate ? endDate < new Date() : false;
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

  const displayName = project.metadata?.name || project.tokenName || `Project #${project.id}`;
  const displayImage = project.images?.[0] || project.metadata?.image;
  const displayCategory = project.category || project.metadata?.attributes?.category;
  const displayROI = project.expectedROI || project.metadata?.attributes?.projected_roi;

  // Check milestone progress for completed projects
  const milestonesCompleted = project.milestones?.filter(m => m.status === 'approved' || m.status === 'completed').length || 0;
  const totalMilestones = project.milestones?.length || 0;

  // Determine the investor-friendly label
  const getInvestorStatusLabel = () => {
    if (project.status === 'active') {
      if (daysLeft !== null && daysLeft <= 7) {
        return `${daysLeft} days left!`;
      }
      return 'Open for Investment';
    }
    if (project.status === 'funded') {
      return 'Fully Funded';
    }
    if (project.status === 'in_progress') {
      return 'Project Running';
    }
    if (project.status === 'completed') {
      return `Milestones: ${milestonesCompleted}/${totalMilestones}`;
    }
    return statusConfig.investorLabel || statusConfig.label;
  };

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-surface rounded-xl border border-border overflow-hidden transition-all group h-full hover:border-border-strong hover:shadow-panel">
        {/* Image Header */}
        <div className="h-40 bg-gradient-to-br from-gold-600/20 to-gold-light-600/20 relative">
          {displayImage && isValidIPFSHash(displayImage) ? (
            <Image
              src={displayImage.startsWith('ipfs://') 
                ? `https://gateway.pinata.cloud/ipfs/${displayImage.replace('ipfs://', '')}`
                : displayImage}
              alt={displayName}
              fill
              className="object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl font-bold text-border-strong group-hover:text-border transition-colors">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusConfig.color}`}>
              {getInvestorStatusLabel()}
            </span>
          </div>

          {/* Chain Badge */}
          <div className="absolute top-3 left-3">
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
              isTestnet
                ? 'bg-warning-muted text-warning border-warning/30'
                : 'bg-success/10 text-success border-success/30'
            }`}>
              {chainName}
            </span>
          </div>

          {/* Urgent badge for ending soon */}
          {project.status === 'active' && daysLeft !== null && daysLeft <= 3 && daysLeft > 0 && (
            <div className="absolute bottom-3 right-3">
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-danger text-ink">
                <Flame className="w-3.5 h-3.5" /> Ending Soon
              </span>
            </div>
          )}
        </div>

        <div className="p-5">
          {/* Title & Category */}
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-ink group-hover:text-gold transition-colors truncate">
              {displayName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {project.tokenSymbol && (
                <span className="text-sm text-ink-faint">${project.tokenSymbol}</span>
              )}
              {displayCategory && (
                <span className="px-2 py-0.5 bg-surface-overlay text-ink-muted text-xs rounded">
                  {displayCategory}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-ink-muted text-sm mb-4 line-clamp-2">
            {project.metadata?.description || 'Tokenized real-world asset investment opportunity'}
          </p>

          {/* ROI & Investment Info Badges */}
          {(displayROI || project.cliffPeriod) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {displayROI && displayROI > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 border border-success/20 rounded-lg">
                  <TrendingUp className="w-3.5 h-3.5 text-success" />
                  <span className="text-sm text-success font-medium">
                    {displayROI}% ROI
                  </span>
                </div>
              )}
              {project.cliffPeriod && project.cliffPeriod > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-ink-muted/10 border border-ink-muted/20 rounded-lg">
                  <Timer className="w-3.5 h-3.5 text-ink-muted" />
                  <span className="text-sm text-ink-muted font-medium">
                    {project.cliffPeriod}d cliff
                  </span>
                </div>
              )}
              {project.dividendYield && project.dividendYield > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 border border-gold/20 rounded-lg">
                  <Percent className="w-3.5 h-3.5 text-gold" />
                  <span className="text-sm text-gold font-medium">
                    {project.dividendYield}% yield
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Funding Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-ink-muted">
                {project.status === 'active' ? 'Raised' : 'Total Raised'}
              </span>
              <span className="font-medium text-ink">
                {formatUSDC(project.totalRaised)} 
                <span className="text-ink-faint"> / {formatUSD(project.fundingGoal)}</span>
              </span>
            </div>
            <div className="w-full bg-surface-overlay rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  progress >= 100
                    ? 'bg-success'
                    : 'bg-gradient-to-r from-gold-dark to-gold'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="text-right text-xs text-ink-faint mt-1">
              {progress >= 100 ? (
                <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="w-3 h-3" /> Goal Reached</span>
              ) : `${progress.toFixed(1)}% funded`}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <div className="text-ink-muted text-sm">
              {project.status === 'active' && 'Invest Now'}
              {project.status === 'funded' && 'Fully Funded'}
              {project.status === 'in_progress' && 'In Progress'}
              {project.status === 'completed' && 'Review Phase'}
            </div>
            <div className={`text-sm ${
              project.status !== 'active' ? 'text-ink-muted' :
              !endDate ? 'text-ink-muted' :
              isExpired ? 'text-warning' :
              daysLeft !== null && daysLeft <= 7 ? 'text-warning' :
              'text-ink-muted'
            }`}>
              {project.status === 'active' ? (
                !endDate ? 'No deadline' :
                isExpired ? 'Ended' : 
                `${daysLeft} days left`
              ) : (
                project.status === 'completed' && totalMilestones > 0
                  ? `${milestonesCompleted}/${totalMilestones} milestones`
                  : ''
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function ProjectsClient() {
  const walletChainId = useChainId();
  const { isConnected } = useAccount();

  const {
    chainId,
    chainName,
    contracts,
    explorerUrl,
    isDeployed,
    isTestnet,
    switchToChain,
    isSwitching,
    deployedChains
  } = useChainConfig();

  const isWrongChain = useMemo(() => 
    isConnected && walletChainId !== chainId,
    [isConnected, walletChainId, chainId]
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'funded' | 'in_progress'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('ending_soon');
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [cacheHit, setCacheHit] = useState(false);

  // Fetch from API - only investor-visible statuses
  const fetchFromAPI = useCallback(async (showLoading: boolean) => {
    if (showLoading) setLoading(true);
    
    try {
      // Only fetch statuses that investors should see
      const statusParam = INVESTOR_VISIBLE_STATUSES.join(',');
      const url = `/api/crowdfunding/projects?status=${statusParam}${chainId ? `&chainId=${chainId}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();

      if (data.success && data.projects) {
        const parsedProjects: Project[] = data.projects
          .map((p: any) => ({
            id: p.id,
            owner: p.owner || p.wallet_address || '',
            fundingGoal: BigInt(p.fundingGoal || p.funding_goal || '0'),
            totalRaised: BigInt(p.totalRaised || p.funded_amount || '0'),
            deadline: BigInt(p.deadline || '0'),
            createdAt: BigInt(p.createdAt || Math.floor(new Date(p.created_at || 0).getTime() / 1000) || '0'),
            status: p.status || 'active',
            securityToken: p.securityToken || p.security_token_address || '',
            escrowVault: p.escrowVault || p.escrow_vault_address || '',
            metadata: p.metadata,
            tokenName: p.tokenName || p.token_name,
            tokenSymbol: p.tokenSymbol || p.token_symbol,
            cliffPeriod: p.cliffPeriod || p.cliff_period || p.token_cliff,
            vestingPeriod: p.vestingPeriod || p.vesting_period || p.token_vesting,
            expectedROI: p.expectedROI || p.expected_roi || p.projected_roi,
            dividendYield: p.dividendYield || p.dividend_yield,
            images: p.images || (p.logo_url ? [p.logo_url] : []),
            category: p.category,
            milestones: p.milestones,
            activatedAt: p.activated_at,
            raiseEndDate: p.raise_end_date,
          }))
          // Filter out completed projects with all milestones done
          .filter((p: Project) => isVisibleToInvestors(p));

        setProjects(parsedProjects);
        setLastRefresh(Date.now());
        setCacheHit(false);
        
        setLocalCache(chainId, parsedProjects);
        
        console.log(`[ProjectsClient] Loaded ${parsedProjects.length} investor-visible projects`);
      }

      setError(null);
    } catch (err) {
      console.error('[ProjectsClient] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [chainId]);

  // Load projects
  const loadProjects = useCallback(async (forceRefresh = false) => {
    if (!isDeployed) {
      setProjects([]);
      setLoading(false);
      return;
    }

    if (!forceRefresh) {
      const localCache = getLocalCache(chainId);
      if (isLocalCacheValid(localCache)) {
        console.log('[ProjectsClient] Using local cache');
        // Re-filter cached projects in case milestone status changed
        const filteredCache = localCache!.projects.filter(isVisibleToInvestors);
        setProjects(filteredCache);
        setLastRefresh(localCache!.timestamp);
        setLoading(false);
        setCacheHit(true);
        
        fetchFromAPI(false);
        return;
      }
    }

    await fetchFromAPI(true);
  }, [chainId, isDeployed, fetchFromAPI]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search, sortBy, chainId]);

  const handleRefresh = () => loadProjects(true);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSwitchNetwork = async (targetChainId: number) => {
    if (!isValidChainId(targetChainId)) return;
    await switchToChain(targetChainId);
  };

  // Filter and sort - simplified for investor view
  const filteredProjects = useMemo(() => {
    let result = projects.filter((p) => {
      // Status filter
      if (filter !== 'all' && p.status !== filter) return false;

      // Search filter
      if (search) {
        const s = search.toLowerCase();
        const matches = 
          p.metadata?.name?.toLowerCase().includes(s) ||
          p.tokenSymbol?.toLowerCase().includes(s) ||
          p.tokenName?.toLowerCase().includes(s) ||
          p.metadata?.description?.toLowerCase().includes(s) ||
          p.category?.toLowerCase().includes(s);
        if (!matches) return false;
      }

      return true;
    });

    return sortProjects(result, sortBy);
  }, [projects, filter, search, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * PROJECTS_PER_PAGE,
    currentPage * PROJECTS_PER_PAGE
  );

  // Stats for filter badges
  const statusCounts = useMemo(() => ({
    all: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    funded: projects.filter(p => p.status === 'funded').length,
    in_progress: projects.filter(p => p.status === 'in_progress' || p.status === 'completed').length,
  }), [projects]);

  const formatLastRefresh = () => {
    if (!lastRefresh) return '';
    const seconds = Math.floor((Date.now() - lastRefresh) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  // Network not supported
  if (!isDeployed) {
    return (
      <div className="min-h-screen bg-surface-sunken">
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-surface rounded-xl border border-border p-12 text-center">
            <div className="w-20 h-20 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Globe2 className="w-9 h-9 text-warning" />
            </div>
            <h2 className="text-2xl font-display font-medium text-ink mb-2">Network Not Supported</h2>
            <p className="text-ink-muted mb-6">
              Projects are not available on {chainName}. Please switch to a supported network.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {deployedChains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => handleSwitchNetwork(chain.id)}
                  disabled={isSwitching}
                  className="px-6 py-3 bg-gold hover:bg-gold-light disabled:bg-border rounded-lg text-surface-sunken font-medium transition-colors"
                >
                  {chain.name}
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-sunken">
      {/* Network Banner */}
      <div className={`border-b ${isTestnet ? 'bg-warning-muted border-warning/30' : 'bg-success/10 border-success/30'}`}>
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-warning' : 'bg-success'}`} />
            <span className={`text-sm font-medium ${isTestnet ? 'text-warning' : 'text-success'}`}>
              {chainName} {isTestnet && '(Testnet)'}
            </span>
          </div>
          {contracts?.RWAProjectNFT && (
            <a
              href={`${explorerUrl}/address/${contracts.RWAProjectNFT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-muted hover:text-ink text-sm transition flex items-center gap-1"
            >
              View Contract
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Wrong Chain Warning */}
      {isWrongChain && (
        <div className="bg-warning-muted border-b border-warning/30">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-warning text-sm flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Your wallet is on a different network</span>
            <button
              onClick={() => handleSwitchNetwork(chainId)}
              disabled={isSwitching}
              className="px-4 py-1.5 bg-warning hover:bg-warning/80 rounded-lg text-surface-sunken text-sm font-medium"
            >
              Switch to {chainName}
            </button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-medium text-ink mb-2">Investment Opportunities</h1>
            <p className="text-ink-muted">
              {statusCounts.active} active raises • {statusCounts.funded} funded • {statusCounts.in_progress} in progress
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface-overlay hover:bg-border-strong disabled:bg-surface text-ink rounded-lg font-medium transition-colors"
              title={lastRefresh ? `Last updated: ${formatLastRefresh()}` : 'Refresh'}
            >
              <svg 
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {lastRefresh && <span className="text-xs text-ink-muted">{formatLastRefresh()}</span>}
            </button>
            <Link
              href="/crowdfunding/apply"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-light text-surface-sunken rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Start a Raise
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-surface rounded-xl border border-border p-4 mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, symbol, or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-overlay border border-border-strong rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <SortDropdown value={sortBy} onChange={setSortBy} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-ink-faint text-sm mr-2">Show:</span>
              {([
                { key: 'all', label: 'All Projects', count: statusCounts.all },
                { key: 'active', label: 'Open for Investment', count: statusCounts.active },
                { key: 'funded', label: 'Fully Funded', count: statusCounts.funded },
                { key: 'in_progress', label: 'In Progress', count: statusCounts.in_progress },
              ] as const).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    filter === f.key 
                      ? 'bg-gold text-surface-sunken' 
                      : 'bg-surface-overlay text-ink-muted hover:bg-border-strong hover:text-ink'
                  }`}
                >
                  {f.label}
                  {f.count > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                      filter === f.key ? 'bg-gold/80' : 'bg-border-strong'
                    }`}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <p className="text-ink-muted">
            {filteredProjects.length > PROJECTS_PER_PAGE ? (
              <>Showing {((currentPage - 1) * PROJECTS_PER_PAGE) + 1}-{Math.min(currentPage * PROJECTS_PER_PAGE, filteredProjects.length)} of {filteredProjects.length} projects</>
            ) : (
              <>Found {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}</>
            )}
          </p>
          {totalPages > 1 && <p className="text-ink-faint text-sm">Page {currentPage} of {totalPages}</p>}
        </div>

        {/* Loading */}
        {loading && projects.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto" />
              <p className="mt-4 text-ink-muted">Loading investment opportunities...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-danger-muted border border-danger/30 rounded-xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-danger mb-4 mx-auto" />
            <h2 className="text-xl font-semibold text-ink mb-2">Error Loading Projects</h2>
            <p className="text-ink-muted mb-4">{error}</p>
            <button onClick={handleRefresh} className="px-4 py-2 bg-danger hover:bg-danger/80 text-ink rounded-lg">
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredProjects.length === 0 && (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <Search className="w-12 h-12 text-ink-faint mb-4 mx-auto" />
            <h2 className="text-xl font-semibold text-ink mb-2">No Projects Found</h2>
            <p className="text-ink-muted mb-6">
              {projects.length === 0 
                ? 'No active investment opportunities right now. Check back soon!' 
                : 'Try adjusting your filters or search terms.'}
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="px-6 py-3 bg-gold hover:bg-gold-light text-surface-sunken rounded-lg font-medium"
              >
                Show All Projects
              </button>
            )}
          </div>
        )}

        {/* Projects Grid */}
        {!loading && !error && paginatedProjects.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedProjects.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  chainName={chainName}
                  isTestnet={isTestnet}
                />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </main>
    </div>
  );
}
