// src/lib/admin-session.ts
//
// Who is calling an admin route. Admin routes used to take the caller's word
// for it: whatever wallet the `x-wallet-address` header named was checked
// against admin_roles, so anyone could name an admin's wallet and act as
// them. Now the wallet proves itself once, by signing a sign-in message, and
// the server answers with a session cookie it has signed (HMAC with
// ADMIN_SESSION_SECRET). Routes read the wallet from that cookie only.
//
// The cookie says who the wallet is, not what it may do: routes still look
// up the role on every request, so removing an admin takes effect at once.
import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

export const ADMIN_SESSION_COOKIE = 'rwa_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
/** How old a signed sign-in message may be when it reaches the server. */
export const SIGN_IN_WINDOW_SECONDS = 5 * 60;

export { adminSignInMessage } from './admin-sign-in-message';

function secret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  // A short or missing secret would make the cookie forgeable, so it counts
  // as no secret at all: sign-in fails and no cookie is accepted.
  return s && s.length >= 32 ? s : null;
}

function mac(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

/** A signed session token for `wallet`. Throws if ADMIN_SESSION_SECRET is not set. */
export function createAdminSessionToken(wallet: string, now = Math.floor(Date.now() / 1000)): string {
  const key = secret();
  if (!key) throw new Error('ADMIN_SESSION_SECRET is not configured (at least 32 characters)');
  const payload = Buffer.from(
    JSON.stringify({ w: wallet.toLowerCase(), iat: now, exp: now + ADMIN_SESSION_TTL_SECONDS })
  ).toString('base64url');
  return `${payload}.${mac(payload, key)}`;
}

/** The wallet a session token was issued to, or null if it is forged, malformed or expired. */
export function readAdminSessionToken(token: string | undefined | null, now = Math.floor(Date.now() / 1000)): string | null {
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

/** The wallet this request's admin session belongs to, or null if there is none. */
export function getSessionWallet(request: NextRequest): string | null {
  return readAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}
