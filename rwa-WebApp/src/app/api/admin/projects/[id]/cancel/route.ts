// src/app/api/admin/projects/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAccess } from '@/lib/admin';
import { createPublicClient, createWalletClient, http, Chain, formatUnits } from 'viem';
import { avalancheFuji, polygon, polygonAmoy, avalanche, mainnet, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ZERO_ADDRESS } from '@/config/contracts';
import { RWAProjectNFTABI, RWAEscrowVaultABI } from '@/config/abis';

import { openVaultRefunds, readVaultFunding, VAULT_STATE } from '@/lib/crowdfunding/vault';
import { resolveVaultProjectId } from '@/lib/crowdfunding/vaultProject';

// ============================================================================
// MULTICHAIN CONFIGURATION
// ============================================================================

interface ChainConfig {
  chain: Chain;
  name: string;
  rpcUrl: string;
  contracts: {
    RWAProjectNFT?: string;
  };
  isTestnet: boolean;
  nativeCurrency: string;
  explorerUrl: string;
}

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // Avalanche Fuji Testnet
  43113: {
    chain: avalancheFuji,
    name: 'Avalanche Fuji',
    rpcUrl: process.env.AVALANCHE_FUJI_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    contracts: {
      RWAProjectNFT: process.env.AVALANCHE_FUJI_PROJECT_NFT || process.env.NEXT_PUBLIC_PROJECT_NFT,
    },
    isTestnet: true,
    nativeCurrency: 'AVAX',
    explorerUrl: 'https://testnet.snowtrace.io',
  },
  // Polygon Amoy Testnet
  80002: {
    chain: polygonAmoy,
    name: 'Polygon Amoy',
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    contracts: {
      RWAProjectNFT: process.env.POLYGON_AMOY_PROJECT_NFT,
    },
    isTestnet: true,
    nativeCurrency: 'POL',
    explorerUrl: 'https://amoy.polygonscan.com',
  },
  // Sepolia Testnet
  11155111: {
    chain: sepolia,
    name: 'Sepolia',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    contracts: {
      RWAProjectNFT: process.env.SEPOLIA_PROJECT_NFT,
    },
    isTestnet: true,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  // Avalanche Mainnet
  43114: {
    chain: avalanche,
    name: 'Avalanche',
    rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    contracts: {
      RWAProjectNFT: process.env.AVALANCHE_PROJECT_NFT,
    },
    isTestnet: false,
    nativeCurrency: 'AVAX',
    explorerUrl: 'https://snowtrace.io',
  },
  // Polygon Mainnet
  137: {
    chain: polygon,
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    contracts: {
      RWAProjectNFT: process.env.POLYGON_PROJECT_NFT,
    },
    isTestnet: false,
    nativeCurrency: 'POL',
    explorerUrl: 'https://polygonscan.com',
  },
  // Ethereum Mainnet
  1: {
    chain: mainnet,
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    contracts: {
      RWAProjectNFT: process.env.ETHEREUM_PROJECT_NFT,
    },
    isTestnet: false,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://etherscan.io',
  },
};

// Default chain ID
const DEFAULT_CHAIN_ID = 43113;

// ============================================================================
// CONSTANTS
// ============================================================================

// RWAProjectNFT.ProjectStatus
const NFT_STATUS = { DRAFT: 0, ACTIVE: 1, FUNDED: 2, COMPLETED: 3, CANCELLED: 4 } as const;

const STATUS_NAMES: Record<number, string> = {
  0: 'Draft',
  1: 'Active',
  2: 'Funded',
  3: 'Completed',
  4: 'Cancelled',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getChainConfig(chainId: number): ChainConfig | null {
  return CHAIN_CONFIGS[chainId] || null;
}

function createChainPublicClient(chainConfig: ChainConfig) {
  return createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  });
}

function createChainWalletClient(chainConfig: ChainConfig, privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  });
}

function getChainIdFromRequest(request: NextRequest): number {
  const { searchParams } = new URL(request.url);
  const chainIdParam = searchParams.get('chainId') || request.headers.get('x-chain-id');
  return chainIdParam ? parseInt(chainIdParam, 10) : DEFAULT_CHAIN_ID;
}

