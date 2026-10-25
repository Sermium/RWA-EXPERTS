// @vitest-environment node
/// <reference types="vite/client" />
/**
 * Routes that act for a wallet -- its exchange balance, orders, withdrawals,
 * tokenization applications, trade deals, notifications, KYC email -- must
 * take that wallet from the signed session, never from the
 * `x-wallet-address` header, which anyone can set to anyone's wallet.
 *
 * Session tokens are real; only the database and storage are faked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The first import of each route module can take seconds on a cold start.
vi.setConfig({ testTimeout: 30_000 });
import { NextRequest } from 'next/server';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

const alice = privateKeyToAccount(generatePrivateKey());
const mallory = privateKeyToAccount(generatePrivateKey());
const reviewer = privateKeyToAccount(generatePrivateKey());

// ---------------------------------------------------------------- fakes

type Op = { table: string; action: string; filters: any[][] };
const calls: Op[] = [];

function builder(table: string) {
  const op: Op = { table, action: 'select', filters: [] };
  const finish = () => {
    calls.push(op);
    if (table === 'admin_roles') {
      const wallet = op.filters.find(([f, col]) => f === 'eq' && col === 'wallet_address')?.[2];
      return Promise.resolve(wallet === reviewer.address.toLowerCase() ? { data: { role: 'admin' }, error: null } : { data: null, error: { message: 'none' } });
    }
    return Promise.resolve({ data: null, error: null });
  };
  const b: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (res: any, rej: any) => finish().then(res, rej);
      if (prop === 'single' || prop === 'maybeSingle') return () => finish();
      return (...args: any[]) => {
        if (['insert', 'update', 'upsert', 'delete'].includes(prop)) op.action = prop;
        else if (prop !== 'select') op.filters.push([prop, ...args]);
        return b;
      };
    },
  });
  return b;
}

const fakeClient = { from: (t: string) => builder(t), rpc: async () => ({ data: null, error: null }) };
const getAllUserBalances = vi.fn(async (_wallet: string) => [] as unknown[]);
const getKYCEmail = vi.fn(async (_wallet: string) => 'alice@example.test');

vi.mock('@supabase/supabase-js', () => ({ createClient: () => fakeClient }));
vi.mock('@/lib/supabase', async (orig) => ({
  ...((await orig()) as any),
  getSupabaseAdmin: () => fakeClient,
  getSupabaseClient: () => fakeClient,
  getKYCEmail: (w: string) => getKYCEmail(w),
  saveKYCEmail: async () => true,
}));
vi.mock('@/lib/kycStorage', () => ({ getKYCDocuments: async () => null }));
vi.mock('@/lib/exchange-service', async (orig) => ({
  ...((await orig()) as any),
  getAllUserBalances: (w: string) => getAllUserBalances(w),
}));

beforeEach(() => {
  calls.length = 0;
  getAllUserBalances.mockClear();
  getKYCEmail.mockClear();
  process.env.SESSION_SECRET = 'x'.repeat(48);
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  process.env.KYC_WALLET_HASH_SECRET = 'test-secret';
  delete process.env.INTERNAL_API_KEY;
});

async function cookieFor(wallet: string) {
  const { createSessionToken, SESSION_COOKIE } = await import('@/lib/wallet-session');
  return `${SESSION_COOKIE}=${createSessionToken(wallet)}`;
}

function req(path: string, init: { method?: string; headers?: Record<string, string>; body?: unknown; form?: FormData } = {}) {
  return new NextRequest(`http://app.test${path}`, {
    method: init.method ?? 'GET',
    headers: { ...(init.form ? {} : { 'content-type': 'application/json' }), ...(init.headers ?? {}) },
    body: init.form ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
  });
}

// ---------------------------------------------------------------- every wallet route

const all = import.meta.glob('../{exchange,notifications,tokenization,trade}/**/route.ts');
// The routes that act for the calling wallet. Others in these folders (a
// pair's public order book, say) don't read a wallet at all.
const WALLET_ROUTES = [
  '../exchange/balance/route.ts', '../exchange/deposit/route.ts', '../exchange/history/route.ts',
  '../exchange/mexc/trade/route.ts', '../exchange/orders/route.ts', '../exchange/trade/route.ts',
  '../exchange/withdraw/route.ts', '../notifications/preferences/route.ts', '../notifications/route.ts',
  '../tokenization/[id]/cancel/route.ts', '../tokenization/[id]/deploy/route.ts', '../tokenization/[id]/pay/route.ts',
  '../tokenization/[id]/resubmit/route.ts', '../tokenization/[id]/route.ts', '../tokenization/[id]/update-draft/route.ts',
  '../tokenization/apply/route.ts', '../trade/deals/[id]/route.ts', '../trade/deals/documents/route.ts',
  '../trade/deals/route.ts', '../trade/messages/route.ts', '../trade/milestones/[id]/approve/route.ts',
];
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const ctx = { params: Object.assign(Promise.resolve({ id: '1', address: alice.address }), { id: '1', address: alice.address }) };

