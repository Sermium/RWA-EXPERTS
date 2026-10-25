// src/app/api/admin/trade/deals/[id]/flag/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAccess, logAdminActivity } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase';

// PATCH - Flag a deal for review, or clear the flag
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateAdminAccess(request);
  if (!auth.isValid) return auth.error;

  try {
    const { id } = await params;
    const { flagged, reason } = await request.json();

    if (typeof flagged !== 'boolean') {
      return NextResponse.json({ error: 'flagged must be true or false' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: deal, error } = await supabase
      .from('trade_deals')
      .update({
        flagged,
        flag_reason: flagged && typeof reason === 'string' ? reason : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, flagged, flag_reason')
      .single();

    if (error || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    await logAdminActivity(flagged ? 'trade_deal_flag' : 'trade_deal_unflag', auth.walletAddress, null, { deal_id: id, reason });
    return NextResponse.json({ success: true, deal });
  } catch (error) {
    console.error('[Admin Trade Deal] Flag error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
