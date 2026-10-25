import { NextRequest, NextResponse } from 'next/server';
import { getAllAdmins, validateAdminAccess } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminAccess(request);
    if (!auth.isValid) return auth.error;

    const admins = await getAllAdmins();
    return NextResponse.json({ admins });
  } catch (error) {
    console.error('Error fetching admins:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
