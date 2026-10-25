// lib/wallet/vaultCrypto.ts
//
// Pure crypto for the on-device wallet vault. No Expo / React Native imports, so it can be
// unit-tested in Node. Randomness is injected by the caller (expo-crypto in the app).
//
// v2 format (JSON string stored in place of the old hex blob):
//   { v: 2, cipher: 'xchacha20poly1305', kdf: { name: 'scrypt', N, r, p, dkLen },
//     salt: <hex>, nonce: <hex>, ct: <hex, ciphertext || 16-byte Poly1305 tag> }
//
// Key derivation:
//   password = HMAC-SHA256(key = deviceSecret, msg = utf8(pin))
//   key      = scrypt(password, salt, { N, r, p, dkLen: 32 })
// The device secret is 32 random bytes kept in expo-secure-store, so the short PIN alone is not
// enough to brute-force the vault offline. The header (version, cipher, kdf, salt) is bound to the
// ciphertext as AEAD associated data.
//
// v1 format (legacy, read-only): hex of plaintext XOR'd with a key derived from 1000 rounds of
// SHA-256 over (pin + salt). Only used to migrate existing wallets to v2.

import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { scryptAsync } from '@noble/hashes/scrypt';
import { sha256 } from '@noble/hashes/sha2';
import { hmac } from '@noble/hashes/hmac';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';

export type RandomBytes = (length: number) => Uint8Array;

export interface ScryptParams {
  name: 'scrypt';
  N: number;
  r: number;
  p: number;
  dkLen: 32;
}

export interface VaultBlobV2 {
  v: 2;
  cipher: 'xchacha20poly1305';
  kdf: ScryptParams;
  salt: string;
  nonce: string;
  ct: string;
}

/** A derived vault key together with the parameters it was derived with. */
export interface VaultKey {
  key: Uint8Array;
  salt: Uint8Array;
  saltHex: string;
  kdf: ScryptParams;
}

export type ParsedSecret =
  | { version: 1; hex: string }
  | { version: 2; blob: VaultBlobV2 };

// scrypt's standard "interactive login" parameters: N=2^14, r=8, p=1 (128 * N * r = 16 MiB per
// derivation). Pure-JS scrypt on Hermes (no JIT) is slow, so this is a compromise between unlock
// latency and attacker cost; the main protection against offline guessing is the 256-bit device
// secret mixed into the password. The parameters are stored in every blob, so they can be raised
// later (e.g. with a native scrypt) without breaking existing data.
export const DEFAULT_KDF: ScryptParams = { name: 'scrypt', N: 2 ** 14, r: 8, p: 1, dkLen: 32 };

export const DEVICE_SECRET_BYTES = 32;
const SALT_BYTES = 32;
const NONCE_BYTES = 24; // XChaCha20 nonce, safe to pick at random
const PIN_VERIFIER_PLAINTEXT = 'rwa-mobile/pin-verifier/v2';

// Bounds for parameters read from storage, so a corrupted blob can't make us allocate gigabytes.
const KDF_LIMITS = { minLogN: 10, maxLogN: 20, maxR: 16, maxP: 4 };

export class WrongPinError extends Error {
  constructor(message = 'Invalid PIN') {
    super(message);
    this.name = 'WrongPinError';
  }
}

export class InvalidVaultDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidVaultDataError';
  }
}

// ==================== HELPERS ====================

function utf8Decode(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }
  // Minimal fallback for runtimes without TextDecoder.
  let encoded = '';
  for (let i = 0; i < bytes.length; i++) encoded += '%' + bytes[i].toString(16).padStart(2, '0');
  return decodeURIComponent(encoded);
}

function isHex(value: unknown, byteLength?: number): value is string {
  if (typeof value !== 'string' || value.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(value)) return false;
  return byteLength === undefined || value.length === byteLength * 2;
}

function assertKdfParams(kdf: unknown): asserts kdf is ScryptParams {
  const k = kdf as Partial<ScryptParams> | null;
  const valid =
    !!k &&
    k.name === 'scrypt' &&
    k.dkLen === 32 &&
    Number.isInteger(k.N) &&
    Number.isInteger(k.r) &&
    Number.isInteger(k.p) &&
    (k.N as number) >= 2 ** KDF_LIMITS.minLogN &&
    (k.N as number) <= 2 ** KDF_LIMITS.maxLogN &&
    ((k.N as number) & ((k.N as number) - 1)) === 0 &&
    (k.r as number) >= 1 &&
    (k.r as number) <= KDF_LIMITS.maxR &&
    (k.p as number) >= 1 &&
    (k.p as number) <= KDF_LIMITS.maxP;
  if (!valid) throw new InvalidVaultDataError('Unsupported key derivation parameters');
}

function associatedData(kdf: ScryptParams, saltHex: string): Uint8Array {
  return utf8ToBytes(
    ['rwa-vault', 'v2', 'xchacha20poly1305', kdf.name, kdf.N, kdf.r, kdf.p, kdf.dkLen, saltHex.toLowerCase()].join('|')
  );
}

