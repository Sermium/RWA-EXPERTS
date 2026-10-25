import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatUnits, isAddress } from 'viem';
import {
  isPaymentIntentId,
  isTxHash,
  retrievePaymentIntent,
  tokenDecimals,
  verifyVaultInvestment,
} from '@/lib/payment-verification';
import { checkCrowdfundingInvestmentIntent, recordCrowdfundingInvestment } from '@/lib/payment-records';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return createClient(url, key);
}

/** Amounts are USD stablecoins; a cent of rounding is tolerated, nothing more. */
const sameUsd = (a: number, b: number) => Math.abs(a - b) < 0.01;

/**
 * Records an investment in a crowdfunding project once it is proven:
 *
 * - crypto: `tx_hash` must be a successful transaction on the project's chain
 *   whose receipt carries the project's escrow vault `InvestmentReceived`
 *   event for this project (its on-chain id, project_nft_id) and this
 *   investor. The amount recorded is the event's amount.
 * - card: `payment_intent_id` must be a succeeded USD PaymentIntent of type
 *   crowdfunding_investment for this project (and investor, when the intent
 *   names one). The amount recorded is what Stripe charged.
 *
 * A transaction or PaymentIntent already recorded is refused (409). The
 * Stripe webhook records card payments through the same code.
 */
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
    if (investor_address && !isAddress(investor_address)) {
      return NextResponse.json({ error: 'Invalid investor_address' }, { status: 400 });
    }

    const claimedUsd = parseFloat(amount_usd);
    if (!Number.isFinite(claimedUsd) || claimedUsd <= 0) {
      return NextResponse.json({ error: 'Invalid amount_usd' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { data: project } = await supabase
      .from('crowdfunding_applications')
      .select('*')
      .eq('id', project_id)
      .maybeSingle();
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Build metadata object
    const metadataObj = {
      ...(metadata || {}),
      token_symbol: token_symbol || null,
    };

    let row: Parameters<typeof recordCrowdfundingInvestment>[1];

    if (payment_method === 'stripe') {
      if (!isPaymentIntentId(payment_intent_id)) {
        return NextResponse.json({ error: 'Card payments require a payment_intent_id' }, { status: 400 });
      }

      const { data: reused } = await supabase
        .from('investments')
        .select('id')
        .eq('payment_intent_id', payment_intent_id)
        .limit(1)
        .maybeSingle();
      if (reused) {
        return NextResponse.json({ error: 'This payment has already been recorded', investment_id: reused.id }, { status: 409 });
      }

      const retrieved = await retrievePaymentIntent(payment_intent_id);
      if (!retrieved.ok) return NextResponse.json({ error: retrieved.error }, { status: retrieved.status });
      const checked = checkCrowdfundingInvestmentIntent(retrieved.value, {
        projectId: String(project_id),
        amountUsd: claimedUsd,
        investorAddress: retrieved.value.metadata?.investorAddress && investor_address ? investor_address : undefined,
      });
      if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: checked.status });

      const investor = investor_address || retrieved.value.metadata?.investorAddress;
      if (!investor || !isAddress(investor)) {
        return NextResponse.json({ error: 'No investor address for this payment' }, { status: 400 });
      }

      const chainId = Number(retrieved.value.metadata?.chainId) || Number(project.deployed_chain_id ?? project.chain_id) || null;
      row = {
        project_id,
        investor_address: investor,
        investor_email: investor_email || null,
        amount_usd: retrieved.value.amount / 100,
        amount_tokens: amount_tokens ? parseFloat(amount_tokens) : null,
        payment_method: 'stripe',
        payment_intent_id,
        payment_reference: payment_reference || null,
        chain_id: chainId,
        metadata: metadataObj,
      };
    } else {
      if (!isTxHash(tx_hash)) {
        return NextResponse.json({ error: 'Crypto payments require a tx_hash' }, { status: 400 });
      }
      const hash = tx_hash.toLowerCase();

      const { data: reused } = await supabase
        .from('investments')
        .select('id')
        .eq('tx_hash', hash)
        .limit(1)
        .maybeSingle();
      if (reused) {
        return NextResponse.json({ error: 'This transaction has already been recorded', investment_id: reused.id }, { status: 409 });
      }

      const vault = project.escrow_vault_address || project.escrow_address;
      const onchainProjectId = project.project_nft_id ?? project.onchain_project_id;
      const chainId = Number(project.deployed_chain_id ?? project.chain_id);
      if (!vault || onchainProjectId === null || onchainProjectId === undefined || !chainId) {
        return NextResponse.json({ error: 'This project is not deployed to an escrow vault' }, { status: 400 });
      }

      const verified = await verifyVaultInvestment({
        chainId,
        txHash: hash,
        vault,
        projectId: BigInt(onchainProjectId),
        investor: investor_address,
      });
      if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

      const decimals = await tokenDecimals(chainId, verified.value.paymentToken);
      if (decimals === null) {
        return NextResponse.json({ error: 'Unknown payment token' }, { status: 400 });
      }
      const onchainUsd = Number(formatUnits(verified.value.amount, decimals));
      if (!sameUsd(onchainUsd, claimedUsd)) {
        return NextResponse.json({ error: 'amount_usd does not match the amount invested on chain' }, { status: 400 });
      }

      row = {
        project_id,
        investor_address,
        investor_email: investor_email || null,
        amount_usd: onchainUsd,
        amount_tokens: amount_tokens ? parseFloat(amount_tokens) : null,
        payment_method,
        tx_hash: hash,
        payment_reference: payment_reference || null,
        chain_id: chainId,
        metadata: { ...metadataObj, payment_token: verified.value.paymentToken },
      };
    }

    const result = await recordCrowdfundingInvestment(supabase, row);
    if (result.status === 'reused') {
      return NextResponse.json({ error: 'This payment has already been recorded' }, { status: 409 });
    }
    if (result.status !== 'confirmed') {
      console.error('Insert error:', result.status === 'error' ? result.error : result.status);
      return NextResponse.json({ error: 'Failed to record investment' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      investment_id: result.record.id,
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
