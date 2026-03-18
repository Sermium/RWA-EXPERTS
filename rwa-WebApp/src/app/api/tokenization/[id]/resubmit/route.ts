import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FEES = {
  base: 750,
  escrow: 250,
  dividend: 200,
};

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

    // Verify status is rejected
    if (existing.status !== 'rejected') {
      return NextResponse.json({ error: 'Only rejected applications can be resubmitted' }, { status: 400 });
    }

    // Calculate fee difference
    const originalFee = existing.total_fee_paid || existing.original_fee_paid || existing.fee_amount || FEES.base;
    const newFee = body.feeAmount || FEES.base;
    const feeDifference = Math.max(0, newFee - originalFee);
    
    // Determine new status based on fee difference
    let newStatus = 'pending';
    if (feeDifference > 0) {
      newStatus = 'pending_additional_payment';
    }

    // Build documents object - preserve if not provided
    let documentsData = existing.documents;
    if (body.documents && body.documents.length > 0) {
      documentsData = { 
        files: body.documents,
        website: body.website || existing.website,
        useCase: body.useCase || existing.use_case,
        originalAssetType: body.assetType || existing.asset_type,
      };
    }

    // Update application with correct column names
    const { data, error } = await supabase
      .from('tokenization_applications')
      .update({
        // Contact info - correct column names
        legal_entity_name: body.companyName || existing.legal_entity_name,
        contact_name: body.contactName || existing.contact_name,
        contact_email: body.email || existing.contact_email,
        contact_phone: body.phone || existing.contact_phone,
        contact_telegram: body.telegram || existing.contact_telegram,
        website: body.website || existing.website,
        
        // Asset info
        asset_name: body.assetName || existing.asset_name,
        asset_type: body.assetType || existing.asset_type,
        asset_description: body.assetDescription || existing.asset_description,
        estimated_value: body.estimatedValue 
          ? parseFloat(String(body.estimatedValue).replace(/[^0-9.]/g, '')) 
          : existing.estimated_value,
        use_case: body.useCase || existing.use_case,
        
        // Options - can only add, not remove
        needs_escrow: body.needsEscrow || existing.needs_escrow,
        needs_dividends: body.needsDividends || existing.needs_dividends,
        
        // Fee info
        fee_amount: newFee,
        original_fee_paid: originalFee,
        additional_fee_required: feeDifference > 0 ? feeDifference : null,
        
        // Documents
        documents: documentsData,
        
        // Status - reset review fields
        status: newStatus,
        admin_notes: null,
        rejection_reason: null,
        reviewed_by: null,
        reviewed_at: null,
        
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      console.error('[Resubmit] Error updating application:', error);
      return NextResponse.json({ error: 'Failed to resubmit application' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      application: data,
      requiresPayment: feeDifference > 0,
      feeDifference
    });
  } catch (err) {
    console.error('[Resubmit] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
