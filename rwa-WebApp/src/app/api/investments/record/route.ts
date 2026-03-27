import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      project_id,
      investor_address,
      investor_email,
      amount_usd,
      amount_tokens,        // matches your column (not token_amount)
      token_symbol,         // we'll put this in metadata
      payment_method,
      tx_hash,
      payment_intent_id,    // matches your column (not stripe_payment_intent_id)
      payment_reference,
      chain_id,
      metadata,
    } = body;

    if (!project_id || !amount_usd || !payment_method) {
      return NextResponse.json(
        { error: 'Missing required fields: project_id, amount_usd, payment_method' },
        { status: 400 }
      );
    }

    if (payment_method !== 'stripe' && !investor_address) {
      return NextResponse.json(
        { error: 'Crypto payments require investor_address' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Check for duplicate tx_hash (idempotency)
    if (tx_hash) {
      const { data: existing } = await supabase
        .from('investments')
        .select('id')
        .eq('tx_hash', tx_hash)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({
          success: true,
          message: 'Investment already recorded',
          investment_id: existing.id,
          duplicate: true,
        });
      }
    }

    // Check for duplicate payment_intent_id
    if (payment_intent_id) {
      const { data: existing } = await supabase
        .from('investments')
        .select('id')
        .eq('payment_intent_id', payment_intent_id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({
          success: true,
          message: 'Investment already recorded',
          investment_id: existing.id,
          duplicate: true,
        });
      }
    }

    // Build metadata object
    const metadataObj = {
      ...(metadata || {}),
      token_symbol: token_symbol || null,
    };

    // Insert investment
    const { data: investment, error: insertError } = await supabase
      .from('investments')
      .insert({
        project_id,
        investor_address: investor_address?.toLowerCase() || null,
        investor_email: investor_email || null,
        amount_usd: parseFloat(amount_usd),
        amount_tokens: amount_tokens ? parseFloat(amount_tokens) : null,
        payment_method,
        tx_hash: tx_hash || null,
        payment_intent_id: payment_intent_id || null,
        payment_reference: payment_reference || null,
        chain_id: chain_id ? parseInt(chain_id) : null,
        status: 'completed',
        metadata: metadataObj,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to record investment', details: insertError.message },
        { status: 500 }
      );
    }

    // Update project funded_amount
    const { data: project } = await supabase
      .from('crowdfunding_applications')
      .select('funded_amount')
      .eq('id', project_id)
      .single();

    if (project) {
      const currentFunded = parseFloat(project.funded_amount || '0');
      const newFunded = currentFunded + parseFloat(amount_usd);

      await supabase
        .from('crowdfunding_applications')
        .update({ funded_amount: newFunded, updated_at: new Date().toISOString() })
        .eq('id', project_id);

      console.log(`Updated funded_amount: $${currentFunded} → $${newFunded}`);
    }

    return NextResponse.json({
      success: true,
      investment_id: investment.id,
    });

  } catch (error: any) {
    console.error('Record investment error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get('project_id');
    const wallet = searchParams.get('wallet');

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ investments: [] });

    let query = supabase.from('investments').select('*');
    if (project_id) query = query.eq('project_id', project_id);
    if (wallet) query = query.eq('investor_address', wallet.toLowerCase());

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch investments error:', error);
      return NextResponse.json({ investments: [] });
    }
    
    return NextResponse.json({ investments: data || [] });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
