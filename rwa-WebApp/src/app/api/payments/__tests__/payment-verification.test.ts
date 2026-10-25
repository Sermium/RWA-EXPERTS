// @vitest-environment node
/**
 * No route may record money as received on the client's word. Each route
 * below is shown refusing a fake or mismatched payment and accepting a
 * genuine one.
 *
 * Event logs are real (viem-encoded); only the database, the chain
 * connection and Stripe are faked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { encodeAbiParameters, encodeEventTopics, parseAbi } from 'viem';

const CHAIN_ID = 80002;
// Amoy USDC as listed in config/tokens (6 decimals, known to the server).
const USDC = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582';
// A USDT not in config/tokens: decimals come from the contract (mocked: 6).
const USDT = '0x3333333333333333333333333333333333333333';
const FAKE_TOKEN = '0x4444444444444444444444444444444444444444';
const FEE_RECEIVER = '0x5555555555555555555555555555555555555555';
const DEPOSIT_ADDRESS = '0x6666666666666666666666666666666666666666';
const VAULT = '0x7777777777777777777777777777777777777777';
const FAKE_VAULT = '0x8888888888888888888888888888888888888888';
const STRANGER = '0x9999999999999999999999999999999999999999';
const PROJECT_UUID = '0b3f7c1e-1111-4222-8333-944445555666';
const ONCHAIN_PROJECT_ID = 7;

// ---------------------------------------------------------------- database fake

type Op = { table: string; action: string; payload?: any; options?: any; filters: any[][]; terminal?: string };
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
        if (['insert', 'update', 'upsert', 'delete'].includes(prop)) { op.action = prop; op.payload = args[0]; op.options = args[1]; }
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

const eq = (op: Op, col: string, val?: unknown) =>
  op.filters.some(([f, c, v]) => f === 'eq' && c === col && (val === undefined || v === val));
const writes = (table: string, action?: string) =>
  calls.filter((c) => c.table === table && (action ? c.action === action : ['insert', 'update', 'upsert'].includes(c.action)));

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (t: string) => builder(t), rpc }) }));

vi.mock('@/config/deployments', () => ({
  DEPLOYMENTS: {
    80002: {
      contracts: { RWAEscrowVault: '0x7777777777777777777777777777777777777777' },
      tokens: { USDC: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', USDT: '0x3333333333333333333333333333333333333333' },
      platformWallets: { feeReceiver: '0x5555555555555555555555555555555555555555' },
    },
  },
  PROJECT_LIMITS: { MIN_INVESTMENT: 100 },
}));
vi.mock('@/config/chains', () => {
  const CHAINS: any = {
    80002: { id: 80002, name: 'Amoy', testnet: true, chain: { id: 80002, name: 'amoy' }, rpcUrl: 'http://rpc.test', explorerUrl: 'http://scan.test' },
  };
  return {
    CHAINS,
    getChainById: (id: number) => CHAINS[id],
    isValidChainId: (id: number) => id in CHAINS,
    getDefaultChain: () => CHAINS[80002],
    getSupportedChainIds: () => [80002],
  };
});

// ---------------------------------------------------------------- chain fake

const receipts: Record<string, any> = {};
const transactions: Record<string, any> = {};
vi.mock('viem', async (orig) => {
  const real: any = await orig();
  return {
    ...real,
    createPublicClient: () => ({
      getTransactionReceipt: async ({ hash }: any) => {
        if (!receipts[hash]) throw new Error('not found');
        return receipts[hash];
      },
      getTransaction: async ({ hash }: any) => {
        if (!transactions[hash]) throw new Error('not found');
        return transactions[hash];
      },
      readContract: async () => 6,
    }),
  };
});

// ---------------------------------------------------------------- stripe fake

const intents: Record<string, any> = {};
let searchResults: any[] = [];
const created: any[] = [];
vi.mock('stripe', () => ({
  default: class {
    paymentIntents = {
      retrieve: async (id: string) => {
        if (!intents[id]) throw new Error('No such payment_intent');
        return intents[id];
      },
      search: async () => ({ data: searchResults }),
      create: async (params: any) => {
        created.push(params);
        return { id: 'pi_created', client_secret: 'cs_test', ...params };
      },
    };
    webhooks = {
      constructEvent: (body: string, signature: string) => {
        if (signature !== 'valid-signature') throw new Error('No signatures found matching the expected signature');
        return JSON.parse(body);
      },
    };
  },
}));

// ---------------------------------------------------------------- helpers

const investor = privateKeyToAccount(generatePrivateKey()).address;
const investorLc = investor.toLowerCase();

const ERC20 = parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']);
const VAULT_EVENTS = parseAbi(['event InvestmentReceived(uint256 indexed projectId, address indexed investor, uint256 amount, address paymentToken)']);
const logBase = {
  blockHash: '0x' + '00'.repeat(32), blockNumber: BigInt(1), logIndex: 0,
  transactionHash: '0x' + '11'.repeat(32), transactionIndex: 0, removed: false,
};

function transferLog(token: string, from: string, to: string, value: bigint) {
  return {
    ...logBase,
    address: token,
    topics: encodeEventTopics({ abi: ERC20, eventName: 'Transfer', args: { from: from as `0x${string}`, to: to as `0x${string}` } }),
    data: encodeAbiParameters([{ type: 'uint256' }], [value]),
  };
}
function investmentLog(vault: string, projectId: number, who: string, amount: bigint, token = USDC) {
  return {
    ...logBase,
    address: vault,
    topics: encodeEventTopics({ abi: VAULT_EVENTS, eventName: 'InvestmentReceived', args: { projectId: BigInt(projectId), investor: who as `0x${string}` } }),
    data: encodeAbiParameters([{ type: 'uint256' }, { type: 'address' }], [amount, token as `0x${string}`]),
  };
}

let txCounter = 0;
/** A successful transaction carrying `logs`; returns its hash. */
function minedTx(logs: any[], extra: Record<string, unknown> = {}) {
  const hash = '0x' + (++txCounter).toString(16).padStart(64, 'a');
  receipts[hash] = { status: 'success', from: investor, to: USDC, logs, ...extra };
  return hash;
}

