// src/app/api/admin/settings/fee/stats/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { DEFAULT_PLATFORM_FEES } from '@/lib/feesService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Fetch platform fees from DB (not from feesService which is client-side only)
    let platformFees = { ...DEFAULT_PLATFORM_FEES };
    
    const { data: feeData } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('category', 'platform_fees')
      .single();

    if (feeData?.value) {
      platformFees = { ...platformFees, ...feeData.value };
    }

    // ... rest of your stats logic using platformFees from DB
    
    // Example: Fetch crowdfunding applications
    const { data: crowdfundingApps } = await supabase
      .from('crowdfunding_applications')
      .select('*')
      .eq('payment_status', 'paid');

    const crowdfundingCount = crowdfundingApps?.length || 0;
    const crowdfundingFees = crowdfundingCount * platformFees.CROWDFUNDING_SUBMISSION_FEE;

    // Fetch tokenization applications
    const { data: tokenizationApps } = await supabase
      .from('tokenization_applications')
      .select('*')
      .eq('payment_status', 'paid');

    const tokenizationCount = tokenizationApps?.length || 0;
    const tokenizationFees = tokenizationCount * platformFees.TOKENIZATION_SUBMISSION_FEE;

    const totalCollected = crowdfundingFees + tokenizationFees;

    // Calculate this month / last month / this year
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // This month crowdfunding
    const { data: thisMonthCrowdfunding } = await supabase
      .from('crowdfunding_applications')
      .select('*')
      .eq('payment_status', 'paid')
      .gte('created_at', startOfMonth.toISOString());

    // Last month crowdfunding
    const { data: lastMonthCrowdfunding } = await supabase
      .from('crowdfunding_applications')
      .select('*')
      .eq('payment_status', 'paid')
      .gte('created_at', startOfLastMonth.toISOString())
      .lte('created_at', endOfLastMonth.toISOString());

    const thisMonthFees = (thisMonthCrowdfunding?.length || 0) * platformFees.CROWDFUNDING_SUBMISSION_FEE;
    const lastMonthFees = (lastMonthCrowdfunding?.length || 0) * platformFees.CROWDFUNDING_SUBMISSION_FEE;

    const stats = {
      total_collected: totalCollected,
      crowdfunding_fees: crowdfundingFees,
      tokenization_fees: tokenizationFees,
      trading_fees: 0,
      dividend_fees: 0,
      kyc_fees: 0,
      withdrawal_fees: 0,
      this_month: thisMonthFees,
      last_month: lastMonthFees,
      this_year: totalCollected, // Simplified
      counts: {
        crowdfunding: crowdfundingCount,
        tokenization: tokenizationCount,
        trading: 0,
      },
      config: platformFees, // Now from DB!
    };

    console.log('[Fee Stats] Final stats:', JSON.stringify(stats, null, 2));

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Fee Stats] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
