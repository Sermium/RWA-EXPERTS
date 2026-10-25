// src/app/api/admin/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAddress, verifyMessage } from 'viem';
import { getAdminRole, logAdminActivity } from '@/lib/admin';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  SIGN_IN_WINDOW_SECONDS,
  adminSignInMessage,
  createAdminSessionToken,
  getSessionWallet,
} from '@/lib/admin-session';

function requestHost(request: NextRequest): string {
  return request.headers.get('host') ?? new URL(request.url).host;
}

/**
 * Start an admin session. The wallet signs adminSignInMessage(wallet, host,
 * issuedAt); if the signature is good, recent, for this host, and the wallet
 * is an admin, the response sets the signed session cookie that admin routes
 * read.
 */
export async function POST(request: NextRequest) {
  try {
    const { wallet, issuedAt, signature } = await request.json();
    if (typeof wallet !== 'string' || typeof signature !== 'string' || !Number.isInteger(issuedAt)) {
      return NextResponse.json({ error: 'wallet, issuedAt and signature are required' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    // A minute of clock skew is allowed into the future.
    if (now - issuedAt > SIGN_IN_WINDOW_SECONDS || issuedAt - now > 60) {
      return NextResponse.json({ error: 'Sign-in request expired. Please sign again.' }, { status: 400 });
    }

    let address: `0x${string}`;
    try {
      address = getAddress(wallet);
    } catch {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    const valid = await verifyMessage({
      address,
      message: adminSignInMessage(address, requestHost(request), issuedAt),
      signature: signature as `0x${string}`,
    }).catch(() => false);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const role = await getAdminRole(address);
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'This wallet is not an admin' }, { status: 403 });
    }

    const response = NextResponse.json({ wallet: address.toLowerCase(), role, expiresIn: ADMIN_SESSION_TTL_SECONDS });
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: createAdminSessionToken(address, now),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api',
      maxAge: ADMIN_SESSION_TTL_SECONDS,
    });

    await logAdminActivity('admin_sign_in', address, null);
    return response;
  } catch (error) {
    console.error('[Admin Session] Sign-in error:', error);
    return NextResponse.json({ error: 'Sign-in failed' }, { status: 500 });
  }
}

/** The wallet and role of the current admin session, or 401 if there is none. */
export async function GET(request: NextRequest) {
  const wallet = getSessionWallet(request);
  if (!wallet) {
    return NextResponse.json({ error: 'No admin session' }, { status: 401 });
  }
  const role = await getAdminRole(wallet);
  if (role !== 'admin' && role !== 'super_admin') {
    return NextResponse.json({ error: 'This wallet is no longer an admin' }, { status: 403 });
  }
  return NextResponse.json({ wallet, role });
}

/** Sign out: clear the session cookie. */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({ name: ADMIN_SESSION_COOKIE, value: '', path: '/api', maxAge: 0 });
  return response;
}