const usdc = (n: number) => BigInt(Math.round(n * 1e6));

function paymentIntent(id: string, amount: number, metadata: Record<string, string>, status = 'succeeded', currency = 'usd') {
  const pi = { id, object: 'payment_intent', status, amount, amount_received: status === 'succeeded' ? amount : 0, currency, metadata };
  intents[id] = pi;
  return pi;
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://test/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  calls.length = 0;
  respond = () => undefined;
  for (const k of Object.keys(receipts)) delete receipts[k];
  for (const k of Object.keys(transactions)) delete transactions[k];
  for (const k of Object.keys(intents)) delete intents[k];
  searchResults = [];
  created.length = 0;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://db.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
  process.env.EXCHANGE_DEPOSIT_ADDRESS = DEPOSIT_ADDRESS;
  delete process.env.ALLOW_TESTNET_PAYMENTS;
});

// ================================================================ 1. exchange deposit

describe('exchange deposit credits what the chain shows arrived', () => {
  const deposit = (body: Record<string, unknown>) => post({ tokenSymbol: 'USDC', chainId: CHAIN_ID, ...body }, { 'x-wallet-address': investor });
  const credited = () => writes('user_exchange_balances');

  it('refuses every deposit while no deposit address is configured', async () => {
    delete process.env.EXCHANGE_DEPOSIT_ADDRESS;
    const txHash = minedTx([transferLog(USDC, investor, DEPOSIT_ADDRESS, usdc(10))]);
    const { POST } = await import('../../exchange/deposit/route');
    expect((await POST(deposit({ txHash }))).status).toBe(503);
    expect(credited()).toHaveLength(0);
  });

  it('refuses a successful transaction that moved nothing to the deposit address', async () => {
    const txHash = minedTx([transferLog(USDC, investor, STRANGER, usdc(10))]);
    const { POST } = await import('../../exchange/deposit/route');
    expect((await POST(deposit({ txHash, amount: 10 }))).status).toBe(400);
    expect(writes('exchange_deposits')).toHaveLength(0);
    expect(credited()).toHaveLength(0);
  });

  it("refuses someone else's transfer to the deposit address", async () => {
    const txHash = minedTx([transferLog(USDC, STRANGER, DEPOSIT_ADDRESS, usdc(10))]);
    const { POST } = await import('../../exchange/deposit/route');
    expect((await POST(deposit({ txHash }))).status).toBe(400);
    expect(credited()).toHaveLength(0);
  });

  it('refuses a look-alike token sent to the deposit address', async () => {
    const txHash = minedTx([transferLog(FAKE_TOKEN, investor, DEPOSIT_ADDRESS, usdc(10))]);
    const { POST } = await import('../../exchange/deposit/route');
    expect((await POST(deposit({ txHash }))).status).toBe(400);
    expect(credited()).toHaveLength(0);
  });

  it('credits the on-chain amount, not the amount the client sends', async () => {
    const txHash = minedTx([transferLog(USDC, investor, DEPOSIT_ADDRESS, usdc(25.5))]);
    const { POST } = await import('../../exchange/deposit/route');
    const res = await POST(deposit({ txHash, amount: 1_000_000 }));
    expect(res.status).toBe(200);
    expect(writes('exchange_deposits', 'insert')[0].payload).toMatchObject({
      wallet_address: investorLc, amount: 25.5, tx_hash: txHash, chain_id: CHAIN_ID, status: 'confirmed', token_address: USDC.toLowerCase(),
    });
    expect(credited()[0].payload).toMatchObject({ wallet_address: investorLc, token_symbol: 'USDC', balance: 25.5 });
  });

  it('credits a native deposit by the transaction value', async () => {
    const txHash = minedTx([], { to: DEPOSIT_ADDRESS });
    transactions[txHash] = { from: investor, to: DEPOSIT_ADDRESS, value: BigInt('2000000000000000000') };
    const { POST } = await import('../../exchange/deposit/route');
    const res = await POST(deposit({ tokenSymbol: 'POL', txHash }));
    expect(res.status).toBe(200);
    expect(credited()[0].payload).toMatchObject({ token_symbol: 'POL', balance: 2 });
  });

  it('refuses a deposit already confirmed', async () => {
    const txHash = minedTx([transferLog(USDC, investor, DEPOSIT_ADDRESS, usdc(10))]);
    respond = (op) => (op.table === 'exchange_deposits' && op.terminal ? { data: { id: 'd1', status: 'confirmed' }, error: null } : undefined);
    const { POST } = await import('../../exchange/deposit/route');
    expect((await POST(deposit({ txHash }))).status).toBe(409);
    expect(credited()).toHaveLength(0);
  });

  it('credits nothing when a concurrent request recorded the same transaction first', async () => {
    const txHash = minedTx([transferLog(USDC, investor, DEPOSIT_ADDRESS, usdc(10))]);
    respond = (op) => (op.table === 'exchange_deposits' && op.action === 'insert' ? { data: null, error: { code: '23505' } } : undefined);
    const { POST } = await import('../../exchange/deposit/route');
    expect((await POST(deposit({ txHash }))).status).toBe(409);
    expect(credited()).toHaveLength(0);
  });
});

