// src/app/projects/[id]/page.tsx
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useWalletClient } from 'wagmi';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useChainId, useBalance, useReadContract } from 'wagmi';
import { formatUnits, parseUnits, formatEther, Address } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import { ZERO_ADDRESS } from '@/config/contracts';
import StripeInvestment from '@/components/invest/StripeInvestment';
import { useKYC, KYCTier } from '@/contexts/KYCContext';
import ProjectOwnerPanel from '@/components/crowdfunding/ProjectOwnerPanel';
import InvestorClaimPanel from '@/components/crowdfunding/InvestorClaimPanel';
import { 
  RWAProjectNFTABI, 
  RWALaunchpadFactoryABI, 
  RWAEscrowVaultABI, 
  RWASecurityTokenABI, 
  ERC20ABI 
} from '@/config/abis';

// ============================================================================
// CONSTANTS & CONFIG
// ============================================================================

const STATUS_LABELS: Record<number, string> = {
  0: 'Inactive',
  1: 'Active',
  2: 'Funded',
  3: 'Executing',
  4: 'Cancelled',
  5: 'Completed',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  1: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  2: 'bg-green-500/20 text-green-400 border-green-500/30',
  3: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  4: 'bg-red-500/20 text-red-400 border-red-500/30',
  5: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  
};

const TIER_ICONS: Record<KYCTier, string> = {
  'None': '⚪',
  'Bronze': '🥉',
  'Silver': '🥈',
  'Gold': '🥇',
  'Diamond': '💎',
};

// Milestone status from contract (for display purposes)
const MILESTONE_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Pending', color: 'bg-gray-500/20 text-gray-400' },
  1: { label: 'Approved', color: 'bg-green-500/20 text-green-400' },
  2: { label: 'Released', color: 'bg-emerald-500/20 text-emerald-400' },
  3: { label: 'Disputed', color: 'bg-orange-500/20 text-orange-400' },
  4: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400' },
};

// ============================================================================
// TYPES
// ============================================================================

interface Project {
  id: bigint;
  owner: string;
  metadataURI: string;
  fundingGoal: bigint;
  totalRaised: bigint;
  minInvestment: bigint;
  maxInvestment: bigint;
  deadline: bigint;
  status: number;
  securityToken: string;
  escrowVault: string;
  createdAt: bigint;
  completedAt: bigint;
  transferable: boolean;
}

interface DeploymentRecord {
  projectId: bigint;
  owner: string;
  securityToken: string;
  escrowVault: string;
  compliance: string;
  dividendDistributor: string;
  deployedAt: bigint;
  isActive: boolean;
  category: string;
}

interface ProjectMetadata {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  properties?: {
    category?: string;
    tokenSymbol?: string;
    tokenName?: string;
    investorSharePercent?: number;
    projectedROI?: number;
    roiTimelineMonths?: number;
    platformFeePercent?: number;
    totalSupply?: number;
    fundingGoal?: number;
    images?: string[];
    milestones?: Array<{
      title: string;
      description: string;
      percentageOfFunds: number;
      targetDate: string;
      amount: number;
    }>;
    pitchDeck?: string;
    documents?: string;
  };
  documents?: {
    pitchDeck?: string;
    legalDocs?: string[];
  };
}

interface InvestorDetails {
  contribution: bigint;
  tokenBalance: bigint;
  tokensClaimed: bigint;
  claimableTokens: bigint;
  refundsEnabled: boolean;
  actualTokenBalance: bigint;
}

interface TokenConfig {
  address: Address;
  symbol: string;
  decimals: number;
}

interface EscrowData {
  fundingGoal: bigint;
  totalRaised: bigint;
  deadline: bigint;
  state: number;
  usdcAddress: Address;
  usdtAddress: Address;
}

