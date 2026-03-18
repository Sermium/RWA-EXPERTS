import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { txHash, paymentToken, chainId, isAdditionalPayment } = await request.json();

    if (!txHash) {
      return NextResponse.json({ error: 'Transaction hash required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify application exists and belongs to user
    const { data: application, error: fetchError } = await supabase
      .from('tokenization_applications')
      .select('*')
      .eq('id', id)
      .eq('user_address', walletAddress.toLowerCase())
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Accept multiple statuses
    const payableStatuses = ['approved', 'rejected', 'payment_pending'];
    if (!payableStatuses.includes(application.status)) {
      return NextResponse.json({ error: 'Application is not awaiting payment' }, { status: 400 });
    }

    let updateData: Record<string, any> = {
      payment_token: paymentToken || 'USDC',
      updated_at: new Date().toISOString()
    };

    if (isAdditionalPayment || application.status === 'rejected') {
      // Additional payment from resubmit - set to pending for review
      const previousPaid = application.original_fee_paid || application.fee_amount || 0;
      const additionalPaid = application.additional_fee_required || 0;
      
      updateData = {
        ...updateData,
        status: 'pending', // Go to pending for review
        total_fee_paid: previousPaid + additionalPaid,
        additional_fee_required: null,
        additional_payment_tx_hash: txHash,
        additional_payment_at: new Date().toISOString(),
        // Clear rejection
        admin_notes: null,
        rejection_reason: null,
        reviewed_by: null,
        reviewed_at: null,
      };
    } else {
      // Initial payment
      updateData = {
        ...updateData,
        status: 'creation_ready',
        payment_tx_hash: txHash,
        payment_confirmed_at: new Date().toISOString(),
        original_fee_paid: application.fee_amount,
        total_fee_paid: application.fee_amount,
      };
    }

    // Update application
    const { error: updateError } = await supabase
      .from('tokenization_applications')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ 
      success: true, 
      message: isAdditionalPayment ? 'Application resubmitted for review' : 'Payment confirmed',
      isAdditionalPayment: isAdditionalPayment || application.status === 'rejected'
    });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