/** Constant-time comparison of two strings of equal length. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function wipe(bytes: Uint8Array | null | undefined): void {
  if (bytes) bytes.fill(0);
}

// ==================== DEVICE SECRET ====================

export function generateDeviceSecret(randomBytes: RandomBytes): string {
  return bytesToHex(randomBytes(DEVICE_SECRET_BYTES));
}

export function parseDeviceSecret(hex: string): Uint8Array {
  if (!isHex(hex, DEVICE_SECRET_BYTES)) throw new InvalidVaultDataError('Device secret is corrupted');
  return hexToBytes(hex);
}

// ==================== KEY DERIVATION ====================

export async function deriveVaultKey(
  pin: string,
  deviceSecret: Uint8Array,
  salt: Uint8Array,
  kdf: ScryptParams = DEFAULT_KDF
): Promise<VaultKey> {
  assertKdfParams(kdf);
  if (deviceSecret.length !== DEVICE_SECRET_BYTES) throw new InvalidVaultDataError('Device secret is corrupted');
  const password = hmac(sha256, deviceSecret, utf8ToBytes(pin));
  try {
    const key = await scryptAsync(password, salt, { N: kdf.N, r: kdf.r, p: kdf.p, dkLen: kdf.dkLen });
    return { key, salt: Uint8Array.from(salt), saltHex: bytesToHex(salt), kdf: { ...kdf } };
  } finally {
    wipe(password);
  }
}

/** Derive a key for a brand-new vault, with a fresh random salt. */
export async function createVaultKey(
  pin: string,
  deviceSecret: Uint8Array,
  randomBytes: RandomBytes,
  kdf: ScryptParams = DEFAULT_KDF
): Promise<VaultKey> {
  return deriveVaultKey(pin, deviceSecret, randomBytes(SALT_BYTES), kdf);
}

/** Derive the key matching an existing v2 blob's salt and KDF parameters. */
export async function deriveKeyForBlob(
  pin: string,
  deviceSecret: Uint8Array,
  blob: VaultBlobV2
): Promise<VaultKey> {
  return deriveVaultKey(pin, deviceSecret, hexToBytes(blob.salt), blob.kdf);
}

// ==================== V2 ENCRYPTION ====================

export function encryptV2(plaintext: string, vaultKey: VaultKey, randomBytes: RandomBytes): string {
  const nonce = randomBytes(NONCE_BYTES);
  const aad = associatedData(vaultKey.kdf, vaultKey.saltHex);
  const ct = xchacha20poly1305(vaultKey.key, nonce, aad).encrypt(utf8ToBytes(plaintext));
  const blob: VaultBlobV2 = {
    v: 2,
    cipher: 'xchacha20poly1305',
    kdf: { ...vaultKey.kdf },
    salt: vaultKey.saltHex,
    nonce: bytesToHex(nonce),
    ct: bytesToHex(ct),
  };
  return JSON.stringify(blob);
}

/**
 * Decrypt a v2 blob. Throws WrongPinError when authentication fails (wrong PIN, wrong device
 * secret, or tampered data); never returns unauthenticated plaintext.
 */
export function decryptV2(blobOrString: VaultBlobV2 | string, vaultKey: VaultKey): string {
  const blob = typeof blobOrString === 'string' ? parseV2(blobOrString) : validateV2(blobOrString);
  if (blob.salt.toLowerCase() !== vaultKey.saltHex.toLowerCase()) {
    throw new InvalidVaultDataError('Vault key does not match this data (salt mismatch)');
  }
  const aad = associatedData(blob.kdf, blob.salt);
  let pt: Uint8Array;
  try {
    pt = xchacha20poly1305(vaultKey.key, hexToBytes(blob.nonce), aad).decrypt(hexToBytes(blob.ct));
  } catch {
    throw new WrongPinError();
  }
  try {
    return utf8Decode(pt);
  } finally {
    wipe(pt);
  }
}

function validateV2(value: unknown): VaultBlobV2 {
  const b = value as Partial<VaultBlobV2> | null;
  if (!b || typeof b !== 'object' || b.v !== 2) throw new InvalidVaultDataError('Not a v2 vault blob');
  if (b.cipher !== 'xchacha20poly1305') throw new InvalidVaultDataError('Unsupported cipher');
  assertKdfParams(b.kdf);
  if (!isHex(b.salt, SALT_BYTES)) throw new InvalidVaultDataError('Invalid salt');
  if (!isHex(b.nonce, NONCE_BYTES)) throw new InvalidVaultDataError('Invalid nonce');
  if (!isHex(b.ct) || b.ct.length < 32) throw new InvalidVaultDataError('Invalid ciphertext');
  return b as VaultBlobV2;
}

function parseV2(serialized: string): VaultBlobV2 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new InvalidVaultDataError('Vault blob is not valid JSON');
  }
  return validateV2(parsed);
}

