// src/app/api/admin/trade/deals/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAccess, logAdminActivity } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase';
import { DEAL_STAGES, type DealStage } from '@/lib/trade/constants';

// PATCH - Move a deal to another stage (admin override)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateAdminAccess(request);
  if (!auth.isValid) return auth.error;

  try {
    const { id } = await params;
    const { stage } = await request.json();

    if (typeof stage !== 'string' || !(stage in DEAL_STAGES)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: deal, error } = await supabase
      .from('trade_deals')
      .update({ stage, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, stage')
      .single();

    if (error || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Both parties see the override on the deal's timeline.
    await supabase.from('trade_timeline').insert({
      deal_id: id,
      type: 'stage_change',
      title: `Stage set to ${DEAL_STAGES[stage as DealStage].label} by an administrator`,
      actor: auth.walletAddress,
      metadata: { stage, by: 'admin' },
    });
    await logAdminActivity('trade_deal_stage', auth.walletAddress, null, { deal_id: id, stage });

    return NextResponse.json({ success: true, deal });
  } catch (error) {
    console.error('[Admin Trade Deal] Stage update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
