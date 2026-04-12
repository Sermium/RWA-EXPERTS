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
    
    console.log('[Deploy] Starting deployment save for:', applicationId);
    console.log('[Deploy] Wallet address:', walletAddress);

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    const body = await request.json();
    console.log('[Deploy] Request body:', JSON.stringify(body, null, 2));

    const {
      token_address,
      nft_address,
      nft_token_id,
      escrow_address,
      deployment_tx_hash,
      metadata_uri,
      chain_id,
    } = body;

    // Get existing application
    const { data: existing, error: fetchError } = await supabase
      .from('tokenization_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError) {
      console.error('[Deploy] Fetch error:', fetchError);
      return NextResponse.json({ error: 'Application not found', details: fetchError.message }, { status: 404 });
    }

    if (!existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    console.log('[Deploy] Found application:', existing.id, 'status:', existing.status);

    // Verify ownership
    if (existing.user_address.toLowerCase() !== walletAddress.toLowerCase()) {
      console.error('[Deploy] Unauthorized - owner:', existing.user_address, 'caller:', walletAddress);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify status is approved
    if (existing.status !== 'approved') {
      console.error('[Deploy] Invalid status:', existing.status);
      return NextResponse.json({ error: `Cannot deploy: status is ${existing.status}, expected approved` }, { status: 400 });
    }

    // Build update object with only valid fields
    const updateData: Record<string, any> = {
      status: 'completed',
      token_address,
      deployment_tx_hash,
      deployed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Only add optional fields if they have values
    if (nft_address) updateData.nft_address = nft_address;
    if (nft_token_id !== null && nft_token_id !== undefined) updateData.nft_token_id = nft_token_id;
    if (escrow_address) updateData.escrow_address = escrow_address;
    if (metadata_uri) updateData.metadata_uri = metadata_uri;
    if (chain_id) updateData.chain_id = chain_id;

    console.log('[Deploy] Update data:', JSON.stringify(updateData, null, 2));

    // Update application with deployment data
    const { data, error } = await supabase
      .from('tokenization_applications')
      .update(updateData)
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      console.error('[Deploy] Supabase update error:', error);
      return NextResponse.json({ 
        error: 'Failed to save deployment', 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    console.log('[Deploy] Update successful:', data.id);

    // Auto-list on exchange if token was deployed
    let listed = false;
    if (token_address) {
      try {
        const { error: listingError } = await supabase.from('exchange_listings').insert({
          token_address,
          token_name: existing.token_name,
          token_symbol: existing.token_symbol,
          owner_address: walletAddress,
          chain_id,
          status: 'active',
          project_id: applicationId,
          created_at: new Date().toISOString(),
        });
        
        if (listingError) {
          console.error('[Deploy] Listing error:', listingError);
        } else {
          listed = true;
        }
      } catch (listingError) {
        console.error('[Deploy] Failed to auto-list token:', listingError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      application: data,
      listed,
    });

  } catch (err: any) {
    console.error('[Deploy] Unhandled error:', err);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: err.message 
    }, { status: 500 });
  }
}
