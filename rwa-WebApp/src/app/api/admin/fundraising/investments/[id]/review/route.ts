// src/app/api/admin/fundraising/investments/[id]/review/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { validateAdminAccess, logAdminActivity } from '@/lib/admin';
import { confirmFundraisingInvestment } from '@/lib/payment-records';

/** A review is final: an investment already decided either way is not reviewed again. */
const DECIDED = ['confirmed', 'failed'];

/** Columns the review is written to, if this database has them. */
const NOTE_COLUMNS = ['admin_notes', 'review_notes', 'notes'];

/**
 * The review is recorded on the investment row in whichever columns exist
 * (fundraising_investments is not in schema.sql, so its columns are read off
 * the row): reviewed_by / reviewed_at, a notes column, else a `metadata`
 * JSON column. It is always written to admin_activity_log as well.
 */
function reviewColumns(row: Record<string, any>, review: { decision: 'confirmed' | 'failed'; reviewer: string; note: string | null; at: string }) {
  const columns: Record<string, unknown> = {};
  if ('payment_status' in row) columns.payment_status = review.decision;
  if (review.decision === 'confirmed' && 'confirmed_at' in row) columns.confirmed_at = review.at;
  if ('reviewed_by' in row) columns.reviewed_by = review.reviewer;
  if ('reviewed_at' in row) columns.reviewed_at = review.at;

  const line = `[${review.at}] ${review.decision === 'confirmed' ? 'Confirmed' : 'Rejected'} by admin ${review.reviewer}${review.note ? `: ${review.note}` : ''}`;
  const noteColumn = NOTE_COLUMNS.find((c) => c in row);
  if (noteColumn) {
    columns[noteColumn] = row[noteColumn] ? `${row[noteColumn]}\n${line}` : line;
  } else if ('metadata' in row) {
    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    columns.metadata = {
      ...metadata,
      admin_review: { decision: review.decision, reviewed_by: review.reviewer, reviewed_at: review.at, note: review.note },
    };
  }
  return columns;
}

/**
 * An admin attests to a payment received off-platform (bank transfer etc.)
 * or rejects the investment.
 *
 * confirm: true  -- confirms the investment and its allocations and updates
 *                   the round totals, through the same code as the payment
 *                   confirm routes and the Stripe webhook.
 * confirm: false -- marks the investment failed and cancels its pending
 *                   allocations; no totals change.
 *
 * Either way the status change is conditional, so an investment already
 * confirmed or failed -- including by a concurrent review or payment -- is
 * refused with 409 and nothing is counted twice.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await validateAdminAccess(request);
    if (!auth.isValid) {
      return (auth as { error?: NextResponse }).error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const reviewer = auth.walletAddress!.toLowerCase();

    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body.confirm !== 'boolean') {
      return NextResponse.json({ error: 'Body must be { confirm: boolean, note?: string }' }, { status: 400 });
    }
    if (body.note !== undefined && body.note !== null && typeof body.note !== 'string') {
      return NextResponse.json({ error: 'note must be a string' }, { status: 400 });
    }
    const note: string | null = body.note?.trim() ? body.note.trim().slice(0, 2000) : null;

    const supabase = getSupabaseAdmin();
    const { data: investment } = await supabase
      .from('fundraising_investments')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!investment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }
    if (DECIDED.includes(investment.status) || DECIDED.includes(investment.payment_status)) {
      return NextResponse.json({ error: `Investment already ${investment.status ?? investment.payment_status}` }, { status: 409 });
    }

    const at = new Date().toISOString();
    const decision = body.confirm ? 'confirmed' : 'failed';
    const extra = reviewColumns(investment, { decision, reviewer, note, at });

    let record: any;
    if (body.confirm) {
      const result = await confirmFundraisingInvestment(supabase, investment, {}, { extra, excludeStatuses: DECIDED });
      if (result.status === 'already_confirmed' || result.status === 'reused') {
        return NextResponse.json({ error: 'Investment already reviewed' }, { status: 409 });
      }
      if (result.status === 'error') {
        console.error('[admin review] confirm failed:', result.error);
        return NextResponse.json({ error: 'Failed to confirm investment' }, { status: 500 });
      }
      record = result.record;
    } else {
      let query = supabase
        .from('fundraising_investments')
        .update({ ...extra, status: 'failed', updated_at: at })
        .eq('id', id);
      for (const status of DECIDED) query = query.neq('status', status);
      const { data: updated, error } = await query.select().maybeSingle();
      if (error) {
        console.error('[admin review] reject failed:', error);
        return NextResponse.json({ error: 'Failed to reject investment' }, { status: 500 });
      }
      if (!updated) {
        return NextResponse.json({ error: 'Investment already reviewed' }, { status: 409 });
      }
      const { error: allocError } = await supabase
        .from('token_allocations')
        .update({ status: 'cancelled', updated_at: at })
        .eq('investment_id', id)
        .eq('status', 'pending');
      if (allocError) console.error('[admin review] allocation cancel failed:', allocError);
      record = updated;
    }

    await logAdminActivity(
      body.confirm ? 'fundraising_investment_confirmed' : 'fundraising_investment_rejected',
      reviewer,
      investment.wallet_address ?? null,
      {
        investment_id: id,
        round_id: investment.round_id ?? null,
        amount_usd: investment.investment_amount_usd ?? null,
        decision,
        note,
        reviewed_at: at,
        basis: body.confirm ? 'admin attestation of off-platform payment' : 'admin rejection',
      },
    );

    return NextResponse.json({ success: true, investment: record });
  } catch (error) {
    console.error('[admin review] error:', error);
    return NextResponse.json({ error: 'Review failed' }, { status: 500 });
  }
}
