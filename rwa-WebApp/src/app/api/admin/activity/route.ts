import { NextRequest, NextResponse } from 'next/server';
import { getAdminActivityLog, validateSuperAdminAccess } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const auth = await validateSuperAdminAccess(request);
    if (!auth.isValid) return auth.error;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const activityLog = await getAdminActivityLog(limit);
    return NextResponse.json({ activityLog });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
