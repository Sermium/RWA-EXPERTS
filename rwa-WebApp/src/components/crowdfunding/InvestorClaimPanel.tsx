'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { formatUnits } from 'viem';
import { 
  Coins, CheckCircle, AlertCircle, Loader2, 
  Wallet, TrendingUp, Clock, ArrowRight
} from 'lucide-react';
import { useChainConfig } from '@/hooks/useChainConfig';
import { RWAEscrowVaultABI, RWASecurityTokenABI } from '@/config/abis';
import { PROJECT_STATE } from '@/config/deployments';

// ============================================================================
// TYPES
// ============================================================================

interface InvestorClaimPanelProps {
  projectId: string | number;
  escrowAddress: string;
  securityTokenAddress: string;
  projectState: number;
  tokenSymbol?: string;
  onRefresh: () => void;
}

interface InvestorStats {
  contribution: bigint;
  allocation: bigint;
  claimable: bigint;
  hasClaimed: boolean;
  tokenBalance: bigint;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InvestorClaimPanel({
  projectId,
  escrowAddress,
  securityTokenAddress,
  projectState,
  tokenSymbol = 'TOKENS',
  onRefresh,
}: InvestorClaimPanelProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { explorerUrl } = useChainConfig();

  // State
  const [stats, setStats] = useState<InvestorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Load investor stats
  const loadInvestorStats = useCallback(async () => {
    if (!publicClient || !address || !escrowAddress) {
      setIsLoading(false);
      return;
    }

    try {
      const [contribution, allocation, claimable, hasClaimed, tokenBalance] = await Promise.all([
        publicClient.readContract({
          address: escrowAddress as `0x${string}`,
          abi: RWAEscrowVaultABI,
          functionName: 'getInvestorContribution',
          args: [BigInt(projectId), address],
        }).catch(() => 0n),
        publicClient.readContract({
          address: escrowAddress as `0x${string}`,
          abi: RWAEscrowVaultABI,
          functionName: 'getInvestorAllocation',
          args: [BigInt(projectId), address],
        }).catch(() => 0n),
        publicClient.readContract({
          address: escrowAddress as `0x${string}`,
          abi: RWAEscrowVaultABI,
          functionName: 'getClaimableTokens',
          args: [BigInt(projectId), address],
        }).catch(() => 0n),
        publicClient.readContract({
          address: escrowAddress as `0x${string}`,
          abi: RWAEscrowVaultABI,
          functionName: 'hasInvestorClaimed',
          args: [BigInt(projectId), address],
        }).catch(() => false),
        securityTokenAddress ? publicClient.readContract({
          address: securityTokenAddress as `0x${string}`,
          abi: RWASecurityTokenABI,
          functionName: 'balanceOf',
          args: [address],
        }).catch(() => 0n) : 0n,
      ]);

      setStats({
        contribution: contribution as bigint,
        allocation: allocation as bigint,
        claimable: claimable as bigint,
        hasClaimed: hasClaimed as boolean,
        tokenBalance: tokenBalance as bigint,
      });
    } catch (e) {
      console.error('Error loading investor stats:', e);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, address, escrowAddress, securityTokenAddress, projectId]);

  useEffect(() => {
    loadInvestorStats();
  }, [loadInvestorStats]);

  // Handle claim tokens
  const handleClaimTokens = async () => {
    if (!walletClient || !publicClient || !address) return;
    
    setIsClaiming(true);
    setError(null);
    setSuccess(null);
    setTxHash(null);

    try {
      const hash = await walletClient.writeContract({
        address: escrowAddress as `0x${string}`,
        abi: RWAEscrowVaultABI,
        functionName: 'claimTokens',
        args: [BigInt(projectId)],
      });

      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      
      setSuccess('Tokens claimed successfully!');
      loadInvestorStats();
      onRefresh();
    } catch (e: any) {
      setError(e.message || 'Failed to claim tokens');
    } finally {
      setIsClaiming(false);
    }
  };

  // Handle claim refund
  const handleClaimRefund = async () => {
    if (!walletClient || !publicClient || !address) return;
    
    setIsRefunding(true);
    setError(null);
    setSuccess(null);
    setTxHash(null);

    try {
      const hash = await walletClient.writeContract({
        address: escrowAddress as `0x${string}`,
        abi: RWAEscrowVaultABI,
        functionName: 'claimRefund',
        args: [BigInt(projectId)],
      });

      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      
      setSuccess('Refund claimed successfully!');
      loadInvestorStats();
      onRefresh();
    } catch (e: any) {
      setError(e.message || 'Failed to claim refund');
    } finally {
      setIsRefunding(false);
    }
  };

  // Don't render if not connected or no investment
  if (!isConnected) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-ink-muted animate-spin" />
        </div>
      </div>
    );
  }

