import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    const {
      wallet_address,
      escrow_vault_address,
      security_token_address,
      compliance_address,
      project_nft_id,
      deployment_tx_hash,
      activation_tx_hash,
      chain_id,
      deadline_days,
      activated_at,
      raise_end_date,
    } = body;

    // Validate required fields
    if (!wallet_address || !escrow_vault_address || !security_token_address) {
      return NextResponse.json(
        { error: 'Missing required deployment addresses' },
        { status: 400 }
      );
    }

    // Fetch current application
    const { data: app, error: fetchError } = await supabase
      .from('crowdfunding_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !app) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (app.wallet_address?.toLowerCase() !== wallet_address.toLowerCase()) {
      return NextResponse.json(
        { error: 'Only the project owner can activate' },
        { status: 403 }
      );
    }

    // Verify status is approved
    if (app.status !== 'approved') {
      return NextResponse.json(
        { error: `Cannot activate project with status: ${app.status}` },
        { status: 400 }
      );
    }

    // Update the application
    const { data: updated, error: updateError } = await supabase
      .from('crowdfunding_applications')
      .update({
        status: 'active',
        escrow_vault_address,
        security_token_address,
        compliance_address,
        project_nft_id: project_nft_id ? parseInt(project_nft_id) : null,  // Convert to number
        deployment_tx_hash,
        activation_tx_hash,
        deployed_chain_id: chain_id ? parseInt(chain_id) : null,  // Ensure it's a number
        deployed_at: activated_at,
        activated_at,
        deadline_days: deadline_days ? parseInt(deadline_days) : 30,  // Ensure it's a number
        raise_end_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update application:', updateError);
      return NextResponse.json(
        { error: 'Failed to activate project', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Project activated successfully',
      data: {
        id: updated.id,
        status: updated.status,
        activated_at: updated.activated_at,
        raise_end_date: updated.raise_end_date,
        escrow_vault_address: updated.escrow_vault_address,
        security_token_address: updated.security_token_address,
      }
    });

  } catch (error) {
    console.error('Activation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