describe('every wallet route', () => {
  it('exists', () => {
    for (const p of WALLET_ROUTES) expect(Object.keys(all)).toContain(p);
  });

  it.each(WALLET_ROUTES)('%s refuses a wallet named only by the header', async (path) => {
    const mod: any = await all[path]();
    for (const method of METHODS.filter((m) => typeof mod[m] === 'function')) {
      const res = await mod[method](req('/api/x', { method, headers: { 'x-wallet-address': alice.address }, body: method === 'GET' ? undefined : {} }), ctx);
      expect(res.status, `${method} ${path}`).toBe(401);
      expect((await res.json()).code).toBe('SIGN_IN_REQUIRED');
    }
    expect(calls).toEqual([]);
  });

  it.each(WALLET_ROUTES)('%s refuses a session for another wallet than the one connected', async (path) => {
    const mod: any = await all[path]();
    const cookie = await cookieFor(mallory.address);
    for (const method of METHODS.filter((m) => typeof mod[m] === 'function')) {
      const res = await mod[method](req('/api/x', { method, headers: { cookie, 'x-wallet-address': alice.address }, body: method === 'GET' ? undefined : {} }), ctx);
      expect(res.status, `${method} ${path}`).toBe(401);
    }
  });
});

describe('the wallet a route acts for', () => {
  it('is the signed-in one, whatever the header says', async () => {
    const { GET } = await import('../exchange/balance/route');
    const res = await GET(req('/api/exchange/balance', { headers: { cookie: await cookieFor(alice.address) } }));
    expect(res.status).toBe(200);
    expect(getAllUserBalances).toHaveBeenCalledWith(alice.address);
  });
});

// ---------------------------------------------------------------- routes that had no check

describe('KYC email, documents and linked wallets', () => {
  it('are refused to another signed-in wallet', async () => {
    const cookie = await cookieFor(mallory.address);
    const email = await import('../kyc/email/[address]/route');
    expect((await email.GET(req('/x', { headers: { cookie } }), { params: Promise.resolve({ address: alice.address }) })).status).toBe(403);
    expect((await email.POST(req('/x', { method: 'POST', headers: { cookie }, body: { email: 'evil@example.test' } }), { params: Promise.resolve({ address: alice.address }) })).status).toBe(403);
    const docs = await import('../kyc/documents/[address]/route');
    expect((await docs.GET(req('/x', { headers: { cookie } }), { params: { address: alice.address } })).status).toBe(403);
    const links = await import('../kyc/link/list/route');
    expect((await links.GET(req(`/x?wallet=${alice.address}`, { headers: { cookie } }))).status).toBe(403);
    expect(getKYCEmail).not.toHaveBeenCalled();
  });

  it('are open to the wallet itself and to a reviewer', async () => {
    const email = await import('../kyc/email/[address]/route');
    for (const who of [alice, reviewer]) {
      const res = await email.GET(req('/x', { headers: { cookie: await cookieFor(who.address) } }), { params: Promise.resolve({ address: alice.address }) });
      expect(res.status).toBe(200);
    }
  });

  it('refuse a documents path that is not an address', async () => {
    const docs = await import('../kyc/documents/[address]/route');
    const res = await docs.GET(req('/x', { headers: { cookie: await cookieFor(alice.address) } }), { params: { address: '0x/../../secrets' } });
    expect(res.status).toBe(400);
  });
});

describe('upload', () => {
  function form(type: string, name = 'id.pdf', mime = 'application/pdf') {
    const f = new FormData();
    f.set('file', new File([new Uint8Array([1, 2, 3])], name, { type: mime }));
    f.set('type', type);
    return f;
  }

  it('needs a session', async () => {
    const { POST } = await import('../upload/route');
    expect((await POST(req('/api/upload', { method: 'POST', form: form('document') }))).status).toBe(401);
  });

  it('refuses a type that would leave the uploads folder', async () => {
    const { POST } = await import('../upload/route');
    const res = await POST(req('/api/upload', { method: 'POST', headers: { cookie: await cookieFor(alice.address) }, form: form('../../app') }));
    expect(res.status).toBe(400);
  });
});

describe('notifications/send', () => {
  const body = { userAddress: alice.address, type: 'system', title: 't', message: 'm' };

  it('refuses a caller with no key and no admin session, even with INTERNAL_API_KEY unset', async () => {
    const { POST } = await import('../notifications/send/route');
    const res = await POST(req('/api/notifications/send', { method: 'POST', headers: { 'x-wallet-address': mallory.address }, body }));
    expect(res.status).toBe(401);
  });

  it('refuses a wrong key, and a signed-in wallet that is not an admin', async () => {
    process.env.INTERNAL_API_KEY = 'k'.repeat(32);
    const { POST } = await import('../notifications/send/route');
    expect((await POST(req('/x', { method: 'POST', headers: { 'x-api-key': 'wrong' }, body }))).status).toBe(401);
    expect((await POST(req('/x', { method: 'POST', headers: { cookie: await cookieFor(mallory.address) }, body }))).status).toBe(403);
  });
});

describe('deploy-escrow', () => {
  it('is admin-only: it signs with the server key', async () => {
    const { POST } = await import('../projects/[id]/deploy-escrow/route');
    const params = { params: Promise.resolve({ id: '1' }) };
    expect((await POST(req('/x', { method: 'POST', body: {} }), params)).status).toBe(401);
    expect((await POST(req('/x', { method: 'POST', headers: { cookie: await cookieFor(alice.address) }, body: {} }), params)).status).toBe(403);
  });
});

describe('exchange/trades', () => {
  it("keeps a pair's recent trades public but a wallet's own trades behind its session", async () => {
    const { GET } = await import('../exchange/trades/route');
    expect((await GET(req('/api/exchange/trades'))).status).toBe(400); // missing pairId, not 401
    expect((await GET(req('/api/exchange/trades?userOnly=true', { headers: { 'x-wallet-address': alice.address } }))).status).toBe(401);
  });
});
