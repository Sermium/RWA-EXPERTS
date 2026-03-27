// src/app/api/kyc/limits/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

function formatLimit(value: number | null): string {
  if (value === null) return 'Unlimited';
  if (value === 0) return '$0';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data: tiers, error } = await supabase
      .from('kyc_tier_limits')
      .select('*')
      .order('tier_level', { ascending: true });

    if (error) {
      console.error('[KYC Limits] DB error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch limits' },
        { status: 500 }
      );
    }

    // Build response
    const limits: Record<string, number | null> = {};
    const tiersInfo: Record<string, any> = {};

    for (const tier of tiers || []) {
      const limit = tier.investment_limit === null ? null : Number(tier.investment_limit);
      limits[tier.tier_name] = limit;
      
      tiersInfo[tier.tier_name] = {
        name: tier.tier_name,
        level: tier.tier_level,
        limit: limit,
        formatted: formatLimit(limit),
        dailyLimit: tier.daily_limit ? Number(tier.daily_limit) : null,
        monthlyLimit: tier.monthly_limit ? Number(tier.monthly_limit) : null,
        description: tier.description,
      };
    }

    console.log('[KYC Limits] Fetched from DB:', limits);

    return NextResponse.json({
      success: true,
      limits,
      tiers: tiersInfo,
    });
  } catch (error) {
    console.error('[KYC Limits] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
