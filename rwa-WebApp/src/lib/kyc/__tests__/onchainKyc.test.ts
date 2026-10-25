// @vitest-environment node
/**
 * Security tokens enforce KYC on every holder, so the app caches KYC proofs on the token before
 * tokens are minted. These tests use real EIP-712 signatures (viem); only the chain and the
 * proof endpoint are faked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { verifyTypedData } from 'viem';
import { ensureKYCCached, signKYCProofForWallet } from '../onchainCache';
import { ensureOwnKYCCached, requestKYCProof } from '../ownProof';

vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: () => ({}) }));

const VERIFIER = '0x1111111111111111111111111111111111111111';
const TOKEN = '0x2222222222222222222222222222222222222222';
const WALLET = '0x3333333333333333333333333333333333333333';
const CHAIN_ID = 43113;

const KYC_TYPES = {
  KYCProof: [
    { name: 'wallet', type: 'address' },
    { name: 'level', type: 'uint8' },
    { name: 'countryCode', type: 'uint16' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

function fakeChain(kycValid: boolean) {
  const publicClient = {
    readContract: vi.fn().mockResolvedValue(kycValid),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: 'success' }),
  };
  const walletClient = {
    writeContract: vi.fn().mockResolvedValue('0xabc'),
  };
  return { publicClient, walletClient };
}

describe('server-side KYC proofs', () => {
  const signerKey = generatePrivateKey();

  beforeEach(() => {
    vi.stubEnv('VERIFIER_PRIVATE_KEY', signerKey);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('signs proofs the KYCVerifier accepts (its EIP-712 domain, the trusted signer)', async () => {
    const proof = await signKYCProofForWallet(CHAIN_ID, VERIFIER, WALLET, { level: 4, countryCode: 756 });
    const valid = await verifyTypedData({
      address: privateKeyToAccount(signerKey).address,
      domain: { name: 'RWA KYC Verifier', version: '1', chainId: CHAIN_ID, verifyingContract: VERIFIER },
      types: KYC_TYPES,
      primaryType: 'KYCProof',
      message: { wallet: WALLET, level: 4, countryCode: 756, expiry: proof.expiry },
      signature: proof.signature,
    });
    expect(valid).toBe(true);
    expect(proof.expiry).toBeGreaterThan(BigInt(Math.floor(Date.now() / 1000)));
  });

  it('caches a proof only for wallets without valid KYC on the token', async () => {
    const valid = fakeChain(true);
    const skipped = await ensureKYCCached({
      publicClient: valid.publicClient as any, walletClient: valid.walletClient as any,
      chainId: CHAIN_ID, verifier: VERIFIER, token: TOKEN, wallet: WALLET, kyc: { level: 4, countryCode: 756 },
    });
    expect(skipped).toBeNull();
    expect(valid.walletClient.writeContract).not.toHaveBeenCalled();

    const missing = fakeChain(false);
    const hash = await ensureKYCCached({
      publicClient: missing.publicClient as any, walletClient: missing.walletClient as any,
      chainId: CHAIN_ID, verifier: VERIFIER, token: TOKEN, wallet: WALLET, kyc: { level: 4, countryCode: 756 },
    });
    expect(hash).toBe('0xabc');
    const call = missing.walletClient.writeContract.mock.calls[0][0];
    expect(call.address).toBe(TOKEN);
    expect(call.functionName).toBe('cacheKYC');
    expect(call.args[0]).toBe(WALLET);
    expect(call.args[1]).toMatchObject({ level: 4, countryCode: 756 });
    expect(missing.publicClient.waitForTransactionReceipt).toHaveBeenCalledWith({ hash: '0xabc' });
  });

  it('refuses to sign without the verifier key', async () => {
    vi.stubEnv('VERIFIER_PRIVATE_KEY', '');
    await expect(signKYCProofForWallet(CHAIN_ID, VERIFIER, WALLET, { level: 1, countryCode: 840 }))
      .rejects.toThrow('VERIFIER_PRIVATE_KEY');
  });
});

describe("a wallet's own KYC proof", () => {
  const account = privateKeyToAccount(generatePrivateKey());
  const proofResponse = { hasProof: true, proof: { level: 2, countryCode: 840, expiry: 2000000000, signature: '0xdead' } };

  function fakeWallet() {
    return {
      account,
      chain: undefined,
      signMessage: vi.fn(({ message }: { message: string }) => account.signMessage({ message })),
      writeContract: vi.fn().mockResolvedValue('0xbeef'),
    };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks /api/kyc/proof with a wallet signature over the expected message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => proofResponse });
    vi.stubGlobal('fetch', fetchMock);
    const wallet = fakeWallet();

    const proof = await requestKYCProof(wallet as any, CHAIN_ID);

    expect(proof).toEqual({ level: 2, countryCode: 840, expiry: BigInt(2000000000), signature: '0xdead' });
    const [url, init] = fetchMock.mock.calls[0];
    const params = new URL(url, 'http://localhost').searchParams;
    expect(params.get('wallet')).toBe(account.address);
    expect(init.headers['x-chain-id']).toBe(String(CHAIN_ID));
    const message = wallet.signMessage.mock.calls[0][0].message;
    expect(message).toBe(`Get KYC Proof\nWallet: ${account.address}\nTimestamp: ${params.get('timestamp')}`);
  });

  it('surfaces why no proof is available', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ hasProof: false, message: 'Your KYC application is pending review' }),
    }));
    await expect(requestKYCProof(fakeWallet() as any, CHAIN_ID)).rejects.toThrow('pending review');
  });

  it('caches the proof on the token before a claim, unless KYC is already valid there', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => proofResponse }));

    const cached = fakeChain(true);
    const walletA = fakeWallet();
    await ensureOwnKYCCached(cached.publicClient as any, walletA as any, CHAIN_ID, TOKEN);
    expect(walletA.writeContract).not.toHaveBeenCalled();

    const uncached = fakeChain(false);
    const walletB = fakeWallet();
    await ensureOwnKYCCached(uncached.publicClient as any, walletB as any, CHAIN_ID, TOKEN);
    const call = walletB.writeContract.mock.calls[0][0];
    expect(call.functionName).toBe('cacheKYC');
    expect(call.args).toEqual([account.address, { level: 2, countryCode: 840, expiry: BigInt(2000000000), signature: '0xdead' }]);
  });
});
