// src/app/api/admin/settings/fee/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const DEFAULT_FEES = {
  crowdfunding_fee: 2.5,
  tokenization_fee: 750,
  trading_fee: 1.0,
  dividend_fee: 1.0,
  kyc_fee: 2.5,
  withdrawal_fee: 0.5,
};

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('category', 'fees')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[Fee Settings API] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch fee settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      fees: data?.value || DEFAULT_FEES,
    });

  } catch (error) {
    console.error('[Fee Settings API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const { data, error } = await supabase
      .from('platform_settings')
      .upsert({
        category: 'fees',
        value: body.fees || body,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'category',
      })
      .select()
      .single();

    if (error) {
      console.error('[Fee Settings API] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update fee settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ fees: data.value });

  } catch (error) {
    console.error('[Fee Settings API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
