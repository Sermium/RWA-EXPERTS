import { describe, it, expect } from 'vitest';
import { createHash, randomBytes as nodeRandomBytes } from 'node:crypto';
import {
  DEFAULT_KDF,
  InvalidVaultDataError,
  ScryptParams,
  WrongPinError,
  createPinVerifier,
  createVaultKey,
  decryptV2,
  deriveKeyForBlob,
  deriveLegacyKey,
  encryptV2,
  generateDeviceSecret,
  legacyHashPin,
  legacyXorDecrypt,
  legacyXorEncrypt,
  openPinVerifier,
  parseDeviceSecret,
  parseStoredSecret,
} from '../vaultCrypto';

const rng = (n: number) => new Uint8Array(nodeRandomBytes(n));
// Low-cost parameters keep the suite fast; one test below exercises DEFAULT_KDF.
const FAST_KDF: ScryptParams = { name: 'scrypt', N: 2 ** 10, r: 8, p: 1, dkLen: 32 };

const MNEMONIC = 'test test test test test test test test test test test junk';
const PIN = '123456';

function deviceSecret() {
  return parseDeviceSecret(generateDeviceSecret(rng));
}

describe('v2 vault encryption', () => {
  it('round-trips and stores the versioned format', async () => {
    const secret = deviceSecret();
    const vk = await createVaultKey(PIN, secret, rng, FAST_KDF);
    const stored = encryptV2(MNEMONIC, vk, rng);

    const blob = JSON.parse(stored);
    expect(blob).toMatchObject({ v: 2, cipher: 'xchacha20poly1305', kdf: FAST_KDF, salt: vk.saltHex });
    expect(blob.salt).toMatch(/^[0-9a-f]{64}$/);
    expect(blob.nonce).toMatch(/^[0-9a-f]{48}$/);
    expect(stored).not.toContain('test');

    // Fresh derivation from the stored parameters opens it.
    const parsed = parseStoredSecret(stored);
    expect(parsed.version).toBe(2);
    if (parsed.version !== 2) throw new Error('unreachable');
    const vk2 = await deriveKeyForBlob(PIN, secret, parsed.blob);
    expect(decryptV2(stored, vk2)).toBe(MNEMONIC);
  });

  it('uses a fresh nonce for every encryption', async () => {
    const vk = await createVaultKey(PIN, deviceSecret(), rng, FAST_KDF);
    const a = JSON.parse(encryptV2(MNEMONIC, vk, rng));
    const b = JSON.parse(encryptV2(MNEMONIC, vk, rng));
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.ct).not.toBe(b.ct);
  });

  it('round-trips with the default (production) scrypt parameters', async () => {
    const secret = deviceSecret();
    const vk = await createVaultKey(PIN, secret, rng);
    expect(vk.kdf).toEqual(DEFAULT_KDF);
    const stored = encryptV2(MNEMONIC, vk, rng);
    const parsed = parseStoredSecret(stored);
    if (parsed.version !== 2) throw new Error('expected v2');
    expect(decryptV2(stored, await deriveKeyForBlob(PIN, secret, parsed.blob))).toBe(MNEMONIC);
  }, 30_000);

  it('rejects a wrong PIN with WrongPinError instead of returning garbage', async () => {
    const secret = deviceSecret();
    const vk = await createVaultKey(PIN, secret, rng, FAST_KDF);
    const stored = encryptV2(MNEMONIC, vk, rng);
    const parsed = parseStoredSecret(stored);
    if (parsed.version !== 2) throw new Error('expected v2');

    const wrong = await deriveKeyForBlob('654321', secret, parsed.blob);
    expect(() => decryptV2(stored, wrong)).toThrow(WrongPinError);
  });

  it('rejects the right PIN with a different device secret', async () => {
    const vk = await createVaultKey(PIN, deviceSecret(), rng, FAST_KDF);
    const stored = encryptV2(MNEMONIC, vk, rng);
    const parsed = parseStoredSecret(stored);
    if (parsed.version !== 2) throw new Error('expected v2');

    const otherDevice = await deriveKeyForBlob(PIN, deviceSecret(), parsed.blob);
    expect(() => decryptV2(stored, otherDevice)).toThrow(WrongPinError);
  });

  describe('tampering', () => {
    async function setup() {
      const vk = await createVaultKey(PIN, deviceSecret(), rng, FAST_KDF);
      return { vk, blob: JSON.parse(encryptV2(MNEMONIC, vk, rng)) };
    }
    const flipHexChar = (hex: string, i: number) =>
      hex.slice(0, i) + ((parseInt(hex[i], 16) ^ 1).toString(16)) + hex.slice(i + 1);

    it('rejects a modified ciphertext byte', async () => {
      const { vk, blob } = await setup();
      const tampered = { ...blob, ct: flipHexChar(blob.ct, 0) };
      expect(() => decryptV2(JSON.stringify(tampered), vk)).toThrow(WrongPinError);
    });

    it('rejects a modified authentication tag', async () => {
      const { vk, blob } = await setup();
      const tampered = { ...blob, ct: flipHexChar(blob.ct, blob.ct.length - 1) };
      expect(() => decryptV2(JSON.stringify(tampered), vk)).toThrow(WrongPinError);
    });

    it('rejects a truncated ciphertext', async () => {
      const { vk, blob } = await setup();
      const tampered = { ...blob, ct: blob.ct.slice(0, -2) };
      expect(() => decryptV2(JSON.stringify(tampered), vk)).toThrow(WrongPinError);
    });

    it('rejects a modified nonce', async () => {
      const { vk, blob } = await setup();
      const tampered = { ...blob, nonce: flipHexChar(blob.nonce, 3) };
      expect(() => decryptV2(JSON.stringify(tampered), vk)).toThrow(WrongPinError);
    });

    it('rejects modified KDF parameters (bound as associated data)', async () => {
      const { vk, blob } = await setup();
      const tampered = { ...blob, kdf: { ...blob.kdf, N: blob.kdf.N * 2 } };
      expect(() => decryptV2(JSON.stringify(tampered), vk)).toThrow(WrongPinError);
    });

    it('rejects absurd KDF parameters before deriving anything', async () => {
      const { blob } = await setup();
      const tampered = { ...blob, kdf: { ...blob.kdf, N: 2 ** 30 } };
      expect(() => parseStoredSecret(JSON.stringify(tampered))).toThrow(InvalidVaultDataError);
    });

    it('rejects malformed blobs', async () => {
      const { vk } = await setup();
      expect(() => decryptV2('{"v":2}', vk)).toThrow(InvalidVaultDataError);
      expect(() => decryptV2('not json', vk)).toThrow(InvalidVaultDataError);
      expect(() => parseStoredSecret('zz-not-hex')).toThrow(InvalidVaultDataError);
    });
  });
});

