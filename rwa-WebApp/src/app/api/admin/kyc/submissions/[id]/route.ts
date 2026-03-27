// src/app/api/admin/kyc/submissions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = params;

    const { data: submission, error } = await supabase
      .from('kyc_submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ submission });

  } catch (error) {
    console.error('[KYC API] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = params;

    const body = await request.json();
    const { status, rejection_reason, reviewed_by } = body;

    // Update submission
    const { data: submission, error } = await supabase
      .from('kyc_submissions')
      .update({
        status,
        rejection_reason: status === 'rejected' ? rejection_reason : null,
        reviewed_by,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If approved, update current_level to requested_level
    if (status === 'approved' && submission.wallet_address) {
      await supabase
        .from('kyc_submissions')
        .update({
          current_level: submission.requested_level
        })
        .eq('id', id);

      // Also update kyc_data table if you have one
      await supabase
        .from('kyc_data')
        .upsert({
          wallet_address: submission.wallet_address.toLowerCase(),
          kyc_level: submission.requested_level,
          updated_at: new Date().toISOString()
        }, { onConflict: 'wallet_address' });
    }

    return NextResponse.json({ submission });

  } catch (error) {
    console.error('[KYC API] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
