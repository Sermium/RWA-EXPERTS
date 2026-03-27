// src/app/api/token/[address]/holders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';

// Explorer API URLs
const EXPLORER_APIS: Record<number, { url: string; apiKey?: string }> = {
  1: { url: 'https://api.etherscan.io/api' },
  11155111: { url: 'https://api-sepolia.etherscan.io/api' },
  137: { url: 'https://api.polygonscan.com/api' },
  80002: { url: 'https://api-amoy.polygonscan.com/api' },
  43114: { url: 'https://api.snowtrace.io/api' },
  43113: { url: 'https://api-testnet.snowtrace.io/api' },
  56: { url: 'https://api.bscscan.com/api' },
  97: { url: 'https://api-testnet.bscscan.com/api' },
  42161: { url: 'https://api.arbiscan.io/api' },
  421614: { url: 'https://api-sepolia.arbiscan.io/api' },
  10: { url: 'https://api-optimistic.etherscan.io/api' },
  11155420: { url: 'https://api-sepolia-optimistic.etherscan.io/api' },
  8453: { url: 'https://api.basescan.org/api' },
  84532: { url: 'https://api-sepolia.basescan.org/api' },
};

// RPC URLs for fallback
const RPC_URLS: Record<number, string> = {
  1: 'https://eth.llamarpc.com',
  11155111: 'https://rpc.sepolia.org',
  137: 'https://polygon-rpc.com',
  80002: 'https://rpc-amoy.polygon.technology',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
  43113: 'https://api.avax-test.network/ext/bc/C/rpc',
  56: 'https://bsc-dataseed.binance.org',
  97: 'https://data-seed-prebsc-1-s1.binance.org:8545',
  42161: 'https://arb1.arbitrum.io/rpc',
  421614: 'https://sepolia-rollup.arbitrum.io/rpc',
  10: 'https://mainnet.optimism.io',
  11155420: 'https://sepolia.optimism.io',
  8453: 'https://mainnet.base.org',
  84532: 'https://sepolia.base.org',
};

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const;

