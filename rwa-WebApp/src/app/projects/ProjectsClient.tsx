'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useChainId, useAccount } from 'wagmi';
import { useChainConfig } from '@/hooks/useChainConfig';
import { isValidChainId } from '@/config/chains';
import { TrendingUp, Timer, Clock, Percent } from 'lucide-react';

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

interface Project {
  id: string | number;
  owner: string;
  fundingGoal: bigint;
  totalRaised: bigint;
  deadline: bigint;
  status: string; // Changed from number to string for DB status
  securityToken: string;
  escrowVault: string;
  createdAt: bigint;
  metadata?: ProjectMetadata;
  tokenName?: string;
  tokenSymbol?: string;
  // New fields for cliff/ROI
  cliffPeriod?: number;
  vestingPeriod?: number;
  expectedROI?: number;
  dividendYield?: number;
  // Images from DB
  images?: string[];
  category?: string;
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
}

// Database status labels and colors
const DB_STATUS_CONFIG: Record<string, { label: string; color: string; priority: number }> = {
  'draft': { label: 'Draft', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', priority: 5 },
  'pending_review': { label: 'Pending Review', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', priority: 4 },
  'pending_payment': { label: 'Pending Payment', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', priority: 4 },
  'approved': { label: 'Approved', color: 'bg-green-500/20 text-green-400 border-green-500/30', priority: 2 },
  'active': { label: 'Active', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', priority: 0 },
  'funded': { label: 'Funded', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', priority: 1 },
  'in_progress': { label: 'In Progress', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', priority: 1 },
  'completed': { label: 'Completed', color: 'bg-green-500/20 text-green-400 border-green-500/30', priority: 3 },
  'rejected': { label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30', priority: 6 },
  'cancelled': { label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-500/30', priority: 6 },
  'failed': { label: 'Failed', color: 'bg-red-500/20 text-red-400 border-red-500/30', priority: 6 },
};

const getStatusConfig = (status: string) => {
  return DB_STATUS_CONFIG[status] || { label: status, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', priority: 99 };
};

// ============================================================================
// LOCAL CACHE (for instant loading)
// ============================================================================

const LOCAL_CACHE_KEY_PREFIX = 'rwa_projects_v3_';
const LOCAL_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
    
    // Convert string values back to BigInt
    const projects = data.projects.map((p: APIProject) => ({
      ...p,
      fundingGoal: BigInt(p.fundingGoal || '0'),
      totalRaised: BigInt(p.totalRaised || '0'),
      deadline: BigInt(p.deadline || '0'),
      createdAt: BigInt(p.createdAt || '0'),
    }));
    
    return {
      projects,
      timestamp: data.timestamp,
    };
  } catch {
    return null;
  }
}

function setLocalCache(chainId: number, projects: Project[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Convert BigInt to string for JSON serialization
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
  icon: string;
}

const SORT_OPTIONS: SortConfig[] = [
  { value: 'newest', label: 'Newest First', icon: '🕐' },
  { value: 'oldest', label: 'Oldest First', icon: '📅' },
  { value: 'highest_roi', label: 'Highest ROI', icon: '📈' },
  { value: 'most_raised', label: 'Most Raised', icon: '💰' },
  { value: 'least_raised', label: 'Least Raised', icon: '💵' },
  { value: 'most_funded', label: 'Most % Funded', icon: '📊' },
  { value: 'least_funded', label: 'Least % Funded', icon: '📉' },
  { value: 'status', label: 'By Status', icon: '🏷️' },
  { value: 'ending_soon', label: 'Ending Soon', icon: '⏰' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const isProjectArchived = (project: Project): boolean => {
  const archivedStatuses = ['cancelled', 'failed', 'rejected'];
  const hasNoFundsLeft = project.totalRaised === 0n;
  return archivedStatuses.includes(project.status) && hasNoFundsLeft;
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
        if (a.deadline === 0n && b.deadline === 0n) return 0;
        if (a.deadline === 0n) return 1;
        if (b.deadline === 0n) return -1;
        return Number(a.deadline - b.deadline);
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
        className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 transition-colors min-w-[180px]"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        <span className="flex-1 text-left text-sm">
          {currentOption.icon} {currentOption.label}
        </span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                value === option.value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>{option.icon}</span>
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
        className="flex items-center gap-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="hidden sm:inline">Previous</span>
      </button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => (
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition-colors ${
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
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
        className="flex items-center gap-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
// PROJECT CARD COMPONENT (Updated with ROI & Cliff)
// ============================================================================

interface ProjectCardProps {
  project: Project;
  chainName: string;
  isTestnet: boolean;
}

function ProjectCard({ project, chainName, isTestnet }: ProjectCardProps) {
  const isArchived = isProjectArchived(project);
  const statusConfig = getStatusConfig(project.status);
  
  const fundingGoalNum = Number(project.fundingGoal) / 1e6;
  const totalRaisedNum = Number(project.totalRaised) / 1e6;
  const progress = fundingGoalNum > 0 ? (totalRaisedNum / fundingGoalNum) * 100 : 0;

  const deadline = project.deadline > 0n ? new Date(Number(project.deadline) * 1000) : null;
  const isExpired = deadline ? deadline < new Date() : false;
  const daysLeft = deadline ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

  const displayName = project.metadata?.name || project.tokenName || `Project #${project.id}`;
  const displayImage = project.images?.[0] || project.metadata?.image;
  const displayCategory = project.category || project.metadata?.attributes?.category;
  const displayROI = project.expectedROI || project.metadata?.attributes?.projected_roi;

  return (
    <Link href={`/projects/${project.id}`}>
      <div className={`bg-gray-800 rounded-xl border overflow-hidden transition-all group h-full ${
        isArchived 
          ? 'border-gray-800 opacity-60 hover:opacity-80' 
          : 'border-gray-700 hover:border-gray-600 hover:shadow-lg hover:shadow-blue-500/10'
      }`}>
        {/* Image Header */}
        <div className={`h-40 bg-gradient-to-br from-blue-600/20 to-purple-600/20 relative ${isArchived ? 'grayscale' : ''}`}>
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
              <span className="text-6xl font-bold text-gray-700 group-hover:text-gray-600 transition-colors">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            {isArchived ? (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-700/80 text-gray-400 border border-gray-600">
                📦 Archived
              </span>
            ) : (
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            )}
          </div>

          {/* Chain Badge */}
          <div className="absolute top-3 left-3">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              isTestnet 
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}>
              {chainName}
            </span>
          </div>
        </div>

        <div className="p-5">
          {/* Title & Category */}
          <div className="mb-3">
            <h3 className={`text-lg font-semibold transition-colors truncate ${
              isArchived ? 'text-gray-400' : 'text-white group-hover:text-blue-400'
            }`}>
              {displayName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {project.tokenSymbol && (
                <span className="text-sm text-gray-500">${project.tokenSymbol}</span>
              )}
              {displayCategory && (
                <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">
                  {displayCategory}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-400 text-sm mb-4 line-clamp-2">
            {project.metadata?.description || 'Tokenized real-world asset investment opportunity'}
          </p>

          {/* ROI & Cliff Badges - NEW */}
          {!isArchived && (displayROI || project.cliffPeriod) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {displayROI && displayROI > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-sm text-green-400 font-medium">
                    {displayROI}% ROI
                  </span>
                </div>
              )}
              {project.cliffPeriod && project.cliffPeriod > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <Timer className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-sm text-orange-400 font-medium">
                    {project.cliffPeriod}d cliff
                  </span>
                </div>
              )}
              {project.vestingPeriod && project.vestingPeriod > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-sm text-blue-400 font-medium">
                    {project.vestingPeriod}d vest
                  </span>
                </div>
              )}
              {project.dividendYield && project.dividendYield > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <Percent className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-sm text-purple-400 font-medium">
                    {project.dividendYield}% yield
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Funding Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Raised</span>
              <span className={`font-medium ${isArchived ? 'text-gray-500' : 'text-white'}`}>
                {formatUSDC(project.totalRaised)} 
                <span className="text-gray-500"> / {formatUSD(project.fundingGoal)}</span>
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  isArchived ? 'bg-gray-600' :
                  ['cancelled', 'failed', 'rejected'].includes(project.status) ? 'bg-red-500' : 
                  'bg-gradient-to-r from-blue-500 to-blue-400'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="text-right text-xs text-gray-500 mt-1">
              {isArchived ? 'Refunded' : `${progress.toFixed(1)}% funded`}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-700">
            <div className="text-gray-400 text-sm">
              {isArchived ? 'Archived' : statusConfig.label}
            </div>
            <div className={`text-sm ${
              isArchived ? 'text-gray-500' :
              ['cancelled', 'failed', 'rejected'].includes(project.status) ? 'text-red-400' : 
              !deadline ? 'text-gray-400' :
              isExpired ? 'text-orange-400' : 
              'text-gray-400'
            }`}>
              {isArchived ? 'Closed' : 
               project.status === 'cancelled' ? 'Cancelled' : 
               project.status === 'failed' ? 'Failed' : 
               project.status === 'rejected' ? 'Rejected' :
               !deadline ? 'No deadline' :
               isExpired ? 'Ended' : 
               `${daysLeft} days left`}
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
  const [filter, setFilter] = useState<'all' | 'active' | 'funded' | 'ended' | 'archived'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [cacheHit, setCacheHit] = useState(false);

  // Fetch from API
  const fetchFromAPI = useCallback(async (showLoading: boolean) => {
    if (showLoading) setLoading(true);
    
    try {
      const url = `/api/crowdfunding/projects?status=all${chainId ? `&chainId=${chainId}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();

      if (data.success && data.projects) {
        // Convert and map projects
        const parsedProjects: Project[] = data.projects.map((p: any) => ({
          id: p.id,
          owner: p.owner || '',
          fundingGoal: BigInt(p.fundingGoal || '0'),
          totalRaised: BigInt(p.totalRaised || '0'),
          deadline: BigInt(p.deadline || '0'),
          createdAt: BigInt(p.createdAt || '0'),
          status: p.status || 'draft', // String status from DB
          securityToken: p.securityToken || '',
          escrowVault: p.escrowVault || '',
          metadata: p.metadata,
          tokenName: p.tokenName,
          tokenSymbol: p.tokenSymbol,
          // New fields
          cliffPeriod: p.cliffPeriod || p.cliff_period || p.token_cliff,
          vestingPeriod: p.vestingPeriod || p.vesting_period || p.token_vesting,
          expectedROI: p.expectedROI || p.expected_roi || p.projected_roi,
          dividendYield: p.dividendYield || p.dividend_yield,
          images: p.images || [],
          category: p.category,
        }));

        setProjects(parsedProjects);
        setLastRefresh(Date.now());
        setCacheHit(false);
        
        // Update local cache
        setLocalCache(chainId, parsedProjects);
        
        console.log(`[ProjectsClient] Loaded ${parsedProjects.length} projects from database`);
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

    // Try local cache first for instant loading
    if (!forceRefresh) {
      const localCache = getLocalCache(chainId);
      if (isLocalCacheValid(localCache)) {
        console.log('[ProjectsClient] Using local cache');
        setProjects(localCache!.projects);
        setLastRefresh(localCache!.timestamp);
        setLoading(false);
        setCacheHit(true);
        
        // Still fetch from API in background to update
        fetchFromAPI(false);
        return;
      }
    }

    await fetchFromAPI(true);
  }, [chainId, isDeployed, fetchFromAPI]);

  // Load on mount and chain change
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Reset page on filter/search/sort change
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

  const archivedCount = projects.filter(isProjectArchived).length;

  // Filter and sort
  const filteredProjects = useMemo(() => {
    let result = projects.filter((p) => {
      const isArchived = isProjectArchived(p);
      
      // Status-based filters using string statuses
      if (filter === 'active' && p.status !== 'active') return false;
      if (filter === 'funded' && p.status !== 'funded') return false;
      if (filter === 'ended') {
        if (!['completed', 'cancelled', 'failed'].includes(p.status)) return false;
        if (isArchived) return false;
      }
      if (filter === 'archived' && !isArchived) return false;
      if (filter === 'all' && isArchived) return false;

      // Search filter
      if (search) {
        const s = search.toLowerCase();
        const matches = 
          p.metadata?.name?.toLowerCase().includes(s) ||
          p.tokenSymbol?.toLowerCase().includes(s) ||
          p.tokenName?.toLowerCase().includes(s) ||
          p.metadata?.description?.toLowerCase().includes(s) ||
          p.category?.toLowerCase().includes(s) ||
          `project #${p.id}`.includes(s);
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

  const formatLastRefresh = () => {
    if (!lastRefresh) return '';
    const seconds = Math.floor((Date.now() - lastRefresh) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  // Network not supported
  if (!isDeployed) {
    return (
      <div className="min-h-screen bg-gray-900">
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🌐</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Network Not Supported</h2>
            <p className="text-gray-400 mb-6">
              Projects are not available on {chainName}. Please switch to a supported network.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {deployedChains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => handleSwitchNetwork(chain.id)}
                  disabled={isSwitching}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors"
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
    <div className="min-h-screen bg-gray-900">
      {/* Network Banner */}
      <div className={`border-b ${isTestnet ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-yellow-400' : 'bg-green-400'}`} />
            <span className={`text-sm font-medium ${isTestnet ? 'text-yellow-400' : 'text-green-400'}`}>
              {chainName} {isTestnet && '(Testnet)'}
            </span>
          </div>
          {contracts?.RWAProjectNFT && (
            <a
              href={`${explorerUrl}/address/${contracts.RWAProjectNFT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white text-sm transition flex items-center gap-1"
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
        <div className="bg-orange-500/10 border-b border-orange-500/30">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-orange-400 text-sm">⚠️ Your wallet is on a different network</span>
            <button
              onClick={() => handleSwitchNetwork(chainId)}
              disabled={isSwitching}
              className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 rounded-lg text-white text-sm font-medium"
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
            <h1 className="text-3xl font-bold text-white mb-2">Investment Opportunities</h1>
            <p className="text-gray-400">Discover tokenized real-world assets on {chainName}</p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg font-medium transition-colors"
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
              {lastRefresh && <span className="text-xs text-gray-400">{formatLastRefresh()}</span>}
            </button>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Project
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <SortDropdown value={sortBy} onChange={setSortBy} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-500 text-sm mr-2">Filter:</span>
              {(['all', 'active', 'funded', 'ended'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    filter === f ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              {archivedCount > 0 && (
                <button
                  onClick={() => setFilter('archived')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    filter === 'archived' ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                  }`}
                >
                  📦 Archived ({archivedCount})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <p className="text-gray-400">
            {filteredProjects.length > PROJECTS_PER_PAGE ? (
              <>Showing {((currentPage - 1) * PROJECTS_PER_PAGE) + 1}-{Math.min(currentPage * PROJECTS_PER_PAGE, filteredProjects.length)} of {filteredProjects.length} projects</>
            ) : (
              <>Showing {filteredProjects.length} projects on {chainName}</>
            )}
          </p>
          {totalPages > 1 && <p className="text-gray-500 text-sm">Page {currentPage} of {totalPages}</p>}
        </div>

        {/* Loading */}
        {loading && projects.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
              <p className="mt-4 text-gray-400">Loading projects...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
            <div className="text-red-400 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Error Loading Projects</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <button onClick={handleRefresh} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredProjects.length === 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-white mb-2">No Projects Found</h2>
            <p className="text-gray-400 mb-6">
              {projects.length === 0 ? 'Be the first to create a project!' : 'Try adjusting your filters.'}
            </p>
            {projects.length === 0 && (
              <Link href="/create" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                Create First Project
              </Link>
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
