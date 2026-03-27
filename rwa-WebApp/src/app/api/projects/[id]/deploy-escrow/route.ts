import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { DEPLOYMENTS } from '@/config/deployments';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const PROJECTS_DIR = path.join(process.cwd(), '.projects-storage');

const RWAEscrowVaultABI = [
  {
    name: 'createProject',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_securityToken', type: 'address' },
      { name: '_fundingGoal', type: 'uint256' },
      { name: '_deadline', type: 'uint256' },
      { name: '_totalSupply', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'activateProject',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_projectId', type: 'uint256' }],
    outputs: [],
  },
] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  try {
    const body = await request.json();
    const { chainId, securityTokenAddress, fundingGoalUSD, deadlineTimestamp, totalSupply, autoActivate } = body;

    // Validate
    if (!chainId || !securityTokenAddress || !fundingGoalUSD || !deadlineTimestamp || !totalSupply) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const deployment = DEPLOYMENTS[chainId as keyof typeof DEPLOYMENTS];
    if (!deployment?.contracts?.RWAEscrowVault) {
      return NextResponse.json(
        { error: `EscrowVault not deployed on chain ${chainId}` },
        { status: 400 }
      );
    }

    const escrowAddress = deployment.contracts.RWAEscrowVault;
    const OPERATOR_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;

    if (!OPERATOR_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Operator key not configured' },
        { status: 500 }
      );
    }

    // Create clients
    const publicClient = createPublicClient({
      chain: avalancheFuji, // TODO: Dynamic chain
      transport: http(),
    });

    const account = privateKeyToAccount(OPERATOR_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: avalancheFuji,
      transport: http(),
    });

    // Create escrow project
    const fundingGoalInUSDC = parseUnits(fundingGoalUSD.toString(), 6);
    const totalSupplyInWei = parseUnits(totalSupply.toString(), 18);

    const createHash = await walletClient.writeContract({
      address: escrowAddress as `0x${string}`,
      abi: RWAEscrowVaultABI,
      functionName: 'createProject',
      args: [
        BigInt(projectId),
        securityTokenAddress as `0x${string}`,
        fundingGoalInUSDC,
        BigInt(deadlineTimestamp),
        totalSupplyInWei,
      ],
    });

    await publicClient.waitForTransactionReceipt({ hash: createHash });
    console.log(`[Escrow] Created project ${projectId}: ${createHash}`);

    let activateHash: string | undefined;

    // Auto-activate if requested
    if (autoActivate) {
      activateHash = await walletClient.writeContract({
        address: escrowAddress as `0x${string}`,
        abi: RWAEscrowVaultABI,
        functionName: 'activateProject',
        args: [BigInt(projectId)],
      });

      await publicClient.waitForTransactionReceipt({ hash: activateHash });
      console.log(`[Escrow] Activated project ${projectId}: ${activateHash}`);
    }

    // Update local project file
    try {
      const projectPath = path.join(PROJECTS_DIR, `${projectId}.json`);
      const data = await readFile(projectPath, 'utf-8');
      const project = JSON.parse(data);
      
      project.escrowAddress = escrowAddress;
      project.escrowCreatedAt = Date.now();
      project.escrowTxHash = createHash;
      project.status = autoActivate ? 'active' : 'pending_activation';
      project.updatedAt = Date.now();
      
      await writeFile(projectPath, JSON.stringify(project, null, 2));
    } catch (e) {
      console.warn(`[Escrow] Could not update local project file:`, e);
    }

    return NextResponse.json({
      success: true,
      projectId,
      escrowAddress,
      createTxHash: createHash,
      activateTxHash: activateHash,
      status: autoActivate ? 'active' : 'created',
    });

  } catch (error: any) {
    console.error('[Escrow] Deploy error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to deploy escrow' },
      { status: 500 }
    );
  }
}