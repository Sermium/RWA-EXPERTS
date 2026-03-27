import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to parse documents from JSONB
function parseDocuments(docs: any): any[] {
  if (!docs) return [];
  if (Array.isArray(docs)) return docs;
  if (typeof docs === 'object') return Object.values(docs);
  if (typeof docs === 'string') {
    try {
      const parsed = JSON.parse(docs);
      return Array.isArray(parsed) ? parsed : Object.values(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tokenization_applications')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error || !data) {
      console.error('[Project API] Error:', error);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = {
      id: data.id,
      name: data.asset_name,
      tokenName: data.token_name,
      tokenSymbol: data.token_symbol,
      tokenAddress: data.token_address,
      escrowAddress: data.escrow_address,
      nftAddress: data.nft_address,
      status: data.status,
      category: data.asset_type,
      chainId: data.chain_id,
      targetAmount: data.fundraising_goal || data.estimated_value,
      totalSupply: data.token_supply || data.desired_token_supply,
      tokenPrice: data.token_price_estimate,
      description: data.asset_description,
      website: data.website,
      logoUrl: data.logo_url,
      bannerUrl: data.banner_url,
      createdAt: data.created_at,
      owner: data.user_address,
      location: data.asset_location,
      country: data.asset_country,
      deployedAt: data.deployed_at,
      metadataUri: data.metadata_uri,
      documents: parseDocuments(data.documents),
    };

    return NextResponse.json({ project });
  } catch (error) {
    console.error('[Project API] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
