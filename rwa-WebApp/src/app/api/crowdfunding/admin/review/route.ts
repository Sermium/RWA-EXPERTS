// src/app/api/crowdfunding/admin/review/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, adminAddress, action, rejectionReason } = body;

    if (!applicationId || !adminAddress || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'reject' && !rejectionReason) {
      return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 });
    }

    // Fetch application
    const { data: application, error: fetchError } = await supabase
      .from('crowdfunding_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.status !== 'pending_review') {
      return NextResponse.json({ error: 'Application not pending review' }, { status: 400 });
    }

    if (action === 'reject') {
      const { data, error } = await supabase
        .from('crowdfunding_applications')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          // REMOVE THIS LINE: rejected_at: new Date().toISOString(),
          reviewed_by: adminAddress.toLowerCase(),
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Application rejected. Owner can resubmit.',
        application: data,
      });
    }

    // Approve - mark as approved, ready for deployment
    const { data, error } = await supabase
      .from('crowdfunding_applications')
      .update({
        status: 'approved',
        reviewed_by: adminAddress.toLowerCase(),
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Application approved. Ready for deployment.',
      application: data,
      nextStep: 'deploy',
    });
  } catch (error: any) {
    console.error('Review error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}