// ================================================================ 2. fundraising confirm-payment

describe('fundraising confirm-payment confirms only a proven payment', () => {
  const investment = {
    id: 'inv-1', status: 'pending', round_id: 'round-1', wallet_address: investorLc,
    investment_amount_usd: 250, chain_id: CHAIN_ID, payment_token: 'USDC',
  };
  let reusedTx = false;
  beforeEach(() => {
    reusedTx = false;
    respond = (op) => {
      if (op.table !== 'fundraising_investments') return undefined;
      if (op.action === 'update') return { data: { ...investment, status: 'confirmed' }, error: null };
      if (op.terminal === 'single' && eq(op, 'id', 'inv-1')) return { data: investment, error: null };
      if (op.terminal && eq(op, 'tx_hash')) return { data: reusedTx ? { id: 'inv-other' } : null, error: null };
      return undefined;
    };
  });
  const confirmed = () => writes('fundraising_investments', 'update');
  const CARD_CENTS = 26000; // 250 USD + 4% card surcharge

  it('refuses a confirmation with no proof of payment', async () => {
    const { POST } = await import('../../fundraising/confirm-payment/route');
    expect((await POST(post({ investmentId: 'inv-1', paymentMethod: 'stripe' }))).status).toBe(402);
    expect(confirmed()).toHaveLength(0);
    expect(writes('token_allocations')).toHaveLength(0);
  });

  it('refuses a PaymentIntent that has not succeeded', async () => {
    paymentIntent('pi_pending', CARD_CENTS, { type: 'fundraising_investment', investmentId: 'inv-1' }, 'requires_payment_method');
    const { POST } = await import('../../fundraising/confirm-payment/route');
    expect((await POST(post({ investmentId: 'inv-1', paymentIntentId: 'pi_pending' }))).status).toBe(402);
    expect(confirmed()).toHaveLength(0);
  });

  it('refuses a PaymentIntent for a smaller amount', async () => {
    paymentIntent('pi_short', 100, { type: 'fundraising_investment', investmentId: 'inv-1' });
    const { POST } = await import('../../fundraising/confirm-payment/route');
    expect((await POST(post({ investmentId: 'inv-1', paymentIntentId: 'pi_short' }))).status).toBe(400);
    expect(confirmed()).toHaveLength(0);
  });

  it('refuses a PaymentIntent paid for another investment', async () => {
    paymentIntent('pi_other', CARD_CENTS, { type: 'fundraising_investment', investmentId: 'inv-2' });
    const { POST } = await import('../../fundraising/confirm-payment/route');
    expect((await POST(post({ investmentId: 'inv-1', paymentIntentId: 'pi_other' }))).status).toBe(400);
    expect(confirmed()).toHaveLength(0);
  });

  it('refuses a PaymentIntent id Stripe does not know', async () => {
    const { POST } = await import('../../fundraising/confirm-payment/route');
    expect((await POST(post({ investmentId: 'inv-1', paymentIntentId: 'pi_madeup' }))).status).toBe(400);
    expect(confirmed()).toHaveLength(0);
  });

  it('confirms a genuine card payment and adds a number, not a Promise, to the round', async () => {
    paymentIntent('pi_good', CARD_CENTS, { type: 'fundraising_investment', investmentId: 'inv-1' });
    const { POST } = await import('../../fundraising/confirm-payment/route');
    const res = await POST(post({ investmentId: 'inv-1', paymentIntentId: 'pi_good' }));
    expect(res.status).toBe(200);
    expect(confirmed()[0].payload).toMatchObject({ status: 'confirmed', stripe_payment_intent_id: 'pi_good' });
    expect(confirmed()[0].payload).not.toHaveProperty('tx_hash');
    expect(writes('token_allocations')[0].payload).toMatchObject({ status: 'confirmed' });
    const raised = calls.find((c) => c.table === 'rpc:increment_round_raised')!;
    expect(raised.payload).toEqual({ p_round_id: 'round-1', p_amount: 250 });
    // The old code wrote `rpc(...) + amount` straight into the row.
    expect(writes('fundraising_rounds')).toHaveLength(0);
  });

  it('refuses a crypto transfer to someone other than the platform', async () => {
    const txHash = minedTx([transferLog(USDC, investor, STRANGER, usdc(250))]);
    const { POST } = await import('../../fundraising/confirm-payment/route');
    expect((await POST(post({ investmentId: 'inv-1', txHash, paymentMethod: 'crypto' }))).status).toBe(400);
    expect(confirmed()).toHaveLength(0);
  });

  it('refuses a crypto transfer from another wallet', async () => {
    const txHash = minedTx([transferLog(USDC, STRANGER, FEE_RECEIVER, usdc(250))]);
    const { POST } = await import('../../fundraising/confirm-payment/route');
    expect((await POST(post({ investmentId: 'inv-1', txHash }))).status).toBe(400);
    expect(confirmed()).toHaveLength(0);
  });

  it('refuses a crypto transfer short of the investment', async () => {
    const txHash = minedTx([transferLog(USDC, investor, FEE_RECEIVER, usdc(249.99))]);
    const { POST } = await import('../../fundraising/confirm-payment/route');
    expect((await POST(post({ investmentId: 'inv-1', txHash }))).status).toBe(400);
    expect(confirmed()).toHaveLength(0);
  });

  it('refuses a transaction that already confirmed another investment', async () => {
    reusedTx = true;
    const txHash = minedTx([transferLog(USDC, investor, FEE_RECEIVER, usdc(250))]);
    const { POST } = await import('../../fundraising/confirm-payment/route');
    expect((await POST(post({ investmentId: 'inv-1', txHash }))).status).toBe(409);
    expect(confirmed()).toHaveLength(0);
  });

  it('refuses testnet tokens where testnet payments are switched off', async () => {
    process.env.ALLOW_TESTNET_PAYMENTS = 'false';
    const txHash = minedTx([transferLog(USDC, investor, FEE_RECEIVER, usdc(250))]);
    const { POST } = await import('../../fundraising/confirm-payment/route');
    expect((await POST(post({ investmentId: 'inv-1', txHash }))).status).toBe(400);
    expect(confirmed()).toHaveLength(0);
  });

  it('confirms a genuine crypto payment', async () => {
    const txHash = minedTx([transferLog(USDC, investor, FEE_RECEIVER, usdc(250))]);
    const { POST } = await import('../../fundraising/confirm-payment/route');
    const res = await POST(post({ investmentId: 'inv-1', txHash, token: 'USDT' /* ignored: the investment says USDC */ }));
    expect(res.status).toBe(200);
    expect(confirmed()[0].payload).toMatchObject({ status: 'confirmed', tx_hash: txHash });
  });
});

