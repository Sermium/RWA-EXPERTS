'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  Target, 
  TrendingUp, 
  Calendar,
  FileText,
  PlayCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Share2,
  Heart,
  DollarSign,
  Percent,
  Timer,
  Milestone,
  Shield,
  Globe,
  Building,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';

// Status mapping for database statuses
const DB_STATUS_MAP: Record<string, { label: string; color: string; bgColor: string; textColor: string }> = {
  'draft': { label: 'Draft', color: 'gray', bgColor: 'bg-gray-500/20', textColor: 'text-gray-400' },
  'pending_review': { label: 'Pending Review', color: 'yellow', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400' },
  'pending_payment': { label: 'Pending Payment', color: 'orange', bgColor: 'bg-orange-500/20', textColor: 'text-orange-400' },
  'approved': { label: 'Approved', color: 'green', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
  'active': { label: 'Active Raise', color: 'blue', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  'funded': { label: 'Funded', color: 'emerald', bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400' },
  'completed': { label: 'Completed', color: 'green', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
  'rejected': { label: 'Rejected', color: 'red', bgColor: 'bg-red-500/20', textColor: 'text-red-400' },
  'cancelled': { label: 'Cancelled', color: 'gray', bgColor: 'bg-gray-500/20', textColor: 'text-gray-400' },
};

// Chain info helper
const CHAIN_INFO: Record<number, { name: string; symbol: string; explorer: string }> = {
  1: { name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io' },
  137: { name: 'Polygon', symbol: 'POL', explorer: 'https://polygonscan.com' },
  43114: { name: 'Avalanche', symbol: 'AVAX', explorer: 'https://snowtrace.io' },
  56: { name: 'BNB Chain', symbol: 'BNB', explorer: 'https://bscscan.com' },
  25: { name: 'Cronos', symbol: 'CRO', explorer: 'https://cronoscan.com' },
  11155111: { name: 'Sepolia', symbol: 'ETH', explorer: 'https://sepolia.etherscan.io' },
  43113: { name: 'Fuji', symbol: 'AVAX', explorer: 'https://testnet.snowtrace.io' },
};

interface ProjectData {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  category: string;
  status: string;
  statusInfo: { label: string; color: string; bgColor: string; textColor: string };
  fundingGoal: number;
  totalRaised: number;
  minInvestment: number;
  maxInvestment: number;
  deadline: Date | null;
  createdAt: Date;
  owner: string;
  chainId: number;
  // Token info
  tokenName: string;
  tokenSymbol: string;
  tokenSupply: number;
  tokenPrice: number;
  // Vesting/ROI
  cliffPeriod?: number; // in days
  vestingPeriod?: number; // in days
  expectedROI?: number; // percentage
  dividendYield?: number; // percentage
  // Media
  images: string[];
  documents: { name: string; url: string; type: string }[];
  videoUrl?: string;
  pitchDeckUrl?: string;
  // Contract addresses (if deployed)
  escrowAddress?: string;
  tokenAddress?: string;
  nftAddress?: string;
  // Milestones
  milestones: {
    title: string;
    description: string;
    targetDate: string;
    fundingPercentage: number;
    status: 'pending' | 'in_progress' | 'completed';
  }[];
  // Additional info
  teamMembers?: { name: string; role: string; image?: string }[];
  socialLinks?: { platform: string; url: string }[];
  legalEntity?: string;
  jurisdiction?: string;
  investorCount?: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string | null): string {
  if (!date) return 'TBD';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calculateDaysLeft(deadline: Date | null): number {
  if (!deadline) return 0;
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function calculateProgress(raised: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, (raised / goal) * 100);
}

function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Copy button component
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} className="p-1 hover:bg-gray-700 rounded">
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
    </button>
  );
}

// Milestone component
function MilestoneCard({ milestone, index }: { milestone: ProjectData['milestones'][0]; index: number }) {
  const statusColors = {
    pending: 'bg-gray-500',
    in_progress: 'bg-blue-500',
    completed: 'bg-green-500',
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${statusColors[milestone.status]} flex items-center justify-center text-white font-bold text-sm`}>
          {index + 1}
        </div>
        {index < 3 && <div className="w-0.5 h-full bg-gray-700 mt-2" />}
      </div>
      <div className="flex-1 pb-6">
        <h4 className="text-white font-medium">{milestone.title}</h4>
        <p className="text-gray-400 text-sm mt-1">{milestone.description}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(milestone.targetDate)}
          </span>
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            {milestone.fundingPercentage}% of funds
          </span>
        </div>
      </div>
    </div>
  );
}

function ProjectPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params?.id as string;
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'documents' | 'team'>('overview');
  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const [investAmount, setInvestAmount] = useState('');
  const [isInvesting, setIsInvesting] = useState(false);

  const fetchProject = useCallback(async () => {
    if (!projectId) {
      setError('No project ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch from database API
      const response = await fetch(`/api/crowdfunding/applications/${projectId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Project not found');
        } else {
          setError('Failed to load project');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (!data.success || !data.application) {
        setError('Project not found');
        setLoading(false);
        return;
      }

      const app = data.application;

      // Calculate token price from funding goal and supply
      const tokenPrice = app.token_supply > 0 ? app.funding_goal / app.token_supply : 0;

      // Map database application to project format
      setProject({
        id: app.id,
        name: app.project_name || app.name,
        description: app.description || '',
        shortDescription: app.short_description || app.description?.substring(0, 200),
        category: app.category || 'Other',
        status: app.status,
        statusInfo: DB_STATUS_MAP[app.status] || { label: app.status, color: 'gray', bgColor: 'bg-gray-500/20', textColor: 'text-gray-400' },
        fundingGoal: parseFloat(app.funding_goal) || 0,
        totalRaised: parseFloat(app.total_raised) || 0,
        minInvestment: parseFloat(app.min_investment) || 100,
        maxInvestment: parseFloat(app.max_investment) || 100000,
        deadline: app.deadline ? new Date(app.deadline) : null,
        createdAt: new Date(app.created_at),
        owner: app.wallet_address || '',
        chainId: app.chain_id || 1,
        // Token info
        tokenName: app.token_name || app.project_name,
        tokenSymbol: app.token_symbol || 'TKN',
        tokenSupply: parseFloat(app.token_supply) || 0,
        tokenPrice: tokenPrice,
        // Vesting/ROI
        cliffPeriod: app.cliff_period || app.token_cliff || 0,
        vestingPeriod: app.vesting_period || app.token_vesting || 0,
        expectedROI: app.expected_roi || app.projected_roi || 0,
        dividendYield: app.dividend_yield || 0,
        // Media
        images: app.images || app.media_urls || [],
        documents: app.documents || [],
        videoUrl: app.video_url,
        pitchDeckUrl: app.pitch_deck_url,
        // Contract addresses
        escrowAddress: app.escrow_address,
        tokenAddress: app.token_address,
        nftAddress: app.nft_address,
        // Milestones
        milestones: app.milestones || [],
        // Additional
        teamMembers: app.team_members || [],
        socialLinks: app.social_links || [],
        legalEntity: app.legal_entity || app.company_name,
        jurisdiction: app.jurisdiction || app.country,
        investorCount: app.investor_count || 0,
      });

    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Handle investment (placeholder - implement based on your escrow contract)
  const handleInvest = async () => {
    if (!project || !investAmount || !isConnected) return;

    const amount = parseFloat(investAmount);
    if (amount < project.minInvestment || amount > project.maxInvestment) {
      alert(`Investment must be between ${formatCurrency(project.minInvestment)} and ${formatCurrency(project.maxInvestment)}`);
      return;
    }

    setIsInvesting(true);
    try {
      // TODO: Implement actual investment via escrow contract
      console.log('Investing:', amount, 'in project:', project.id);
      alert('Investment functionality coming soon!');
    } catch (err) {
      console.error('Investment error:', err);
    } finally {
      setIsInvesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {error || 'Project Not Found'}
          </h1>
          <p className="text-gray-400 mb-6">
            The project you're looking for doesn't exist or is no longer available.
          </p>
          <Link 
            href="/projects" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const progress = calculateProgress(project.totalRaised, project.fundingGoal);
  const daysLeft = calculateDaysLeft(project.deadline);
  const chainInfo = CHAIN_INFO[project.chainId] || { name: 'Unknown', symbol: 'ETH', explorer: '' };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link 
            href="/projects" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Project Info */}
            <div className="lg:col-span-2">
              {/* Project Image */}
              <div className="relative h-64 md:h-96 rounded-xl overflow-hidden bg-gray-800 mb-6">
                {project.images && project.images.length > 0 ? (
                  <Image
                    src={project.images[0]}
                    alt={project.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Building className="w-24 h-24 text-gray-600" />
                  </div>
                )}
                {/* Status Badge */}
                <div className={`absolute top-4 left-4 ${project.statusInfo.bgColor} ${project.statusInfo.textColor} px-3 py-1 rounded-full text-sm font-medium`}>
                  {project.statusInfo.label}
                </div>
                {/* Category Badge */}
                <div className="absolute top-4 right-4 bg-gray-900/80 text-white px-3 py-1 rounded-full text-sm">
                  {project.category}
                </div>
              </div>

              {/* Project Title & Description */}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{project.name}</h1>
              
              <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
                <span className="flex items-center gap-1 text-gray-400">
                  <Globe className="w-4 h-4" />
                  {chainInfo.name}
                </span>
                {project.legalEntity && (
                  <span className="flex items-center gap-1 text-gray-400">
                    <Building className="w-4 h-4" />
                    {project.legalEntity}
                  </span>
                )}
                {project.jurisdiction && (
                  <span className="flex items-center gap-1 text-gray-400">
                    <Shield className="w-4 h-4" />
                    {project.jurisdiction}
                  </span>
                )}
              </div>

              <p className="text-gray-300 text-lg mb-6">{project.description}</p>

              {/* Key Metrics - ROI & Cliff */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {project.expectedROI !== undefined && project.expectedROI > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-400 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">Expected ROI</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{project.expectedROI}%</p>
                  </div>
                )}
                {project.cliffPeriod !== undefined && project.cliffPeriod > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-orange-400 mb-1">
                      <Timer className="w-4 h-4" />
                      <span className="text-sm">Cliff Period</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{project.cliffPeriod} days</p>
                  </div>
                )}
                {project.vestingPeriod !== undefined && project.vestingPeriod > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Vesting Period</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{project.vestingPeriod} days</p>
                  </div>
                )}
                {project.dividendYield !== undefined && project.dividendYield > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-purple-400 mb-1">
                      <Percent className="w-4 h-4" />
                      <span className="text-sm">Dividend Yield</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{project.dividendYield}%</p>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-700 mb-6">
                <div className="flex gap-6">
                  {['overview', 'milestones', 'documents', 'team'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as typeof activeTab)}
                      className={`pb-3 px-1 text-sm font-medium transition-colors ${
                        activeTab === tab
                          ? 'text-blue-400 border-b-2 border-blue-400'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Token Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm">Token Name</p>
                        <p className="text-white font-medium">{project.tokenName}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Symbol</p>
                        <p className="text-white font-medium">{project.tokenSymbol}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Total Supply</p>
                        <p className="text-white font-medium">{project.tokenSupply.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Token Price</p>
                        <p className="text-white font-medium">{formatCurrency(project.tokenPrice)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contract Addresses */}
                  {(project.escrowAddress || project.tokenAddress || project.nftAddress) && (
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Contract Addresses</h3>
                      <div className="space-y-3">
                        {project.escrowAddress && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Escrow</span>
                            <div className="flex items-center gap-2">
                              <code className="text-blue-400 text-sm">{shortenAddress(project.escrowAddress)}</code>
                              <CopyButton text={project.escrowAddress} />
                              <a 
                                href={`${chainInfo.explorer}/address/${project.escrowAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-white"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        )}
                        {project.tokenAddress && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Token</span>
                            <div className="flex items-center gap-2">
                              <code className="text-blue-400 text-sm">{shortenAddress(project.tokenAddress)}</code>
                              <CopyButton text={project.tokenAddress} />
                              <a 
                                href={`${chainInfo.explorer}/address/${project.tokenAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-white"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'milestones' && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-6">Project Milestones</h3>
                  {project.milestones && project.milestones.length > 0 ? (
                    <div>
                      {project.milestones
                        .slice(0, showAllMilestones ? undefined : 4)
                        .map((milestone, index) => (
                          <MilestoneCard key={index} milestone={milestone} index={index} />
                        ))}
                      {project.milestones.length > 4 && (
                        <button
                          onClick={() => setShowAllMilestones(!showAllMilestones)}
                          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mt-4"
                        >
                          {showAllMilestones ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Show All ({project.milestones.length})
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400">No milestones defined yet.</p>
                  )}
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-6">Documents</h3>
                  <div className="space-y-3">
                    {project.pitchDeckUrl && (
                      <a
                        href={project.pitchDeckUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-blue-400" />
                        <span className="text-white">Pitch Deck</span>
                        <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
                      </a>
                    )}
                    {project.documents && project.documents.map((doc, index) => (
                      <a
                        key={index}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-blue-400" />
                        <span className="text-white">{doc.name}</span>
                        <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
                      </a>
                    ))}
                    {(!project.documents || project.documents.length === 0) && !project.pitchDeckUrl && (
                      <p className="text-gray-400">No documents available.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'team' && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-6">Team Members</h3>
                  {project.teamMembers && project.teamMembers.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {project.teamMembers.map((member, index) => (
                        <div key={index} className="text-center p-4 bg-gray-700 rounded-lg">
                          <div className="w-16 h-16 rounded-full bg-gray-600 mx-auto mb-3 flex items-center justify-center">
                            {member.image ? (
                              <Image src={member.image} alt={member.name} width={64} height={64} className="rounded-full" />
                            ) : (
                              <Users className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                          <p className="text-white font-medium">{member.name}</p>
                          <p className="text-gray-400 text-sm">{member.role}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">Team information not available.</p>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Investment Card */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-xl p-6 sticky top-4">
                {/* Funding Progress */}
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-gray-400 text-sm">Raised</p>
                      <p className="text-2xl font-bold text-white">{formatCurrency(project.totalRaised)}</p>
                    </div>
                    <p className="text-gray-400 text-sm">of {formatCurrency(project.fundingGoal)}</p>
                  </div>
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-right text-sm text-gray-400 mt-1">{progress.toFixed(1)}% funded</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs">Investors</span>
                    </div>
                    <p className="text-xl font-bold text-white">{project.investorCount || 0}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">Days Left</span>
                    </div>
                    <p className="text-xl font-bold text-white">{daysLeft}</p>
                  </div>
                </div>

                {/* ROI & Cliff Quick View */}
                {(project.expectedROI || project.cliffPeriod) && (
                  <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      {project.expectedROI !== undefined && project.expectedROI > 0 && (
                        <div>
                          <p className="text-gray-400 text-xs">Expected ROI</p>
                          <p className="text-green-400 font-bold text-lg">{project.expectedROI}%</p>
                        </div>
                      )}
                      {project.cliffPeriod !== undefined && project.cliffPeriod > 0 && (
                        <div>
                          <p className="text-gray-400 text-xs">Cliff Period</p>
                          <p className="text-orange-400 font-bold text-lg">{project.cliffPeriod}d</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Investment Input */}
                {project.status === 'active' && (
                  <>
                    <div className="mb-4">
                      <label className="block text-gray-400 text-sm mb-2">Investment Amount (USD)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          value={investAmount}
                          onChange={(e) => setInvestAmount(e.target.value)}
                          placeholder={`Min: ${formatCurrency(project.minInvestment)}`}
                          min={project.minInvestment}
                          max={project.maxInvestment}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <p className="text-gray-500 text-xs mt-1">
                        Min: {formatCurrency(project.minInvestment)} · Max: {formatCurrency(project.maxInvestment)}
                      </p>
                    </div>

                    {investAmount && parseFloat(investAmount) > 0 && project.tokenPrice > 0 && (
                      <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                        <p className="text-gray-400 text-sm">You will receive approximately:</p>
                        <p className="text-white font-bold text-lg">
                          {(parseFloat(investAmount) / project.tokenPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })} {project.tokenSymbol}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleInvest}
                      disabled={!isConnected || isInvesting || !investAmount}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {isInvesting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : !isConnected ? (
                        'Connect Wallet to Invest'
                      ) : (
                        <>
                          <DollarSign className="w-5 h-5" />
                          Invest Now
                        </>
                      )}
                    </button>
                  </>
                )}

                {project.status !== 'active' && (
                  <div className={`text-center py-4 rounded-lg ${project.statusInfo.bgColor}`}>
                    <p className={`font-medium ${project.statusInfo.textColor}`}>
                      {project.status === 'funded' ? 'This project has been fully funded!' :
                       project.status === 'completed' ? 'This project has been completed.' :
                       project.status === 'approved' ? 'Raise starting soon...' :
                       'Investment not available'}
                    </p>
                  </div>
                )}

                {/* Share & Actions */}
                <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-gray-700">
                  <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors">
                    <Heart className="w-4 h-4" />
                    Save
                  </button>
                </div>

                {/* Project Creator */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <p className="text-gray-400 text-sm mb-2">Project Creator</p>
                  <div className="flex items-center gap-2">
                    <code className="text-blue-400 text-sm">{shortenAddress(project.owner)}</code>
                    <CopyButton text={project.owner} />
                    {chainInfo.explorer && (
                      <a 
                        href={`${chainInfo.explorer}/address/${project.owner}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    }>
      <ProjectPageContent />
    </Suspense>
  );
}
