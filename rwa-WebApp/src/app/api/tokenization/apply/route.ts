// src/app/api/tokenization/apply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Asset type mapping
const assetTypeMap: Record<string, string> = {
  real_estate: 'real_estate',
  infrastructure: 'infrastructure',
  art_collectibles: 'art_collectibles',
  business_equity: 'business_equity',
  revenue_based: 'revenue_based',
  commodities: 'commodities',
  vehicles: 'vehicles',
  intellectual_property: 'intellectual_property',
  other: 'other',
};

export async function GET(request: NextRequest) {
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    
    const { data: applications, error } = await supabase
      .from('tokenization_applications')
      .select('*')
      .eq('user_address', walletAddress.toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const walletAddress = request.headers.get('x-wallet-address');
  const chainIdHeader = request.headers.get('x-chain-id');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    // Get chain ID from body or header
    const chainId = body.chainId || (chainIdHeader ? parseInt(chainIdHeader) : null);
    
    if (!chainId) {
      return NextResponse.json({ error: 'Chain ID is required' }, { status: 400 });
    }

    // Parse estimated value (remove commas and convert)
    let estimatedValue = 0;
    if (body.estimatedValue) {
      const cleanValue = body.estimatedValue.toString().replace(/[^0-9.]/g, '');
      estimatedValue = parseFloat(cleanValue) || 0;
    }

    // Parse total supply
    let tokenSupply = null;
    if (body.totalSupply) {
      const cleanSupply = body.totalSupply.toString().replace(/[^0-9]/g, '');
      tokenSupply = parseInt(cleanSupply) || null;
    }

    // Parse price per token
    let pricePerToken = null;
    if (body.pricePerToken) {
      const cleanPrice = body.pricePerToken.toString().replace(/[^0-9.]/g, '');
      pricePerToken = parseFloat(cleanPrice) || null;
    }

    // Calculate fee
    const feeAmount = body.feeAmount || 750;

    // Validate payment hash is provided
    if (!body.feeTxHash) {
      return NextResponse.json({ error: 'Payment transaction hash required' }, { status: 400 });
    }

    // Prepare documents object
    const documentsData = {
      files: body.documents || [],
      additionalNotes: body.additionalNotes,
    };

    const { data: application, error: appError } = await supabase
      .from('tokenization_applications')
      .insert({
        // User & Chain
        user_address: walletAddress.toLowerCase(),
        chain_id: chainId,
        
        // Step 1: Asset Info
        asset_name: body.assetName || 'Unnamed Asset',
        asset_type: assetTypeMap[body.assetType] || 'other',
        asset_description: body.assetDescription || '',
        asset_location: body.assetLocation || null,
        asset_country: body.assetLocation || null, // Using location as country
        estimated_value: estimatedValue,
        currency: body.currency || 'USD',
        website: body.website || null,
        
        // Step 2: Tokenization Details
        token_name: body.tokenName || null,
        token_symbol: body.tokenSymbol || null,
        token_supply: tokenSupply,  // FIXED: was desired_token_supply
        token_price_estimate: pricePerToken,
        use_case: body.useCase || null,
        
        // Step 3: Contact Info
        contact_name: body.contactName || '',
        contact_email: body.email || '',
        contact_phone: body.phone || null,
        
        // Optional Company Info
        legal_entity_name: body.companyName || null,
        legal_entity_type: body.legalEntityType || null,
        legal_jurisdiction: body.legalJurisdiction || null,
        
        // Options
        needs_escrow: body.includeEscrow || false,
        needs_dividends: body.includeDividend || false,
        
        // Logo and Banner
        logo_url: body.logo?.url || null,
        logo_ipfs: body.logo?.ipfsHash || null,
        banner_url: body.banner?.url || null,
        banner_ipfs: body.banner?.ipfsHash || null,
        
        // Fee fields
        fee_amount: feeAmount,
        fee_currency: body.feeCurrency || 'USDC',
        fee_tx_hash: body.feeTxHash,
        fee_paid_at: new Date().toISOString(),
        
        // Payment fields
        payment_tx_hash: body.feeTxHash,
        payment_token: body.feeCurrency || 'USDC',
        payment_confirmed_at: new Date().toISOString(),
        
        // Status
        status: 'pending',
        
        // Documents as JSONB
        documents: documentsData,
      })
      .select()
      .single();

    if (appError) {
      console.error('Error creating application:', appError);
      return NextResponse.json({ 
        error: 'Failed to create application',
        details: appError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      application,
      applicationId: application.id,
      chainId: chainId,
      message: 'Application submitted successfully. Payment confirmed.'
    });

  } catch (error: any) {
    console.error('Error creating application:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
