// src/hooks/useCrowdfundingAdmin.ts
import { useCallback, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import { DEPLOYMENTS } from '@/config/deployments';
import { RWAEscrowVaultABI, ERC20ABI, PlatformFeeManagerABI, DisputeManagerABI } from '@/config/abis';
import { SupportedChainId } from '@/config/chains';

// ============================================
// TYPES
// ============================================

export interface RecordOffChainParams {
  projectId: bigint;
  investor: string;
  amount: string;
  paymentReference: string;
}

export interface InjectFundsParams {
  projectId: bigint;
  amount: string;
  paymentToken: 'USDC' | 'USDT';
}

export interface ReleaseMilestoneParams {
  projectId: bigint;
  milestoneIndex: number;
}

export interface OpenDisputeParams {
  projectId: bigint;
  reason: string;
}

export interface ResolveDisputeParams {
  disputeId: bigint;
  refundInvestors: boolean;
}

// ============================================
// MAIN HOOK
// ============================================

export function useCrowdfundingAdmin() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { chainId } = useChainConfig();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get deployment for current chain
  const deployment = DEPLOYMENTS[chainId as SupportedChainId];
  const escrowAddress = deployment?.contracts?.RWAEscrowVault as `0x${string}` | undefined;
  const feeManagerAddress = deployment?.contracts?.PlatformFeeManager as `0x${string}` | undefined;
  const disputeManagerAddress = deployment?.contracts?.DisputeManager as `0x${string}` | undefined;
  const tokens = deployment?.tokens;

  // ============================================
  // ROLE CHECKS
  // ============================================

  const checkRole = useCallback(async (role: 'ADMIN' | 'OPERATOR' | 'DISPUTE_RESOLVER'): Promise<boolean> => {
    if (!publicClient || !address || !escrowAddress) return false;

    try {
      const roleFunctionName = role === 'ADMIN' 
        ? 'ADMIN_ROLE' 
        : role === 'OPERATOR' 
        ? 'OPERATOR_ROLE' 
        : 'DISPUTE_RESOLVER_ROLE';

      const roleHash = await publicClient.readContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: roleFunctionName,
      }) as `0x${string}`;

      return await publicClient.readContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'hasRole',
        args: [roleHash, address],
      }) as boolean;
    } catch {
      return false;
    }
  }, [publicClient, address, escrowAddress]);

  const isAdmin = useCallback(async () => checkRole('ADMIN'), [checkRole]);
  const isOperator = useCallback(async () => checkRole('OPERATOR'), [checkRole]);
  const isDisputeResolver = useCallback(async () => checkRole('DISPUTE_RESOLVER'), [checkRole]);

  // ============================================
  // PROJECT LIFECYCLE
  // ============================================

  const activateProject = useCallback(async (projectId: bigint): Promise<`0x${string}` | null> => {
    if (!walletClient || !publicClient || !escrowAddress) {
      setError('Wallet not connected or contracts not deployed');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'activateProject',
        args: [projectId],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (e: any) {
      setError(e.message || 'Failed to activate project');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, escrowAddress]);

  const completeProject = useCallback(async (projectId: bigint): Promise<`0x${string}` | null> => {
    if (!walletClient || !publicClient || !escrowAddress) {
      setError('Wallet not connected or contracts not deployed');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'completeProject',
        args: [projectId],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (e: any) {
      setError(e.message || 'Failed to complete project');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, escrowAddress]);

  const cancelProject = useCallback(async (projectId: bigint): Promise<`0x${string}` | null> => {
    if (!walletClient || !publicClient || !escrowAddress) {
      setError('Wallet not connected or contracts not deployed');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'cancelProject',
        args: [projectId],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (e: any) {
      setError(e.message || 'Failed to cancel project');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, escrowAddress]);

  const forceMarkFunded = useCallback(async (projectId: bigint): Promise<`0x${string}` | null> => {
    if (!walletClient || !publicClient || !escrowAddress) {
      setError('Wallet not connected or contracts not deployed');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'forceMarkFunded',
        args: [projectId],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (e: any) {
      setError(e.message || 'Failed to force mark funded');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, escrowAddress]);

  // ============================================
  // OFF-CHAIN INVESTMENT MANAGEMENT
  // ============================================

  const recordOffChainInvestment = useCallback(async (params: RecordOffChainParams): Promise<`0x${string}` | null> => {
    if (!walletClient || !publicClient || !escrowAddress) {
      setError('Wallet not connected or contracts not deployed');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const amount = parseUnits(params.amount, 6);

      const hash = await walletClient.writeContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'recordOffChainInvestment',
        args: [
          params.projectId,
          params.investor as `0x${string}`,
          amount,
          params.paymentReference,
        ],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (e: any) {
      setError(e.message || 'Failed to record off-chain investment');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, escrowAddress]);

  const injectOffChainFunds = useCallback(async (params: InjectFundsParams): Promise<`0x${string}` | null> => {
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

      // Inject funds
      const hash = await walletClient.writeContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'injectOffChainFunds',
        args: [params.projectId, amount, paymentTokenAddress as `0x${string}`],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (e: any) {
      setError(e.message || 'Failed to inject funds');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, address, escrowAddress, tokens]);

  // ============================================
  // MILESTONE MANAGEMENT
  // ============================================

  const releaseMilestoneFunds = useCallback(async (params: ReleaseMilestoneParams): Promise<`0x${string}` | null> => {
    if (!walletClient || !publicClient || !escrowAddress) {
      setError('Wallet not connected or contracts not deployed');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'releaseMilestoneFunds',
        args: [params.projectId, BigInt(params.milestoneIndex)],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (e: any) {
      setError(e.message || 'Failed to release milestone funds');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, escrowAddress]);

  const approveMilestone = useCallback(async (projectId: bigint, milestoneIndex: number): Promise<`0x${string}` | null> => {
    if (!walletClient || !publicClient || !escrowAddress) {
      setError('Wallet not connected or contracts not deployed');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'approveMilestone',
        args: [projectId, BigInt(milestoneIndex)],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (e: any) {
      setError(e.message || 'Failed to approve milestone');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, escrowAddress]);

  // ============================================
  // FEE DISTRIBUTION
  // ============================================

  const distributeFees = useCallback(async (projectId: bigint): Promise<`0x${string}` | null> => {
    if (!walletClient || !publicClient || !feeManagerAddress) {
      setError('Wallet not connected or PlatformFeeManager not deployed');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: feeManagerAddress,
        abi: PlatformFeeManagerABI,
        functionName: 'distributeFees',
        args: [projectId],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (e: any) {
      setError(e.message || 'Failed to distribute fees');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, feeManagerAddress]);

  // ============================================
  // DISPUTE MANAGEMENT
  // ============================================

  const openDispute = useCallback(async (params: OpenDisputeParams): Promise<`0x${string}` | null> => {
    if (!walletClient || !publicClient || !disputeManagerAddress) {
      setError('Wallet not connected or DisputeManager not deployed');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: disputeManagerAddress,
        abi: DisputeManagerABI,
        functionName: 'openDispute',
        args: [params.projectId, params.reason],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (e: any) {
      setError(e.message || 'Failed to open dispute');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, disputeManagerAddress]);

  const dismissDispute = useCallback(async (disputeId: bigint): Promise<`0x${string}` | null> => {
    if (!walletClient || !publicClient || !disputeManagerAddress) {
      setError('Wallet not connected or DisputeManager not deployed');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: disputeManagerAddress,
        abi: DisputeManagerABI,
        functionName: 'dismissDispute',
        args: [disputeId],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (e: any) {
      setError(e.message || 'Failed to dismiss dispute');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, disputeManagerAddress]);

  const resolveDispute = useCallback(async (params: ResolveDisputeParams): Promise<`0x${string}` | null> => {
    if (!walletClient || !publicClient || !disputeManagerAddress) {
      setError('Wallet not connected or DisputeManager not deployed');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: disputeManagerAddress,
        abi: DisputeManagerABI,
        functionName: 'resolveDispute',
        args: [params.disputeId, params.refundInvestors],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (e: any) {
      setError(e.message || 'Failed to resolve dispute');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, disputeManagerAddress]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    isLoading,
    error,
    chainId,
    escrowAddress,
    feeManagerAddress,
    disputeManagerAddress,

    // Role checks
    checkRole,
    isAdmin,
    isOperator,
    isDisputeResolver,

    // Project lifecycle
    activateProject,
    completeProject,
    cancelProject,
    forceMarkFunded,

    // Off-chain investment
    recordOffChainInvestment,
    injectOffChainFunds,

    // Milestone management
    releaseMilestoneFunds,
    approveMilestone,

    // Fee distribution
    distributeFees,

    // Dispute management
    openDispute,
    dismissDispute,
    resolveDispute,
  };
}