describe('PIN verifier', () => {
  it('opens with the right PIN and returns a key that decrypts secrets', async () => {
    const secret = deviceSecret();
    const vk = await createVaultKey(PIN, secret, rng, FAST_KDF);
    const verifier = createPinVerifier(vk, rng);
    const stored = encryptV2(MNEMONIC, vk, rng);

    const opened = await openPinVerifier(PIN, secret, verifier);
    expect(decryptV2(stored, opened)).toBe(MNEMONIC);
  });

  it('throws WrongPinError for a wrong PIN', async () => {
    const secret = deviceSecret();
    const verifier = createPinVerifier(await createVaultKey(PIN, secret, rng, FAST_KDF), rng);
    await expect(openPinVerifier('000000', secret, verifier)).rejects.toThrow(WrongPinError);
  });
});

describe('legacy v1 compatibility', () => {
  // Re-implementation of the original SecureWallet code (expo-crypto SHA-256, lowercase hex).
  const sha256Hex = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
  function originalDeriveKey(pin: string, salt: string) {
    let key = pin + salt;
    for (let i = 0; i < 1000; i++) key = sha256Hex(key);
    return key;
  }
  function originalEncrypt(data: string, key: string) {
    const k = Buffer.from(key, 'utf8');
    const d = Buffer.from(data, 'utf8');
    return Buffer.from(d.map((b, i) => b ^ k[i % k.length])).toString('hex');
  }

  it('matches the original PIN hash, key derivation and XOR format', () => {
    const salt = nodeRandomBytes(32).toString('hex');
    expect(legacyHashPin(PIN, salt)).toBe(sha256Hex(PIN + salt));
    const key = deriveLegacyKey(PIN, salt);
    expect(key).toBe(originalDeriveKey(PIN, salt));
    const blob = originalEncrypt(MNEMONIC, key);
    expect(legacyXorEncrypt(MNEMONIC, key)).toBe(blob);
    expect(parseStoredSecret(blob)).toEqual({ version: 1, hex: blob });
    expect(legacyXorDecrypt(blob, key)).toBe(MNEMONIC);
  });

  it('can be re-encrypted as v2 (migration path)', async () => {
    const salt = nodeRandomBytes(32).toString('hex');
    const v1 = originalEncrypt(MNEMONIC, originalDeriveKey(PIN, salt));

    const secret = deviceSecret();
    const vk = await createVaultKey(PIN, secret, rng, FAST_KDF);
    const v2 = encryptV2(legacyXorDecrypt(v1, deriveLegacyKey(PIN, salt)), vk, rng);

    expect(parseStoredSecret(v2).version).toBe(2);
    expect(decryptV2(v2, vk)).toBe(MNEMONIC);
  });
});
