// src/hooks/useCrowdfunding.ts
import { useCallback, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import { DEPLOYMENTS } from '@/config/deployments';
import { RWAEscrowVaultABI, ERC20ABI } from '@/config/abis';
import { SupportedChainId } from '@/config/chains';

// Types
export interface Project {
  projectId: bigint;
  projectOwner: string;
  securityToken: string;
  paymentToken: string;
  priceFeed: string;
  fundingGoal: bigint;
  totalRaised: bigint;
  deadline: bigint;
  state: ProjectState;
  createdAt: bigint;
  platformFeeBps: bigint;
  maxPriceAge: bigint;
}

export enum ProjectState {
  INACTIVE = 0,
  ACTIVE = 1,
  FUNDED = 2,
  COMPLETED = 3,
  CANCELLED = 4,
  DISPUTED = 5,
}

export interface KYCProof {
  level: number;
  countryCode: number;
  expiry: bigint;
  signature: `0x${string}`;
}

export interface InvestmentParams {
  projectId: bigint;
  amount: string;
  paymentToken: 'USDC' | 'USDT';
  kycProof: KYCProof;
}

export interface InvestorStats {
  contribution: bigint;
  allocation: bigint;
  hasClaimed: boolean;
  claimableTokens: bigint;
}

// ============================================
// MAIN HOOK
// ============================================

export function useCrowdfunding() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { chainId } = useChainConfig();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get deployment for current chain
  const deployment = DEPLOYMENTS[chainId as SupportedChainId];
  const escrowAddress = deployment?.contracts?.RWAEscrowVault as `0x${string}` | undefined;
  const tokens = deployment?.tokens;

  // ============================================
  // READ FUNCTIONS
  // ============================================

  const getProject = useCallback(async (projectId: bigint): Promise<Project | null> => {
    if (!publicClient || !escrowAddress) return null;

    try {
      const result = await publicClient.readContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'getProject',
        args: [projectId],
      }) as any;

      return {
        projectId: result.projectId,
        projectOwner: result.projectOwner,
        securityToken: result.securityToken,
        paymentToken: result.paymentToken,
        priceFeed: result.priceFeed,
        fundingGoal: result.fundingGoal,
        totalRaised: result.totalRaised,
        deadline: result.deadline,
        state: result.state as ProjectState,
        createdAt: result.createdAt,
        platformFeeBps: result.platformFeeBps,
        maxPriceAge: result.maxPriceAge,
      };
    } catch (e) {
      console.error('Error fetching project:', e);
      return null;
    }
  }, [publicClient, escrowAddress]);

  const getOffChainPending = useCallback(async (projectId: bigint): Promise<bigint> => {
    if (!publicClient || !escrowAddress) return 0n;

    try {
      return await publicClient.readContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'getOffChainPending',
        args: [projectId],
      }) as bigint;
    } catch (e) {
      console.error('Error fetching off-chain pending:', e);
      return 0n;
    }
  }, [publicClient, escrowAddress]);

  const getAvailableFunds = useCallback(async (projectId: bigint): Promise<bigint> => {
    if (!publicClient || !escrowAddress) return 0n;

    try {
      return await publicClient.readContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'getAvailableFunds',
        args: [projectId],
      }) as bigint;
    } catch (e) {
      console.error('Error fetching available funds:', e);
      return 0n;
    }
  }, [publicClient, escrowAddress]);

  const getClaimableTokens = useCallback(async (projectId: bigint, investor?: string): Promise<bigint> => {
    if (!publicClient || !escrowAddress) return 0n;
    const investorAddress = investor || address;
    if (!investorAddress) return 0n;

    try {
      return await publicClient.readContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'getClaimableTokens',
        args: [projectId, investorAddress as `0x${string}`],
      }) as bigint;
    } catch (e) {
      console.error('Error fetching claimable tokens:', e);
      return 0n;
    }
  }, [publicClient, escrowAddress, address]);

  const getInvestorStats = useCallback(async (projectId: bigint, investor?: string): Promise<InvestorStats | null> => {
    if (!publicClient || !escrowAddress) return null;
    const investorAddress = investor || address;
    if (!investorAddress) return null;

    try {
      const [contribution, allocation, hasClaimed, claimableTokens] = await Promise.all([
        publicClient.readContract({
          address: escrowAddress,
          abi: RWAEscrowVaultABI,
          functionName: 'getInvestorContribution',
          args: [projectId, investorAddress as `0x${string}`],
        }),
        publicClient.readContract({
          address: escrowAddress,
          abi: RWAEscrowVaultABI,
          functionName: 'getInvestorAllocation',
          args: [projectId, investorAddress as `0x${string}`],
        }),
        publicClient.readContract({
          address: escrowAddress,
          abi: RWAEscrowVaultABI,
          functionName: 'hasInvestorClaimed',
          args: [projectId, investorAddress as `0x${string}`],
        }),
        publicClient.readContract({
          address: escrowAddress,
          abi: RWAEscrowVaultABI,
          functionName: 'getClaimableTokens',
          args: [projectId, investorAddress as `0x${string}`],
        }),
      ]);

      return {
        contribution: contribution as bigint,
        allocation: allocation as bigint,
        hasClaimed: hasClaimed as boolean,
        claimableTokens: claimableTokens as bigint,
      };
    } catch (e) {
      console.error('Error fetching investor stats:', e);
      return null;
    }
  }, [publicClient, escrowAddress, address]);

  const getMilestones = useCallback(async (projectId: bigint) => {
    if (!publicClient || !escrowAddress) return [];

    try {
      const result = await publicClient.readContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'getMilestones',
        args: [projectId],
      }) as readonly {
        description: string;
        amount: bigint;
        deadline: bigint;
        state: number;
        releasedAt: bigint;
        approvedAt: bigint;
      }[];

      return result.map((m, index) => ({
        index,
        description: m.description,
        amount: m.amount,
        deadline: m.deadline,
        state: m.state,
        releasedAt: m.releasedAt,
        approvedAt: m.approvedAt,
      }));
    } catch (e) {
      console.error('Error fetching milestones:', e);
      return [];
    }
  }, [publicClient, escrowAddress]);

  // ============================================
  // WRITE FUNCTIONS
  // ============================================

  const invest = useCallback(async (params: InvestmentParams): Promise<`0x${string}` | null> => {
    if (!walletClient || !publicClient || !address || !escrowAddress || !tokens) {
      setError('Wallet not connected or contracts not deployed');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const paymentTokenAddress = params.paymentToken === 'USDC'
        ? tokens.USDC
        : tokens.USDT;

      const amount = parseUnits(params.amount, 6);

      // Check and approve allowance
      const currentAllowance = await publicClient.readContract({
        address: paymentTokenAddress as `0x${string}`,
        abi: ERC20ABI,
        functionName: 'allowance',
        args: [address, escrowAddress],
      }) as bigint;

      if (currentAllowance < amount) {
        const approveHash = await walletClient.writeContract({
          address: paymentTokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [escrowAddress, amount],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // Invest
      const hash = await walletClient.writeContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'invest',
        args: [
          params.projectId,
          amount,
          paymentTokenAddress as `0x${string}`,
          {
            level: params.kycProof.level,
            countryCode: params.kycProof.countryCode,
            expiry: params.kycProof.expiry,
            signature: params.kycProof.signature,
          },
        ],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (e: any) {
      setError(e.message || 'Investment failed');
      console.error('Investment error:', e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, address, escrowAddress, tokens]);

  const claimTokens = useCallback(async (projectId: bigint): Promise<`0x${string}` | null> => {
    if (!walletClient || !publicClient || !escrowAddress) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'claimTokens',
        args: [projectId],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (e: any) {
      setError(e.message || 'Claim failed');
      console.error('Claim error:', e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, escrowAddress]);

  const claimRefund = useCallback(async (projectId: bigint): Promise<`0x${string}` | null> => {
    if (!walletClient || !publicClient || !escrowAddress) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'claimRefund',
        args: [projectId],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (e: any) {
      setError(e.message || 'Refund claim failed');
      console.error('Refund error:', e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, escrowAddress]);

  return {
    // State
    isLoading,
    error,
    isConnected,
    address,
    chainId,
    escrowAddress,

    // Read functions
    getProject,
    getOffChainPending,
    getAvailableFunds,
    getClaimableTokens,
    getInvestorStats,
    getMilestones,

    // Write functions
    invest,
    claimTokens,
    claimRefund,
  };
}
