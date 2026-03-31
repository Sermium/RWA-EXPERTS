// src/app/admin/AdminClient.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient } from 'wagmi';
import { Address, formatUnits } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import { RWAProjectNFTABI, RWAEscrowVaultABI } from '@/config/abis';
import { Project, AdminTab, KYCStats, TokenizationStats, TradeStats, DisputeStats } from './constants';
import { convertIPFSUrl } from './helpers';
import AdminDocs from '@/components/admin/AdminDocs';
import {
  Rocket, FileText, LayoutDashboard,
  FolderKanban,
  CreditCard,
  UserCheck,
  FileCode,
  Factory,
  Settings,
  Loader2,
  Wallet,
  Shield,
  Coins,
  Users,
  Ship,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
  ArrowRightLeft,
  ExternalLink,
  Globe,
  Book,
  Download,
  CheckCircle,
  ChevronDown,
} from 'lucide-react';

// Import all tab components
import { AdminOverview, PlatformContracts } from '@/components/admin';
import KYCManagement from './kyc/KYCManagement';
import OffChainPayments from './offchain/OffChainPayments';
import FactorySettings from './settings/FactorySettings';
import PlatformSettings from './settings/PlatformSettings';
import TokenizationManagement from './tokenization/TokenizationManagement';
import TradeManagement from './trade/TradeManagement';
import DisputeManagement from './trade/DisputeManagement';
import AdminUsersManagement from './users/AdminUsersManagement';
import { SupportedChainId } from '@/config/chains';
import CrowdfundingReviewPanel from './crowdfunding/CrowdfundingReviewPanel';
import BlogManagement from './blog/BlogManagement';
import FundraisingManagement from './fundraising/FundraisingManagement';

// ============================================================================
// CONSTANTS
// ============================================================================

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Tab structure with submenus
interface TabItem {
  id: AdminTab;
  label: string;
  icon: React.ReactNode;
  children?: { id: AdminTab; label: string; icon: React.ReactNode }[];
}

const tabs: TabItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { 
    id: 'crowdfunding', 
    label: 'Projects', 
    icon: <FolderKanban className="w-4 h-4" />,
    children: [
      { id: 'crowdfunding', label: 'Crowdfunding', icon: <Coins className="w-4 h-4" /> },
      { id: 'tokenization', label: 'Tokenization', icon: <Coins className="w-4 h-4" /> },
      { id: 'trade', label: 'Trade', icon: <Ship className="w-4 h-4" /> },
    ]
  },
  { 
    id: 'fundraising', 
    label: 'Fundraising', 
    icon: <Rocket className="w-4 h-4" />,
    children: [
      { id: 'fundraising', label: 'Rounds', icon: <Rocket className="w-4 h-4" /> },
      { id: 'allocations', label: 'Allocations', icon: <Coins className="w-4 h-4" /> },
    ]
  },
  { id: 'disputes', label: 'Disputes', icon: <AlertTriangle className="w-4 h-4" /> },
  { 
    id: 'contracts', 
    label: 'Infrastructure', 
    icon: <FileCode className="w-4 h-4" />,
    children: [
      { id: 'contracts', label: 'Contracts', icon: <FileCode className="w-4 h-4" /> },
      { id: 'factory', label: 'Factory', icon: <Factory className="w-4 h-4" /> },
      { id: 'offchain', label: 'Off-Chain', icon: <CreditCard className="w-4 h-4" /> },
    ]
  },
  { 
    id: 'users', 
    label: 'Users', 
    icon: <Users className="w-4 h-4" />,
    children: [
      { id: 'users', label: 'Management', icon: <Users className="w-4 h-4" /> },
      { id: 'kyc', label: 'KYC', icon: <UserCheck className="w-4 h-4" /> },
    ]
  },
  { 
    id: 'blog', 
    label: 'Content', 
    icon: <FileText className="w-4 h-4" />,
    children: [
      { id: 'blog', label: 'Blog', icon: <FileText className="w-4 h-4" /> },
      { id: 'docs', label: 'Docs', icon: <Book className="w-4 h-4" /> },
    ]
  },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

