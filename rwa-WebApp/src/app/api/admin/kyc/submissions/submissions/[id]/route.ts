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

    // Note: Using admin client, so no user auth check here
    // Add your own auth logic (e.g., check wallet signature in header)

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
    const { status, rejection_reason, kyc_tier, reviewed_by } = body;

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

    // If approved, update user's KYC tier
    if (status === 'approved' && kyc_tier && submission.user_id) {
      await supabase
        .from('profiles')
        .update({
          kyc_status: 'verified',
          kyc_tier: kyc_tier,
          kyc_verified_at: new Date().toISOString()
        })
        .eq('id', submission.user_id);
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
