import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const roundId = searchParams.get('roundId');

    let query = supabase
      .from('fundraising_investments')
      .select('*, fundraising_rounds(display_name)')
      .order('invested_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('payment_status', status);
    }
    if (roundId) {
      query = query.eq('round_id', roundId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ investments: data });
  } catch (error: any) {
    console.error('Fetch investments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}