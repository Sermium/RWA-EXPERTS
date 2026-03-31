import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data: rounds, error } = await supabase
      .from('fundraising_rounds')
      .select('*')
      .order('token_price_usd', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ rounds });
  } catch (error: any) {
    console.error('Fetch rounds error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { roundId, ...updates } = body;

    if (!roundId) {
      return NextResponse.json({ error: 'Round ID required' }, { status: 400 });
    }

    // If activating a round, deactivate others first
    if (updates.status === 'active') {
      await supabase
        .from('fundraising_rounds')
        .update({ status: 'upcoming' })
        .eq('status', 'active');
    }

    // Clean up the updates object
    const allowedFields = [
      'status',
      'display_name',
      'token_price_usd',
      'min_investment_usd',
      'max_investment_usd',
      'target_amount_usd',
      'token_allocation_percent',
      'token_allocation_amount',
      'vesting_months',
      'start_date',
      'end_date',
      'deliverables',
      'timeline'
    ];

    const cleanUpdates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        cleanUpdates[key] = updates[key];
      }
    }
    cleanUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('fundraising_rounds')
      .update(cleanUpdates)
      .eq('id', roundId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, round: data });
  } catch (error: any) {
    console.error('Update round error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
