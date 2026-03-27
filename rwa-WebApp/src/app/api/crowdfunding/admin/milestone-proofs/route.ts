import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    let query = supabase
      .from('milestone_proofs')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch proofs' }, { status: 500 });
    }

    // Enrich with project info
    const proofs = await Promise.all((data || []).map(async (proof) => {
      // Try to get project name from applications
      const { data: app } = await supabase
        .from('tokenization_applications')
        .select('asset_name, milestones, fundraising_goal')
        .eq('chain_id', proof.chain_id)
        .eq('project_id', proof.project_id)
        .single();

      const milestone = app?.milestones?.[proof.milestone_index];
      const releaseAmount = milestone && app?.fundraising_goal
        ? (app.fundraising_goal * milestone.percentageOfFunds) / 100
        : null;

      return {
        id: proof.id,
        chainId: proof.chain_id,
        projectId: proof.project_id,
        milestoneIndex: proof.milestone_index,
        ownerAddress: proof.owner_address,
        title: proof.title,
        description: proof.description,
        documents: proof.documents || [],
        links: proof.links || [],
        kpisAchieved: proof.kpis_achieved || [],
        submittedAt: proof.submitted_at,
        status: proof.status,
        submissionCount: proof.submission_count || 1,
        projectName: app?.asset_name,
        milestoneTitle: milestone?.title,
        percentageOfFunds: milestone?.percentageOfFunds,
        releaseAmount,
      };
    }));

    return NextResponse.json({ proofs });
  } catch (error) {
    console.error('Error fetching milestone proofs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
