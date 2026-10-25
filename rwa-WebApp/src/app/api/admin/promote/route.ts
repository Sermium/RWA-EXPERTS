import { NextRequest, NextResponse } from 'next/server';
import { promoteToAdmin, promoteToSuperAdmin, validateSuperAdminAccess } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const auth = await validateSuperAdminAccess(request);
    if (!auth.isValid) return auth.error;
    const walletAddress = auth.walletAddress;

    const { targetAddress, role } = await request.json();

    if (!targetAddress || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;
    if (role === 'super_admin') {
      result = await promoteToSuperAdmin(targetAddress, walletAddress);
    } else {
      result = await promoteToAdmin(targetAddress, walletAddress);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error promoting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
