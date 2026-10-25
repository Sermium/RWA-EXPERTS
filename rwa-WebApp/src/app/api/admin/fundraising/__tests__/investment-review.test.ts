// @vitest-environment node
/**
 * An admin attesting to an off-platform payment confirms an investment once,
 * through the same code as the payment routes; a rejection fails it and
 * touches no totals; nobody else can do either.
 *
 * Only the database and the admin check are faked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The first import of each route module can take seconds on a cold start.
vi.setConfig({ testTimeout: 30_000 });
import { NextResponse } from 'next/server';

const ADMIN = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa';
const INVESTOR = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

// ---------------------------------------------------------------- database fake

type Op = { table: string; action: string; payload?: any; filters: any[][]; terminal?: string };
let respond: (op: Op) => { data: any; error: any } | undefined = () => undefined;
const calls: Op[] = [];

function builder(table: string) {
  const op: Op = { table, action: 'select', filters: [] };
  const finish = (terminal?: string) => {
    const done = { ...op, terminal };
    calls.push(done);
    return Promise.resolve(respond(done) ?? { data: null, error: null });
  };
  const b: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (res: any, rej: any) => finish().then(res, rej);
      if (prop === 'single' || prop === 'maybeSingle') return () => finish(prop);
      return (...args: any[]) => {
        if (['insert', 'update', 'upsert', 'delete'].includes(prop)) { op.action = prop; op.payload = args[0]; }
        else if (prop !== 'select') op.filters.push([prop, ...args]);
        return b;
      };
    },
  });
  return b;
}
function rpc(name: string, args: any) {
  const op: Op = { table: `rpc:${name}`, action: 'rpc', payload: args, filters: [] };
  calls.push(op);
  return Promise.resolve(respond(op) ?? { data: null, error: null });
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (t: string) => builder(t), rpc }) }));

const writes = (table: string) => calls.filter((c) => c.table === table && c.action === 'update');
const rpcs = (name: string) => calls.filter((c) => c.table === `rpc:${name}`);

// ---------------------------------------------------------------- admin fake

type Auth = { isValid: boolean; walletAddress: string | null; error?: NextResponse; role?: string };
let auth: Auth;
const activity: any[] = [];
vi.mock('@/lib/admin', () => ({
  validateAdminAccess: async () => auth,
  logAdminActivity: async (...args: any[]) => { activity.push(args); },
}));

// ---------------------------------------------------------------- helpers

let investment: Record<string, any>;
/** The database applies a conditional status update only when no excluded status matches. */
function statusUpdateApplies(op: Op) {
  return !op.filters.some(([f, col, v]) => f === 'neq' && col === 'status' && investment.status === v);
}

beforeEach(() => {
  calls.length = 0;
  activity.length = 0;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://db.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  auth = { isValid: true, walletAddress: ADMIN, role: 'admin' };
  investment = {
    id: 'inv-1', status: 'pending', round_id: 'round-1', wallet_address: INVESTOR,
    investment_amount_usd: 500, admin_notes: null,
  };
  respond = (op) => {
    if (op.table !== 'fundraising_investments') return undefined;
    if (op.action === 'update') {
      if (!statusUpdateApplies(op)) return { data: null, error: null };
      investment = { ...investment, ...op.payload };
      return { data: investment, error: null };
    }
    if (op.terminal && op.filters.some(([f, c, v]) => f === 'eq' && c === 'id' && v === 'inv-1')) return { data: investment, error: null };
    return undefined;
  };
});

