// src/app/api/milestones/proofs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch proofs for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('milestone_proofs')
      .select('*')
      .eq('project_id', projectId)
      .order('milestone_index', { ascending: true });

    if (error) throw error;

    const proofs = (data || []).map(row => ({
      id: row.id,
      milestoneIndex: row.milestone_index,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      documents: row.documents || [],
      links: row.links || [],
      submittedAt: row.submitted_at,
      status: row.status,
      adminNotes: row.admin_notes,
    }));

    return NextResponse.json({ proofs });
  } catch (error: any) {
    console.error('Fetch proofs error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Submit a new proof
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, milestoneIndex, ownerAddress, title, description, documents, links } = body;

    if (!projectId || milestoneIndex === undefined || !ownerAddress || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if proof already exists and is pending
    const { data: existing } = await supabase
      .from('milestone_proofs')
      .select('id, status')
      .eq('project_id', projectId)
      .eq('milestone_index', milestoneIndex)
      .single();

    if (existing && existing.status === 'pending') {
      return NextResponse.json({ error: 'A proof is already pending review' }, { status: 400 });
    }

    // Insert or update
    const proofData = {
      project_id: projectId,
      milestone_index: milestoneIndex,
      owner_address: ownerAddress.toLowerCase(),
      title,
      description,
      documents: documents || [],
      links: links || [],
      submitted_at: new Date().toISOString(),
      status: 'pending',
      admin_notes: null,
    };

    let result;
    if (existing) {
      // Update existing (resubmission after rejection)
      const { data, error } = await supabase
        .from('milestone_proofs')
        .update(proofData)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      // Insert new
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
