// @vitest-environment node
/**
 * An applicant who asks to upgrade keeps the level already approved while
 * the upgrade is reviewed, and keeps it if the upgrade is rejected. Plus the
 * KYC upload's failure modes and the admin trade routes the admin screen
 * calls.
 *
 * Signatures and session tokens are real; only the database is faked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

vi.setConfig({ testTimeout: 30_000 });

const applicant = privateKeyToAccount(generatePrivateKey());
const reviewer = privateKeyToAccount(generatePrivateKey());

// ---------------------------------------------------------------- fakes

type Op = { table: string; action: string; payload?: any; filters: any[][] };
const calls: Op[] = [];
/** Rows each table holds; selects return the first row matching the filters. */
let rows: Record<string, any[]> = {};

function matches(row: any, filters: any[][]) {
  return filters.every(([f, col, val]) => {
    if (f === 'eq') return row[col] === val;
    if (f === 'in') return (val as any[]).includes(row[col]);
    if (f === 'gte') return Number(row[col]) >= Number(val);
    return true; // order, limit, or, ilike...: not modelled
  });
}

function builder(table: string) {
  const op: Op = { table, action: 'select', filters: [] };
  const finish = () => {
    calls.push(op);
    if (table === 'admin_roles') {
      const wallet = op.filters.find(([f, col]) => f === 'eq' && col === 'wallet_address')?.[2];
      return Promise.resolve(wallet === reviewer.address.toLowerCase() ? { data: { role: 'admin' }, error: null } : { data: null, error: { message: 'none' } });
    }
    const row = (rows[table] ?? []).find((r) => matches(r, op.filters)) ?? null;
    if (op.action === 'update') return Promise.resolve({ data: row ? { ...row, ...op.payload } : null, error: null });
    return Promise.resolve({ data: row, error: null });
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
vi.mock('@/lib/supabase', async (orig) => ({ ...((await orig()) as any), getSupabaseAdmin: () => fakeClient }));
vi.mock('@/config/deployments', () => ({ DEPLOYMENTS: { 80002: { contracts: { KYCVerifier: '0x1111111111111111111111111111111111111111' } } } }));

beforeEach(() => {
  calls.length = 0;
  rows = {};
  process.env.SESSION_SECRET = 'x'.repeat(48);
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  process.env.KYC_WALLET_HASH_SECRET = 'test-secret';
  process.env.VERIFIER_PRIVATE_KEY = generatePrivateKey();
  delete process.env.GOOGLE_CLIENT_ID;
});

async function walletHash() {
  const { keccak256, toHex } = await import('viem');
  return keccak256(toHex(`${applicant.address.toLowerCase()}:test-secret`));
}

async function reviewerCookie() {
  const { createSessionToken, SESSION_COOKIE } = await import('@/lib/wallet-session');
  return `${SESSION_COOKIE}=${createSessionToken(reviewer.address)}`;
}

function req(init: { method?: string; headers?: Record<string, string>; body?: unknown; form?: FormData } = {}) {
  return new NextRequest('http://app.test/api/x', {
    method: init.method ?? 'POST',
    headers: { ...(init.form ? {} : { 'content-type': 'application/json' }), 'x-chain-id': '80002', ...(init.headers ?? {}) },
    body: init.form ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
  });
}

// An approved Bronze applicant who has asked for Silver.
async function upgradeUnderReview(extra: Record<string, unknown> = {}) {
  rows.kyc_applications = [{
    id: 'app-1', wallet_hash: await walletHash(), wallet_address: applicant.address.toLowerCase(),
    status: 'pending', current_level: 1, requested_level: 2, country_code: 250,
    approved_at: new Date().toISOString(), tx_hash: '0x' + 'ab'.repeat(32), ...extra,
  }];
}

// ---------------------------------------------------------------- upgrades

describe('an upgrade under review', () => {
  async function proof(level: number) {
    const ts = Math.floor(Date.now() / 1000);
    const message = `KYC Application\nWallet: ${applicant.address}\nLevel: ${level}\nTimestamp: ${ts}`;
    const { POST } = await import('../kyc/generate-proof/route');
    return POST(req({ body: { walletAddress: applicant.address, level, timestamp: ts, signature: await applicant.signMessage({ message }) } }));
  }

  it('still gets a proof for the level already approved', async () => {
    await upgradeUnderReview();
    const res = await proof(1);
    expect(res.status).toBe(200);
    expect((await res.json()).proof).toMatchObject({ level: 1, countryCode: 250 });
  });

  it('gets none for the level it asked for', async () => {
    await upgradeUnderReview();
    expect((await proof(2)).status).toBe(403);
  });

  it('gets none for a first application still pending', async () => {
    await upgradeUnderReview({ current_level: 0, requested_level: 1 });
    expect((await proof(1)).status).toBe(403);
  });

  it('shows as approved at the held level, still registered, with the upgrade pending', async () => {
    await upgradeUnderReview();
    const { GET } = await import('../kyc/status/[address]/route');
    const body = await (await GET(req({ method: 'GET' }), { params: Promise.resolve({ address: applicant.address }) })).json();
    expect(body).toMatchObject({ status: 'approved', tierNumber: 1, isVerified: true, canInvest: true, upgradePending: true, needsRegistration: false });
  });
});

describe('a reviewer', () => {
  it('rejecting an upgrade leaves the applicant approved at the level they held', async () => {
    await upgradeUnderReview();
    const { POST } = await import('../admin/kyc/reject/route');
    const res = await POST(req({ headers: { cookie: await reviewerCookie() }, body: { applicationId: 'app-1', reason: 'invalid_document' } }));
    expect(res.status).toBe(200);
    const update = calls.find((c) => c.table === 'kyc_applications' && c.action === 'update')!;
    expect(update.payload).toMatchObject({ status: 'approved', requested_level: 1 });
  });

  it('rejecting a first application rejects it', async () => {
    await upgradeUnderReview({ current_level: 0, requested_level: 1 });
    const { POST } = await import('../admin/kyc/reject/route');
    const res = await POST(req({ headers: { cookie: await reviewerCookie() }, body: { applicationId: 'app-1', reason: 'invalid_document' } }));
    expect(res.status).toBe(200);
    expect(calls.find((c) => c.table === 'kyc_applications' && c.action === 'update')!.payload).toMatchObject({ status: 'rejected' });
  });

  it('approving an upgrade asks for the new level to be registered on chain', async () => {
    await upgradeUnderReview();
    const { POST } = await import('../admin/kyc/approve/route');
    const res = await POST(req({ headers: { cookie: await reviewerCookie() }, body: { applicationId: 'app-1' } }));
    expect(res.status).toBe(200);
    const update = calls.find((c) => c.table === 'kyc_applications' && c.action === 'update')!;
    expect(update.payload).toMatchObject({ status: 'approved', current_level: 2, tx_hash: null });
  });
});

// ---------------------------------------------------------------- KYC upload

describe('KYC upload', () => {
  async function upload() {
    const ts = String(Math.floor(Date.now() / 1000));
    const form = new FormData();
    form.set('file', new File([new Uint8Array([0xff, 0xd8, 0xff])], 'id.jpg', { type: 'image/jpeg' }));
    form.set('type', 'idFront');
    form.set('walletAddress', applicant.address);
    form.set('timestamp', ts);
    form.set('signature', await applicant.signMessage({ message: `Upload KYC Document\nWallet: ${applicant.address}\nType: idFront\nTimestamp: ${ts}` }));
    const { POST } = await import('../kyc/upload/route');
    return POST(req({ form }));
  }

  it('says so when document storage is not configured, instead of claiming success', async () => {
    const res = await upload();
    expect(res.status).toBe(503);
    expect((await res.json()).success).toBe(false);
  });

  it('refuses to file documents under a default secret', async () => {
    delete process.env.KYC_WALLET_HASH_SECRET;
    expect((await upload()).status).toBe(500);
  });
});

// ---------------------------------------------------------------- admin trade routes

describe('admin trade routes the admin screen calls', () => {
  beforeEach(() => {
    rows.trade_deals = [{ id: 'deal-1', stage: 'draft', flagged: false }];
    rows.trade_disputes = [{ id: 'disp-1', status: 'submitted' }];
  });
  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  it('flag a deal', async () => {
    const { PATCH } = await import('../admin/trade/deals/[id]/flag/route');
    const res = await PATCH(req({ method: 'PATCH', headers: { cookie: await reviewerCookie() }, body: { flagged: true } }), params('deal-1'));
    expect(res.status).toBe(200);
    expect(calls.find((c) => c.action === 'update')!.payload).toMatchObject({ flagged: true });
  });

  it('set a known stage, and refuse an unknown one', async () => {
    const { PATCH } = await import('../admin/trade/deals/[id]/route');
    const cookie = await reviewerCookie();
    expect((await PATCH(req({ method: 'PATCH', headers: { cookie }, body: { stage: 'shipping' } }), params('deal-1'))).status).toBe(200);
    expect((await PATCH(req({ method: 'PATCH', headers: { cookie }, body: { stage: 'paid_in_full' } }), params('deal-1'))).status).toBe(400);
  });

  it('set a party KYC level, and refuse an unknown one', async () => {
    const { PATCH } = await import('../admin/trade/deals/[id]/kyc/route');
    const cookie = await reviewerCookie();
    expect((await PATCH(req({ method: 'PATCH', headers: { cookie }, body: { party: 'buyer', level: 'gold' } }), params('deal-1'))).status).toBe(200);
    expect(calls.find((c) => c.action === 'update')!.payload).toMatchObject({ buyer_kyc_level: 'gold' });
    expect((await PATCH(req({ method: 'PATCH', headers: { cookie }, body: { party: 'buyer', level: 'platinum' } }), params('deal-1'))).status).toBe(400);
  });

  it('record the signed-in admin as the one who resolved a dispute', async () => {
    const { PATCH } = await import('../admin/trade/disputes/[id]/route');
    const res = await PATCH(req({ method: 'PATCH', headers: { cookie: await reviewerCookie() }, body: { status: 'resolved_buyer', resolved_by: applicant.address } }), params('disp-1'));
    expect(res.status).toBe(200);
    expect(calls.find((c) => c.action === 'update')!.payload).toMatchObject({ status: 'resolved_buyer', resolved_by: reviewer.address.toLowerCase() });
  });
});
