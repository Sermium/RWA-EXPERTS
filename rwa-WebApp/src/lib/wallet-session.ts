// src/lib/wallet-session.ts
//
// Which wallet is calling. Routes used to take the caller's word for it:
// whatever wallet the `x-wallet-address` header named, they acted for, so
// anyone could read another user's balances, place orders, withdraw, or act
// as an admin by naming that wallet. Now the wallet proves itself once, by
// signing a sign-in message, and the server answers with a session cookie it
// has signed (HMAC with SESSION_SECRET). Routes read the wallet from that
// cookie only.
//
// The cookie says who the wallet is, not what it may do: admin routes still
// look the role up on every request (lib/admin.ts), so removing an admin
// takes effect at once.
import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getAddress } from 'viem';

export const SESSION_COOKIE = 'rwa_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
/** How old a signed sign-in message may be when it reaches the server. */
export const SIGN_IN_WINDOW_SECONDS = 5 * 60;
/** The error code the browser's fetch wrapper answers by asking the wallet to sign in. */
export const SIGN_IN_REQUIRED = 'SIGN_IN_REQUIRED';

export { signInMessage } from './sign-in-message';

function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  // A short or missing secret would make the cookie forgeable, so it counts
  // as no secret at all: sign-in fails and no cookie is accepted.
  return s && s.length >= 32 ? s : null;
}

function mac(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

/** A signed session token for `wallet`. Throws if SESSION_SECRET is not set. */
export function createSessionToken(wallet: string, now = Math.floor(Date.now() / 1000)): string {
  const key = secret();
  if (!key) throw new Error('SESSION_SECRET is not configured (at least 32 characters)');
  const payload = Buffer.from(
    JSON.stringify({ w: wallet.toLowerCase(), iat: now, exp: now + SESSION_TTL_SECONDS })
  ).toString('base64url');
  return `${payload}.${mac(payload, key)}`;
}

/** The wallet (lowercase) a session token was issued to, or null if it is forged, malformed or expired. */
export function readSessionToken(token: string | undefined | null, now = Math.floor(Date.now() / 1000)): string | null {
  const key = secret();
  if (!key || !token) return null;
  const [payload, tag] = token.split('.');
  if (!payload || !tag) return null;

  const expected = Buffer.from(mac(payload, key));
  const given = Buffer.from(tag);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const { w, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof w !== 'string' || !/^0x[0-9a-f]{40}$/.test(w)) return null;
    if (typeof exp !== 'number' || exp <= now) return null;
    return w;
  } catch {
    return null;
  }
}

/**
 * The wallet (lowercase) this request's session belongs to, or null if there
 * is none -- or if the browser says it is now connected with a different
 * wallet. Pages still send `x-wallet-address` with the connected wallet; it
 * proves nothing, but a mismatch means the session is for a wallet the user
 * has switched away from, and they should sign in again rather than keep
 * acting as the old one.
 */
export function getSessionWallet(request: NextRequest): string | null {
  const wallet = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const connected = request.headers.get('x-wallet-address');
  if (wallet && connected && connected.toLowerCase() !== wallet) return null;
  return wallet;
}

export function signInRequired(): NextResponse {
  return NextResponse.json({ error: 'Sign-in required', code: SIGN_IN_REQUIRED }, { status: 401 });
}

export type WalletSession =
  | { ok: true; wallet: `0x${string}` }
  | { ok: false; response: NextResponse };

/**
 * The signed-in wallet making this request, checksummed (as the
 * `x-wallet-address` header used to carry it), or a 401 telling the browser
 * to sign in.
 *
 *   const session = requireSessionWallet(request);
 *   if (!session.ok) return session.response;
 *   const walletAddress = session.wallet;
 */
export function requireSessionWallet(request: NextRequest): WalletSession {
  const wallet = getSessionWallet(request);
  if (!wallet) return { ok: false, response: signInRequired() };
  return { ok: true, wallet: getAddress(wallet) };
}
