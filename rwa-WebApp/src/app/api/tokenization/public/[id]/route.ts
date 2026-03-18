// src/app/api/tokenization/public/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: project, error } = await supabase
      .from('tokenization_applications')
      .select(`
        id,
        status,
        asset_name,
        asset_type,
        asset_description,
        asset_country,
        estimated_value,
        legal_entity_name,
        contact_name,
        website,
        use_case,
        token_name,
        token_symbol,
        token_supply,
        token_address,
        nft_address,
        nft_token_id,
        escrow_address,
        deployment_tx_hash,
        deployed_at,
        needs_escrow,
        needs_dividends,
        documents,
        created_at,
        updated_at,
        chain_id,
        logo_url,
        banner_url,
        user_address
      `)
      .eq('id', id)
      .single();

    if (error || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Only return public projects (completed/deployed) or basic info for others
    // Remove sensitive data
    const publicProject = {
      ...project,
      // Don't expose these in public view
      contact_email: undefined,
      contact_phone: undefined,
      contact_telegram: undefined,
      admin_notes: undefined,
      rejection_reason: undefined,
      reviewed_by: undefined,
      fee_amount: undefined,
      fee_currency: undefined,
      fee_tx_hash: undefined,
      fee_paid_at: undefined,
    };

    return NextResponse.json({ project: publicProject });
  } catch (error) {
    console.error('[API] Error fetching tokenization project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
