// src/app/api/tokenization/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: application, error } = await supabase
      .from('tokenization_applications')
      .select('*')
      .eq('id', id)
      .eq('user_address', walletAddress.toLowerCase())
      .single();

    if (error || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    // Verify ownership
    const { data: application, error: fetchError } = await supabase
      .from('tokenization_applications')
      .select('id, user_address, status')
      .eq('id', id)
      .eq('user_address', walletAddress.toLowerCase())
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Only allow updates for approved applications (before deployment)
    if (application.status !== 'approved' && application.status !== 'creation_ready') {
      return NextResponse.json({ error: 'Cannot update application in current status' }, { status: 400 });
    }

    // Allowed fields to update during token creation
    const allowedFields = [
      'token_name',
      'token_symbol', 
      'token_supply',
      'token_price_estimate',
      'asset_description',
      'logo_url',
      'logo_ipfs',
      'banner_url',
      'banner_ipfs',
      'needs_escrow',
      'funding_goal',
      'funding_deadline',
      'enable_dividends'
    ];

    // Filter only allowed fields
    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('tokenization_applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    return NextResponse.json({ success: true, application: updated });

  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
