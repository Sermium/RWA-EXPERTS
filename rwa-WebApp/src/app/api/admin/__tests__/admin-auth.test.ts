// @vitest-environment node
/// <reference types="vite/client" />
/**
 * Admin routes must take the caller from a signed admin session, never from
 * the `x-wallet-address` header, which anyone can set to an admin's wallet.
 *
 * Signatures and session tokens here are real; only the database is faked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The first import of each route module can take seconds on a cold start.
vi.setConfig({ testTimeout: 30_000 });
import { NextRequest } from 'next/server';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

// ---------------------------------------------------------------- fakes

const admin = privateKeyToAccount(generatePrivateKey());
const superAdmin = privateKeyToAccount(generatePrivateKey());
const outsider = privateKeyToAccount(generatePrivateKey());

type Op = { table: string; action: string; payload?: any; filters: any[][] };
const calls: Op[] = [];

function roleOf(wallet: string) {
  if (wallet === admin.address.toLowerCase()) return 'admin';
  if (wallet === superAdmin.address.toLowerCase()) return 'super_admin';
  return null;
}

function builder(table: string) {
  const op: Op = { table, action: 'select', filters: [] };
  const finish = () => {
    calls.push(op);
    if (table === 'admin_roles') {
      const wallet = op.filters.find(([f, col]) => f === 'eq' && col === 'wallet_address')?.[2];
      const role = wallet && roleOf(wallet);
      return Promise.resolve(role ? { data: { role }, error: null } : { data: null, error: { message: 'none' } });
    }
    if (table === 'crowdfunding_applications' && op.action === 'select') {
      return Promise.resolve({ data: { id: 'app-1', status: 'pending_review' }, error: null });
    }
    return Promise.resolve({ data: op.action === 'select' ? [] : { id: 'row' }, error: null });
  };
  const b: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (res: any, rej: any) => finish().then(res, rej);
      if (prop === 'single' || prop === 'maybeSingle') return () => finish();
      return (...args: any[]) => {
        if (['insert', 'update', 'upsert', 'delete'].includes(prop)) { op.action = prop; op.payload = args[0]; }
        else if (prop !== 'select') op.filters.push([prop, ...args]);
        return b;
      };
    },
  });
  return b;
}

const fakeClient = { from: (t: string) => builder(t), rpc: async () => ({ data: null, error: null }) };
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fakeClient }));
vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: () => fakeClient, supabase: fakeClient, supabaseAdmin: fakeClient }));

beforeEach(() => {
  calls.length = 0;
  process.env.SESSION_SECRET = 'x'.repeat(48);
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
});

const HOST = 'admin.test';

async function sessionCookieFor(wallet: string) {
  const { createSessionToken, SESSION_COOKIE } = await import('@/lib/wallet-session');
  return `${SESSION_COOKIE}=${createSessionToken(wallet)}`;
}

function req(path: string, init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) {
  return new NextRequest(`http://${HOST}${path}`, {
    method: init.method ?? 'GET',
    headers: { host: HOST, 'content-type': 'application/json', ...(init.headers ?? {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

// ---------------------------------------------------------------- session token

describe('session token', () => {
  it('names the wallet it was issued to', async () => {
    const { createSessionToken, readSessionToken } = await import('@/lib/wallet-session');
    expect(readSessionToken(createSessionToken(admin.address))).toBe(admin.address.toLowerCase());
  });

  it('is refused when its payload is edited to name another wallet', async () => {
    const { createSessionToken, readSessionToken } = await import('@/lib/wallet-session');
    const [, tag] = createSessionToken(outsider.address).split('.');
    const forged = Buffer.from(JSON.stringify({ w: superAdmin.address.toLowerCase(), iat: 0, exp: 4102444800 })).toString('base64url');
    expect(readSessionToken(`${forged}.${tag}`)).toBeNull();
  });

  it('is refused once expired', async () => {
    const { createSessionToken, readSessionToken, SESSION_TTL_SECONDS } = await import('@/lib/wallet-session');
    const issued = 1_700_000_000;
    const token = createSessionToken(admin.address, issued);
    expect(readSessionToken(token, issued + SESSION_TTL_SECONDS - 1)).toBe(admin.address.toLowerCase());
    expect(readSessionToken(token, issued + SESSION_TTL_SECONDS)).toBeNull();
  });

  it('is refused under a different secret, and not issued without a long enough one', async () => {
    const { createSessionToken, readSessionToken } = await import('@/lib/wallet-session');
    const token = createSessionToken(admin.address);
    process.env.SESSION_SECRET = 'y'.repeat(48);
    expect(readSessionToken(token)).toBeNull();
    process.env.SESSION_SECRET = 'short';
    expect(() => createSessionToken(admin.address)).toThrow();
    expect(readSessionToken(token)).toBeNull();
  });
});

// ---------------------------------------------------------------- sign-in

describe('sign-in', () => {
  async function signIn(account: typeof admin, { issuedAt = Math.floor(Date.now() / 1000), host = HOST } = {}) {
    const { signInMessage } = await import('@/lib/sign-in-message');
    const signature = await account.signMessage({ message: signInMessage(account.address, host, issuedAt) });
    const { POST } = await import('../../auth/session/route');
    return POST(req('/api/auth/session', { method: 'POST', body: { wallet: account.address, issuedAt, signature } }));
  }

  it('gives an admin who signs a session cookie that admin routes accept', async () => {
    const res = await signIn(admin);
    expect(res.status).toBe(200);
    const cookie = res.cookies.get('rwa_session');
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);

    const { GET } = await import('../list/route');
    const list = await GET(req('/api/admin/list', { headers: { cookie: `rwa_session=${cookie!.value}` } }));
    expect(list.status).toBe(200);
  });

  it('gives a wallet that is not an admin a session that admin routes still refuse', async () => {
    const res = await signIn(outsider);
    expect(res.status).toBe(200);
    expect((await res.json()).role).toBeNull();
    const { GET } = await import('../list/route');
    const list = await GET(req('/api/admin/list', { headers: { cookie: `rwa_session=${res.cookies.get('rwa_session')!.value}` } }));
    expect(list.status).toBe(403);
  });

  it('refuses a signature older than five minutes', async () => {
    expect((await signIn(admin, { issuedAt: Math.floor(Date.now() / 1000) - 600 })).status).toBe(400);
  });

  it('refuses a signature made for another host', async () => {
    expect((await signIn(admin, { host: 'phish.example' })).status).toBe(401);
  });
});

// ---------------------------------------------------------------- every admin route

const routes = {
  ...import.meta.glob('../**/route.ts'),
  ...import.meta.glob('../../crowdfunding/admin/**/route.ts'),
  ...import.meta.glob('../../debug/**/route.ts'),
};
// Public role lookups: they grant nothing.
const PUBLIC = ['../check/route.ts', '../role/route.ts'];
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const ctx = { params: Object.assign(Promise.resolve({ id: '1' }), { id: '1' }) };

