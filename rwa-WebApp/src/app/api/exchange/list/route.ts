import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyMessage, getAddress } from 'viem';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// USDC addresses per chain
const USDC_ADDRESSES: Record<number, string> = {
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Mainnet
  137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon
  11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tokenAddress,
      tokenSymbol,
      tokenName,
      ownerAddress,
      signature,
      timestamp,
      chainId = 11155111,
      initialPrice,
      minOrderSize = '1',
      maxOrderSize,
      pricePrecision = 4,
      quantityPrecision = 2,
    } = body;

    // Validate required fields
    if (!tokenAddress || !ownerAddress || !tokenSymbol) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate signature if provided
    if (signature && timestamp) {
      const now = Date.now();
      const requestTime = parseInt(timestamp);
      if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
        return NextResponse.json({ error: 'Request expired' }, { status: 400 });
      }

      const message = `List token on RWA Exchange\nToken: ${tokenAddress}\nTimestamp: ${timestamp}`;
      try {
        const isValid = await verifyMessage({
          address: getAddress(ownerAddress),
          message,
          signature: signature as `0x${string}`,
        });
        if (!isValid) {
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
      } catch {
        return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
      }
    }

    // Verify ownership from tokenization_applications
    const { data: project, error: projectError } = await supabase
      .from('tokenization_applications')
      .select('id, user_address, token_address, token_symbol, token_name, status')
      .eq('token_address', tokenAddress.toLowerCase())
      .single();

    if (projectError && projectError.code !== 'PGRST116') {
      console.error('[Exchange List] Project lookup error:', projectError);
    }

    // If project exists, verify ownership
    if (project && project.user_address?.toLowerCase() !== ownerAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Not the token owner' }, { status: 403 });
    }

    // Check if already listed
    const { data: existingPair } = await supabase
      .from('trading_pairs')
      .select('id, is_active')
      .eq('base_token_address', tokenAddress.toLowerCase())
      .single();

    if (existingPair) {
      if (existingPair.is_active) {
        return NextResponse.json({
          error: 'Token already listed',
          pairId: existingPair.id,
        }, { status: 409 });
      } else {
        // Reactivate existing pair
        const { error: updateError } = await supabase
          .from('trading_pairs')
          .update({ 
            is_active: true,
            last_price: initialPrice,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPair.id);

        if (updateError) {
          return NextResponse.json({ error: 'Failed to reactivate listing' }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          pairId: existingPair.id,
          message: 'Token listing reactivated',
          reactivated: true,
        });
      }
    }

    // Get USDC address for this chain
    const usdcAddress = USDC_ADDRESSES[chainId] || USDC_ADDRESSES[11155111];

    // Create trading pair
    const symbol = `${tokenSymbol}/USDC`;
    const { data: pair, error: pairError } = await supabase
      .from('trading_pairs')
      .insert({
        symbol,
        base_token: tokenSymbol,
        quote_token: 'USDC',
        base_symbol: tokenSymbol,
        quote_symbol: 'USDC',
        base_token_address: tokenAddress.toLowerCase(),
        quote_token_address: usdcAddress,
        base_decimals: 18,
        quote_decimals: 6,
        min_order_size: parseFloat(minOrderSize),
        max_order_size: maxOrderSize ? parseFloat(maxOrderSize) : null,
        price_precision: pricePrecision,
        quantity_precision: quantityPrecision,
        last_price: initialPrice ? parseFloat(initialPrice) : null,
        chain_id: chainId,
        project_id: project?.id || null,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (pairError) {
      console.error('[Exchange List] Insert error:', pairError);
      return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
    }

    // Update project status if exists
    if (project) {
      await supabase
        .from('tokenization_applications')
        .update({ 
          status: 'listed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);
    }

    // Log the action
    await supabase.from('admin_audit_log').insert({
      action: 'TOKEN_LISTED',
      admin_address: 'SYSTEM',
      target_address: tokenAddress,
      details: {
        pairId: pair.id,
        symbol,
        owner: ownerAddress,
      },
      created_at: new Date().toISOString(),
    }).catch(() => {}); 

    return NextResponse.json({
      success: true,
      pairId: pair.id,
      symbol,
      message: 'Token successfully listed on exchange',
    });
  } catch (error) {
    console.error('[Exchange List] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
