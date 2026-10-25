// src/app/api/admin/trade/disputes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAccess, logAdminActivity } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase';

// The off-chain statuses the dispute screen offers (DisputeManagement STATUS_CONFIG).
const STATUSES = [
  'submitted', 'under_review', 'evidence_requested', 'mediation', 'arbitration',
  'resolved_buyer', 'resolved_seller', 'resolved_split', 'resolved_refund', 'resolved_dismissed',
  'withdrawn',
];

// PATCH - Change a dispute's status (the screen's per-dispute actions)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateAdminAccess(request);
  if (!auth.isValid) return auth.error;

  try {
    const { id } = await params;
    const { status, resolution } = await request.json();

    if (typeof status !== 'string' || !STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const closing = status.startsWith('resolved') || status === 'withdrawn';
    const supabase = getSupabaseAdmin();
    const { data: dispute, error } = await supabase
      .from('trade_disputes')
      .update({
        status,
        ...(typeof resolution === 'string' ? { resolution } : {}),
        // The admin who closed it is the signed-in one.
        ...(closing ? { resolved_at: now, resolved_by: auth.walletAddress } : {}),
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    await logAdminActivity('trade_dispute_status', auth.walletAddress, null, { dispute_id: id, status });
    return NextResponse.json({ success: true, dispute });
  } catch (error) {
    console.error('[Admin Trade Dispute] Update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
