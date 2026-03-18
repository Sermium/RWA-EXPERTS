import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    const { id: applicationId } = await params;
    const body = await request.json();

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

    // Build documents object
    let documentsData = existing.documents;
    if (body.documents && body.documents.length > 0) {
      documentsData = { 
        files: body.documents,
        website: body.website || existing.website,
        useCase: body.useCase || existing.use_case,
        originalAssetType: body.assetType || existing.asset_type,
      };
    }

    // Update application data but keep status as rejected (will change after payment)
    const { data, error } = await supabase
      .from('tokenization_applications')
      .update({
        // Contact info
        legal_entity_name: body.companyName || existing.legal_entity_name,
        contact_name: body.contactName || existing.contact_name,
        contact_email: body.email || existing.contact_email,
        contact_phone: body.phone || existing.contact_phone,
        website: body.website || existing.website,
        
        // Asset info
        asset_name: body.assetName || existing.asset_name,
        asset_type: body.assetType || existing.asset_type,
        asset_description: body.assetDescription || existing.asset_description,
        estimated_value: body.estimatedValue 
          ? parseFloat(String(body.estimatedValue).replace(/[^0-9.]/g, '')) 
          : existing.estimated_value,
        use_case: body.useCase || existing.use_case,
        
        // Options
        needs_escrow: body.needsEscrow || existing.needs_escrow,
        needs_dividends: body.needsDividends || existing.needs_dividends,
        
        // Fee info
        fee_amount: body.feeAmount,
        additional_fee_required: body.additionalFeeRequired || null,
        
        // Documents
        documents: documentsData,
        
        // Keep status as rejected - will change to pending after payment
        // status: 'rejected', // Don't change
        
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      console.error('[UpdateDraft] Error:', error);
      return NextResponse.json({ error: 'Failed to save application' }, { status: 500 });
    }

    return NextResponse.json({ success: true, application: data });
  } catch (err) {
    console.error('[UpdateDraft] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
