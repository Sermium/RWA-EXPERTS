// src/app/api/crowdfunding/milestones/proofs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAddress } from 'viem';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch proofs for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId');
    const projectId = searchParams.get('projectId');

    if (!chainId || !projectId) {
      return NextResponse.json({ error: 'chainId and projectId required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('milestone_proofs')
      .select('*')
      .eq('chain_id', parseInt(chainId))
      .eq('project_id', projectId) // Keep as string/text since that's the column type
      .order('milestone_index', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      proofs: (data || []).map(row => ({
        id: row.id,
        chainId: row.chain_id,
        projectId: row.project_id,
        milestoneIndex: row.milestone_index,
        ownerAddress: row.owner_address,
        title: row.title,
        description: row.description,
        kpisAchieved: row.kpis_achieved || [],
        documents: row.documents || [],
        links: row.links || [],
        status: row.status,
        adminNotes: row.admin_notes,
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at,
        reviewedBy: row.reviewed_by,
        submissionCount: row.submission_count || 1,
        releaseTxHash: row.release_tx_hash,
        releasedAt: row.released_at,
        releasedAmount: row.released_amount,
      })),
    });
  } catch (error: any) {
    console.error('Fetch proofs error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Submit proof
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      chainId,
      projectId,
      milestoneIndex,
      ownerAddress,
      title,
      description,
      kpisAchieved,
      documents,
      links,
    } = body;

    if (!chainId || !projectId || milestoneIndex === undefined || !ownerAddress || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedAddress = getAddress(ownerAddress).toLowerCase();
    const projectIdStr = String(projectId); // Ensure string for DB

    // Check existing
    const { data: existing } = await supabase
      .from('milestone_proofs')
      .select('id, status, submission_count')
      .eq('chain_id', chainId)
      .eq('project_id', projectIdStr)
      .eq('milestone_index', milestoneIndex)
      .single();

    if (existing?.status === 'pending') {
      return NextResponse.json({ error: 'Proof already pending review' }, { status: 400 });
    }

    if (existing?.status === 'approved') {
      return NextResponse.json({ error: 'Milestone already approved' }, { status: 400 });
    }

    const proofData = {
      chain_id: chainId,
      project_id: projectIdStr,
      milestone_index: milestoneIndex,
      owner_address: normalizedAddress,
      title,
      description,
      kpis_achieved: kpisAchieved || [],
      documents: documents || [],
      links: links || [],
      status: 'pending',
      submission_count: existing ? (existing.submission_count || 1) + 1 : 1,
      submitted_at: new Date().toISOString(),
      admin_notes: null,
      reviewed_by: null,
      reviewed_at: null,
    };

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('milestone_proofs')
        .update(proofData)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('milestone_proofs')
        .insert(proofData)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, proof: result });
  } catch (error: any) {
    console.error('Submit proof error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
