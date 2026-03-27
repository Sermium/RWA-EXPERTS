import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http } from 'viem';
import { getChainById, getDeployedChainIds, type SupportedChainId } from '@/config/chains';
import { DEPLOYMENTS } from '@/config/deployments';
import { RWAProjectNFTABI } from '@/config/abis';

interface ChainContractResult {
  error?: string;
  chainName?: string;
  projectNFT?: string;
  factory?: string;
  projectCounter?: string;
  projects?: unknown[];
  loadedCount?: number;
}

interface DebugResults {
  timestamp: string;
  database: {
    count?: number;
    projects?: unknown[];
    error?: string;
  };
  contracts: Record<string, ChainContractResult>;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chainIdParam = searchParams.get('chainId');
  
  const results: DebugResults = {
    timestamp: new Date().toISOString(),
    database: { count: 0, projects: [] },
    contracts: {},
    };

  // 1. Check Database (tokenization_applications with project_type = 'crowdfund')
  try {
    const { data: dbProjects, error: dbError } = await supabase
      .from('tokenization_applications')
      .select('id, asset_name, status, chain_id, project_id, user_address, created_at, fundraising_goal, token_address, escrow_address')
      .eq('project_type', 'crowdfund')
      .order('created_at', { ascending: false });

    if (dbError) {
      results.database = { error: dbError.message };
    } else {
      results.database = {
        count: dbProjects?.length || 0,
        projects: dbProjects?.map(p => ({
          id: p.id,
          name: p.asset_name,
          status: p.status,
          chainId: p.chain_id,
          projectId: p.project_id,
          owner: p.user_address,
          fundingGoal: p.fundraising_goal,
          tokenAddress: p.token_address,
          escrowAddress: p.escrow_address,
          createdAt: p.created_at,
        })),
      };
    }
  } catch (err) {
    results.database = { error: err instanceof Error ? err.message : 'Unknown error' };
  }

  // 2. Check On-Chain (for each deployed chain or specific chain)
  const chainsToCheck = chainIdParam 
    ? [parseInt(chainIdParam)] 
    : getDeployedChainIds();

  for (const chainId of chainsToCheck) {
    const chainInfo = getChainById(chainId as SupportedChainId);
    const deployment = DEPLOYMENTS[chainId as keyof typeof DEPLOYMENTS];

    if (!chainInfo || !deployment?.contracts?.RWAProjectNFT) {
      results.contracts[chainId] = { error: 'Not deployed or no ProjectNFT' };
      continue;
    }

    try {
      const publicClient = createPublicClient({
        chain: chainInfo.chain,
        transport: http(chainInfo.rpcUrl),
      });

      const projectNFTAddress = deployment.contracts.RWAProjectNFT as `0x${string}`;
      const factoryAddress = deployment.contracts.RWALaunchpadFactory as `0x${string}`;

      // Get project counter from factory
      let projectCounter = 0n;
      try {
        projectCounter = await publicClient.readContract({
          address: factoryAddress,
          abi: [{ 
            name: 'projectCounter', 
            type: 'function', 
            stateMutability: 'view', 
            inputs: [], 
            outputs: [{ type: 'uint256' }] 
          }],
          functionName: 'projectCounter',
        }) as bigint;
      } catch (e) {
        // Try nextProjectId if projectCounter doesn't exist
        try {
          projectCounter = await publicClient.readContract({
            address: factoryAddress,
            abi: [{ 
              name: 'nextProjectId', 
              type: 'function', 
              stateMutability: 'view', 
              inputs: [], 
              outputs: [{ type: 'uint256' }] 
            }],
            functionName: 'nextProjectId',
          }) as bigint;
        } catch {
          // Ignore
        }
      }

      const chainResult: Record<string, unknown> = {
        chainName: chainInfo.name,
        projectNFT: projectNFTAddress,
        factory: factoryAddress,
        projectCounter: projectCounter.toString(),
        projects: [],
      };

      // Load individual projects
      const projects: Record<string, unknown>[] = [];
      
      // Try both 0-indexed and 1-indexed
      for (let i = 0; i <= Math.min(Number(projectCounter) + 1, 20); i++) {
        try {
          const projectData = await publicClient.readContract({
            address: projectNFTAddress,
            abi: RWAProjectNFTABI,
            functionName: 'getProject',
            args: [BigInt(i)],
          }) as {
            owner: string;
            securityToken: string;
            escrowVault: string;
            status: number;
            createdAt: bigint;
            fundingGoal: bigint;
            totalRaised: bigint;
            name: string;
            category: string;
          };

          projects.push({
            id: i,
            name: projectData.name,
            owner: projectData.owner,
            status: projectData.status,
            statusLabel: ['Draft', 'Pending', 'Active', 'Funded', 'InProgress', 'Completed', 'Cancelled', 'Failed'][projectData.status] || `Unknown(${projectData.status})`,
            fundingGoal: (Number(projectData.fundingGoal) / 1e6).toFixed(2),
            totalRaised: (Number(projectData.totalRaised) / 1e6).toFixed(2),
            securityToken: projectData.securityToken,
            escrowVault: projectData.escrowVault,
            createdAt: projectData.createdAt > 0n ? new Date(Number(projectData.createdAt) * 1000).toISOString() : null,
          });
        } catch (err) {
          // Project doesn't exist at this index
          if (i <= Number(projectCounter)) {
            projects.push({
              id: i,
              error: err instanceof Error ? err.message : 'Failed to load',
            });
          }
        }
      }

      chainResult.projects = projects;
      chainResult.loadedCount = projects.filter(p => !('error' in p)).length;
      
      results.contracts[chainId] = chainResult;
    } catch (err) {
      results.contracts[chainId] = { 
        error: err instanceof Error ? err.message : 'Unknown error',
        chainName: chainInfo?.name,
      };
    }
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
