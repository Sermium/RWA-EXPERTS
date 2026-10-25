// src/app/api/admin/role/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminRole } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    // A public lookup of the role a wallet holds, for showing or hiding admin
    // UI. It grants nothing: admin routes take the caller from the signed
    // admin session (validateAdminAccess), never from this header.
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json({ role: null });
    }

    const role = await getAdminRole(walletAddress);

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Error getting admin role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}