// ================================================================ 3. investments/record

describe('investments/record records only a proven investment', () => {
  const project = { id: PROJECT_UUID, escrow_vault_address: VAULT, project_nft_id: ONCHAIN_PROJECT_ID, deployed_chain_id: CHAIN_ID, chain_id: CHAIN_ID };
  let reused = false;
  let insertError: any = null;
  beforeEach(() => {
    reused = false;
    insertError = null;
    respond = (op) => {
      if (op.table === 'crowdfunding_applications' && op.terminal && eq(op, 'id', PROJECT_UUID)) return { data: project, error: null };
      if (op.table === 'investments' && op.action === 'insert') return insertError ? { data: null, error: insertError } : { data: { id: 'investment-1' }, error: null };
      if (op.table === 'investments' && op.terminal) return { data: reused ? { id: 'investment-0' } : null, error: null };
      return undefined;
    };
  });
  const record = (body: Record<string, unknown>) =>
    post({ project_id: PROJECT_UUID, investor_address: investorLc, amount_usd: 100, payment_method: 'usdc', chain_id: CHAIN_ID, ...body });
  const inserted = () => writes('investments', 'insert');
  const bumped = () => calls.filter((c) => c.table === 'rpc:increment_funded_amount');

  it('refuses a crypto investment with no transaction', async () => {
    const { POST } = await import('../../investments/record/route');
    expect((await POST(record({}))).status).toBe(400);
    expect(inserted()).toHaveLength(0);
  });

  it('refuses a plain token transfer to the vault: no investment event', async () => {
    const tx_hash = minedTx([transferLog(USDC, investor, VAULT, usdc(100))]);
    const { POST } = await import('../../investments/record/route');
    expect((await POST(record({ tx_hash }))).status).toBe(400);
    expect(inserted()).toHaveLength(0);
    expect(bumped()).toHaveLength(0);
  });

  it('refuses an investment in another project', async () => {
    const tx_hash = minedTx([investmentLog(VAULT, ONCHAIN_PROJECT_ID + 1, investor, usdc(100))]);
    const { POST } = await import('../../investments/record/route');
    expect((await POST(record({ tx_hash }))).status).toBe(400);
    expect(inserted()).toHaveLength(0);
  });

  it("refuses someone else's investment", async () => {
    const tx_hash = minedTx([investmentLog(VAULT, ONCHAIN_PROJECT_ID, STRANGER, usdc(100))]);
    const { POST } = await import('../../investments/record/route');
    expect((await POST(record({ tx_hash }))).status).toBe(400);
    expect(inserted()).toHaveLength(0);
  });

  it("refuses the event from a contract that is not the project's vault", async () => {
    const tx_hash = minedTx([investmentLog(FAKE_VAULT, ONCHAIN_PROJECT_ID, investor, usdc(100))]);
    const { POST } = await import('../../investments/record/route');
    expect((await POST(record({ tx_hash }))).status).toBe(400);
    expect(inserted()).toHaveLength(0);
  });

  it('refuses an amount larger than the one invested on chain', async () => {
    const tx_hash = minedTx([investmentLog(VAULT, ONCHAIN_PROJECT_ID, investor, usdc(100))]);
    const { POST } = await import('../../investments/record/route');
    expect((await POST(record({ tx_hash, amount_usd: 100000 }))).status).toBe(400);
    expect(inserted()).toHaveLength(0);
  });

  it('refuses a transaction already recorded', async () => {
    reused = true;
    const tx_hash = minedTx([investmentLog(VAULT, ONCHAIN_PROJECT_ID, investor, usdc(100))]);
    const { POST } = await import('../../investments/record/route');
    expect((await POST(record({ tx_hash }))).status).toBe(409);
    expect(inserted()).toHaveLength(0);
  });

  it('does not bump the funded amount when a concurrent request inserted first', async () => {
    insertError = { code: '23505' };
    const tx_hash = minedTx([investmentLog(VAULT, ONCHAIN_PROJECT_ID, investor, usdc(100))]);
    const { POST } = await import('../../investments/record/route');
    expect((await POST(record({ tx_hash }))).status).toBe(409);
    expect(bumped()).toHaveLength(0);
  });

  it('records a genuine vault investment at the on-chain amount', async () => {
    const tx_hash = minedTx([investmentLog(VAULT, ONCHAIN_PROJECT_ID, investor, usdc(100))]);
    const { POST } = await import('../../investments/record/route');
    const res = await POST(record({ tx_hash }));
    expect(res.status).toBe(200);
    expect(inserted()[0].payload).toMatchObject({ project_id: PROJECT_UUID, investor_address: investorLc, amount_usd: 100, tx_hash, chain_id: CHAIN_ID, status: 'completed' });
    expect(bumped()[0].payload).toEqual({ p_project_id: PROJECT_UUID, p_amount: 100 });
  });

  it('refuses a card payment Stripe has not completed', async () => {
    paymentIntent('pi_card_pending', 10000, { type: 'crowdfunding_investment', projectId: PROJECT_UUID }, 'processing');
    const { POST } = await import('../../investments/record/route');
    expect((await POST(record({ payment_method: 'stripe', payment_intent_id: 'pi_card_pending' }))).status).toBe(402);
    expect(inserted()).toHaveLength(0);
  });

  it('refuses a card payment for another project', async () => {
    paymentIntent('pi_card_other', 10000, { type: 'crowdfunding_investment', projectId: 'another-project' });
    const { POST } = await import('../../investments/record/route');
    expect((await POST(record({ payment_method: 'stripe', payment_intent_id: 'pi_card_other' }))).status).toBe(400);
    expect(inserted()).toHaveLength(0);
  });

  it('refuses a card payment of a different amount', async () => {
    paymentIntent('pi_card_small', 500, { type: 'crowdfunding_investment', projectId: PROJECT_UUID });
    const { POST } = await import('../../investments/record/route');
    expect((await POST(record({ payment_method: 'stripe', payment_intent_id: 'pi_card_small' }))).status).toBe(400);
    expect(inserted()).toHaveLength(0);
  });

  it('records a genuine card payment', async () => {
    paymentIntent('pi_card_good', 10000, { type: 'crowdfunding_investment', projectId: PROJECT_UUID, investorAddress: investor, chainId: String(CHAIN_ID) });
    const { POST } = await import('../../investments/record/route');
    const res = await POST(record({ payment_method: 'stripe', payment_intent_id: 'pi_card_good' }));
    expect(res.status).toBe(200);
    expect(inserted()[0].payload).toMatchObject({ amount_usd: 100, payment_intent_id: 'pi_card_good', payment_method: 'stripe' });
  });
});

