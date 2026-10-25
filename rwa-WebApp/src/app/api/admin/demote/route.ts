import { NextRequest, NextResponse } from 'next/server';
import { demoteToAdmin, removeAdmin, validateSuperAdminAccess } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const auth = await validateSuperAdminAccess(request);
    if (!auth.isValid) return auth.error;
    const walletAddress = auth.walletAddress;

    const { targetAddress, action } = await request.json();

    if (!targetAddress || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;
    if (action === 'remove') {
      result = await removeAdmin(targetAddress, walletAddress);
    } else {
      result = await demoteToAdmin(targetAddress, walletAddress);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error demoting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
