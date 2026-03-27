import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, Address } from 'viem';
import { getChainById, getDeployedChainIds, type SupportedChainId } from '@/config/chains';
import { DEPLOYMENTS } from '@/config/deployments';
import { RWAProjectNFTABI, RWASecurityTokenABI } from '@/config/abis';

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

interface CachedProject {
  id: number;
  owner: string;
  fundingGoal: string;
  totalRaised: string;
  deadline: string;
  status: number;
  securityToken: string;
  escrowVault: string;
  createdAt: string;
  metadata?: ProjectMetadata;
  tokenName?: string;
  tokenSymbol?: string;
}

interface ChainCache {
  projects: CachedProject[];
  timestamp: number;
  chainId: number;
}

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const projectsCache: Map<number, ChainCache> = new Map();

// Lock to prevent concurrent fetches for the same chain
const fetchLocks: Map<number, Promise<CachedProject[]>> = new Map();

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// ============================================================================
// HELPERS
// ============================================================================

function isCacheValid(cache: ChainCache | undefined): boolean {
  if (!cache) return false;
  return Date.now() - cache.timestamp < CACHE_DURATION;
}

async function fetchIPFSMetadata(uri: string): Promise<ProjectMetadata | undefined> {
  if (!uri) return undefined;
  
  try {
    const metadataUrl = uri.startsWith('ipfs://')
      ? `https://gateway.pinata.cloud/ipfs/${uri.replace('ipfs://', '')}`
      : uri;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(metadataUrl, { 
      signal: controller.signal,
      next: { revalidate: 3600 } // Cache metadata for 1 hour
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // Ignore metadata fetch errors
  }
  return undefined;
}

async function fetchProjectsFromChain(chainId: number): Promise<CachedProject[]> {
  const chainInfo = getChainById(chainId as SupportedChainId);
  const deployment = DEPLOYMENTS[chainId as keyof typeof DEPLOYMENTS];

  if (!chainInfo || !deployment?.contracts?.RWAProjectNFT) {
    console.log(`[ProjectsAPI] Chain ${chainId} not deployed`);
    return [];
  }

  const publicClient = createPublicClient({
    chain: chainInfo.chain,
    transport: http(chainInfo.rpcUrl),
  });

  const projectNFTAddress = deployment.contracts.RWAProjectNFT as Address;
  
  console.log(`[ProjectsAPI] Fetching projects from chain ${chainId}...`);

  const projects: CachedProject[] = [];
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 5;
  const MAX_SCAN_INDEX = 200;

  // Batch contract reads for better performance
  for (let i = 0; i <= MAX_SCAN_INDEX; i++) {
    try {
      const projectData = await publicClient.readContract({
        address: projectNFTAddress,
        abi: RWAProjectNFTABI,
        functionName: 'getProject',
        args: [BigInt(i)],
      }) as {
        owner: Address;
        securityToken: Address;
        escrowVault: Address;
        status: number;
        createdAt: bigint;
        fundingGoal: bigint;
        totalRaised: bigint;
        name: string;
        category: string;
      };

      if (projectData.owner === ZERO_ADDRESS) {
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && projects.length > 0) {
          console.log(`[ProjectsAPI] Stopping scan at index ${i}`);
          break;
        }
        continue;
      }

      consecutiveFailures = 0;

      // Fetch escrow data
      let deadline = '0';
      let escrowTotalRaised = '0';
      
      if (projectData.escrowVault && projectData.escrowVault !== ZERO_ADDRESS) {
        try {
          const escrowData = await publicClient.readContract({
            address: projectData.escrowVault as Address,
            abi: [
              { 
                inputs: [{ name: '_projectId', type: 'uint256' }], 
                name: 'getProject', 
                outputs: [{ 
                  components: [
                    { name: 'projectId', type: 'uint256' },
                    { name: 'projectOwner', type: 'address' },
                    { name: 'securityToken', type: 'address' },
                    { name: 'paymentToken', type: 'address' },
                    { name: 'priceFeed', type: 'address' },
                    { name: 'fundingGoal', type: 'uint256' },
                    { name: 'totalRaised', type: 'uint256' },
                    { name: 'deadline', type: 'uint256' },
                    { name: 'state', type: 'uint8' },
                    { name: 'createdAt', type: 'uint256' },
                    { name: 'platformFeeBps', type: 'uint256' },
                    { name: 'maxPriceAge', type: 'uint256' }
                  ],
                  type: 'tuple'
                }], 
                stateMutability: 'view', 
                type: 'function' 
              },
            ],
            functionName: 'getProject',
            args: [BigInt(i)],
          }) as { deadline: bigint; totalRaised: bigint };
          
          deadline = escrowData.deadline.toString();
          escrowTotalRaised = escrowData.totalRaised.toString();
        } catch {
          // Ignore escrow errors
        }
      }

      // Fetch metadata
      let metadata: ProjectMetadata | undefined;
      try {
        const tokenURI = await publicClient.readContract({
          address: projectNFTAddress,
          abi: RWAProjectNFTABI,
          functionName: 'tokenURI',
          args: [BigInt(i)],
        }) as string;

        if (tokenURI && tokenURI.length > 10) {
          metadata = await fetchIPFSMetadata(tokenURI);
        }
      } catch {
        // Ignore metadata errors
      }

      // Fetch token info
      let tokenName: string | undefined;
      let tokenSymbol: string | undefined;

      if (projectData.securityToken && projectData.securityToken !== ZERO_ADDRESS) {
        try {
          const [name, symbol] = await Promise.all([
            publicClient.readContract({
              address: projectData.securityToken,
              abi: RWASecurityTokenABI,
              functionName: 'name',
            }),
            publicClient.readContract({
              address: projectData.securityToken,
              abi: RWASecurityTokenABI,
              functionName: 'symbol',
            }),
          ]);
          tokenName = name as string;
          tokenSymbol = symbol as string;
        } catch {
          // Ignore token errors
        }
      }

      const totalRaised = BigInt(escrowTotalRaised) > 0n 
        ? escrowTotalRaised 
        : projectData.totalRaised.toString();

      projects.push({
        id: i,
        owner: projectData.owner,
        fundingGoal: projectData.fundingGoal.toString(),
        totalRaised,
        deadline,
        status: projectData.status,
        securityToken: projectData.securityToken,
        escrowVault: projectData.escrowVault,
        createdAt: projectData.createdAt.toString(),
        metadata,
        tokenName: tokenName || projectData.name,
        tokenSymbol,
      });

      console.log(`[ProjectsAPI] Loaded project #${i}: ${projectData.name}`);
    } catch {
      consecutiveFailures++;
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && projects.length > 0) {
        break;
      }
    }
  }

  console.log(`[ProjectsAPI] Fetched ${projects.length} projects from chain ${chainId}`);
  return projects;
}