// ================================================================ 4a. crowdfunding confirm-payment

describe('crowdfunding confirm-payment advances an application only on a proven fee', () => {
  const app = { id: 'app-1', status: 'draft', fee_amount: 500, user_address: investorLc, chain_id: CHAIN_ID };
  let storedIntent: string | null = null;
  let usedElsewhere = false;
  beforeEach(() => {
    storedIntent = null;
    usedElsewhere = false;
    respond = (op) => {
      if (op.table === 'tokenization_applications') {
        if (op.action === 'update') return { data: { ...app, status: 'pending_review' }, error: null };
        if (op.terminal && eq(op, 'payment_tx_hash')) return { data: usedElsewhere ? { id: 'app-0' } : null, error: null };
        if (op.terminal && eq(op, 'id', 'app-1')) return { data: app, error: null };
      }
      if (op.table === 'payments' && op.terminal) {
        return { data: storedIntent ? { stripe_payment_intent_id: storedIntent } : null, error: null };
      }
      return undefined;
    };
  });
  const advanced = () => writes('tokenization_applications', 'update');
  const feeIntent = (id: string, amount = 50000, metadata: Record<string, string> = {}) =>
    paymentIntent(id, amount, { type: 'crowdfunding_submission_fee', applicationId: 'app-1', walletAddress: investorLc, ...metadata });

  it('no longer advances an application when the payment intent is simply left out', async () => {
    const { POST } = await import('../../crowdfunding/confirm-payment/route');
    expect((await POST(post({ applicationId: 'app-1' }))).status).toBe(402);
    expect(advanced()).toHaveLength(0);
  });

  it('refuses a fee paid for another application', async () => {
    feeIntent('pi_fee_other', 50000, { applicationId: 'app-2' });
    const { POST } = await import('../../crowdfunding/confirm-payment/route');
    expect((await POST(post({ applicationId: 'app-1', paymentIntentId: 'pi_fee_other' }))).status).toBe(400);
    expect(advanced()).toHaveLength(0);
  });

  it('refuses a fee of the wrong amount', async () => {
    feeIntent('pi_fee_small', 100);
    const { POST } = await import('../../crowdfunding/confirm-payment/route');
    expect((await POST(post({ applicationId: 'app-1', paymentIntentId: 'pi_fee_small' }))).status).toBe(400);
    expect(advanced()).toHaveLength(0);
  });

  it('refuses a fee already used by another application', async () => {
    usedElsewhere = true;
    feeIntent('pi_fee_used');
    const { POST } = await import('../../crowdfunding/confirm-payment/route');
    expect((await POST(post({ applicationId: 'app-1', paymentIntentId: 'pi_fee_used' }))).status).toBe(409);
    expect(advanced()).toHaveLength(0);
  });

  it('refuses an on-chain fee short of the fee', async () => {
    const txHash = minedTx([transferLog(USDC, investor, FEE_RECEIVER, usdc(50))]);
    const { POST } = await import('../../crowdfunding/confirm-payment/route');
    expect((await POST(post({ applicationId: 'app-1', txHash, chainId: CHAIN_ID }))).status).toBe(400);
    expect(advanced()).toHaveLength(0);
  });

  it('advances on a genuine card fee', async () => {
    feeIntent('pi_fee_good');
    const { POST } = await import('../../crowdfunding/confirm-payment/route');
    const res = await POST(post({ applicationId: 'app-1', paymentIntentId: 'pi_fee_good' }));
    expect(res.status).toBe(200);
    expect(advanced()[0].payload).toMatchObject({ status: 'pending_review', payment_tx_hash: 'pi_fee_good' });
    expect(eq(advanced()[0], 'status', 'draft')).toBe(true);
  });

  it('advances after a Stripe redirect using the intent the webhook stored', async () => {
    storedIntent = 'pi_fee_redirect';
    feeIntent('pi_fee_redirect');
    const { POST } = await import('../../crowdfunding/confirm-payment/route');
    expect((await POST(post({ applicationId: 'app-1' }))).status).toBe(200);
    expect(advanced()[0].payload).toMatchObject({ payment_tx_hash: 'pi_fee_redirect' });
  });

  it('advances on a genuine on-chain fee (USDT, decimals read from the contract)', async () => {
    const txHash = minedTx([transferLog(USDT, investor, FEE_RECEIVER, usdc(500))]);
    const { POST } = await import('../../crowdfunding/confirm-payment/route');
    const res = await POST(post({ applicationId: 'app-1', txHash, chainId: CHAIN_ID }));
    expect(res.status).toBe(200);
    expect(advanced()[0].payload).toMatchObject({ payment_tx_hash: txHash, payment_token: 'USDT' });
  });
});

