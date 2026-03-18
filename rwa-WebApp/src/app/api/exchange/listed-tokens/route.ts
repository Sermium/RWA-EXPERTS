import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId');
    const category = searchParams.get('category');

    // Build query
    let query = supabase
      .from('listed_tokens')
      .select(`
        *,
        projects (
          id,
          name,
          symbol,
          description,
          token_address,
          nft_address,
          total_supply,
          price_per_token,
          funding_goal,
          metadata_uri,
          owner_address,
          status,
          application_id
        )
      `)
      .eq('is_active', true)
      .order('listed_at', { ascending: false });

    // Filter by chain
    if (chainId) {
      query = query.eq('chain_id', parseInt(chainId));
    }

    // Filter by category/asset_type
    if (category && category !== 'all') {
      query = query.eq('asset_type', category);
    }

    const { data: tokens, error } = await query;

    if (error) {
      console.error('Error fetching listed tokens:', error);
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
    }

    // Fetch documents from tokenization_applications for each token
    const tokensWithDocs = await Promise.all(
      (tokens || []).map(async (token) => {
        if (token.projects?.application_id) {
          const { data: appData } = await supabase
            .from('tokenization_applications')
            .select('documents, asset_description, asset_type, logo_url, banner_url')
            .eq('id', token.projects.application_id)
            .single();

          if (appData) {
            // Parse documents if it's a string
            let documents = appData.documents;
            if (typeof documents === 'string') {
              try {
                documents = JSON.parse(documents);
              } catch (e) {
                console.error('Error parsing documents:', e);
                documents = null;
              }
            }

            return {
              ...token,
              documents,
              asset_description: appData.asset_description || token.projects?.description,
              asset_type: token.asset_type || appData.asset_type || 'other',
              logo_url: token.logo_url || appData.logo_url,
              banner_url: token.banner_url || appData.banner_url,
            };
          }
        }
        return {
          ...token,
          asset_type: token.asset_type || 'other',
        };
      })
    );

    // Get category counts for the filter UI
    const { data: categoryCounts } = await supabase
      .from('listed_tokens')
      .select('asset_type')
      .eq('is_active', true)
      .eq('chain_id', chainId ? parseInt(chainId) : 80002);

    const counts: Record<string, number> = { all: tokensWithDocs.length };
    categoryCounts?.forEach((t) => {
      const type = t.asset_type || 'other';
      counts[type] = (counts[type] || 0) + 1;
    });

    return NextResponse.json({ 
      tokens: tokensWithDocs,
      categoryCounts: counts
    });

  } catch (error) {
    console.error('Error in listed-tokens API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
