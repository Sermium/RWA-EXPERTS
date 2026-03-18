import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Asset type mapping
const assetTypeMap: Record<string, string> = {
  company_equity: 'company_equity',
  real_estate: 'real_estate',
  commodity: 'commodity',
  product_inventory: 'product_inventory',
  intellectual_property: 'intellectual_property',
  revenue_stream: 'revenue_stream',
  equipment: 'equipment',
  vehicles: 'vehicles',
  agricultural: 'agricultural',
  energy: 'energy',
  art: 'art',
  collectibles: 'collectibles',
  securities: 'securities',
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

    // Parse estimated value
    let estimatedValue = 0;
    if (body.estimatedValue) {
      const cleanValue = body.estimatedValue.toString().replace(/[^0-9.]/g, '');
      estimatedValue = parseFloat(cleanValue) || 0;
    }

    // Parse total supply
    let totalSupply = null;
    if (body.totalSupply) {
      const cleanSupply = body.totalSupply.toString().replace(/[^0-9]/g, '');
      totalSupply = parseInt(cleanSupply) || null;
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
      website: body.website,
      useCase: body.useCase,
      tokenName: body.tokenName,
      tokenSymbol: body.tokenSymbol,
      additionalInfo: body.additionalInfo || body.additionalNotes,
      originalAssetType: body.assetType,
      chainId: body.chainId || chainIdHeader,
    };

    const { data: application, error: appError } = await supabase
      .from('tokenization_applications')
      .insert({
        user_address: walletAddress.toLowerCase(),
        asset_name: body.assetName || 'Unnamed Asset',
        asset_type: assetTypeMap[body.assetType] || 'other',
        asset_description: body.assetDescription || '',
        asset_location: body.location || null,
        asset_country: body.country || 'Not Specified',
        estimated_value: estimatedValue,
        currency: body.currency || 'USD',
        valuation_source: body.valuationSource || null,
        desired_token_supply: totalSupply,
        token_price_estimate: pricePerToken,
        fundraising_goal: body.fundraisingGoal || null,
        needs_escrow: body.needsEscrow || false,
        needs_dividends: body.needsDividends || false,
        ownership_proof_type: body.ownershipProofType || null,
        legal_entity_name: body.companyName || body.legalEntityName || null,
        legal_entity_type: body.legalEntityType || null,
        legal_jurisdiction: body.legalJurisdiction || null,
        contact_name: body.contactName || '',
        contact_email: body.email || body.contactEmail || '',
        contact_phone: body.phone || body.contactPhone || null,
        contact_telegram: body.telegram || null,
        website: body.website || null,
        use_case: body.useCase || null,
        
        // Logo and Banner fields
        logo_url: body.logo?.url || null,
        logo_ipfs: body.logo?.ipfsHash || null,
        banner_url: body.banner?.url || null,
        banner_ipfs: body.banner?.ipfsHash || null,
        
        // Fee fields - payment already made
        fee_amount: feeAmount,
        fee_currency: body.feeCurrency || 'USDC',
        fee_tx_hash: body.feeTxHash,
        fee_paid_at: new Date().toISOString(),
        
        // Payment fields
        payment_tx_hash: body.feeTxHash,
        payment_token: body.paymentToken || 'USDC',
        payment_confirmed_at: new Date().toISOString(),
        
        // Status
        status: 'pending',
        token_type: body.tokenType || 'nft_and_token',
        
        // Documents and metadata as JSONB
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
      message: 'Application submitted successfully. Payment confirmed.'
    });

  } catch (error: any) {
    console.error('Error creating application:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