// ================================================================ 4b. crowdfunding submit

describe('crowdfunding submit marks the fee paid only when it is', () => {
  let usedFee = false;
  beforeEach(() => {
    usedFee = false;
    respond = (op) => {
      if (op.table === 'crowdfunding_applications' && op.action === 'insert') return { data: { id: 'new-app', ...op.payload }, error: null };
      if (op.terminal && (eq(op, 'fee_payment_id') || op.filters.some(([f]) => f === 'in'))) {
        return { data: usedFee && op.table === 'crowdfunding_applications' ? { id: 'old-app' } : null, error: null };
      }
      return undefined;
    };
  });
  const submit = (extra: Record<string, unknown> = {}) =>
    post({ walletAddress: investor, chainId: CHAIN_ID, name: 'P', tokenName: 'T', tokenSymbol: 'TT', fundingGoal: 10000, ...extra });
  const inserted = () => writes('crowdfunding_applications', 'insert');

  it('refuses a made-up fee payment id', async () => {
    const { POST } = await import('../../crowdfunding/submit/route');
    expect((await POST(submit({ feePaymentId: 'pi_invented' }))).status).toBe(400);
    expect(inserted()).toHaveLength(0);
  });

  it("refuses another wallet's fee", async () => {
    paymentIntent('pi_theirs', 50000, { type: 'crowdfunding_submission_fee', walletAddress: STRANGER });
    const { POST } = await import('../../crowdfunding/submit/route');
    expect((await POST(submit({ feePaymentId: 'pi_theirs' }))).status).toBe(400);
    expect(inserted()).toHaveLength(0);
  });

  it('refuses a fee already used by another application', async () => {
    usedFee = true;
    paymentIntent('pi_used', 50000, { type: 'crowdfunding_submission_fee', walletAddress: investorLc });
    const { POST } = await import('../../crowdfunding/submit/route');
    expect((await POST(submit({ feePaymentId: 'pi_used' }))).status).toBe(409);
    expect(inserted()).toHaveLength(0);
  });

  it('saves an unpaid submission as a draft awaiting payment', async () => {
    const { POST } = await import('../../crowdfunding/submit/route');
    const body = await (await POST(submit())).json();
    expect(body.requiresPayment).toBe(true);
    expect(inserted()[0].payload).toMatchObject({ fee_paid: false, status: 'draft', fee_payment_id: null });
  });

  it('marks a genuinely paid card fee', async () => {
    paymentIntent('pi_mine', 50000, { type: 'crowdfunding_submission_fee', walletAddress: investorLc });
    const { POST } = await import('../../crowdfunding/submit/route');
    const body = await (await POST(submit({ feePaymentId: 'pi_mine' }))).json();
    expect(body.requiresPayment).toBe(false);
    expect(inserted()[0].payload).toMatchObject({ fee_paid: true, status: 'pending_review', fee_payment_id: 'pi_mine' });
  });

  it('marks a genuine on-chain fee', async () => {
    const txHash = minedTx([transferLog(USDC, investor, FEE_RECEIVER, usdc(500))]);
    const { POST } = await import('../../crowdfunding/submit/route');
    const res = await POST(submit({ feePaymentId: txHash }));
    expect(res.status).toBe(200);
    expect(inserted()[0].payload).toMatchObject({ fee_paid: true, fee_payment_id: txHash });
  });
});

