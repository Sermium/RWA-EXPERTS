import { NextRequest, NextResponse } from 'next/server';
import { getDeployedChainIds } from '@/config/chains';

// This endpoint can be called by a cron job to pre-warm the cache
export async function POST(request: NextRequest) {
  // Verify cron secret (optional security)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const chainIds = getDeployedChainIds();
  const results: Record<number, { success: boolean; count?: number; error?: string }> = {};

  for (const chainId of chainIds) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects/list?chainId=${chainId}&refresh=true`,
        { cache: 'no-store' }
      );
      
      if (response.ok) {
        const data = await response.json();
        results[chainId] = { success: true, count: data.count };
      } else {
        results[chainId] = { success: false, error: 'Failed to fetch' };
      }
    } catch (error) {
      results[chainId] = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
}
