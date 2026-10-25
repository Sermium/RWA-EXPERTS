// src/lib/kyc/ownProof.ts
// Client-side: fetch the connected wallet's signed KYC proof and cache it on a security token.

import type { Chain, PublicClient, Transport, WalletClient, Account } from 'viem';
import { RWASecurityTokenABI } from '@/config/abis';

export interface OnchainKYCProof {
  level: number;
  countryCode: number;
  expiry: bigint;
  signature: `0x${string}`;
}

/**
 * Ask /api/kyc/proof for a fresh proof. The wallet signs a short message so the server knows
 * the request comes from the wallet owner.
 */
export async function requestKYCProof(
  walletClient: WalletClient<Transport, Chain | undefined, Account>,
  chainId: number
): Promise<OnchainKYCProof> {
  const wallet = walletClient.account.address;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await walletClient.signMessage({
    account: walletClient.account,
    message: `Get KYC Proof\nWallet: ${wallet}\nTimestamp: ${timestamp}`,
  });

  const query = new URLSearchParams({ wallet, signature, timestamp: String(timestamp) });
  const res = await fetch(`/api/kyc/proof?${query}`, { headers: { 'x-chain-id': String(chainId) } });
  const data = await res.json();
  if (!res.ok || !data.hasProof) {
    throw new Error(data.message || data.error || 'No valid KYC proof available for this wallet');
  }
  return {
    level: data.proof.level,
    countryCode: data.proof.countryCode,
    expiry: BigInt(data.proof.expiry),
    signature: data.proof.signature,
  };
}

/**
 * Make sure the connected wallet can receive `token`: security tokens enforce KYC on holders,
 * so cache the wallet's proof on the token first if it has no valid one yet.
 */
export async function ensureOwnKYCCached(
  publicClient: PublicClient,
  walletClient: WalletClient<Transport, Chain | undefined, Account>,
  chainId: number,
  token: `0x${string}`
): Promise<void> {
  const wallet = walletClient.account.address;
  const valid = await publicClient
    .readContract({ address: token, abi: RWASecurityTokenABI, functionName: 'isKYCValid', args: [wallet] })
    .catch(() => false);
  if (valid) return;

  const proof = await requestKYCProof(walletClient, chainId);
  const hash = await walletClient.writeContract({
    address: token,
    abi: RWASecurityTokenABI,
    functionName: 'cacheKYC',
    args: [wallet, proof],
    account: walletClient.account,
    chain: walletClient.chain,
  });
  await publicClient.waitForTransactionReceipt({ hash });
}