function review(body: unknown, id = 'inv-1') {
  const req = new Request(`http://test/api/admin/fundraising/investments/${id}/review`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
  return { req, ctx: { params: Promise.resolve({ id }) } };
}
async function send(body: unknown, id?: string) {
  const { POST } = await import('../investments/[id]/review/route');
  const { req, ctx } = review(body, id);
  return POST(req, ctx);
}

// ---------------------------------------------------------------- tests

describe('admin review of a fundraising investment', () => {
  it('confirms an off-platform payment: investment, allocations and totals, once', async () => {
    const res = await send({ confirm: true, note: 'Bank transfer ref 4471' });
    expect(res.status).toBe(200);

    const update = writes('fundraising_investments')[0];
    expect(update.payload).toMatchObject({ status: 'confirmed' });
    expect(update.payload.admin_notes).toContain(`Confirmed by admin ${ADMIN.toLowerCase()}: Bank transfer ref 4471`);
    expect(update.payload).not.toHaveProperty('stripe_payment_intent_id');
    expect(update.payload).not.toHaveProperty('tx_hash');

    expect(writes('token_allocations')[0].payload).toMatchObject({ status: 'confirmed' });
    expect(rpcs('increment_round_raised')).toHaveLength(1);
    expect(rpcs('increment_round_raised')[0].payload).toEqual({ p_round_id: 'round-1', p_amount: 500 });

    expect(activity).toHaveLength(1);
    expect(activity[0][0]).toBe('fundraising_investment_confirmed');
    expect(activity[0][1]).toBe(ADMIN.toLowerCase());
    expect(activity[0][3]).toMatchObject({ investment_id: 'inv-1', decision: 'confirmed', note: 'Bank transfer ref 4471' });
  });

  it('rejects: the investment fails, allocations are cancelled and no totals move', async () => {
    const res = await send({ confirm: false, note: 'No funds received' });
    expect(res.status).toBe(200);

    expect(writes('fundraising_investments')[0].payload).toMatchObject({ status: 'failed' });
    expect(writes('token_allocations')[0].payload).toMatchObject({ status: 'cancelled' });
    expect(calls.filter((c) => c.action === 'rpc')).toHaveLength(0);
    expect(writes('fundraising_rounds')).toHaveLength(0);
    expect(activity[0][0]).toBe('fundraising_investment_rejected');
  });

  it('refuses a second review of a confirmed investment, and counts nothing again', async () => {
    expect((await send({ confirm: true })).status).toBe(200);
    calls.length = 0;
    expect((await send({ confirm: true })).status).toBe(409);
    expect((await send({ confirm: false })).status).toBe(409);
    expect(writes('fundraising_investments')).toHaveLength(0);
    expect(calls.filter((c) => c.action === 'rpc')).toHaveLength(0);
  });

  it('refuses to confirm an investment already rejected', async () => {
    investment.status = 'failed';
    expect((await send({ confirm: true })).status).toBe(409);
    expect(writes('fundraising_investments')).toHaveLength(0);
    expect(calls.filter((c) => c.action === 'rpc')).toHaveLength(0);
  });

  it('counts nothing when a concurrent review or payment decided it first', async () => {
    // Read as pending, but decided by the time the conditional update runs.
    respond = (op) => {
      if (op.table !== 'fundraising_investments') return undefined;
      if (op.action === 'update') return { data: null, error: null };
      return op.terminal ? { data: investment, error: null } : undefined;
    };
    expect((await send({ confirm: true })).status).toBe(409);
    expect(calls.filter((c) => c.action === 'rpc')).toHaveLength(0);
    expect(writes('token_allocations')).toHaveLength(0);
    expect(activity).toHaveLength(0);
  });

  it('refuses a caller with no wallet (401) and a non-admin (403), touching nothing', async () => {
    auth = { isValid: false, walletAddress: null, error: NextResponse.json({ error: 'Wallet address required' }, { status: 401 }) };
    expect((await send({ confirm: true })).status).toBe(401);
    auth = { isValid: false, walletAddress: INVESTOR, error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
    expect((await send({ confirm: true })).status).toBe(403);
    expect(calls).toHaveLength(0);
    expect(activity).toHaveLength(0);
  });

  it('still refuses when the auth result carries no error response', async () => {
    auth = { isValid: false, walletAddress: null };
    expect((await send({ confirm: true })).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it('refuses a body without a boolean decision', async () => {
    expect((await send({ confirm: 'yes' })).status).toBe(400);
    expect(writes('fundraising_investments')).toHaveLength(0);
  });

  it('records the review in metadata when the row has no notes column', async () => {
    delete investment.admin_notes;
    investment.metadata = { source: 'raise' };
    expect((await send({ confirm: false, note: 'duplicate' })).status).toBe(200);
    expect(writes('fundraising_investments')[0].payload.metadata).toMatchObject({
      source: 'raise',
      admin_review: { decision: 'failed', reviewed_by: ADMIN.toLowerCase(), note: 'duplicate' },
    });
  });
});