async function getProjectsWithCache(chainId: number, forceRefresh = false): Promise<CachedProject[]> {
  // Check cache first
  if (!forceRefresh) {
    const cached = projectsCache.get(chainId);
    if (isCacheValid(cached)) {
      console.log(`[ProjectsAPI] Cache hit for chain ${chainId}`);
      return cached!.projects;
    }
  }

  // Check if already fetching
  const existingFetch = fetchLocks.get(chainId);
  if (existingFetch) {
    console.log(`[ProjectsAPI] Waiting for existing fetch for chain ${chainId}`);
    return existingFetch;
  }

  // Start new fetch
  const fetchPromise = fetchProjectsFromChain(chainId);
  fetchLocks.set(chainId, fetchPromise);

  try {
    const projects = await fetchPromise;
    
    // Update cache
    projectsCache.set(chainId, {
      projects,
      timestamp: Date.now(),
      chainId,
    });

    return projects;
  } finally {
    fetchLocks.delete(chainId);
  }
}

// ============================================================================
// API HANDLERS
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chainIdParam = searchParams.get('chainId');
  const forceRefresh = searchParams.get('refresh') === 'true';

  if (!chainIdParam) {
    return NextResponse.json({ error: 'chainId is required' }, { status: 400 });
  }

  const chainId = parseInt(chainIdParam);
  
  if (isNaN(chainId)) {
    return NextResponse.json({ error: 'Invalid chainId' }, { status: 400 });
  }

  const chainInfo = getChainById(chainId as SupportedChainId);
  if (!chainInfo) {
    return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 });
  }

  try {
    const startTime = Date.now();
    const projects = await getProjectsWithCache(chainId, forceRefresh);
    const duration = Date.now() - startTime;

    const cached = projectsCache.get(chainId);
    const cacheAge = cached ? Math.floor((Date.now() - cached.timestamp) / 1000) : 0;

    return NextResponse.json({
      success: true,
      chainId,
      chainName: chainInfo.name,
      count: projects.length,
      projects,
      cache: {
        hit: !forceRefresh && cacheAge > 0,
        age: cacheAge,
        maxAge: CACHE_DURATION / 1000,
      },
      timing: {
        duration,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('[ProjectsAPI] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch projects',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