// ============================================================================
// POST - Cancel a project
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateAdminAccess(request);
  if (!auth.isValid) return auth.error;

  try {
    // Await params in Next.js 15+
    const { id } = await params;
    const projectId = parseInt(id);
    
    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const body = await request.json();
    // Refunds open whenever a project with an escrow is cancelled; there is no separate switch
    const {
      reason = 'Project cancelled by admin',
      chainId: requestedChainId,
    } = body;

    // Get chain ID
    const chainId = requestedChainId || getChainIdFromRequest(request);
    const chainConfig = getChainConfig(chainId);

    if (!chainConfig) {
      return NextResponse.json({
        success: false,
        error: `Unsupported chain ID: ${chainId}`,
        supportedChains: Object.entries(CHAIN_CONFIGS).map(([id, config]) => ({
          chainId: parseInt(id, 10),
          name: config.name,
          isTestnet: config.isTestnet,
        })),
      }, { status: 400 });
    }

    const adminKey = process.env.ADMIN_PRIVATE_KEY || process.env.VERIFIER_PRIVATE_KEY;
    if (!adminKey) {
      return NextResponse.json({
        success: false,
        error: 'Admin key not configured',
      }, { status: 500 });
    }

    if (!chainConfig.contracts.RWAProjectNFT) {
      return NextResponse.json({
        success: false,
        error: `RWAProjectNFT not configured for ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
      }, { status: 500 });
    }

    const projectNFTAddress = chainConfig.contracts.RWAProjectNFT as `0x${string}`;

    console.log(`[${chainConfig.name}] Cancelling project ${projectId}`);
    console.log(`[${chainConfig.name}] Reason:`, reason);

    const publicClient = createChainPublicClient(chainConfig);
    const walletClient = createChainWalletClient(chainConfig, adminKey as `0x${string}`);

    // Get project info
    const project = await publicClient.readContract({
      address: projectNFTAddress,
      abi: RWAProjectNFTABI,
      functionName: 'getProject',
      args: [BigInt(projectId)],
    }) as any;

    const currentStatus = Number(project.status);
    const hasEscrow = !!project.escrowVault && project.escrowVault !== ZERO_ADDRESS;

    console.log(`[${chainConfig.name}] Current status:`, STATUS_NAMES[currentStatus] || currentStatus);
    console.log(`[${chainConfig.name}] Escrow vault:`, project.escrowVault);

    if (currentStatus === NFT_STATUS.CANCELLED) {
      return NextResponse.json({
        success: false,
        error: `Project ${projectId} already cancelled on ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
      }, { status: 400 });
    }

    if (currentStatus === NFT_STATUS.COMPLETED) {
      return NextResponse.json({
        success: false,
        error: `Cannot cancel completed project on ${chainConfig.name}: a completed project is refunded through a dispute`,
        chainId,
        chainName: chainConfig.name,
      }, { status: 400 });
    }

    const results: any = {
      projectId,
      reason,
      previousStatus: STATUS_NAMES[currentStatus] || `Status ${currentStatus}`,
      totalRaised: Number(project.totalRaised) / 1e6,
      totalRaisedFormatted: `$${(Number(project.totalRaised) / 1e6).toLocaleString()}`,
      investorCount: 0,
      transactions: [],
      chainId,
      chainName: chainConfig.name,
      isTestnet: chainConfig.isTestnet,
      explorerUrl: chainConfig.explorerUrl,
    };

    if (hasEscrow) {
      // Cancelling on the escrow vault opens refunds: each investor then calls claimRefund.
      // The vault also marks the project NFT cancelled.
      const vault = project.escrowVault as `0x${string}`;
      const vaultProjectId = await resolveVaultProjectId(chainId, projectId);
      const status = await readVaultFunding(publicClient, vault, vaultProjectId);
      results.totalRaised = Number(status.totalRaised) / 1e6;
      results.totalRaisedFormatted = `$${results.totalRaised.toLocaleString()}`;
      results.investorCount = status.investorCount;
      results.vaultProjectId = vaultProjectId.toString();

      console.log(`[${chainConfig.name}] Cancelling vault project ${vaultProjectId} on ${vault}...`);
      const cancelHash = await openVaultRefunds(publicClient, walletClient, vault, vaultProjectId);
      if (cancelHash) {
        results.transactions.push({
          action: 'cancel',
          hash: cancelHash,
          txUrl: `${chainConfig.explorerUrl}/tx/${cancelHash}`,
        });
      }
      results.refundsEnabled = status.totalRaised > 0n;
      if (!results.refundsEnabled) results.refundReason = 'No funds raised';
      results.escrowVault = vault;
      results.escrowVaultUrl = `${chainConfig.explorerUrl}/address/${vault}`;
    } else {
      // No escrow, nothing to refund: only the project NFT's status changes
      console.log(`[${chainConfig.name}] Marking project NFT ${projectId} cancelled...`);
      const cancelHash = await walletClient.writeContract({
        address: projectNFTAddress,
        abi: RWAProjectNFTABI,
        functionName: 'updateProjectStatus',
        args: [BigInt(projectId), NFT_STATUS.CANCELLED],
      });
      const cancelReceipt = await publicClient.waitForTransactionReceipt({ hash: cancelHash });
      results.transactions.push({
        action: 'cancel',
        hash: cancelHash,
        txUrl: `${chainConfig.explorerUrl}/tx/${cancelHash}`,
        blockNumber: Number(cancelReceipt.blockNumber),
      });
      results.refundsEnabled = false;
      results.refundReason = 'No escrow vault';
    }
    results.cancelled = true;

    results.newStatus = 'Cancelled';
    results.success = true;
    results.message = `Project ${projectId} cancelled successfully on ${chainConfig.name}`;

    console.log(`[${chainConfig.name}] Cancel completed:`, results);

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('Cancel project error:', error);
    
    let errorMessage = error.message || 'Unknown error';
    
    // Parse common contract errors
    if (errorMessage.includes('NotAuthorized') || errorMessage.includes('NotAdmin') || errorMessage.includes('NotOwner')) {
      errorMessage = 'Not authorized to cancel this project';
    } else if (errorMessage.includes('InvalidStatus') || errorMessage.includes('InvalidState')) {
      errorMessage = 'Project is not in a cancellable state';
    } else if (errorMessage.includes('AlreadyCancelled')) {
      errorMessage = 'Project is already cancelled';
    } else if (errorMessage.includes('insufficient funds')) {
      errorMessage = 'Admin account has insufficient funds for gas';
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
    }, { status: 500 });
  }
}