  // No investment
  if (!stats || stats.contribution === 0n) {
    return null;
  }

  const isCompleted = projectState === PROJECT_STATE.COMPLETED;
  const isCancelled = projectState === PROJECT_STATE.CANCELLED;
  const canClaim = isCompleted && stats.claimable > 0n && !stats.hasClaimed;
  const canRefund = isCancelled && stats.contribution > 0n;

  return (
    <div className="bg-surface rounded-2xl border border-gold-500/30 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-ink flex items-center gap-2">
          <Wallet className="w-5 h-5 text-gold-400" />
          Your Investment
        </h3>
        {stats.hasClaimed && (
          <span className="px-3 py-1 bg-success/10 text-success rounded-lg text-sm flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            Claimed
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-overlay/50 rounded-xl p-4">
          <p className="text-ink-muted text-sm mb-1">Contributed</p>
          <p className="text-xl font-bold text-ink">
            ${formatUnits(stats.contribution, 6)}
          </p>
        </div>
        <div className="bg-surface-overlay/50 rounded-xl p-4">
          <p className="text-ink-muted text-sm mb-1">Token Allocation</p>
          <p className="text-xl font-bold text-ink">
            {Number(formatUnits(stats.allocation, 18)).toLocaleString()}
          </p>
          <p className="text-xs text-ink-faint">{tokenSymbol}</p>
        </div>
        <div className="bg-surface-overlay/50 rounded-xl p-4">
          <p className="text-ink-muted text-sm mb-1">Claimable</p>
          <p className={`text-xl font-bold ${stats.claimable > 0n ? 'text-success' : 'text-ink-muted'}`}>
            {Number(formatUnits(stats.claimable, 18)).toLocaleString()}
          </p>
          <p className="text-xs text-ink-faint">{tokenSymbol}</p>
        </div>
        <div className="bg-surface-overlay/50 rounded-xl p-4">
          <p className="text-ink-muted text-sm mb-1">Current Balance</p>
          <p className="text-xl font-bold text-gold-400">
            {Number(formatUnits(stats.tokenBalance, 18)).toLocaleString()}
          </p>
          <p className="text-xs text-ink-faint">{tokenSymbol}</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />
          <p className="text-danger text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
            <p className="text-success text-sm">{success}</p>
          </div>
          {txHash && explorerUrl && (
            <a
              href={`${explorerUrl}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-400 hover:text-gold-300 text-sm mt-2 inline-flex items-center gap-1"
            >
              View Transaction <ArrowRight className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Status Messages */}
      {!isCompleted && !isCancelled && (
        <div className="p-4 bg-gold-500/10 border border-gold-500/30 rounded-xl mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold-400" />
            <div>
              <p className="text-ink font-medium">Funding in Progress</p>
              <p className="text-sm text-ink-muted">
                Tokens can be claimed once the project is completed
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.hasClaimed && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            <div>
              <p className="text-ink font-medium">Tokens Claimed</p>
              <p className="text-sm text-ink-muted">
                Your {tokenSymbol} tokens are in your wallet
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {canClaim && (
          <button
            onClick={handleClaimTokens}
            disabled={isClaiming}
            className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-border-strong disabled:to-border-strong text-ink rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            {isClaiming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Coins className="w-5 h-5" />
            )}
            {isClaiming ? 'Claiming...' : `Claim ${Number(formatUnits(stats.claimable, 18)).toLocaleString()} ${tokenSymbol}`}
          </button>
        )}

        {canRefund && (
          <button
            onClick={handleClaimRefund}
            disabled={isRefunding}
            className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-border-strong disabled:to-border-strong text-ink rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            {isRefunding ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <TrendingUp className="w-5 h-5" />
            )}
            {isRefunding ? 'Processing...' : `Claim Refund ($${formatUnits(stats.contribution, 6)})`}
          </button>
        )}
      </div>

      {/* Token Info */}
      {securityTokenAddress && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-ink-muted text-sm">Security Token</p>
          <a
            href={`${explorerUrl}/token/${securityTokenAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-400 hover:text-gold-300 text-sm font-mono"
          >
            {securityTokenAddress.slice(0, 10)}...{securityTokenAddress.slice(-8)}
          </a>
        </div>
      )}
    </div>
  );
}