// ================================================================ 5. stripe webhook

describe('stripe webhook persists payments and marks what they paid for', () => {
  const investment = { id: 'inv-9', status: 'pending', round_id: 'round-1', wallet_address: investorLc, investment_amount_usd: 100, chain_id: CHAIN_ID, stripe_payment_intent_id: null };
  const app = { id: 'app-9', status: 'draft', fee_amount: 500, user_address: investorLc, chain_id: CHAIN_ID, payment_tx_hash: null };
  let paymentsError: any = null;
  beforeEach(() => {
    paymentsError = null;
    respond = (op) => {
      if (op.table === 'payments' && paymentsError) return { data: null, error: paymentsError };
      if (op.table === 'fundraising_investments' && op.action === 'update') return { data: { ...investment, status: 'confirmed' }, error: null };
      if (op.table === 'fundraising_investments' && op.terminal && eq(op, 'id', 'inv-9')) return { data: investment, error: null };
      if (op.table === 'tokenization_applications' && op.action === 'update') return { data: { ...app, status: 'pending_review' }, error: null };
      if (op.table === 'tokenization_applications' && op.terminal && eq(op, 'id', 'app-9')) return { data: app, error: null };
      return undefined;
    };
  });
  const event = (type: string, object: any) => JSON.stringify({ id: 'evt_1', type, data: { object } });
  const hook = (body: string, signature = 'valid-signature') =>
    new Request('http://test/webhook', { method: 'POST', headers: { 'stripe-signature': signature }, body }) as any;
  const paymentsUpdates = () => writes('payments', 'update').map((c) => c.payload);

  it('ignores a request without a valid signature', async () => {
    const pi = paymentIntent('pi_hook_forged', 10400, { type: 'fundraising_investment', investmentId: 'inv-9' });
    const { POST } = await import('../stripe/webhook/route');
    expect((await POST(hook(event('payment_intent.succeeded', pi), 'forged'))).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('stores a succeeded fundraising payment and confirms its investment', async () => {
    const pi = paymentIntent('pi_hook_raise', 10400, { type: 'fundraising_investment', investmentId: 'inv-9', walletAddress: investorLc });
    const { POST } = await import('../stripe/webhook/route');
    expect((await POST(hook(event('payment_intent.succeeded', pi)))).status).toBe(200);
    const upsert = writes('payments', 'upsert')[0];
    expect(upsert.payload).toMatchObject({ stripe_payment_intent_id: 'pi_hook_raise', status: 'succeeded', type: 'fundraising_investment', investment_id: 'inv-9', amount_cents: 10400 });
    expect(upsert.options).toMatchObject({ onConflict: 'stripe_payment_intent_id', ignoreDuplicates: true });
    expect(writes('fundraising_investments', 'update')[0].payload).toMatchObject({ status: 'confirmed', stripe_payment_intent_id: 'pi_hook_raise' });
    expect(paymentsUpdates().some((p) => p.processing_status === 'processed')).toBe(true);
  });

  it('does not confirm an investment from a payment of the wrong amount, and keeps it for review', async () => {
    const pi = paymentIntent('pi_hook_short', 100, { type: 'fundraising_investment', investmentId: 'inv-9' });
    const { POST } = await import('../stripe/webhook/route');
    expect((await POST(hook(event('payment_intent.succeeded', pi)))).status).toBe(200);
    expect(writes('fundraising_investments', 'update')).toHaveLength(0);
    expect(paymentsUpdates().some((p) => p.processing_status === 'needs_manual_processing')).toBe(true);
  });

  it('stores a succeeded submission fee and moves its application to review', async () => {
    const pi = paymentIntent('pi_hook_fee', 50000, { type: 'crowdfunding_submission_fee', applicationId: 'app-9', walletAddress: investorLc });
    const { POST } = await import('../stripe/webhook/route');
    expect((await POST(hook(event('payment_intent.succeeded', pi)))).status).toBe(200);
    expect(writes('tokenization_applications', 'update')[0].payload).toMatchObject({ status: 'pending_review', payment_tx_hash: 'pi_hook_fee' });
    expect(paymentsUpdates().some((p) => p.processing_status === 'processed')).toBe(true);
  });

  it('stores a failed payment', async () => {
    const pi = { ...paymentIntent('pi_hook_failed', 10400, { type: 'fundraising_investment', investmentId: 'inv-9' }, 'requires_payment_method'), last_payment_error: { message: 'Card declined' } };
    const { POST } = await import('../stripe/webhook/route');
    expect((await POST(hook(event('payment_intent.payment_failed', pi)))).status).toBe(200);
    expect(writes('payments', 'upsert')[0].payload).toMatchObject({ stripe_payment_intent_id: 'pi_hook_failed', status: 'failed' });
    expect(paymentsUpdates().some((p) => p.processing_status === 'failed' && p.failure_reason === 'Card declined')).toBe(true);
    expect(writes('fundraising_investments', 'update')).toHaveLength(0);
  });

  it('answers 500 so Stripe retries when the payment cannot be stored', async () => {
    paymentsError = { message: 'db down' };
    const pi = paymentIntent('pi_hook_dbdown', 10400, { type: 'fundraising_investment', investmentId: 'inv-9' });
    const { POST } = await import('../stripe/webhook/route');
    expect((await POST(hook(event('payment_intent.succeeded', pi)))).status).toBe(500);
    expect(writes('fundraising_investments', 'update')).toHaveLength(0);
  });
});

// ================================================================ create-intent (fundraising)

describe('create-intent prices a fundraising card payment from the stored investment', () => {
  it('ignores the amount the client sends and names the investment', async () => {
    respond = (op) => (op.table === 'fundraising_investments' && op.terminal
      ? { data: { id: 'inv-5', status: 'pending', wallet_address: investorLc, round_id: 'round-1', investment_amount_usd: 1000 }, error: null }
      : undefined);
    const { POST } = await import('../stripe/create-intent/route');
    const res = await POST(post({ type: 'fundraising_investment', investmentId: 'inv-5', amount: 1, metadata: { type: 'spoof', investmentId: 'inv-6' } }));
    expect(res.status).toBe(200);
    expect(created[0]).toMatchObject({ amount: 104000, currency: 'usd', metadata: { type: 'fundraising_investment', investmentId: 'inv-5' } });
  });
});
