// End-to-end tests of SecureWallet's storage format and v1 -> v2 migration, with the Expo native
// modules replaced by in-memory fakes.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash, randomBytes as nodeRandomBytes } from 'node:crypto';

const store = vi.hoisted(() => new Map<string, string>());

vi.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
  getItemAsync: vi.fn(async (key: string) => (store.has(key) ? store.get(key)! : null)),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    store.delete(key);
  }),
}));

vi.mock('expo-crypto', async () => {
  const nodeCrypto = await import('node:crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    getRandomBytes: (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
    getRandomBytesAsync: async (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
    digestStringAsync: async (_alg: string, data: string) =>
      nodeCrypto.createHash('sha256').update(data, 'utf8').digest('hex'),
  };
});

vi.mock('expo-local-authentication', () => ({}));

// Keep ethers real, but stop JsonRpcProvider from making network calls.
vi.mock('ethers', async (importOriginal) => {
  const real = (await importOriginal()) as typeof import('ethers');
  class OfflineProvider {
    _isProvider = true;
  }
  return {
    ...real,
    ethers: { ...real.ethers, providers: { ...real.ethers.providers, JsonRpcProvider: OfflineProvider } },
  };
});

import { ethers } from 'ethers';

const PIN = '135790';
const MNEMONIC = 'test test test test test test test test test test test junk';
const PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

async function freshWallet() {
  vi.resetModules();
  const mod = await import('../SecureWallet');
  return mod.secureWallet;
}

function groups() {
  return JSON.parse(store.get('wallet_groups')!).groups as Array<{ type: string; encryptedSecret: string }>;
}

/** Seed the store exactly as the old (XOR) implementation would have written it. */
function seedLegacyInstall(pin: string) {
  const sha256Hex = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
  const salt = nodeRandomBytes(32).toString('hex');
  let key = pin + salt;
  for (let i = 0; i < 1000; i++) key = sha256Hex(key);
  const xor = (data: string) => {
    const k = Buffer.from(key, 'utf8');
    return Buffer.from(Buffer.from(data, 'utf8').map((b, i) => b ^ k[i % k.length])).toString('hex');
  };
  const seedAddress = ethers.utils.HDNode.fromMnemonic(MNEMONIC).derivePath("m/44'/60'/0'/0/0").address;
  const keyAddress = new ethers.Wallet(PRIVATE_KEY).address;

  store.set('wallet_pin_hash', sha256Hex(pin + salt));
  store.set('wallet_salt', salt);
  store.set(
    'wallet_groups',
    JSON.stringify({
      groups: [
        {
          id: 'g1',
          name: 'Main',
          type: 'mnemonic',
          encryptedSecret: xor(MNEMONIC),
          addresses: [{ index: 0, name: 'Account 1', address: seedAddress, createdAt: 1 }],
          createdAt: 1,
        },
        {
          id: 'g2',
          name: 'Imported',
          type: 'privateKey',
          encryptedSecret: xor(PRIVATE_KEY),
          addresses: [{ index: 0, name: 'Imported', address: keyAddress, createdAt: 2 }],
          createdAt: 2,
        },
      ],
    })
  );
  store.set('active_group_id', 'g1');
  store.set('active_wallet_index', '0');
  return { seedAddress, keyAddress };
}

beforeEach(() => {
  store.clear();
});

describe('SecureWallet (v2 storage)', () => {
  it('creates a wallet stored as v2 and unlocks it again after a restart', async () => {
    let wallet = await freshWallet();
    const created = await wallet.createWalletGroup(PIN, 'Main');

    const [group] = groups();
    const blob = JSON.parse(group.encryptedSecret);
    expect(blob).toMatchObject({ v: 2, cipher: 'xchacha20poly1305', kdf: { name: 'scrypt' } });
    expect(group.encryptedSecret).not.toContain(created.mnemonic.split(' ')[0] + ' ');
    expect(store.has('wallet_pin_hash')).toBe(false);
    expect(store.has('wallet_salt')).toBe(false);
    expect(store.get('wallet_device_secret_v2')).toMatch(/^[0-9a-f]{64}$/);

    wallet = await freshWallet();
    expect(await wallet.unlockWallet(PIN)).toBe(created.address);
    expect(await wallet.exportMnemonic(PIN)).toBe(created.mnemonic);
  }, 30_000);

  it('fails cleanly on a wrong PIN', async () => {
    let wallet = await freshWallet();
    await wallet.createWalletGroup(PIN, 'Main');

    wallet = await freshWallet();
    expect(await wallet.verifyPin('000000')).toBe(false);
    await expect(wallet.unlockWallet('000000')).rejects.toThrow('Invalid PIN');
    await expect(wallet.exportMnemonic('000000')).rejects.toThrow('Invalid PIN');
    expect(wallet.isUnlocked()).toBe(false);
  }, 30_000);

  it('refuses to decrypt tampered stored data', async () => {
    let wallet = await freshWallet();
    await wallet.createWalletGroup(PIN, 'Main');

    const data = JSON.parse(store.get('wallet_groups')!);
    const blob = JSON.parse(data.groups[0].encryptedSecret);
    blob.ct = (blob.ct[0] === '0' ? '1' : '0') + blob.ct.slice(1);
    data.groups[0].encryptedSecret = JSON.stringify(blob);
    store.set('wallet_groups', JSON.stringify(data));

    wallet = await freshWallet();
    await expect(wallet.unlockWallet(PIN)).rejects.toThrow(/integrity check/);
    await expect(wallet.exportMnemonic(PIN)).rejects.toThrow(/integrity check/);
  }, 30_000);

  it('refuses to unlock if the device secret is gone (e.g. restored onto a new device)', async () => {
    let wallet = await freshWallet();
    await wallet.createWalletGroup(PIN, 'Main');
    store.delete('wallet_device_secret_v2');

    wallet = await freshWallet();
    await expect(wallet.unlockWallet(PIN)).rejects.toThrow(/recovery phrase/);
  }, 30_000);
});

describe('SecureWallet v1 -> v2 migration', () => {
  it('migrates legacy XOR blobs on the first successful unlock', async () => {
    const { seedAddress, keyAddress } = seedLegacyInstall(PIN);

    let wallet = await freshWallet();
    expect(await wallet.hasPinSet()).toBe(true);
    expect(await wallet.unlockWallet(PIN)).toBe(seedAddress);

    // Every secret is now v2, the fast PIN hash and legacy salt are gone.
    for (const g of groups()) expect(JSON.parse(g.encryptedSecret).v).toBe(2);
    expect(store.has('wallet_pin_hash')).toBe(false);
    expect(store.has('wallet_salt')).toBe(false);
    expect(store.has('wallet_pin_verifier_v2')).toBe(true);

    // Secrets survive the migration.
    expect(await wallet.exportMnemonic(PIN, 'g1')).toBe(MNEMONIC);
    expect(await wallet.exportPrivateKey(PIN, 'g2')).toBe(PRIVATE_KEY);
    await wallet.setActiveWalletByAddress(keyAddress);

    // And the v2 data unlocks after a restart.
    wallet = await freshWallet();
    expect(await wallet.unlockWallet(PIN)).toBe(keyAddress);
  }, 30_000);

  it('does not migrate or touch legacy data on a wrong PIN', async () => {
    seedLegacyInstall(PIN);
    const before = store.get('wallet_groups');

    const wallet = await freshWallet();
    await expect(wallet.unlockWallet('999999')).rejects.toThrow('Invalid PIN');
    expect(store.get('wallet_groups')).toBe(before);
    expect(store.has('wallet_pin_hash')).toBe(true);
    expect(store.has('wallet_pin_verifier_v2')).toBe(false);
  });

  it('finishes an interrupted migration (verifier written, secrets still v1)', async () => {
    const { seedAddress } = seedLegacyInstall(PIN);
    const legacy = {
      groups: store.get('wallet_groups')!,
      hash: store.get('wallet_pin_hash')!,
      salt: store.get('wallet_salt')!,
    };

    // Run a migration, then roll the store back to the state right after the verifier was written
    // but before the re-encrypted secrets were saved (as if the app had been killed there).
    let wallet = await freshWallet();
    await wallet.unlockWallet(PIN);
    store.set('wallet_groups', legacy.groups);
    store.set('wallet_pin_hash', legacy.hash);
    store.set('wallet_salt', legacy.salt);

    wallet = await freshWallet();
    expect(await wallet.unlockWallet(PIN)).toBe(seedAddress);
    for (const g of groups()) expect(JSON.parse(g.encryptedSecret).v).toBe(2);
    expect(store.has('wallet_pin_hash')).toBe(false);
    expect(store.has('wallet_salt')).toBe(false);
    expect(await wallet.exportMnemonic(PIN, 'g1')).toBe(MNEMONIC);
  }, 30_000);

  it('refuses v1 data that can no longer be migrated instead of returning garbage', async () => {
    seedLegacyInstall(PIN);
    const legacyGroups = store.get('wallet_groups')!;

    let wallet = await freshWallet();
    await wallet.unlockWallet(PIN);
    // v1 blobs reappear but the legacy salt is gone: they cannot be decrypted.
    store.set('wallet_groups', legacyGroups);

    wallet = await freshWallet();
    await expect(wallet.unlockWallet(PIN)).rejects.toThrow(/old storage format/);
  }, 30_000);
});
