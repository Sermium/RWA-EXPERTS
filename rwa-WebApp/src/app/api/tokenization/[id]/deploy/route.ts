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
    
    console.log('[Deploy API] Request:', { applicationId, walletAddress, body });
    const { 
      txHash, 
      chainId, 
      contracts, 
      metadataUri,
      totalSupply,
      pricePerToken,
      tokenName,
      tokenSymbol
    } = body;

    // Validate chainId
    if (!chainId) {
      return NextResponse.json({ error: 'Chain ID is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: application, error: fetchError } = await supabase
      .from('tokenization_applications')
      .select('*')
      .eq('id', applicationId)
      .eq('user_address', walletAddress.toLowerCase())
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Accept both 'approved' and 'creation_ready' status
    if (application.status !== 'approved' && application.status !== 'creation_ready') {
      return NextResponse.json({ error: 'Application not ready for deployment' }, { status: 400 });
    }

    const tokenAddress = contracts?.tokenContract || null;
    const nftAddress = contracts?.nftContract || null;
    const escrowAddress = contracts?.escrowContract || null;

    // Use values from request body, fallback to application data
    const finalTokenName = tokenName || application.token_name || application.asset_name;
    const finalTokenSymbol = tokenSymbol || application.token_symbol || application.asset_name?.substring(0, 4).toUpperCase();
    const finalTotalSupply = totalSupply || application.desired_token_supply || application.token_supply;
    const finalPricePerToken = pricePerToken || application.token_price_estimate || 1;

    // Update application with deployment info - INCLUDING chain_id
    const { data: updated, error: updateError } = await supabase
      .from('tokenization_applications')
      .update({
        status: 'completed',
        deployment_tx_hash: txHash,
        metadata_uri: metadataUri,
        token_address: tokenAddress,
        nft_address: nftAddress,
        escrow_address: escrowAddress,
        token_name: finalTokenName,
        token_symbol: finalTokenSymbol,
        token_supply: finalTotalSupply,
        chain_id: chainId,  // <-- IMPORTANT: Save the chain ID
        deployed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    // Create project entry
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        application_id: applicationId,
        owner_address: walletAddress.toLowerCase(),
        name: finalTokenName,
        symbol: finalTokenSymbol,
        description: application.asset_description,
        token_address: tokenAddress,
        nft_address: nftAddress,
        escrow_address: escrowAddress,
        chain_id: chainId,
        total_supply: finalTotalSupply,
        price_per_token: finalPricePerToken,
        funding_goal: application.fundraising_goal || application.estimated_value,
        funding_deadline: application.funding_deadline,
        status: 'active',
        metadata_uri: metadataUri,
        deployment_tx_hash: txHash,
        deployed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (projectError) {
      console.error('Project creation error:', projectError);
      // Don't fail the whole request, just log it
    }

    // Create listed token entry for exchange (if token address exists)
    if (tokenAddress && tokenAddress !== '0x0000000000000000000000000000000000000000') {
      const { error: listingError } = await supabase
        .from('listed_tokens')
        .insert({
          project_id: project?.id || null,
          name: finalTokenName,
          symbol: finalTokenSymbol,
          token_address: tokenAddress,
          chain_id: chainId,
          decimals: 18,
          is_active: true,
          is_tradeable: true,
          initial_price: finalPricePerToken,
          current_price: finalPricePerToken,
          asset_type: application.asset_type || 'other',
          logo_url: application.logo_url || null,
          banner_url: application.banner_url || null,
        });

      if (listingError) {
        console.error('Token listing error:', listingError);
      } else {
        console.log('Token listed on exchange:', finalTokenSymbol, 'Chain:', chainId);
      }

      // Auto-create trading pair for the new token (TOKEN/USDC)
      const USDC_ADDRESSES: Record<number, string> = {
        80002: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // Amoy USDC
        137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',   // Polygon USDC
      };
      
      const USDC_ADDRESS = USDC_ADDRESSES[chainId] || USDC_ADDRESSES[80002];

      const { error: pairError } = await supabase
        .from('trading_pairs')
        .insert({
          symbol: `${finalTokenSymbol}/USDC`,
          base_token: finalTokenSymbol,
          quote_token: 'USDC',
          base_token_address: tokenAddress,
          quote_token_address: USDC_ADDRESS,
          base_decimals: 18,
          quote_decimals: 6,
          min_order_size: 0.0001,
          price_precision: 4,
          quantity_precision: 2,
          is_active: true,
          chain_id: chainId,  // <-- Also save chain_id on trading pair
        });

      if (pairError) {
        if (!pairError.message?.includes('duplicate')) {
          console.error('Trading pair creation error:', pairError);
        }
      } else {
        console.log('Trading pair created:', `${finalTokenSymbol}/USDC`, 'Chain:', chainId);
      }
    }

    // Add to status history
    await supabase.from('tokenization_status_history').insert({
      application_id: applicationId,
      status: 'completed',
      notes: `Token deployed on chain ${chainId}. TX: ${txHash}. Token: ${tokenAddress}. Category: ${application.asset_type}`,
      created_by: walletAddress.toLowerCase(),
    });

    return NextResponse.json({
      success: true,
      application: updated,
      project: project || null,
      tokenListed: !!tokenAddress,
      tradingPairCreated: !!tokenAddress,
      chainId: chainId,
    });

  } catch (error) {
    console.error('Deploy recording error:', error);
    return NextResponse.json(
      { error: 'Failed to record deployment' },
      { status: 500 }
    );
  }
}