/** Identify the format of a stored secret. */
export function parseStoredSecret(stored: string): ParsedSecret {
  const trimmed = stored.trim();
  if (trimmed.startsWith('{')) return { version: 2, blob: parseV2(trimmed) };
  if (trimmed.length > 0 && isHex(trimmed)) return { version: 1, hex: trimmed };
  throw new InvalidVaultDataError('Unrecognized vault data format');
}

// ==================== PIN VERIFIER ====================

/** A small v2 blob whose successful decryption proves the PIN (replaces the old fast SHA-256 hash). */
export function createPinVerifier(vaultKey: VaultKey, randomBytes: RandomBytes): string {
  return encryptV2(PIN_VERIFIER_PLAINTEXT, vaultKey, randomBytes);
}

/** Returns the vault key if the PIN is right, throws WrongPinError otherwise. */
export async function openPinVerifier(pin: string, deviceSecret: Uint8Array, verifier: string): Promise<VaultKey> {
  const blob = parseV2(verifier);
  const vaultKey = await deriveKeyForBlob(pin, deviceSecret, blob);
  try {
    if (decryptV2(blob, vaultKey) !== PIN_VERIFIER_PLAINTEXT) throw new WrongPinError();
  } catch (e) {
    wipe(vaultKey.key);
    throw e;
  }
  return vaultKey;
}

/**
 * Check an already-derived key (e.g. one released by biometrics) against the PIN verifier.
 * Throws WrongPinError if the key no longer opens it (for example after the PIN was reset).
 */
export function checkKeyAgainstVerifier(verifier: string, vaultKey: VaultKey): void {
  const blob = parseV2(verifier);
  if (blob.salt.toLowerCase() !== vaultKey.saltHex.toLowerCase()) throw new WrongPinError('Stale vault key');
  if (decryptV2(blob, vaultKey) !== PIN_VERIFIER_PLAINTEXT) throw new WrongPinError('Stale vault key');
}

// ==================== KEY EXPORT (for the biometric-protected keychain entry) ====================
//
// The derived vault keys can be saved so that biometrics can release them instead of the PIN.
// The caller must store this string only behind OS user authentication (expo-secure-store with
// requireAuthentication + a this-device-only accessibility class); it is the key itself.

export function serializeVaultKeys(keys: VaultKey[]): string {
  if (keys.length === 0) throw new InvalidVaultDataError('No vault keys to serialize');
  return JSON.stringify({
    v: 2,
    keys: keys.map((k) => ({ salt: k.saltHex, kdf: k.kdf, key: bytesToHex(k.key) })),
  });
}

/** Inverse of serializeVaultKeys. The first key is the session key. */
export function parseVaultKeys(serialized: string): VaultKey[] {
  let parsed: any;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new InvalidVaultDataError('Stored vault keys are not valid JSON');
  }
  if (!parsed || parsed.v !== 2 || !Array.isArray(parsed.keys) || parsed.keys.length === 0) {
    throw new InvalidVaultDataError('Unsupported stored vault keys');
  }
  return parsed.keys.map((k: any) => {
    assertKdfParams(k?.kdf);
    if (!isHex(k.salt, SALT_BYTES) || !isHex(k.key, 32)) throw new InvalidVaultDataError('Invalid stored vault key');
    return { key: hexToBytes(k.key), salt: hexToBytes(k.salt), saltHex: k.salt.toLowerCase(), kdf: { ...k.kdf } };
  });
}

// ==================== LEGACY V1 (read-only, for migration) ====================

function sha256Hex(input: string): string {
  return bytesToHex(sha256(utf8ToBytes(input)));
}

/** Old PIN hash: SHA-256(pin + salt), lowercase hex (as produced by expo-crypto). */
export function legacyHashPin(pin: string, legacySalt: string): string {
  return sha256Hex(pin + legacySalt);
}

/** Old key derivation: 1000 rounds of SHA-256 over (pin + salt), each round hex-encoded. */
export function deriveLegacyKey(pin: string, legacySalt: string): string {
  let key = pin + legacySalt;
  for (let i = 0; i < 1000; i++) key = sha256Hex(key);
  return key;
}

export function legacyXorDecrypt(encryptedHex: string, legacyKey: string): string {
  if (!isHex(encryptedHex) || encryptedHex.length === 0) throw new InvalidVaultDataError('Invalid legacy data');
  const keyBytes = utf8ToBytes(legacyKey);
  const encrypted = hexToBytes(encryptedHex);
  const out = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) out[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
  try {
    return utf8Decode(out);
  } catch {
    throw new InvalidVaultDataError('Legacy data did not decrypt to valid text');
  } finally {
    wipe(out);
  }
}

/** Only kept so tests can build v1 fixtures; never used to write new data. */
export function legacyXorEncrypt(plaintext: string, legacyKey: string): string {
  const keyBytes = utf8ToBytes(legacyKey);
  const data = utf8ToBytes(plaintext);
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ keyBytes[i % keyBytes.length];
  return bytesToHex(out);
}