// ============================================================================
// GET - Check if project can be cancelled
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateAdminAccess(request);
  if (!auth.isValid) return auth.error;

  try {
    const { id } = await params;
    const projectId = parseInt(id);
    
    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const chainId = getChainIdFromRequest(request);
    const chainConfig = getChainConfig(chainId);

    if (!chainConfig) {
      return NextResponse.json({
        success: false,
        error: `Unsupported chain ID: ${chainId}`,
      }, { status: 400 });
    }

    if (!chainConfig.contracts.RWAProjectNFT) {
      return NextResponse.json({
        success: false,
        error: `RWAProjectNFT not configured for ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
      }, { status: 500 });
    }

    const projectNFTAddress = chainConfig.contracts.RWAProjectNFT as `0x${string}`;
    const publicClient = createChainPublicClient(chainConfig);

    // Get project info
    const project = await publicClient.readContract({
      address: projectNFTAddress,
      abi: RWAProjectNFTABI,
      functionName: 'getProject',
      args: [BigInt(projectId)],
    }) as any;

    let currentStatus = Number(project.status);
    let totalRaised = Number(project.totalRaised || 0);
    let investorCount = 0;
    const hasEscrow = !!project.escrowVault && project.escrowVault !== ZERO_ADDRESS;

    // The escrow vault is the source of truth for funds and refunds
    let refundsAlreadyEnabled = false;
    let vaultProjectId: string | null = null;
    if (hasEscrow) {
      const id = await resolveVaultProjectId(chainId, projectId);
      const status = await readVaultFunding(publicClient, project.escrowVault as `0x${string}`, id);
      vaultProjectId = id.toString();
      totalRaised = Number(status.totalRaised);
      investorCount = status.investorCount;
      refundsAlreadyEnabled = status.refundsEnabled;
      if (status.state === VAULT_STATE.CANCELLED) currentStatus = NFT_STATUS.CANCELLED;
      if (status.state === VAULT_STATE.COMPLETED) currentStatus = NFT_STATUS.COMPLETED;
    }

    // Determine if cancellable
    const isCancellable = currentStatus !== NFT_STATUS.COMPLETED && currentStatus !== NFT_STATUS.CANCELLED;
    const willNeedRefunds = totalRaised > 0 && hasEscrow;

    return NextResponse.json({
      success: true,
      projectId,
      vaultProjectId,
      currentStatus,
      currentStatusName: STATUS_NAMES[currentStatus] || `Status ${currentStatus}`,
      isCancellable,
      cancellableReason: !isCancellable
        ? (currentStatus === NFT_STATUS.COMPLETED ? 'Project is completed' : 'Project is already cancelled')
        : null,
      totalRaised: totalRaised / 1e6,
      totalRaisedFormatted: `$${(totalRaised / 1e6).toLocaleString()}`,
      investorCount,
      hasEscrow,
      escrowVault: hasEscrow ? project.escrowVault : null,
      willNeedRefunds,
      refundsAlreadyEnabled,
      chainId,
      chainName: chainConfig.name,
      isTestnet: chainConfig.isTestnet,
      projectUrl: `${chainConfig.explorerUrl}/address/${projectNFTAddress}`,
    });
  } catch (error: any) {
    console.error('Error checking project cancel status:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// ============================================================================
// PUT - Batch cancel projects
// ============================================================================

export async function PUT(request: NextRequest) {
  const auth = await validateAdminAccess(request);
  if (!auth.isValid) return auth.error;

  try {
    const body = await request.json();
    // Refunds open whenever a project with an escrow is cancelled; there is no separate switch
    const {
      projectIds,
      chainId: requestedChainId,
    } = body;

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'projectIds array is required',
      }, { status: 400 });
    }

    if (projectIds.length > 10) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 10 projects per batch (cancellations are high-impact operations)',
      }, { status: 400 });
    }

    const chainId = requestedChainId || DEFAULT_CHAIN_ID;
    const chainConfig = getChainConfig(chainId);

    if (!chainConfig) {
      return NextResponse.json({
        success: false,
        error: `Unsupported chain ID: ${chainId}`,
      }, { status: 400 });
    }

    const adminKey = process.env.ADMIN_PRIVATE_KEY || process.env.VERIFIER_PRIVATE_KEY;
    if (!adminKey) {
      return NextResponse.json({
        success: false,
        error: 'Admin key not configured',
      }, { status: 500 });
    }

    if (!chainConfig.contracts.RWAProjectNFT) {
      return NextResponse.json({
        success: false,
        error: `RWAProjectNFT not configured for ${chainConfig.name}`,
      }, { status: 500 });
    }

    const projectNFTAddress = chainConfig.contracts.RWAProjectNFT as `0x${string}`;

    console.log(`[${chainConfig.name}] Batch cancelling projects:`, projectIds);

    const publicClient = createChainPublicClient(chainConfig);
    const walletClient = createChainWalletClient(chainConfig, adminKey as `0x${string}`);

    const results: Array<{
      projectId: number;
      status: 'cancelled' | 'skipped' | 'failed';
      message: string;
      cancelTxHash?: string;
      refundTxHash?: string;
      refundsEnabled?: boolean;
      totalRaised?: number;
    }> = [];

    for (const projectId of projectIds) {
      try {
        // Get project info
        const project = await publicClient.readContract({
          address: projectNFTAddress,
          abi: RWAProjectNFTABI,
          functionName: 'getProject',
          args: [BigInt(projectId)],
        }) as any;

        const currentStatus = Number(project.status);

        // Skip if already cancelled or completed
        if (currentStatus === NFT_STATUS.CANCELLED) {
          results.push({
            projectId,
            status: 'skipped',
            message: 'Already cancelled',
          });
          continue;
        }

        if (currentStatus === NFT_STATUS.COMPLETED) {
          results.push({
            projectId,
            status: 'skipped',
            message: 'Cannot cancel completed project',
          });
          continue;
        }

        const result: any = {
          projectId,
          status: 'cancelled',
          message: 'Project cancelled',
          totalRaised: Number(project.totalRaised) / 1e6,
        };

        if (project.escrowVault && project.escrowVault !== ZERO_ADDRESS) {
          // Cancelling on the escrow vault opens refunds (investors call claimRefund)
          const vault = project.escrowVault as `0x${string}`;
          const vaultProjectId = await resolveVaultProjectId(chainId, projectId);
          const status = await readVaultFunding(publicClient, vault, vaultProjectId);
          const cancelHash = await openVaultRefunds(publicClient, walletClient, vault, vaultProjectId);
          if (cancelHash) result.cancelTxHash = cancelHash;
          result.totalRaised = Number(status.totalRaised) / 1e6;
          result.refundsEnabled = status.totalRaised > 0n;
        } else {
          const cancelHash = await walletClient.writeContract({
            address: projectNFTAddress,
            abi: RWAProjectNFTABI,
            functionName: 'updateProjectStatus',
            args: [BigInt(projectId), NFT_STATUS.CANCELLED],
          });
          await publicClient.waitForTransactionReceipt({ hash: cancelHash });
          result.cancelTxHash = cancelHash;
          result.refundsEnabled = false;
        }

        results.push(result);
      } catch (error: any) {
        results.push({
          projectId,
          status: 'failed',
          message: error.shortMessage || error.message,
        });
      }
    }

    const cancelled = results.filter((r) => r.status === 'cancelled').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const refundsEnabled = results.filter((r) => r.refundsEnabled).length;

    return NextResponse.json({
      success: failed === 0,
      message: `Batch cancel on ${chainConfig.name}: ${cancelled} cancelled, ${skipped} skipped, ${failed} failed`,
      summary: {
        cancelled,
        skipped,
        failed,
        refundsEnabled,
        total: projectIds.length,
      },
      results,
      chainId,
      chainName: chainConfig.name,
      explorerUrl: chainConfig.explorerUrl,
    });
  } catch (error: any) {
    console.error('Batch cancel error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