// Default stats
const DEFAULT_KYC_STATS: KYCStats = { total: 0, pending: 0, approved: 0, rejected: 0 };
const DEFAULT_TOKENIZATION_STATS: TokenizationStats = { total: 0, pending: 0, approved: 0, inProgress: 0, completed: 0 };
const DEFAULT_TRADE_STATS: TradeStats = { 
  totalDeals: 0, activeDeals: 0, completedDeals: 0, disputedDeals: 0, 
  totalVolume: 0, pendingVolume: 0, inEscrow: 0, averageDealSize: 0 
};
const DEFAULT_DISPUTE_STATS: DisputeStats = { 
  total: 0, pending: 0, inMediation: 0, inArbitration: 0, resolved: 0, 
  totalValue: 0, valueAtRisk: 0, avgResolutionTime: 0 
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface NetworkBadgeProps {
  chainName: string;
  isTestnet: boolean;
  isConnected?: boolean;
}

function NetworkBadge({ chainName, isTestnet, isConnected = true }: NetworkBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
      isConnected 
        ? isTestnet 
          ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
          : 'bg-green-500/20 border border-green-500/30 text-green-400'
        : 'bg-red-500/20 border border-red-500/30 text-red-400'
    }`}>
      {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
      <span>{chainName}</span>
      {isTestnet && isConnected && (
        <span className="px-1.5 py-0.5 text-xs bg-yellow-500/30 rounded text-yellow-300">Testnet</span>
      )}
    </div>
  );
}

interface NetworkSwitcherProps {
  currentChainId: number | undefined;
  deployedChains: Array<{ id: number; name: string; isTestnet: boolean }>;
  isSwitching: boolean;
  onSwitch: (chainId: number) => void;
}

function NetworkSwitcher({ currentChainId, deployedChains, isSwitching, onSwitch }: NetworkSwitcherProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (deployedChains.length <= 1) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
      >
        <ArrowRightLeft className="w-4 h-4" />
        <span>Switch Network</span>
        {isSwitching && <Loader2 className="w-3 h-3 animate-spin" />}
      </button>
      
      {isExpanded && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsExpanded(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-2">
              <p className="text-xs text-gray-400 px-2 py-1 mb-1">Select Network</p>
              {deployedChains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => {
                    onSwitch(chain.id);
                    setIsExpanded(false);
                  }}
                  disabled={chain.id === currentChainId || isSwitching}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    chain.id === currentChainId
                      ? 'bg-blue-600/20 text-blue-400 cursor-default'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  } disabled:opacity-50`}
                >
                  <span className="flex items-center gap-2">
                    {chain.id === currentChainId && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                    {chain.name}
                  </span>
                  {chain.isTestnet && <span className="text-xs text-yellow-400 opacity-70">Test</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface QuickStatCardProps {
  label: string;
  value: string | number;
  onClick: () => void;
  color: string;
  hoverBorder: string;
}

function QuickStatCard({ label, value, onClick, color, hoverBorder }: QuickStatCardProps) {
  return (
    <button 
      onClick={onClick} 
      className={`bg-gray-800 border border-gray-700 rounded-lg p-4 text-left ${hoverBorder} transition-all hover:shadow-lg`}
    >
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </button>
  );
}

// Admin Tab Menu with Fixed Position Dropdowns
interface AdminTabMenuProps {
  tabs: TabItem[];
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  crowdfundingPending?: number;
}

function AdminTabMenu({ tabs, activeTab, setActiveTab, crowdfundingPending = 0 }: AdminTabMenuProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => setOpenMenu(null);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isChildActive = (tab: TabItem) => tab.children?.some(child => child.id === activeTab);

  const getGroupPendingCount = (tab: TabItem): number => {
    if (tab.children?.some(child => child.id === 'crowdfunding')) return crowdfundingPending;
    return 0;
  };

  const handleMenuOpen = (tabLabel: string) => {
    if (openMenu === tabLabel) {
      setOpenMenu(null);
      return;
    }
    
    const button = buttonRefs.current[tabLabel];
    if (button) {
      const rect = button.getBoundingClientRect();
      setMenuPosition({ top: rect.bottom + 4, left: rect.left });
    }
    setOpenMenu(tabLabel);
  };

  return (
    <>
      <div ref={menuRef} className="flex flex-wrap gap-1.5 mb-6 pb-2">
        {tabs.map(tab => (
          <div key={tab.label}>
            {tab.children ? (
              <button
                ref={(el) => { buttonRefs.current[tab.label] = el; }}
                onClick={() => handleMenuOpen(tab.label)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 relative ${
                  isChildActive(tab) || openMenu === tab.label
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${openMenu === tab.label ? 'rotate-180' : ''}`} />
                {getGroupPendingCount(tab) > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {getGroupPendingCount(tab)}
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Fixed position dropdown portal */}
      {openMenu && (
        <div
          className="fixed w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl overflow-hidden"
          style={{ top: menuPosition.top, left: menuPosition.left, zIndex: 99999 }}
        >
          {tabs.find(t => t.label === openMenu)?.children?.map(child => (
            <button
              key={child.id}
              onClick={() => {
                setActiveTab(child.id);
                setOpenMenu(null);
              }}
              className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2 transition-colors ${
                activeTab === child.id
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {child.icon}
              {child.label}
              {child.id === 'crowdfunding' && crowdfundingPending > 0 && (
                <span className="ml-auto px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {crowdfundingPending}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminClient() {
  const { isConnected, address } = useAccount();
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

  const projectNFTAddress = contracts?.RWAProjectNFT as Address | undefined;

  // State
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [kycStats, setKycStats] = useState<KYCStats>(DEFAULT_KYC_STATS);
  const [tokenizationStats, setTokenizationStats] = useState<TokenizationStats>(DEFAULT_TOKENIZATION_STATS);
  const [tradeStats, setTradeStats] = useState<TradeStats>(DEFAULT_TRADE_STATS);
  const [disputeStats, setDisputeStats] = useState<DisputeStats>(DEFAULT_DISPUTE_STATS);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [crowdfundingStats, setCrowdfundingStats] = useState({ total: 0, pendingReview: 0, approved: 0, rejected: 0 });
  
  // Allocations state
  const [allocations, setAllocations] = useState<any[]>([]);
  const [allocationStats, setAllocationStats] = useState({
    totalAllocations: 0,
    totalTokens: 0,
    totalValue: 0,
    byStatus: { pending: 0, confirmed: 0, distributed: 0 }
  });
  const [allocationFilters, setAllocationFilters] = useState({ status: '', type: '' });
  const [selectedAllocations, setSelectedAllocations] = useState<string[]>([]);
  const [isDistributing, setIsDistributing] = useState(false);

  // Check admin status
  const checkAdminStatus = useCallback(async () => {
    if (!address) {
      setIsAdmin(false);
      setCheckingAdmin(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/check', {
        headers: { 
          'x-wallet-address': address,
          'x-chain-id': chainId?.toString() || ''
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  }, [address, chainId]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  // Fetch allocations
  const fetchAllocations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (allocationFilters.status) params.append('status', allocationFilters.status);
      if (allocationFilters.type) params.append('type', allocationFilters.type);
      
      const res = await fetch(`/api/admin/allocations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAllocations(data.allocations || []);
        if (data.stats) setAllocationStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching allocations:', error);
    }
  }, [allocationFilters]);

  useEffect(() => {
    if (activeTab === 'allocations' && isAdmin) {
      fetchAllocations();
    }
  }, [activeTab, allocationFilters, fetchAllocations, isAdmin]);

  const fetchProjects = useCallback(async () => {
    if (!publicClient || !projectNFTAddress) {
      setProjects([]);
      return;
    }

    try {
      const totalProjects = await publicClient.readContract({
        address: projectNFTAddress,
        abi: RWAProjectNFTABI,
        functionName: 'totalProjects',
      }) as bigint;

      const projectPromises = [];
      for (let i = 0; i < Number(totalProjects); i++) {
        projectPromises.push(
          publicClient.readContract({
            address: projectNFTAddress,
            abi: RWAProjectNFTABI,
            functionName: 'getProject',
            args: [BigInt(i)],
          }).catch(() => null)
        );
      }

      const projectData = await Promise.all(projectPromises);
      const formattedProjects: Project[] = [];

      for (let index = 0; index < projectData.length; index++) {
        const data = projectData[index];
        if (!data) continue;
        
        const project = data as any;
        if (!project.owner || project.owner === ZERO_ADDRESS) continue;

        const projectId = project.id !== undefined ? Number(project.id) : index;
        let name = `Project #${projectId}`;
        let refundsEnabled = false;

        if (project.metadataURI) {
          try {
            const metadataUrl = convertIPFSUrl(project.metadataURI);
            const response = await fetch(metadataUrl);
            const metadata = await response.json();
            name = metadata.name || name;
          } catch (e) {}
        }

        if (project.escrowVault && project.escrowVault !== ZERO_ADDRESS && !isNaN(projectId)) {
          try {
            const fundingData = await publicClient.readContract({
              address: project.escrowVault as Address,
              abi: RWAEscrowVaultABI,
              functionName: 'getProjectFunding',
              args: [BigInt(projectId)],
            });
            refundsEnabled = (fundingData as any)?.refundsEnabled ?? false;
          } catch (e) {}
        }

        formattedProjects.push({
          id: projectId,
          owner: project.owner,
          metadataURI: project.metadataURI || '',
          fundingGoal: project.fundingGoal || BigInt(0),
          totalRaised: project.totalRaised || BigInt(0),
          minInvestment: project.minInvestment || BigInt(0),
          maxInvestment: project.maxInvestment || BigInt(0),
          deadline: project.deadline || BigInt(0),
          status: project.status ?? 0,
          securityToken: project.securityToken || ZERO_ADDRESS,
          escrowVault: project.escrowVault || ZERO_ADDRESS,
          createdAt: project.createdAt || BigInt(0),
          completedAt: project.completedAt || BigInt(0),
          transferable: project.transferable ?? false,
          name,
          refundsEnabled,
        });
      }

      setProjects(formattedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    }
  }, [publicClient, projectNFTAddress]);

  const fetchKYCStats = useCallback(async () => {
    if (!address) return;
    try {
      const response = await fetch('/api/admin/kyc/stats', {
        headers: { 'x-wallet-address': address, 'x-chain-id': chainId?.toString() || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setKycStats({ total: data.total || 0, pending: data.pending || 0, approved: data.approved || 0, rejected: data.rejected || 0 });
      }
    } catch (error) {
      console.error('Error fetching KYC stats:', error);
    }
  }, [address, chainId]);

  const fetchTokenizationStats = useCallback(async () => {
    if (!address) return;
    try {
      const response = await fetch('/api/admin/tokenization/stats', {
        headers: { 'x-wallet-address': address, 'x-chain-id': chainId?.toString() || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setTokenizationStats({ total: data.total || 0, pending: data.pending || 0, approved: data.approved || 0, inProgress: data.inProgress || 0, completed: data.completed || 0 });
      }
    } catch (error) {
      console.error('Error fetching tokenization stats:', error);
    }
  }, [address, chainId]);

  const fetchTradeStats = useCallback(async () => {
    if (!address) return;
    try {
      const response = await fetch('/api/admin/trade/stats', {
        headers: { 'x-wallet-address': address, 'x-chain-id': chainId?.toString() || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setTradeStats({
          totalDeals: data.totalDeals || data.total || 0,
          activeDeals: data.activeDeals || data.active || 0,
          completedDeals: data.completedDeals || data.completed || 0,
          disputedDeals: data.disputedDeals || data.disputed || 0,
          totalVolume: data.totalVolume || 0,
          pendingVolume: data.pendingVolume || 0,
          inEscrow: data.inEscrow || 0,
          averageDealSize: data.averageDealSize || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching trade stats:', error);
    }
  }, [address, chainId]);

  const fetchDisputeStats = useCallback(async () => {
    if (!address) return;
    try {
      const response = await fetch('/api/admin/trade/disputes/stats', {
        headers: { 'x-wallet-address': address, 'x-chain-id': chainId?.toString() || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setDisputeStats({
          total: data.total || 0,
          pending: data.pending || 0,
          inMediation: data.inMediation || 0,
          inArbitration: data.inArbitration || 0,
          resolved: data.resolved || 0,
          totalValue: data.totalValue || 0,
          valueAtRisk: data.valueAtRisk || 0,
          avgResolutionTime: data.avgResolutionTime || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dispute stats:', error);
    }
  }, [address, chainId]);

  const fetchCrowdfundingStats = useCallback(async () => {
    try {
      const response = await fetch('/api/crowdfunding/admin/list?status=all&limit=1000');
      if (response.ok) {
        const data = await response.json();
        const applications = data.applications || [];
        setCrowdfundingStats({
          total: applications.length,
          pendingReview: applications.filter((a: any) => a.status === 'pending_review').length,
          approved: applications.filter((a: any) => a.status === 'approved').length,
          rejected: applications.filter((a: any) => a.status === 'rejected').length,
        });
      }
    } catch (error) {
      console.error('Error fetching crowdfunding stats:', error);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchProjects(), 
      fetchKYCStats(), 
      fetchTokenizationStats(),
      fetchTradeStats(),
      fetchDisputeStats(),
      fetchCrowdfundingStats(),
    ]);
    setLastRefresh(new Date());
    setLoading(false);
  }, [fetchProjects, fetchKYCStats, fetchTokenizationStats, fetchTradeStats, fetchDisputeStats, fetchCrowdfundingStats]);

  useEffect(() => {
    if (isAdmin) refreshAll();
  }, [isAdmin, chainId]);

  const formatVolume = (volume: number): string => {
    if (volume >= 1_000_000_000) return `$${(volume / 1_000_000_000).toFixed(1)}B`;
    if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
    if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  const handleMarkDistributed = async () => {
    if (selectedAllocations.length === 0) return;
    setIsDistributing(true);
    const txHash = prompt('Enter transaction hash (optional):');
    try {
      const response = await fetch('/api/admin/allocations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocationIds: selectedAllocations, status: 'distributed', txHash: txHash || undefined })
      });
      if (response.ok) {
        fetchAllocations();
        setSelectedAllocations([]);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to update allocations'}`);
      }
    } catch (e) {
      console.error('Error marking distributed:', e);
      alert('Failed to update allocations');
    }
    setIsDistributing(false);
  };

  const handleExportCSV = () => {
    const headers = 'wallet,tokens,type,status,round,value_usd,created_at';
    const csv = allocations.map(a => 
      `${a.wallet_address},${a.token_amount},${a.allocation_type},${a.status},${a.fundraising_rounds?.display_name || ''},${a.usd_value || 0},${a.created_at}`
    ).join('\n');
    const blob = new Blob([`${headers}\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `allocations-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
            <p className="text-gray-400">Please connect your wallet to access the admin panel.</p>
          </div>
        </div>
      </div>
    );
  }

  // Checking admin
  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold text-white mb-2">Verifying Access</h2>
            <p className="text-gray-400">Checking admin permissions on {chainName}...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
            <p className="text-gray-400 mb-4">You don&apos;t have permission to access the admin panel on {chainName}.</p>
            <p className="text-gray-500 text-sm font-mono mb-4">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
            
            {deployedChains.length > 1 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-3">Try a different network:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {deployedChains.filter(chain => chain.id !== chainId).map(chain => (
                    <button
                      key={chain.id}
                      onClick={() => switchToChain(chain.id)}
                      disabled={isSwitching}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                      {chain.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render allocations tab
  const renderAllocationsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Total Tokens</div>
          <div className="text-2xl font-bold text-white">{allocationStats.totalTokens.toLocaleString()}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Total Value</div>
          <div className="text-2xl font-bold text-green-400">${allocationStats.totalValue.toLocaleString()}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Confirmed</div>
          <div className="text-2xl font-bold text-blue-400">{allocationStats.byStatus.confirmed.toLocaleString()}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Pending</div>
          <div className="text-2xl font-bold text-yellow-400">{allocationStats.byStatus.pending.toLocaleString()}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <select
            value={allocationFilters.status}
            onChange={(e) => setAllocationFilters(f => ({ ...f, status: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="distributed">Distributed</option>
          </select>
          <select
            value={allocationFilters.type}
            onChange={(e) => setAllocationFilters(f => ({ ...f, type: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">All Types</option>
            <option value="purchase">Purchase</option>
            <option value="referral_bonus">Referral Bonus</option>
          </select>
          <button onClick={fetchAllocations} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm flex items-center gap-2 text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm flex items-center gap-2 text-white">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          {selectedAllocations.length > 0 && (
            <button
              onClick={handleMarkDistributed}
              disabled={isDistributing}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm flex items-center gap-2 text-white disabled:opacity-50"
            >
              {isDistributing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Mark {selectedAllocations.length} Distributed
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedAllocations.length === allocations.length && allocations.length > 0}
                    onChange={(e) => setSelectedAllocations(e.target.checked ? allocations.map(a => a.id) : [])}
                    className="rounded border-gray-600 bg-gray-700"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm text-gray-400 font-medium">Wallet</th>
                <th className="px-4 py-3 text-left text-sm text-gray-400 font-medium">Round</th>
                <th className="px-4 py-3 text-left text-sm text-gray-400 font-medium">Type</th>
                <th className="px-4 py-3 text-right text-sm text-gray-400 font-medium">Tokens</th>
                <th className="px-4 py-3 text-right text-sm text-gray-400 font-medium">Value</th>
                <th className="px-4 py-3 text-center text-sm text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {allocations.map((alloc) => (
                <tr key={alloc.id} className="hover:bg-gray-750">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedAllocations.includes(alloc.id)}
                      onChange={(e) => setSelectedAllocations(e.target.checked 
                        ? [...selectedAllocations, alloc.id] 
                        : selectedAllocations.filter(id => id !== alloc.id)
                      )}
                      className="rounded border-gray-600 bg-gray-700"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-white">
                      {alloc.wallet_address?.slice(0, 6)}...{alloc.wallet_address?.slice(-4)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{alloc.fundraising_rounds?.display_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      alloc.allocation_type === 'purchase' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {alloc.allocation_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white">{parseFloat(alloc.token_amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-400">${parseFloat(alloc.usd_value || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      alloc.status === 'distributed' ? 'bg-green-500/20 text-green-400' :
                      alloc.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {alloc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {allocations.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Coins className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No allocations found</p>
            <p className="text-sm mt-1">Token allocations will appear here after investments are confirmed</p>
          </div>
        )}
      </div>
    </div>
  );

  // Render tab content
  const renderTabContent = () => {
    if (loading && activeTab !== 'allocations') {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <span className="text-gray-400">Loading data from {chainName}...</span>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <AdminOverview projects={projects} kycStats={kycStats} tokenizationStats={tokenizationStats} tradeStats={tradeStats} disputeStats={disputeStats} setActiveTab={setActiveTab} chainName={chainName} explorerUrl={explorerUrl} />;
      case 'crowdfunding':
        return <CrowdfundingReviewPanel onRefresh={refreshAll} />;
      case 'allocations':
        return renderAllocationsTab();
      case 'tokenization':
        return <TokenizationManagement onRefresh={fetchTokenizationStats} />;
      case 'trade':
        return <TradeManagement onRefresh={fetchTradeStats} />;
      case 'disputes':
        return <DisputeManagement onRefresh={fetchDisputeStats} />;
      case 'offchain':
        return <OffChainPayments projects={projects} onRefresh={fetchProjects} />;
      case 'kyc':
        return <KYCManagement />;
      case 'contracts':
        return <PlatformContracts />;
      case 'factory':
        return <FactorySettings />;
      case 'users':
        return <AdminUsersManagement />;
      case 'settings':
        return <PlatformSettings />;
      case 'fundraising':
        return <FundraisingManagement />;
      case 'blog':
        return <BlogManagement />;
      case 'docs':
        return <AdminDocs />;
      default:
        return <AdminOverview projects={projects} kycStats={kycStats} tokenizationStats={tokenizationStats} tradeStats={tradeStats} disputeStats={disputeStats} setActiveTab={setActiveTab} chainName={chainName} explorerUrl={explorerUrl} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
                <p className="text-gray-400">Manage projects, tokenization, trade, KYC, and platform settings</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <NetworkBadge chainName={chainName} isTestnet={isTestnet} />
              <NetworkSwitcher
                currentChainId={chainId}
                deployedChains={deployedChains.map(chain => ({ id: chain.id, name: chain.name, isTestnet: chain.testnet ?? false }))}
                isSwitching={isSwitching}
                onSwitch={(id) => switchToChain(id as SupportedChainId)}
              />
              <button onClick={refreshAll} disabled={loading} className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50" title="Refresh all data">
                <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          {lastRefresh && (
            <p className="text-xs text-gray-500 mt-2">Last updated: {lastRefresh.toLocaleTimeString()} on {chainName}</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <QuickStatCard label="Crowdfunding" value={crowdfundingStats.pendingReview > 0 ? `${crowdfundingStats.pendingReview} pending` : crowdfundingStats.total} onClick={() => setActiveTab('crowdfunding')} color={crowdfundingStats.pendingReview > 0 ? "text-yellow-400" : "text-white"} hoverBorder="hover:border-blue-500/50" />
          <QuickStatCard label="Pending KYC" value={kycStats.pending} onClick={() => setActiveTab('kyc')} color="text-yellow-400" hoverBorder="hover:border-yellow-500/50" />
          <QuickStatCard label="Token Requests" value={tokenizationStats.pending} onClick={() => setActiveTab('tokenization')} color="text-purple-400" hoverBorder="hover:border-purple-500/50" />
          <QuickStatCard label="Active Trades" value={tradeStats.activeDeals} onClick={() => setActiveTab('trade')} color="text-cyan-400" hoverBorder="hover:border-cyan-500/50" />
          <QuickStatCard label="Open Disputes" value={disputeStats.pending + disputeStats.inMediation} onClick={() => setActiveTab('disputes')} color="text-red-400" hoverBorder="hover:border-red-500/50" />
          <QuickStatCard label="Trade Volume" value={formatVolume(tradeStats.totalVolume)} onClick={() => setActiveTab('trade')} color="text-green-400" hoverBorder="hover:border-green-500/50" />
        </div>

        {/* Network Warning */}
        {!projectNFTAddress && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-400 font-medium">Limited functionality on {chainName}</p>
                <p className="text-yellow-300/70 text-sm mt-1">Some contracts are not deployed on this network.</p>
                {deployedChains.length > 1 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {deployedChains.filter(chain => chain.id !== chainId).slice(0, 3).map(chain => (
                      <button key={chain.id} onClick={() => switchToChain(chain.id)} className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm rounded-lg transition-colors">
                        Switch to {chain.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <AdminTabMenu tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} crowdfundingPending={crowdfundingStats.pendingReview} />

        {/* Content */}
        <div className="relative">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-gray-700/50">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2"><Globe className="w-4 h-4" />{chainName}</span>
              <span>•</span>
              <span>Chain ID: {chainId}</span>
              <span>•</span>
              <span>Currency: {nativeCurrency || 'ETH'}</span>
              {isTestnet && (<><span>•</span><span className="text-yellow-400">Testnet</span></>)}
            </div>
            <div className="flex items-center gap-4">
              <Link href="/admin/docs" className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300">
                <Book className="w-4 h-4" />Admin Docs
              </Link>
              {explorerUrl && (
                <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                  Explorer<ExternalLink className="w-3 h-3" />
                </a>
              )}
              <span className="text-gray-500">Admin: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