describe('every admin route', () => {
  const guarded = Object.keys(routes).filter((p) => !PUBLIC.includes(p));

  it('covers the routes it should', () => {
    expect(guarded.length).toBeGreaterThan(35);
    expect(guarded).toContain('../projects/[id]/activate/route.ts');
    expect(guarded).toContain('../../crowdfunding/admin/validate-funding/route.ts');
  });

  it.each(guarded)('%s refuses an admin named only by the header', async (path) => {
    const mod: any = await routes[path]();
    const handlers = METHODS.filter((m) => typeof mod[m] === 'function');
    expect(handlers.length).toBeGreaterThan(0);
    for (const method of handlers) {
      const res = await mod[method](
        req('/api/x', { method, headers: { 'x-wallet-address': superAdmin.address }, body: method === 'GET' ? undefined : {} }),
        ctx
      );
      expect(res.status, `${method} ${path}`).toBe(401);
    }
    // Refused before touching anything but the role table.
    expect(calls.filter((c) => c.table !== 'admin_roles')).toEqual([]);
  });

  it.each(guarded)('%s refuses a signed-in wallet that is not an admin', async (path) => {
    const mod: any = await routes[path]();
    const cookie = await sessionCookieFor(outsider.address);
    for (const method of METHODS.filter((m) => typeof mod[m] === 'function')) {
      const res = await mod[method](req('/api/x', { method, headers: { cookie }, body: method === 'GET' ? undefined : {} }), ctx);
      expect(res.status, `${method} ${path}`).toBe(403);
    }
  });
});

describe('super-admin routes', () => {
  it.each(['../promote/route.ts', '../demote/route.ts'])('%s refuses a plain admin', async (path) => {
    const { POST } = (await routes[path]()) as any;
    const res = await POST(req('/api/x', { method: 'POST', headers: { cookie: await sessionCookieFor(admin.address) }, body: { targetAddress: outsider.address, role: 'admin', action: 'remove' } }));
    expect(res.status).toBe(403);
    expect(calls.some((c) => c.action !== 'select')).toBe(false);
  });
});

describe('who is recorded as reviewer', () => {
  it('is the signed-in admin, not the wallet the body names', async () => {
    const { POST } = (await routes['../../crowdfunding/admin/review/route.ts']()) as any;
    const res = await POST(req('/api/crowdfunding/admin/review', {
      method: 'POST',
      headers: { cookie: await sessionCookieFor(admin.address) },
      body: { applicationId: 'app-1', action: 'approve', adminAddress: superAdmin.address },
    }));
    expect(res.status).toBe(200);
    const update = calls.find((c) => c.table === 'crowdfunding_applications' && c.action === 'update')!;
    expect(update.payload.reviewed_by).toBe(admin.address.toLowerCase());
  });
});
