// @vitest-environment node
/**
 * The KYC routes must not take the applicant's word for anything that
 * approves them: not a score their browser computed, not a transaction hash
 * they typed, not a level they asked a proof to be signed for.
 *
 * Signatures, proofs and event logs here are real (viem); only the database
 * and the chain connection are faked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { encodeAbiParameters, encodeEventTopics, parseAbi, keccak256, toHex } from 'viem';

const VERIFIER = '0x1111111111111111111111111111111111111111';
const OTHER_CONTRACT = '0x2222222222222222222222222222222222222222';
const CHAIN_ID = 80002;

// ---------------------------------------------------------------- fakes

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

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (t: string) => builder(t) }) }));
vi.mock('@/config/deployments', () => ({ DEPLOYMENTS: { 80002: { contracts: { KYCVerifier: '0x1111111111111111111111111111111111111111' } } } }));
vi.mock('@/config/chains', () => ({ CHAINS: { 80002: { chain: { id: 80002, name: 'amoy' }, rpcUrl: 'http://rpc.test' } } }));

let receipt: any = null;
vi.mock('viem', async (orig) => {
  const real: any = await orig();
  return { ...real, createPublicClient: () => ({ getTransactionReceipt: async () => receipt }) };
});

const applicant = privateKeyToAccount(generatePrivateKey());
const verifierKey = generatePrivateKey();

beforeEach(() => {
  calls.length = 0;
  respond = () => undefined;
  receipt = null;
  process.env.VERIFIER_PRIVATE_KEY = verifierKey;
  process.env.KYC_WALLET_HASH_SECRET = 'test-secret';
});

const now = () => Math.floor(Date.now() / 1000);
const walletHash = () => keccak256(toHex(`${applicant.address.toLowerCase()}:test-secret`));

function post(body: unknown) {
  return new Request('http://test/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-chain-id': String(CHAIN_ID) },
    body: JSON.stringify(body),
  }) as any;
}

async function proofRequest(level: number, extra: Record<string, unknown> = {}, ts = now()) {
  const message = `KYC Application\nWallet: ${applicant.address}\nLevel: ${level}\nTimestamp: ${ts}`;
  return post({ walletAddress: applicant.address, level, timestamp: ts, signature: await applicant.signMessage({ message }), ...extra });
}

// ---------------------------------------------------------------- generate-proof

describe('generate-proof signs only what a reviewer approved', () => {
  const approved = (level: number, country = 250) => (op: Op) =>
    op.table === 'kyc_applications' && op.terminal ? { data: { status: 'approved', current_level: level, country_code: country }, error: null } : undefined;

  it('refuses a wallet with no approved application, whatever it asks for', async () => {
    const { POST } = await import('../generate-proof/route');
    const res = await POST(await proofRequest(4, { countryCode: 250 }));
    expect(res.status).toBe(403);
  });

  it('refuses a level above the approved one', async () => {
    respond = approved(1);
    const { POST } = await import('../generate-proof/route');
    expect((await POST(await proofRequest(4))).status).toBe(403);
  });

  it('signs the approved level with the country on file, not the one sent', async () => {
    respond = approved(2, 250);
    const { POST } = await import('../generate-proof/route');
    const res = await POST(await proofRequest(2, { countryCode: 408 }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.proof).toMatchObject({ level: 2, countryCode: 250 });
  });

  it('refuses a signed request older than five minutes', async () => {
    respond = approved(1);
    const { POST } = await import('../generate-proof/route');
    expect((await POST(await proofRequest(1, {}, now() - 600))).status).toBe(400);
  });
});

// ---------------------------------------------------------------- submit

describe('submit decides nothing on what the browser reports', () => {
  it('keeps a perfect score and a made-up payment pending, and stores the score as unverified', async () => {
    process.env.KYC_ENCRYPTION_KEY = '11'.repeat(32);
    // No existing application and no settings row; the insert hands back its row.
    respond = (op) => (op.action === 'insert' && op.table === 'kyc_applications' ? { data: { id: 'new-app' }, error: null } : undefined);
    const { POST } = await import('../submit/route');
    const ts = now();
    const message = `Submit KYC Application\nWallet: ${applicant.address}\nLevel: 1\nTimestamp: ${ts}`;
    const res = await POST(post({
      walletAddress: applicant.address, signature: await applicant.signMessage({ message }), timestamp: ts,
      firstName: 'Ana', lastName: 'Test', email: 'ana@example.test', countryCode: 250, requestedLevel: 1,
      verificationScore: 100, livenessVerification: { passed: true, score: 100, completedChallenges: 4, totalChallenges: 4 },
      txHash: '0x' + 'ab'.repeat(32),
    }));
    const body = await res.json();
    expect(body).toMatchObject({ success: true, status: 'pending', autoApproved: false });

    const insert = calls.find((c) => c.table === 'kyc_applications' && c.action === 'insert')!;
    expect(insert.payload).toMatchObject({ status: 'pending', current_level: 0, verification_score: null, tx_hash: null, approved_at: null });
    expect(insert.payload.documents.clientReported).toMatchObject({ verificationScore: 100 });
    // No proof is signed at submission.
    expect(calls.some((c) => c.table === 'kyc_proofs')).toBe(false);
  });
});

// ---------------------------------------------------------------- confirm-payment

const EVENTS = parseAbi(['event WalletRegistered(address indexed wallet, uint8 level, uint16 countryCode, uint256 fee)']);
function registeredLog(wallet: string, level: number, address = VERIFIER) {
  return {
    address,
    topics: encodeEventTopics({ abi: EVENTS, eventName: 'WalletRegistered', args: { wallet: wallet as `0x${string}` } }),
    data: encodeAbiParameters([{ type: 'uint8' }, { type: 'uint16' }, { type: 'uint256' }], [level, 250, BigInt('1000000000000000')]),
    blockHash: '0x' + '00'.repeat(32), blockNumber: BigInt(1), logIndex: 0, transactionHash: '0x' + '11'.repeat(32), transactionIndex: 0, removed: false,
  };
}
const TX = '0x' + 'cd'.repeat(32);
const approvedApp = (level: number) => (op: Op) => {
  if (op.table !== 'kyc_applications' || !op.terminal) return undefined;
  if (op.filters.some(([f, col]) => f === 'eq' && col === 'tx_hash')) return { data: null, error: null };
  return { data: { id: 'app-1', current_level: level, tx_hash: null }, error: null };
};

describe('confirm-payment records a real registration and approves nothing', () => {
  it('refuses a transaction that did not go to the KYC verifier', async () => {
    respond = approvedApp(1);
    receipt = { status: 'success', from: applicant.address, to: OTHER_CONTRACT, logs: [] };
    const { POST } = await import('../confirm-payment/route');
    const res = await POST(post({ walletAddress: applicant.address, txHash: TX }));
    expect(res.status).toBe(400);
    expect(calls.some((c) => c.action === 'update')).toBe(false);
  });

  it('refuses a call to the verifier that registered nobody', async () => {
    respond = approvedApp(1);
    receipt = { status: 'success', from: applicant.address, to: VERIFIER, logs: [] };
    const { POST } = await import('../confirm-payment/route');
    expect((await POST(post({ walletAddress: applicant.address, txHash: TX }))).status).toBe(400);
  });

  it('refuses a registration at a level other than the approved one', async () => {
    respond = approvedApp(1);
    receipt = { status: 'success', from: applicant.address, to: VERIFIER, logs: [registeredLog(applicant.address, 3)] };
    const { POST } = await import('../confirm-payment/route');
    expect((await POST(post({ walletAddress: applicant.address, txHash: TX }))).status).toBe(400);
  });

  it('refuses a transaction already recorded', async () => {
    respond = (op) => (op.table === 'kyc_applications' && op.terminal
      && op.filters.some(([f, col]) => f === 'eq' && col === 'tx_hash') ? { data: { id: 'other' }, error: null } : approvedApp(1)(op));
    receipt = { status: 'success', from: applicant.address, to: VERIFIER, logs: [registeredLog(applicant.address, 1)] };
    const { POST } = await import('../confirm-payment/route');
    expect((await POST(post({ walletAddress: applicant.address, txHash: TX }))).status).toBe(409);
  });

  it('records the hash of a genuine registration, and changes nothing else', async () => {
    respond = approvedApp(1);
    receipt = { status: 'success', from: applicant.address, to: VERIFIER, logs: [registeredLog(applicant.address, 1)] };
    const { POST } = await import('../confirm-payment/route');
    const res = await POST(post({ walletAddress: applicant.address, txHash: TX }));
    expect(res.status).toBe(200);
    const update = calls.find((c) => c.action === 'update')!;
    expect(Object.keys(update.payload).sort()).toEqual(['tx_hash', 'updated_at']);
    expect(update.payload.tx_hash).toBe(TX);
  });
});

void walletHash;
