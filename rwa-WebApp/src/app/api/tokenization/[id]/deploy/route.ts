// src/app/api/tokenization/[id]/deploy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params;
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      token_address,
      nft_address,
      nft_token_id,
      escrow_address,
      dividend_distributor_address,
      deployment_tx_hash,
      distribution_tx_hash,
      metadata_uri,
      chain_id,
      token_distribution,
    } = body;

    // Get existing application
    const { data: existing, error: fetchError } = await supabase
      .from('tokenization_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify ownership
    if (existing.user_address.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify status is approved
    if (existing.status !== 'approved') {
      return NextResponse.json({ error: 'Only approved applications can be deployed' }, { status: 400 });
    }

    // Update application with deployment data
    const { data, error } = await supabase
      .from('tokenization_applications')
      .update({
        status: 'deployed',
        token_address,
        nft_address,
        nft_token_id,
        escrow_address,
        dividend_distributor_address,
        deployment_tx_hash,
        distribution_tx_hash,
        metadata_uri,
        chain_id,
        deployed_at: new Date().toISOString(),
        token_distribution: token_distribution || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      console.error('[Deploy] Error updating application:', error);
      return NextResponse.json({ error: 'Failed to save deployment' }, { status: 500 });
    }

    // Auto-list on exchange if token was deployed
    if (token_address) {
      try {
        await supabase.from('exchange_listings').insert({
          token_address,
          token_name: existing.token_name,
          token_symbol: existing.token_symbol,
          token_decimals: 18,
          owner_address: walletAddress,
          chain_id,
          listing_type: 'security_token',
          status: 'active',
          metadata: {
            asset_type: existing.asset_type,
            asset_name: existing.asset_name,
            application_id: applicationId,
          },
          created_at: new Date().toISOString(),
        });
      } catch (listingError) {
        console.error('[Deploy] Failed to auto-list token:', listingError);
        // Don't fail the deployment if listing fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      application: data,
      listed: !!token_address,
    });

  } catch (err) {
    console.error('[Deploy] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}