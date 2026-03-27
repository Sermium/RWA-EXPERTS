// src/app/api/admin/kyc/submissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const offset = (page - 1) * limit;

    let query = supabase
      .from('kyc_submissions')
      .select('*', { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[KYC Submissions API] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch submissions', details: error.message },
        { status: 500 }
      );
    }

    // Map to consistent format
    const submissions = (data || []).map(sub => ({
      id: sub.id,
      wallet_address: sub.wallet_address,
      email: sub.email,
      full_name: sub.full_name,
      tier: sub.tier || sub.requested_level,
      current_level: sub.current_level,
      requested_level: sub.requested_level,
      status: sub.status,
      is_upgrade: sub.is_upgrade,
      // Documents
      selfie_url: sub.selfie_url,
      id_document_front_url: sub.id_document_front_url,
      id_document_back_url: sub.id_document_back_url,
      address_proof_url: sub.address_proof_url,
      accredited_proof_url: sub.accredited_proof_url,
      // Verification
      document_type: sub.document_type,
      document_number: sub.document_number,
      date_of_birth: sub.date_of_birth,
      country_code: sub.country_code,
      liveness_passed: sub.liveness_passed,
      liveness_score: sub.liveness_score,
      id_validation_passed: sub.id_validation_passed,
      id_validation_score: sub.id_validation_score,
      id_requires_manual_review: sub.id_requires_manual_review,
      // Review
      reviewed_by: sub.reviewed_by,
      reviewed_at: sub.reviewed_at,
      rejection_reason: sub.rejection_reason,
      // Timestamps
      created_at: sub.created_at,
      updated_at: sub.updated_at,
    }));

    return NextResponse.json({
      submissions,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    console.error('[KYC Submissions API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
