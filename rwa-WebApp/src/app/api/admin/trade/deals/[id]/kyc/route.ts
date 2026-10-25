// src/app/api/admin/trade/deals/[id]/kyc/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAccess, logAdminActivity } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase';
import { KYC_LEVEL_INFO } from '@/lib/trade/kyc-authorization';

// PATCH - Record the KYC level verified for a deal's buyer or seller
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateAdminAccess(request);
  if (!auth.isValid) return auth.error;

  try {
    const { id } = await params;
    const { party, level } = await request.json();

    if (party !== 'buyer' && party !== 'seller') {
      return NextResponse.json({ error: 'party must be buyer or seller' }, { status: 400 });
    }
    if (typeof level !== 'string' || !(level in KYC_LEVEL_INFO)) {
      return NextResponse.json({ error: 'Invalid KYC level' }, { status: 400 });
    }

    const column = party === 'buyer' ? 'buyer_kyc_level' : 'seller_kyc_level';
    const supabase = getSupabaseAdmin();
    const { data: deal, error } = await supabase
      .from('trade_deals')
      .update({ [column]: level, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`id, ${column}`)
      .single();

    if (error || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    await logAdminActivity('trade_deal_kyc', auth.walletAddress, null, { deal_id: id, party, level });
    return NextResponse.json({ success: true, deal });
  } catch (error) {
    console.error('[Admin Trade Deal] KYC update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
