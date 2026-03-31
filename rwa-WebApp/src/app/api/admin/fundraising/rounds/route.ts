import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { roundId, status, ...updates } = body;

    if (!roundId) {
      return NextResponse.json({ error: 'Round ID required' }, { status: 400 });
    }

    // If activating a round, deactivate others first
    if (status === 'active') {
      await supabase
        .from('fundraising_rounds')
        .update({ status: 'upcoming' })
        .eq('status', 'active');
    }

    const { data, error } = await supabase
      .from('fundraising_rounds')
      .update({ status, ...updates, updated_at: new Date().toISOString() })
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