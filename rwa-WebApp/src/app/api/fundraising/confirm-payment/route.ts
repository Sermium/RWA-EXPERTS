import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    const body = await request.json();
    const {
      investmentId,
      paymentIntentId,
      txHash,
      paymentMethod,
      token,
      chainId
    } = body;

    if (!investmentId) {
      return NextResponse.json({ error: 'Missing investment ID' }, { status: 400 });
    }

    // Get the investment first
    const { data: existingInvestment, error: fetchError } = await supabase
      .from('fundraising_investments')
      .select('*')
      .eq('id', investmentId)
      .single();

    if (fetchError || !existingInvestment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    // Update investment status
    const { data: investment, error: updateError } = await supabase
      .from('fundraising_investments')
      .update({
        status: 'confirmed',
        payment_confirmed_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId || null,
        tx_hash: txHash || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', investmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Investment update error:', updateError);
      return NextResponse.json({ error: 'Failed to confirm investment' }, { status: 500 });
    }

    // Update token allocations status
    const { error: allocUpdateError } = await supabase
      .from('token_allocations')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('investment_id', investmentId);

    if (allocUpdateError) {
      console.error('Token allocation update error:', allocUpdateError);
    }

    // Update round raised amount
    const { error: roundUpdateError } = await supabase
      .from('fundraising_rounds')
      .update({
        raised_amount_usd: existingInvestment.round_id ? 
          supabase.rpc('get_round_raised', { p_round_id: existingInvestment.round_id }) + investment.investment_amount_usd :
          investment.investment_amount_usd,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingInvestment.round_id);

    // Alternative: Use RPC function
    if (roundUpdateError) {
      await supabase.rpc('increment_round_raised', {
        p_round_id: existingInvestment.round_id,
        p_amount: investment.investment_amount_usd
      });
    }

    // Check if new investor for this round
    const { data: existingInvestments, error: checkError } = await supabase
      .from('fundraising_investments')
      .select('id')
      .eq('round_id', existingInvestment.round_id)
      .eq('wallet_address', existingInvestment.wallet_address)
      .eq('status', 'confirmed')
      .neq('id', investmentId);

    if (!checkError && (!existingInvestments || existingInvestments.length === 0)) {
      // New investor - increment count
      await supabase.rpc('increment_round_investors', {
        p_round_id: existingInvestment.round_id
      });
    }

    return NextResponse.json({
      success: true,
      investment
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 });
  }
}
