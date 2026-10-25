// src/lib/kyc/onchainCache.ts
// Server-only: put KYC proofs into a security token's on-chain KYC cache.
//
// RWASecurityToken enforces KYC on every holder by default, so a wallet must have a valid
// cached proof (token.cacheKYC) before tokens are minted or transferred to it. Proofs are
// signed with the KYCVerifier's trusted signer (VERIFIER_PRIVATE_KEY), as /api/kyc/proof does.

import { getAddress, keccak256, toHex, type Chain, type PublicClient, type Transport, type WalletClient, type Account } from 'viem';
import { signTypedData } from 'viem/accounts';
import { RWASecurityTokenABI } from '@/config/abis';
import { getSupabaseAdmin } from '@/lib/supabase';

export interface KYCAttributes {
  level: number;
  countryCode: number;
}

export interface SignedKYCProof extends KYCAttributes {
  expiry: bigint;
  signature: `0x${string}`;
}

const KYC_PROOF_TYPES = {
  KYCProof: [
    { name: 'wallet', type: 'address' },
    { name: 'level', type: 'uint8' },
    { name: 'countryCode', type: 'uint16' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

export async function signKYCProofForWallet(
  chainId: number,
  verifier: `0x${string}`,
  wallet: `0x${string}`,
  kyc: KYCAttributes
): Promise<SignedKYCProof> {
  const privateKey = process.env.VERIFIER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!privateKey) throw new Error('VERIFIER_PRIVATE_KEY not configured');

  const validityDays = parseInt(process.env.KYC_VALIDITY_DAYS || '365');
  const expiry = BigInt(Math.floor(Date.now() / 1000) + validityDays * 24 * 60 * 60);
  const signature = await signTypedData({
    privateKey,
    domain: { name: 'RWA KYC Verifier', version: '1', chainId, verifyingContract: verifier },
    types: KYC_PROOF_TYPES,
    primaryType: 'KYCProof',
    message: { wallet: getAddress(wallet), level: kyc.level, countryCode: kyc.countryCode, expiry },
  });
  return { ...kyc, expiry, signature };
}

/** Level and country of the wallet's approved KYC application, or null if it has none */
export async function getApprovedKYC(wallet: string): Promise<KYCAttributes | null> {
  const secret = process.env.KYC_WALLET_HASH_SECRET;
  if (!secret) throw new Error('KYC_WALLET_HASH_SECRET not configured');
  const walletHash = keccak256(toHex(`${wallet.toLowerCase()}:${secret}`));

  const { data } = await getSupabaseAdmin()
    .from('kyc_applications')
    .select('current_level, country_code')
    .eq('wallet_hash', walletHash)
    .eq('status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { level: Number(data.current_level), countryCode: Number(data.country_code) };
}

/** KYC attributes the platform's own wallets (liquidity, treasury) are registered with */
export function platformWalletKYC(): KYCAttributes {
  return {
    level: parseInt(process.env.PLATFORM_KYC_LEVEL || '4'),
    countryCode: parseInt(process.env.PLATFORM_KYC_COUNTRY_CODE || '756'),
  };
}

/**
 * Cache a proof for `wallet` on `token` unless it already has a valid one.
 * Returns the cacheKYC transaction hash, or null when nothing had to be done.
 */
export async function ensureKYCCached(params: {
  publicClient: PublicClient;
  walletClient: WalletClient<Transport, Chain, Account>;
  chainId: number;
  verifier: `0x${string}`;
  token: `0x${string}`;
  wallet: `0x${string}`;
  kyc: KYCAttributes;
}): Promise<`0x${string}` | null> {
  const { publicClient, walletClient, chainId, verifier, token, wallet, kyc } = params;
  const valid = await publicClient
    .readContract({ address: token, abi: RWASecurityTokenABI, functionName: 'isKYCValid', args: [wallet] })
    .catch(() => false);
  if (valid) return null;

  const proof = await signKYCProofForWallet(chainId, verifier, wallet, kyc);
  const hash = await walletClient.writeContract({
    address: token,
    abi: RWASecurityTokenABI,
    functionName: 'cacheKYC',
    args: [wallet, proof],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