// On-chain milestone data (optional, for status display)
interface OnChainMilestone {
  id: bigint;
  description: string;
  targetAmount: bigint;
  releasedAmount: bigint;
  deadline: bigint;
  status: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatUSD = (amount: number): string => {
  if (!isFinite(amount)) return 'Unlimited';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const ipfsToHttp = (uri: string | string[] | undefined | null): string => {
  if (!uri) return '/placeholder-project.png';
  
  if (Array.isArray(uri)) {
    uri = uri[0];
    if (!uri) return '/placeholder-project.png';
  }
  
  if (typeof uri !== 'string') {
    return '/placeholder-project.png';
  }
  
  if (uri.startsWith('ipfs://')) {
    return `https://gateway.pinata.cloud/ipfs/${uri.replace('ipfs://', '')}`;
  }
  if (uri.startsWith('Qm') || uri.startsWith('bafy')) {
    return `https://gateway.pinata.cloud/ipfs/${uri}`;
  }
  return uri;
};

const truncateAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const getTimeLeft = (deadline: bigint): { days: number; hours: number; minutes: number; expired: boolean } => {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (deadline <= now) {
    return { days: 0, hours: 0, minutes: 0, expired: true };
  }
  const diff = Number(deadline - now);
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  return { days, hours, minutes, expired: false };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ProjectPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params?.id as string;

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { writeContract, data: writeData, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: writeData });
  const { data: walletClient } = useWalletClient();
  const [pendingKycProof, setPendingKycProof] = useState<{
    level: number;
    countryCode: number;
    expiry: bigint;
    signature: `0x${string}`;
  } | null>(null);

  // Custom hooks
  const { contracts, explorerUrl, getAddressUrl } = useChainConfig();

  const [usdcBalance, setUsdcBalance] = useState<bigint>(BigInt(0));
  const [usdtBalance, setUsdtBalance] = useState<bigint>(BigInt(0));
  
  // KYC Context
  const {
    kycData,
    tier,
    tierInfo,
    tierLimits,
    isLoading: kycLoading,
    isVerified,
    investmentLimit,
    remainingLimit,
    usedLimit,
    canInvest,
    formatLimit,
  } = useKYC();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [deployment, setDeployment] = useState<DeploymentRecord | null>(null);
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
  const [escrowData, setEscrowData] = useState<EscrowData | null>(null);
  const [investorDetails, setInvestorDetails] = useState<InvestorDetails | null>(null);
  const [tokenConfig, setTokenConfig] = useState<TokenConfig | null>(null);
  const [platformFeeBps, setPlatformFeeBps] = useState<number>(250);
  const [onChainMilestones, setOnChainMilestones] = useState<OnChainMilestone[]>([]);
  const [approvalProcessed, setApprovalProcessed] = useState(false);

  // UI State
  const [investAmount, setInvestAmount] = useState<string>('');
  const [selectedToken, setSelectedToken] = useState<'USDC' | 'USDT'>('USDC');
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'card'>('crypto');
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [logoImage, setLogoImage] = useState<string>('/placeholder-project.png');
  const [bannerImage, setBannerImage] = useState<string>('/placeholder-banner.png');
  const [pendingTxType, setPendingTxType] = useState<'approval' | 'invest' | null>(null);

  // Contract addresses
  const factoryAddress = contracts?.RWALaunchpadFactory as Address;
  const projectNFTAddress = contracts?.RWAProjectNFT as Address;

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadProjectData = useCallback(async () => {
    if (!publicClient || !projectId || !projectNFTAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      let deploymentData: any = null;
      let escrowAddress: Address | null = null;

      // 1. Try to get deployment record from factory (for fully deployed projects)
      if (factoryAddress) {
        try {
          deploymentData = await publicClient.readContract({
            address: factoryAddress,
            abi: RWALaunchpadFactoryABI,
            functionName: 'getDeployment',
            args: [BigInt(projectId)],
          }) as any;

          if (deploymentData && deploymentData.securityToken !== ZERO_ADDRESS) {
            escrowAddress = deploymentData.escrowVault as Address;
          } else {
            deploymentData = null; // Reset if not valid
          }
        } catch (e) {
          console.log('No factory deployment found, trying escrow directly');
        }
      }

      // 2. If no factory deployment, try to get escrow address from contracts config
      if (!escrowAddress && projectNFTAddress) {
        try {
          const projectData = await publicClient.readContract({
            address: projectNFTAddress,
            abi: RWAProjectNFTABI,
            functionName: 'getProject',
            args: [BigInt(projectId)],
          }) as any;

          if (projectData?.escrowVault && projectData.escrowVault !== ZERO_ADDRESS) {
            escrowAddress = projectData.escrowVault as Address;
          }
        } catch (e) {
          console.log('Failed to get project from NFT:', e);
        }
      }

      if (!escrowAddress) {
        throw new Error('Project not found - no escrow address available');
      }

      // 3. Get project data from escrow
      let escrowProject: any;
      try {
        escrowProject = await publicClient.readContract({
          address: escrowAddress,
          abi: RWAEscrowVaultABI,
          functionName: 'getProject',
          args: [BigInt(projectId)],
        });

        // Check if project exists in escrow (projectId should match or have valid data)
        if (!escrowProject || (escrowProject.fundingGoal === 0n && escrowProject.state === 0)) {
          throw new Error('Project not found in escrow');
        }
      } catch (e: any) {
        console.error('Escrow getProject failed:', e);
        throw new Error('Project not found');
      }

      // 4. Set deployment data (from factory or construct from escrow)
      if (deploymentData) {
        setDeployment({
          projectId: deploymentData.projectId || BigInt(projectId),
          owner: deploymentData.deployer || deploymentData.owner,
          securityToken: deploymentData.securityToken,
          escrowVault: deploymentData.escrowVault,
          compliance: deploymentData.compliance,
          dividendDistributor: deploymentData.dividendDistributor || ZERO_ADDRESS,
          deployedAt: deploymentData.deployedAt,
          isActive: deploymentData.active || deploymentData.isActive,
          category: deploymentData.category || '',
        });
      } else {
        // Construct deployment from escrow data
        setDeployment({
          projectId: BigInt(projectId),
          owner: escrowProject.projectOwner || '',
          securityToken: escrowProject.securityToken || ZERO_ADDRESS,
          escrowVault: escrowAddress,
          compliance: ZERO_ADDRESS,
          dividendDistributor: ZERO_ADDRESS,
          deployedAt: escrowProject.createdAt || 0n,
          isActive: Number(escrowProject.state) === 1,
          category: '',
        });
      }

      // 5. Get project data from NFT (optional, for metadata)
      try {
        const projectData = await publicClient.readContract({
          address: projectNFTAddress,
          abi: RWAProjectNFTABI,
          functionName: 'getProject',
          args: [BigInt(projectId)],
        }) as any;

        setProject({
          id: BigInt(projectId),
          owner: projectData.owner || escrowProject.projectOwner,
          metadataURI: '',
          fundingGoal: escrowProject.fundingGoal,
          totalRaised: escrowProject.totalRaised,
          minInvestment: BigInt(0),
          maxInvestment: BigInt(0),
          deadline: escrowProject.deadline,
          status: Number(escrowProject.state),
          securityToken: escrowProject.securityToken || deploymentData?.securityToken || ZERO_ADDRESS,
          escrowVault: escrowAddress,
          createdAt: escrowProject.createdAt || BigInt(0),
          completedAt: BigInt(0),
          transferable: false,
        });
      } catch (e) {
        // NFT data not available, use escrow data only
        setProject({
          id: BigInt(projectId),
          owner: escrowProject.projectOwner || '',
          metadataURI: '',
          fundingGoal: escrowProject.fundingGoal,
          totalRaised: escrowProject.totalRaised,
          minInvestment: BigInt(0),
          maxInvestment: BigInt(0),
          deadline: escrowProject.deadline,
          status: Number(escrowProject.state),
          securityToken: escrowProject.securityToken || ZERO_ADDRESS,
          escrowVault: escrowAddress,
          createdAt: escrowProject.createdAt || BigInt(0),
          completedAt: BigInt(0),
          transferable: false,
        });
      }

      // 6. Get token URI and fetch metadata
      try {
        const tokenURI = await publicClient.readContract({
          address: projectNFTAddress,
          abi: RWAProjectNFTABI,
          functionName: 'tokenURI',
          args: [BigInt(projectId)],
        }) as string;

        if (tokenURI) {
          const metadataUrl = ipfsToHttp(tokenURI);
          const response = await fetch(metadataUrl);
          if (response.ok) {
            const meta = await response.json() as ProjectMetadata;
            setMetadata(meta);

            if (meta.image) {
              setLogoImage(ipfsToHttp(meta.image));
            }
            if (meta.properties?.images && Array.isArray(meta.properties.images)) {
              if (meta.properties.images[0]) {
                setLogoImage(ipfsToHttp(meta.properties.images[0]));
              }
              if (meta.properties.images[1]) {
                setBannerImage(ipfsToHttp(meta.properties.images[1]));
              }
            }
          }
        }
      } catch (e) {
        console.log('Failed to fetch metadata:', e);
      }

      // 7. Set escrow data from the escrow project
      const [usdcAddr, usdtAddr] = await Promise.all([
        publicClient.readContract({
          address: escrowAddress,
          abi: RWAEscrowVaultABI,
          functionName: 'usdc',
        }),
        publicClient.readContract({
          address: escrowAddress,
          abi: RWAEscrowVaultABI,
          functionName: 'usdt',
        }),
      ]);

      setEscrowData({
        fundingGoal: escrowProject.fundingGoal,
        totalRaised: escrowProject.totalRaised,
        deadline: escrowProject.deadline,
        state: Number(escrowProject.state),
        usdcAddress: usdcAddr as Address,
        usdtAddress: usdtAddr as Address,
      });

      // 8. Try to fetch on-chain milestones
      try {
        const milestonesData = await publicClient.readContract({
          address: escrowAddress,
          abi: RWAEscrowVaultABI,
          functionName: 'getMilestones',
          args: [BigInt(projectId)],
        }) as readonly {
          description: string;
          amount: bigint;
          deadline: bigint;
          state: number;
          releasedAt: bigint;
          approvedAt: bigint;
        }[];

        setOnChainMilestones(milestonesData.map((m, index) => ({
          id: BigInt(index),
          description: m.description,
          targetAmount: m.amount,
          releasedAmount: m.state === 2 ? m.amount : 0n, // 2 = Released
          deadline: m.deadline,
          status: m.state,
        })));
      } catch (e) {
        console.log('No on-chain milestones found');
        setOnChainMilestones([]);
      }

      // 9. Get platform fee
      if (factoryAddress) {
        try {
          const feeBps = await publicClient.readContract({
            address: factoryAddress,
            abi: RWALaunchpadFactoryABI,
            functionName: 'platformFeeBps',
          }) as bigint;
          setPlatformFeeBps(Number(feeBps));
        } catch (e) {
          console.log('Failed to get platform fee');
        }
      }

      // 10. Get security token config if available
      const tokenAddress = escrowProject.securityToken || deploymentData?.securityToken;
      if (tokenAddress && tokenAddress !== ZERO_ADDRESS) {
        try {
          const [symbol, decimals] = await Promise.all([
            publicClient.readContract({
              address: tokenAddress as Address,
              abi: RWASecurityTokenABI,
              functionName: 'symbol',
            }),
            publicClient.readContract({
              address: tokenAddress as Address,
              abi: RWASecurityTokenABI,
              functionName: 'decimals',
            }),
          ]);

          setTokenConfig({
            address: tokenAddress as Address,
            symbol: symbol as string,
            decimals: Number(decimals),
          });
        } catch (e) {
          console.log('Failed to get token config');
        }
      }

    } catch (err) {
      console.error('Error loading project:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, projectId, factoryAddress, projectNFTAddress, contracts]);

  // Fetch token balances
  const { data: usdcBalanceData } = useReadContract({
    address: escrowData?.usdcAddress,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!escrowData?.usdcAddress,
    },
  });

  const { data: usdtBalanceData } = useReadContract({
    address: escrowData?.usdtAddress,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!escrowData?.usdtAddress,
    },
  });

  // Update balances when data changes
  useEffect(() => {
    if (usdcBalanceData !== undefined) {
      setUsdcBalance(usdcBalanceData as bigint);
    }
  }, [usdcBalanceData]);

  useEffect(() => {
    if (usdtBalanceData !== undefined) {
      setUsdtBalance(usdtBalanceData as bigint);
    }
  }, [usdtBalanceData]);

  // Helper to format balance
  const formatTokenBalance = (balance: bigint, decimals: number = 6): string => {
    const value = Number(balance) / Math.pow(10, decimals);
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  // Load investor details
  const loadInvestorDetails = useCallback(async () => {
    if (!publicClient || !address || !deployment?.escrowVault) return;

    try {
      const escrowAddress = deployment.escrowVault as Address;
      
      const [contribution, tokenBalance, claimed] = await Promise.all([
        publicClient.readContract({
          address: escrowAddress,
          abi: [{ inputs: [{ name: "_projectId", type: "uint256" }, { name: "_investor", type: "address" }], name: "getInvestorContribution", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }] as const,
          functionName: 'getInvestorContribution',
          args: [BigInt(projectId), address],
        }),
        publicClient.readContract({
          address: escrowAddress,
          abi: [{ inputs: [{ name: "_projectId", type: "uint256" }, { name: "_investor", type: "address" }], name: "getInvestorBalance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }] as const,
          functionName: 'getInvestorBalance',
          args: [BigInt(projectId), address],
        }),
        publicClient.readContract({
          address: escrowAddress,
          abi: [{ inputs: [{ name: "_projectId", type: "uint256" }, { name: "_investor", type: "address" }], name: "tokensClaimed", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }] as const,
          functionName: 'tokensClaimed',
          args: [BigInt(projectId), address],
        }),
      ]);

      setInvestorDetails({
        contribution: contribution as bigint,
        tokenBalance: tokenBalance as bigint,
        tokensClaimed: claimed as bigint,
        claimableTokens: BigInt(0),
        refundsEnabled: false,
        actualTokenBalance: tokenBalance as bigint,
      });
    } catch (e) {
      console.error('Failed to load investor details:', e);
    }
  }, [publicClient, address, deployment?.escrowVault, projectId]);

  // Effects
  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  useEffect(() => {
    if (address && deployment) {
      loadInvestorDetails();
    }
  }, [address, deployment, loadInvestorDetails]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const fundingGoalUsd = escrowData?.fundingGoal 
    ? Number(escrowData.fundingGoal) / 1e6 
    : 0;

  const totalRaisedUsd = escrowData?.totalRaised 
    ? Number(escrowData.totalRaised) / 1e6 
    : 0;

  const progressPercent = fundingGoalUsd > 0 
    ? Math.min((totalRaisedUsd / fundingGoalUsd) * 100, 100) 
    : 0;

  const timeLeft = escrowData?.deadline 
    ? getTimeLeft(escrowData.deadline) 
    : { days: 0, hours: 0, minutes: 0, expired: true };

  const userInvestment = investorDetails?.contribution 
    ? Number(investorDetails.contribution) / 1e6 
    : 0;

  const userTierLimit = investmentLimit;
  const userRemainingAllowance = tier === 'Diamond' 
    ? Infinity 
    : Math.max(0, remainingLimit - userInvestment);

  const escrowState = escrowData?.state ?? 0;
  const isActive = escrowState === 1;
  const isFunded = escrowState === 2;
  const isCancelled = escrowState === 4;
  const isRefunding = escrowState === 4;

  const investAmountNum = parseFloat(investAmount) || 0;
  const investCheck = canInvest(investAmountNum);
  const remainingToFund = fundingGoalUsd - totalRaisedUsd;

  // Check if current user is project owner
  const isOwner = isConnected && address && project?.owner?.toLowerCase() === address.toLowerCase();

  // Calculate total released from on-chain milestones
  const totalReleasedOnChain = onChainMilestones.reduce(
    (sum, m) => sum + Number(m.releasedAmount) / 1e6, 
    0
  );

  // Get selected token balance
  const selectedTokenBalance = selectedToken === 'USDC' ? usdcBalance : usdtBalance;
  const hasInsufficientBalance = investAmountNum > 0 && 
    investAmountNum > Number(selectedTokenBalance) / 1e6;

  // ============================================================================
  // HANDLERS
  // ============================================================================
  

  const handleInvest = async () => {
    // Reset state for new investment flow
    setApprovalProcessed(false);
    setPendingKycProof(null);
    setPendingTxType(null);
    setError(null);

    if (!address || !deployment?.escrowVault || !escrowData || !investAmount || !publicClient || !walletClient) return;

    if (!investCheck.allowed) {
      setError(investCheck.reason || 'Cannot invest');
      return;
    }

    const tokenAddress = selectedToken === 'USDC' ? escrowData.usdcAddress : escrowData.usdtAddress;
    const amount = parseUnits(investAmount, 6);
    const escrowAddress = deployment.escrowVault as Address;

    try {
      // First, fetch KYC proof (requires signature)
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const message = `Get KYC Proof\nWallet: ${address}\nTimestamp: ${timestamp}`;

      // Request signature from wallet
      const signature = await walletClient.signMessage({ message });

      // Fetch KYC proof with signature
      const kycResponse = await fetch(
        `/api/kyc/proof?wallet=${address}&signature=${encodeURIComponent(signature)}&timestamp=${timestamp}`,
        {
          headers: {
            'x-chain-id': chainId.toString(),
          },
        }
      );

      const kycProofData = await kycResponse.json();

      if (!kycProofData.hasProof || !kycProofData.proof) {
        setError(kycProofData.message || 'No valid KYC proof found. Please complete KYC verification.');
        return;
      }

      const kycProof = {
        level: kycProofData.proof.level,
        countryCode: kycProofData.proof.countryCode,
        expiry: BigInt(kycProofData.proof.expiry),
        signature: kycProofData.proof.signature as `0x${string}`,
      };

      // Store for use after approval
      setPendingKycProof(kycProof);

      console.log('Invest params:', {
        escrowAddress,
        projectId,
        amount: amount.toString(),
        tokenAddress,
        kycProof: {
          level: kycProof.level,
          countryCode: kycProof.countryCode,
          expiry: kycProof.expiry.toString(),
          signature: kycProof.signature,
        },
      });

      // Check current allowance
      const currentAllowance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: 'allowance',
        args: [address, escrowAddress],
      }) as bigint;

      console.log('Current allowance:', currentAllowance.toString());

      if (currentAllowance < amount) {
        console.log('Approving...');
        setPendingTxType('approval');
        writeContract({
          address: tokenAddress,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [escrowAddress, amount],
        });
      } else {
        console.log('Simulating invest...');

        // Simulate first to get error message
        try {
          await publicClient.simulateContract({
            address: escrowAddress,
            abi: RWAEscrowVaultABI,
            functionName: 'invest',
            args: [BigInt(projectId), amount, tokenAddress, kycProof],
            account: address,
          });
          console.log('Simulation passed, calling invest...');
        } catch (simError: any) {
          console.error('Simulation failed:', simError);

          const errorMessage = simError?.cause?.reason
            || simError?.cause?.message
            || simError?.message
            || 'Unknown error';

          console.error('Revert reason:', errorMessage);
          setError(`Transaction would fail: ${errorMessage}`);
          return;
        }

        setPendingTxType('invest');
        writeContract({
          address: escrowAddress,
          abi: RWAEscrowVaultABI,
          functionName: 'invest',
          args: [BigInt(projectId), amount, tokenAddress, kycProof],
        });
      }
    } catch (e: any) {
      console.error('Invest error:', e);
      if (e.message?.includes('User rejected') || e.message?.includes('rejected')) {
        setError('Signature rejected');
      } else {
        setError(e instanceof Error ? e.message : 'Investment failed');
      }
    }
  };

  // Add effect to call invest after approval succeeds
  useEffect(() => {
    const callInvestAfterApproval = async () => {
      if (
        isTxSuccess &&
        writeData &&
        pendingKycProof &&
        !approvalProcessed &&
        pendingTxType === 'approval' &&
        deployment?.escrowVault &&
        escrowData &&
        investAmount &&
        address &&
        publicClient
      ) {
        const tokenAddress = selectedToken === 'USDC' ? escrowData.usdcAddress : escrowData.usdtAddress;
        const amount = parseUnits(investAmount, 6);
        const escrowAddress = deployment.escrowVault as Address;

        try {
          const currentAllowance = await publicClient.readContract({
            address: tokenAddress,
            abi: ERC20ABI,
            functionName: 'allowance',
            args: [address, escrowAddress],
          }) as bigint;

          if (currentAllowance >= amount) {
            console.log('Approval confirmed, calling invest...');
            setApprovalProcessed(true);
            setPendingTxType('invest');
            writeContract({
              address: escrowAddress,
              abi: RWAEscrowVaultABI,
              functionName: 'invest',
              args: [BigInt(projectId), amount, tokenAddress, pendingKycProof],
            });
          }
        } catch (e) {
          console.error('Failed to call invest after approval:', e);
          setError('Failed to submit investment after approval');
        }
      }
    };

    callInvestAfterApproval();
  }, [
    isTxSuccess,
    writeData,
    pendingKycProof,
    approvalProcessed,
    pendingTxType,
    deployment?.escrowVault,
    escrowData,
    investAmount,
    address,
    selectedToken,
    publicClient,
    writeContract,
    projectId,
  ]);

  // Effect to refresh data ONLY after invest tx succeeds
  useEffect(() => {
    if (isTxSuccess && pendingTxType === 'invest') {
      console.log('Investment successful, refreshing data...');
      loadProjectData();
      loadInvestorDetails();
      
      // Reset all investment state
      setPendingTxType(null);
      setPendingKycProof(null);
      setApprovalProcessed(false);
      setInvestAmount('');
    }
  }, [isTxSuccess, pendingTxType, loadProjectData, loadInvestorDetails]);

  const handleRefresh = () => {
    loadProjectData();
    loadInvestorDetails();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-white mb-2">Project Not Found</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            href="/projects"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Browse Projects
          </Link>
        </div>
      </div>
    );
  }

  if (!project || !deployment) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">No project data available</p>
      </div>
    );
  }

  const statusInfo = {
    label: STATUS_LABELS[escrowState] || 'Unknown',
    color: STATUS_COLORS[escrowState] || STATUS_COLORS[0],
  };

  // Helper to find on-chain milestone status by matching title/description
  const getOnChainStatus = (metadataMilestone: { title: string; description: string }) => {
    const match = onChainMilestones.find(
      m => m.description.toLowerCase().includes(metadataMilestone.title.toLowerCase()) ||
           metadataMilestone.title.toLowerCase().includes(m.description.toLowerCase())
    );
    return match;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Banner */}
      <div className="relative h-48 md:h-64 lg:h-80 overflow-hidden">
        <img
          src={bannerImage}
          alt="Project Banner"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-banner.png';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
      </div>

      {/* Project Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 border-gray-900 bg-gray-800 shadow-xl flex-shrink-0">
            <img
              src={logoImage}
              alt={project.owner}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-project.png';
              }}
            />
          </div>

          <div className="flex-1 pb-2">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                {metadata?.name || `Project #${projectId}`}
              </h1>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-gray-400">
              <span className="flex items-center gap-1">
                📁 {metadata?.properties?.category || 'General'}
              </span>
              {tokenConfig && (
                <span className="flex items-center gap-1">
                  🪙 {tokenConfig.symbol}
                </span>
              )}
              <a
                href={`${explorerUrl}/address/${deployment.escrowVault}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-blue-400 transition"
              >
                📋 {truncateAddress(deployment.escrowVault)}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">About This Project</h2>
              <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {metadata?.description || 'No description available.'}
              </p>
            </div>

            {/* Investment Details */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Investment Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Investor Share</p>
                  <p className="text-2xl font-bold text-white">
                    {metadata?.properties?.investorSharePercent ?? 0}%
                  </p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Projected ROI</p>
                  <p className="text-2xl font-bold text-green-400">
                    {metadata?.properties?.projectedROI ?? 0}%
                  </p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">ROI Timeline</p>
                  <p className="text-2xl font-bold text-white">
                    {metadata?.properties?.roiTimelineMonths ?? 0} mo
                  </p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Token Supply</p>
                  <p className="text-2xl font-bold text-white">
                    {metadata?.properties?.totalSupply?.toLocaleString() ?? 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Investor Claim Panel - show for investors */}
            {isConnected && !isOwner && deployment?.escrowVault && (
              <InvestorClaimPanel
                projectId={projectId}
                escrowAddress={deployment.escrowVault}
                securityTokenAddress={deployment.securityToken}
                projectState={escrowData?.state ?? 0}
                tokenSymbol={tokenConfig?.symbol}
                onRefresh={handleRefresh}
              />
            )}

            {/* Owner Management Panel */}
            {isOwner && deployment?.escrowVault && deployment.escrowVault !== ZERO_ADDRESS && (
              <div className="lg:col-span-3 mt-8">
                <ProjectOwnerPanel
                  projectId={projectId}
                  escrowAddress={deployment.escrowVault}
                  projectState={escrowData?.state ?? 0}
                  totalRaised={escrowData?.totalRaised ?? 0n}
                  fundingGoal={escrowData?.fundingGoal ?? 0n}
                  onRefresh={loadProjectData}
                />
              </div>
            )}

            {/* Milestones - Using metadata as source */}
            {metadata?.properties?.milestones && metadata.properties.milestones.length > 0 && (
              <div className="bg-gray-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">Milestones</h2>
                  {totalReleasedOnChain > 0 && (
                    <span className="text-sm text-emerald-400">
                      ${totalReleasedOnChain.toLocaleString()} released
                    </span>
                  )}
                </div>
                <div className="space-y-4">
                  {metadata.properties.milestones.map((milestone, index) => {
                    const onChainData = getOnChainStatus(milestone);
                    const statusConfig = onChainData 
                      ? MILESTONE_STATUS[onChainData.status] 
                      : MILESTONE_STATUS[0];
                    const isReleased = onChainData?.status === 2;
                    const releasedAmount = onChainData ? Number(onChainData.releasedAmount) / 1e6 : 0;

                    return (
                      <div key={index} className="bg-gray-700/50 rounded-xl p-4">
                        <div className="flex gap-4">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                            isReleased ? 'bg-emerald-600' : 'bg-blue-600'
                          }`}>
                            {isReleased ? '✓' : index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-white font-semibold">{milestone.title}</h3>
                              {onChainData && (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${statusConfig.color}`}>
                                  {statusConfig.label}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 text-sm mt-1">{milestone.description}</p>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm">
                              <span className="text-blue-400">{milestone.percentageOfFunds}% of funds</span>
                              <span className="text-gray-500">Target: {new Date(milestone.targetDate).toLocaleDateString()}</span>
                              <span className={isReleased ? 'text-emerald-400' : 'text-green-400'}>
                                {isReleased 
                                  ? `Released: ${formatUSD(releasedAmount)}`
                                  : formatUSD(milestone.amount)
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Documents & Links</h2>
              <div className="flex flex-wrap gap-3">
                {metadata?.properties?.pitchDeck && (
                  <a
                    href={ipfsToHttp(metadata.properties.pitchDeck)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white"
                  >
                    📊 Pitch Deck
                  </a>
                )}
                {metadata?.properties?.documents && (
                  <a
                    href={ipfsToHttp(metadata.properties.documents)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white"
                  >
                    📄 Legal Documents
                  </a>
                )}
                {metadata?.documents?.pitchDeck && (
                  <a
                    href={ipfsToHttp(metadata.documents.pitchDeck)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white"
                  >
                    📊 Pitch Deck
                  </a>
                )}
                {metadata?.external_url && (
                  <a
                    href={metadata.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white"
                  >
                    🌐 Website
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Investment Card */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-2xl p-6 sticky top-6">
              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-2xl font-bold text-white">{formatUSD(totalRaisedUsd)}</span>
                  <span className="text-gray-400">of {formatUSD(fundingGoalUsd)}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-blue-400">{progressPercent.toFixed(1)}% funded</span>
                  <span className="text-gray-400">
                    {timeLeft.expired ? 'Ended' : `${timeLeft.days}d ${timeLeft.hours}h left`}
                  </span>
                </div>
              </div>

              {/* User Investment */}
              {isConnected && userInvestment > 0 && (
                <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
                  <p className="text-gray-400 text-sm">Your Investment</p>
                  <p className="text-2xl font-bold text-white">{formatUSD(userInvestment)}</p>
                </div>
              )}

              {/* KYC Status */}
              {isConnected && (
                <div className="mb-6 p-4 bg-gray-700/50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">KYC Status</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{TIER_ICONS[tier]}</span>
                      <span className="text-white font-semibold">{tier}</span>
                      {isVerified && (
                        <span className="text-green-400 text-sm">✓</span>
                      )}
                    </div>
                  </div>
                  {tier !== 'None' && (
                    <div className="mt-2 pt-2 border-t border-gray-600">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Limit:</span>
                        <span className="text-white">{tierInfo.limit}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Remaining:</span>
                        <span className="text-green-400">{formatUSD(userRemainingAllowance)}</span>
                      </div>
                    </div>
                  )}
                  {tier === 'None' && (
                    <Link
                      href="/kyc"
                      className="block mt-3 text-center text-sm text-blue-400 hover:text-blue-300"
                    >
                      Complete KYC to invest →
                    </Link>
                  )}
                </div>
              )}

              {/* Investment Section */}
              {isActive && (
                <>
                  {/* Payment Method */}
                  <div className="mb-4">
                    <label className="text-gray-400 text-sm block mb-2">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPaymentMethod('crypto')}
                        className={`py-2 px-4 rounded-lg font-semibold transition ${
                          paymentMethod === 'crypto'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        🪙 Crypto
                      </button>
                      <button
                        onClick={() => setPaymentMethod('card')}
                        className={`py-2 px-4 rounded-lg font-semibold transition ${
                          paymentMethod === 'card'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        💳 Card
                      </button>
                    </div>
                  </div>

                  {paymentMethod === 'crypto' && (
                    <>
                      {/* Token Selection with Balances */}
                      <div className="mb-4">
                        <label className="text-gray-400 text-sm block mb-2">Payment Token</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSelectedToken('USDC')}
                            className={`relative py-3 px-4 rounded-lg font-semibold transition ${
                              selectedToken === 'USDC'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span>USDC</span>
                              {isConnected && (
                                <span className={`text-xs mt-1 ${
                                  selectedToken === 'USDC' ? 'text-blue-200' : 'text-gray-400'
                                }`}>
                                  {formatTokenBalance(usdcBalance)}
                                </span>
                              )}
                            </div>
                          </button>
                          <button
                            onClick={() => setSelectedToken('USDT')}
                            className={`relative py-3 px-4 rounded-lg font-semibold transition ${
                              selectedToken === 'USDT'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span>USDT</span>
                              {isConnected && (
                                <span className={`text-xs mt-1 ${
                                  selectedToken === 'USDT' ? 'text-blue-200' : 'text-gray-400'
                                }`}>
                                  {formatTokenBalance(usdtBalance)}
                                </span>
                              )}
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Amount Input with Balance Info */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-gray-400 text-sm">Amount (USD)</label>
                          {isConnected && (
                            <button
                              onClick={() => {
                                const maxBalance = Number(selectedTokenBalance) / 1e6;
                                const maxAllowed = Math.min(
                                  maxBalance, 
                                  userRemainingAllowance,
                                  remainingToFund
                                );
                                setInvestAmount(maxAllowed > 0 ? maxAllowed.toFixed(2) : '0');
                              }}
                              className="text-xs text-blue-400 hover:text-blue-300 transition"
                            >
                              Max: {formatUSD(Math.min(Number(selectedTokenBalance) / 1e6, userRemainingAllowance, remainingToFund))}
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={investAmount ? Number(investAmount).toLocaleString('en-US') : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/,/g, '');
                              if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                                setInvestAmount(rawValue);
                              }
                            }}
                            placeholder="0.00"
                            className={`w-full pl-8 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none transition ${
                              hasInsufficientBalance 
                                ? 'border-red-500 focus:border-red-500' 
                                : 'border-gray-600 focus:border-blue-500'
                            }`}
                          />
                        </div>
                        
                        {/* Error Messages */}
                        {investAmount && hasInsufficientBalance && (
                          <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                            <span>⚠️</span>
                            Insufficient {selectedToken} balance
                          </p>
                        )}
                        {investAmount && !hasInsufficientBalance && !investCheck.allowed && (
                          <p className="text-red-400 text-sm mt-1">{investCheck.reason}</p>
                        )}
                        
                        {/* Quick Amount Buttons */}
                        {isConnected && Number(selectedTokenBalance) > 0 && (
                          <div className="flex gap-2 mt-2">
                            {[25, 50, 75, 100].map((percent) => {
                              const maxBalance = Number(selectedTokenBalance) / 1e6;
                              const maxAllowed = Math.min(
                                maxBalance, 
                                userRemainingAllowance,
                                remainingToFund
                              );
                              const amount = (maxAllowed * percent) / 100;
                              
                              if (amount < 1) return null;
                              
                              return (
                                <button
                                  key={percent}
                                  onClick={() => setInvestAmount(amount.toFixed(2))}
                                  className="flex-1 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition"
                                >
                                  {percent}%
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Invest Button - Updated disabled condition */}
                      <button
                        onClick={handleInvest}
                        disabled={
                          !isConnected || 
                          tier === 'None' || 
                          !investAmount || 
                          !investCheck.allowed ||
                          hasInsufficientBalance ||
                          isWritePending || 
                          isTxLoading
                        }
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {!isConnected
                          ? 'Connect Wallet'
                          : tier === 'None'
                          ? 'Complete KYC First'
                          : isWritePending || isTxLoading
                          ? 'Processing...'
                          : hasInsufficientBalance
                          ? `Insufficient ${selectedToken}`
                          : !investCheck.allowed && investAmount
                          ? 'Exceeds Limit'
                          : 'Invest Now'}
                      </button>
                    </>
                  )}

                  {paymentMethod === 'card' && (
                    <StripeInvestment
                      projectId={Number(projectId)}
                      projectName={metadata?.name || `Project #${projectId}`}
                      minInvestment={100}
                      maxInvestment={userRemainingAllowance}
                      tokenPrice={1}
                      onSuccess={(amount) => {
                        handleRefresh();
                      }}
                      onCancel={() => setPaymentMethod('crypto')}
                    />
                  )}

                  <p className="text-gray-500 text-xs text-center mt-4">
                    Platform fee: {platformFeeBps / 100}%
                  </p>
                </>
              )}

              {/* Status Messages */}
              {isFunded && (
                <div className="text-center py-4 bg-green-500/10 rounded-xl">
                  <p className="text-green-400 font-semibold">🎉 Funding Goal Reached!</p>
                </div>
              )}

              {isCancelled && (
                <div className="text-center py-4 bg-red-500/10 rounded-xl">
                  <p className="text-red-400 font-semibold">❌ Project Cancelled</p>
                </div>
              )}

              {isRefunding && (
                <div className="text-center py-4 bg-orange-500/10 rounded-xl">
                  <p className="text-orange-400 font-semibold">🔄 Refunds Available</p>
                </div>
              )}

              {/* Project Owner */}
              <div className="mt-6 pt-4 border-t border-gray-700">
                <p className="text-gray-400 text-sm mb-1">Project Owner</p>
                <a
                  href={`${explorerUrl}/address/${project.owner}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition text-sm"
                >
                  {truncateAddress(project.owner)}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORT
// ============================================================================

export default function ProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <ProjectPageContent />
    </Suspense>
  );
}
