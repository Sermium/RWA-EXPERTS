import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chainId = searchParams.get('chainId');
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabaseAdmin();

    // Build query for approved/active projects
    let query = supabase
      .from('crowdfunding_applications')
      .select('*')
      .eq('payment_status', 'paid');

    // Filter by status
    if (status === 'active') {
      // Show approved projects that are currently fundraising
      query = query.in('status', ['approved', 'active', 'fundraising']);
    } else if (status === 'funded') {
      query = query.eq('status', 'funded');
    } else if (status === 'completed') {
      query = query.eq('status', 'completed');
    } else if (status === 'all') {
      // Show all approved+ projects (not pending/rejected)
      query = query.in('status', ['approved', 'active', 'fundraising', 'funded', 'completed']);
    }

    // Filter by chain if provided
    if (chainId) {
      query = query.eq('chain_id', parseInt(chainId));
    }

    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: applications, error, count } = await query;

    if (error) {
      console.error('[Crowdfunding Projects] DB error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    // Transform to project format expected by frontend
    const projects = (applications || []).map((app) => ({
      // Core identifiers
      id: app.id,
      applicationId: app.id,
      
      // Project info
      name: app.project_name,
      description: app.description,
      category: app.category,
      
      // Owner/Creator
      owner: app.wallet_address,
      companyName: app.company_name,
      
      // Funding details (convert to expected format)
      fundingGoal: (app.funding_goal * 1e6).toString(), // Convert to USDC decimals
      totalRaised: ((app.total_raised || 0) * 1e6).toString(),
      minInvestment: ((app.min_investment || 100) * 1e6).toString(),
      maxInvestment: app.max_investment ? (app.max_investment * 1e6).toString() : null,
      
      // Token info
      tokenName: app.token_name,
      tokenSymbol: app.token_symbol,
      totalSupply: app.total_supply?.toString() || '0',
      tokenPrice: app.token_price?.toString() || '0',
      
      // Status mapping
      status: mapApplicationStatus(app.status),
      statusLabel: app.status,
      
      // Dates
      deadline: app.deadline ? Math.floor(new Date(app.deadline).getTime() / 1000).toString() : '0',
      createdAt: Math.floor(new Date(app.created_at).getTime() / 1000).toString(),
      
      // Media
      metadata: {
        name: app.project_name,
        description: app.description,
        image: app.logo_url || app.banner_url,
        attributes: {
          category: app.category,
          projected_roi: app.projected_roi,
          company_name: app.company_name,
        },
      },
      
      // URLs
      logoUrl: app.logo_url,
      bannerUrl: app.banner_url,
      website: app.website,
      
      // Milestones
      milestones: app.milestones || [],
      
      // Investment stats
      investorCount: app.investor_count || 0,
      
      // Chain info
      chainId: app.chain_id,
      
      // Contract addresses (if deployed)
      securityToken: app.security_token_address || '',
      escrowVault: app.escrow_vault_address || '',
      projectNFT: app.project_nft_address || '',
    }));

    return NextResponse.json({
      success: true,
      projects,
      total: count || projects.length,
      pagination: {
        limit,
        offset,
        hasMore: projects.length === limit,
      },
    });

  } catch (error) {
    console.error('[Crowdfunding Projects] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Map application status to numeric status for frontend compatibility
function mapApplicationStatus(status: string): number {
  const statusMap: Record<string, number> = {
    'pending_review': 0,
    'approved': 1,
    'active': 2,
    'fundraising': 2,
    'funded': 3,
    'in_progress': 4,
    'completed': 5,
    'cancelled': 6,
    'rejected': 7,
    'failed': 7,
  };
  return statusMap[status] ?? 0;
}