interface Holder {
  address: string;
  balance: string;
  percentage: string;
  isOwner: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: tokenAddress } = await params;
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get('chainId') || '80002');

    console.log(`[Token Holders] Fetching for ${tokenAddress} on chain ${chainId}`);

    const rpcUrl = RPC_URLS[chainId];
    if (!rpcUrl) {
      return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 });
    }

    const client = createPublicClient({
      transport: http(rpcUrl),
    });

    // Get token info
    let decimals = 18;
    let totalSupply = 0n;
    let symbol = 'TOKEN';

    try {
      const [dec, supply, sym] = await Promise.all([
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'totalSupply',
        }),
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }),
      ]);
      decimals = dec;
      totalSupply = supply;
      symbol = sym;
      console.log(`[Token Holders] Token info: ${symbol}, decimals: ${decimals}, supply: ${totalSupply}`);
    } catch (err) {
      console.error('[Token Holders] Error fetching token info:', err);
    }

    // Try explorer API first
    const explorerApi = EXPLORER_APIS[chainId];
    let holders: Holder[] = [];

    if (explorerApi) {
      try {
        // Get token holders from explorer API
        const holdersUrl = `${explorerApi.url}?module=token&action=tokenholderlist&contractaddress=${tokenAddress}&page=1&offset=100${explorerApi.apiKey ? `&apikey=${explorerApi.apiKey}` : ''}`;
        
        console.log(`[Token Holders] Fetching from explorer: ${holdersUrl}`);
        
        const response = await fetch(holdersUrl, {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 60 }, // Cache for 1 minute
        });
        
        const data = await response.json();
        console.log(`[Token Holders] Explorer response status: ${data.status}, message: ${data.message}`);

        if (data.status === '1' && Array.isArray(data.result)) {
          holders = data.result.map((h: any) => {
            const balance = h.TokenHolderQuantity || h.value || '0';
            const balanceNum = parseFloat(formatUnits(BigInt(balance), decimals));
            const percentage = totalSupply > 0n
              ? ((Number(BigInt(balance)) / Number(totalSupply)) * 100).toFixed(2)
              : '0';
            
            return {
              address: h.TokenHolderAddress || h.address,
              balance: balanceNum.toLocaleString(undefined, { maximumFractionDigits: 4 }),
              percentage,
              isOwner: false,
            };
          });

          // Mark top holder as owner if they hold majority
          if (holders.length > 0 && parseFloat(holders[0].percentage) > 50) {
            holders[0].isOwner = true;
          }

          console.log(`[Token Holders] Found ${holders.length} holders from explorer`);
        } else {
          console.log(`[Token Holders] Explorer API returned no holders or error: ${data.message}`);
        }
      } catch (err) {
        console.error('[Token Holders] Explorer API error:', err);
      }
    }

    // Fallback: Get transfers from explorer API and derive holders
    if (holders.length === 0 && explorerApi) {
      try {
        const transfersUrl = `${explorerApi.url}?module=account&action=tokentx&contractaddress=${tokenAddress}&page=1&offset=1000&sort=desc${explorerApi.apiKey ? `&apikey=${explorerApi.apiKey}` : ''}`;
        
        console.log(`[Token Holders] Fetching transfers from explorer`);
        
        const response = await fetch(transfersUrl, {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 60 },
        });
        
        const data = await response.json();

        if (data.status === '1' && Array.isArray(data.result)) {
          // Collect unique addresses
          const uniqueAddresses = new Set<string>();
          
          for (const tx of data.result) {
            if (tx.from && tx.from !== '0x0000000000000000000000000000000000000000') {
              uniqueAddresses.add(tx.from.toLowerCase());
            }
            if (tx.to && tx.to !== '0x0000000000000000000000000000000000000000') {
              uniqueAddresses.add(tx.to.toLowerCase());
            }
          }

          console.log(`[Token Holders] Found ${uniqueAddresses.size} unique addresses from transfers`);

          // Fetch balances for unique addresses
          const addressList = Array.from(uniqueAddresses).slice(0, 50);
          
          const balanceResults = await Promise.all(
            addressList.map(async (addr) => {
              try {
                const balance = await client.readContract({
                  address: tokenAddress as `0x${string}`,
                  abi: ERC20_ABI,
                  functionName: 'balanceOf',
                  args: [addr as `0x${string}`],
                });
                return { address: addr, balance };
              } catch {
                return { address: addr, balance: 0n };
              }
            })
          );

          holders = balanceResults
            .filter((h) => h.balance > 0n)
            .map((h) => {
              const balanceFormatted = formatUnits(h.balance, decimals);
              const percentage = totalSupply > 0n
                ? ((Number(h.balance) / Number(totalSupply)) * 100).toFixed(2)
                : '0';
              
              return {
                address: h.address,
                balance: parseFloat(balanceFormatted).toLocaleString(undefined, { maximumFractionDigits: 4 }),
                percentage,
                isOwner: false,
              };
            })
            .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));

          if (holders.length > 0 && parseFloat(holders[0].percentage) > 50) {
            holders[0].isOwner = true;
          }
        }
      } catch (err) {
        console.error('[Token Holders] Transfer fetch error:', err);
      }
    }

    // Final fallback: Use on-chain data from project owner
    if (holders.length === 0 && totalSupply > 0n) {
      console.log('[Token Holders] Using fallback - checking for initial mint recipient');
      
      // The token was likely minted to the deployer
      // We can't determine who without events, so return empty with supply info
      return NextResponse.json({
        holders: [],
        totalSupply: formatUnits(totalSupply, decimals),
        decimals,
        symbol,
        note: 'Holder data unavailable. Check the block explorer for details.',
      });
    }

    console.log(`[Token Holders] Returning ${holders.length} holders`);

    return NextResponse.json({
      holders,
      totalSupply: formatUnits(totalSupply, decimals),
      decimals,
      symbol,
    });

  } catch (error) {
    console.error('[Token Holders] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holders', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
