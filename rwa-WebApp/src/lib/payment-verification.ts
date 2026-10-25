// src/lib/payment-verification.ts
/**
 * Server-side proof that money arrived. Nothing here trusts an amount, a
 * status or a recipient the browser reports: on-chain payments are read from
 * the transaction receipt, card payments from Stripe.
 *
 * Every check returns a Verified<T>: either { ok: true, value } or
 * { ok: false, status, error } with an HTTP status the route can pass on.
 */
import Stripe from 'stripe';
import {
  createPublicClient,
  http,
  getAddress,
  isAddress,
  parseAbi,
  parseEventLogs,
  parseUnits,
  formatUnits,
  type Address,
  type Hex,
} from 'viem';
import { CHAINS, type SupportedChainId } from '@/config/chains';
import { DEPLOYMENTS } from '@/config/deployments';
import { RWAEscrowVaultABI } from '@/config/abis';
import { TOKEN_CONFIGS } from '@/config/tokens';

export type Verified<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

export const fail = (status: number, error: string): { ok: false; status: number; error: string } => ({
  ok: false,
  status,
  error,
});

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const PAYMENT_INTENT_RE = /^pi_[A-Za-z0-9_]+$/;

export const isTxHash = (v: unknown): v is Hex => typeof v === 'string' && TX_HASH_RE.test(v);
export const isPaymentIntentId = (v: unknown): v is string => typeof v === 'string' && PAYMENT_INTENT_RE.test(v);

/** Postgres unique_violation: the row (tx hash, payment intent) is already recorded. */
export const isUniqueViolation = (error: unknown): boolean =>
  !!error && typeof error === 'object' && (error as { code?: string }).code === '23505';

const sameAddress = (a: string | null | undefined, b: string | null | undefined): boolean =>
  !!a && !!b && isAddress(a) && isAddress(b) && getAddress(a) === getAddress(b);

const usableAddress = (a: string | null | undefined): a is string =>
  !!a && isAddress(a) && a.toLowerCase() !== ZERO_ADDRESS;

// ============================================================================
// CHAIN
// ============================================================================

const ERC20_EVENTS = parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']);
const ERC20_DECIMALS = parseAbi(['function decimals() view returns (uint8)']);

export function chainClient(chainId: number) {
  const info = CHAINS[chainId as SupportedChainId];
  if (!info) return null;
  return createPublicClient({ chain: info.chain, transport: http(info.rpcUrl) });
}

type ChainClient = NonNullable<ReturnType<typeof chainClient>>;

async function successfulReceipt(chainId: number, txHash: unknown) {
  if (!isTxHash(txHash)) return fail(400, 'Missing or malformed transaction hash');
  const client = chainClient(chainId);
  if (!client) return fail(400, `Unsupported chain: ${chainId}`);
  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash });
  } catch {
    return fail(400, 'Transaction not found on chain');
  }
  if (!receipt || receipt.status !== 'success') return fail(400, 'Transaction not confirmed on chain');
  return { ok: true as const, value: { client, receipt, hash: txHash } };
}

/**
 * Sum of the ERC-20 `Transfer` events in a successful transaction that move
 * `token` from `from` to `to`. Transfers of other tokens, to other addresses
 * or from other senders are ignored; if none match, the payment is refused.
 */
export async function verifyErc20Transfer(p: {
  chainId: number;
  txHash: unknown;
  token: string;
  from: string;
  to: string;
  minAmount?: bigint;
}): Promise<Verified<{ amount: bigint; txHash: Hex }>> {
  if (!usableAddress(p.token) || !usableAddress(p.to)) return fail(500, 'Payment token or recipient is not configured');
  if (!p.from || !isAddress(p.from)) return fail(400, 'Invalid payer address');
  const r = await successfulReceipt(p.chainId, p.txHash);
  if (!r.ok) return r;

  const token = getAddress(p.token);
  const to = getAddress(p.to);
  const from = getAddress(p.from);
  const transfers = parseEventLogs({ abi: ERC20_EVENTS, logs: r.value.receipt.logs, eventName: 'Transfer' }).filter(
    (l) => getAddress(l.address) === token && getAddress(l.args.to) === to && getAddress(l.args.from) === from,
  );
  if (transfers.length === 0) {
    return fail(400, 'That transaction does not transfer the expected token from the payer to the expected recipient');
  }
  const amount = transfers.reduce((sum, l) => sum + l.args.value, BigInt(0));
  if (p.minAmount !== undefined && amount < p.minAmount) return fail(400, 'The amount transferred is less than required');
  return { ok: true, value: { amount, txHash: r.value.hash } };
}

/** A plain native-coin send from `from` to `to`; the amount is the transaction's own value. */
export async function verifyNativeTransfer(p: {
  chainId: number;
  txHash: unknown;
  from: string;
  to: string;
}): Promise<Verified<{ amount: bigint; txHash: Hex }>> {
  if (!usableAddress(p.to)) return fail(500, 'Payment recipient is not configured');
  if (!p.from || !isAddress(p.from)) return fail(400, 'Invalid payer address');
  const r = await successfulReceipt(p.chainId, p.txHash);
  if (!r.ok) return r;

  const { client, receipt, hash } = r.value;
  if (!sameAddress(receipt.from, p.from)) return fail(400, 'The transaction was not sent by this wallet');
  if (!sameAddress(receipt.to, p.to)) return fail(400, 'The transaction was not sent to the deposit address');
  let tx;
  try {
    tx = await client.getTransaction({ hash });
  } catch {
    return fail(400, 'Transaction not found on chain');
  }
  if (!tx || !sameAddress(tx.to, p.to) || !sameAddress(tx.from, p.from)) {
    return fail(400, 'The transaction does not match the deposit');
  }
  if (tx.value <= BigInt(0)) return fail(400, 'The transaction carries no value');
  return { ok: true, value: { amount: tx.value, txHash: hash } };
}

/** Decimals for a token: from config when known, otherwise from the contract itself. */
export async function tokenDecimals(chainId: number, token: string, client?: ChainClient | null): Promise<number | null> {
  const known = TOKEN_CONFIGS[chainId]?.tokens?.find((t) => t.address.toLowerCase() === token.toLowerCase());
  if (known) return known.decimals;
  const c = client ?? chainClient(chainId);
  if (!c) return null;
  try {
    return Number(await c.readContract({ address: getAddress(token), abi: ERC20_DECIMALS, functionName: 'decimals' }));
  } catch {
    return null;
  }
}

export type Stablecoin = 'USDC' | 'USDT';

/** The platform's USDC/USDT contract on a chain, from DEPLOYMENTS (what the payment UIs send). */
export function stablecoinAddress(chainId: number, symbol: Stablecoin): string | null {
  const address = DEPLOYMENTS[chainId as SupportedChainId]?.tokens?.[symbol];
  return usableAddress(address) ? address : null;
}

/** The platform's fee receiver on a chain; null (fail closed) when the chain has no deployment. */
export function platformFeeReceiver(chainId: number): string | null {
  const receiver = DEPLOYMENTS[chainId as SupportedChainId]?.platformWallets?.feeReceiver;
  return usableAddress(receiver) ? receiver : null;
}

/**
 * Whether a payment on a testnet may pay for something real. Test tokens are
 * free, so production refuses them unless ALLOW_TESTNET_PAYMENTS=true;
 * elsewhere they are accepted unless ALLOW_TESTNET_PAYMENTS=false.
 */
export function testnetPaymentsAllowed(): boolean {
  const flag = process.env.ALLOW_TESTNET_PAYMENTS;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

/**
 * A USDC or USDT transfer of at least `minUsd` from the payer to `to`.
 * When `symbol` is given only that stablecoin counts. Used where the payer
 * picks the chain, so testnets are subject to testnetPaymentsAllowed().
 */
export async function verifyStablecoinPayment(p: {
  chainId: number;
  txHash: unknown;
  from: string;
  to: string | null;
  minUsd: number;
  symbol?: Stablecoin | null;
}): Promise<Verified<{ amount: bigint; decimals: number; usd: number; symbol: Stablecoin; token: string; txHash: Hex }>> {
  const chain = CHAINS[p.chainId as SupportedChainId];
  if (!chain) return fail(400, `Unsupported chain: ${p.chainId}`);
  if (chain.testnet && !testnetPaymentsAllowed()) return fail(400, 'Testnet payments are not accepted');
  if (!p.to) return fail(500, `No payment recipient configured for chain ${p.chainId}`);
  const symbols: Stablecoin[] = p.symbol ? [p.symbol] : ['USDC', 'USDT'];
  let lastError: { ok: false; status: number; error: string } = fail(400, `No supported stablecoin on chain ${p.chainId}`);
  for (const symbol of symbols) {
    const token = stablecoinAddress(p.chainId, symbol);
    if (!token) continue;
    const decimals = await tokenDecimals(p.chainId, token);
    if (decimals === null) {
      lastError = fail(500, `Could not read ${symbol} decimals`);
      continue;
    }
    const minAmount = parseUnits(p.minUsd.toFixed(Math.min(decimals, 6)), decimals);
    const r = await verifyErc20Transfer({ chainId: p.chainId, txHash: p.txHash, token, from: p.from, to: p.to, minAmount });
    if (r.ok) {
      return {
        ok: true,
        value: { ...r.value, decimals, usd: Number(formatUnits(r.value.amount, decimals)), symbol, token },
      };
    }
    lastError = r;
  }
  return lastError;
}

/**
 * The escrow vault's own `InvestmentReceived` event for this project and
 * investor -- emitted only once the vault has pulled the tokens and checked
 * KYC. A bare token transfer to the vault does not count.
 */
export async function verifyVaultInvestment(p: {
  chainId: number;
  txHash: unknown;
  vault: string;
  projectId: bigint;
  investor: string;
}): Promise<Verified<{ amount: bigint; paymentToken: Address; txHash: Hex }>> {
  if (!usableAddress(p.vault)) return fail(400, 'The project has no escrow vault');
  if (!p.investor || !isAddress(p.investor)) return fail(400, 'Invalid investor address');
  const r = await successfulReceipt(p.chainId, p.txHash);
  if (!r.ok) return r;

  const vault = getAddress(p.vault);
  const investor = getAddress(p.investor);
  const events = parseEventLogs({ abi: RWAEscrowVaultABI, logs: r.value.receipt.logs, eventName: 'InvestmentReceived' }).filter(
    (l) => getAddress(l.address) === vault && l.args.projectId === p.projectId && getAddress(l.args.investor) === investor,
  );
  if (events.length === 0) {
    return fail(400, "That transaction has no investment in this project by this investor from the project's escrow vault");
  }
  const tokens = new Set(events.map((e) => getAddress(e.args.paymentToken)));
  if (tokens.size > 1) return fail(400, 'Investments in more than one token in one transaction are not supported');
  const amount = events.reduce((sum, e) => sum + e.args.amount, BigInt(0));
  return { ok: true, value: { amount, paymentToken: events[0].args.paymentToken, txHash: r.value.hash } };
}

// ============================================================================
// STRIPE
// ============================================================================

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover' });
}

export async function retrievePaymentIntent(id: unknown): Promise<Verified<Stripe.PaymentIntent>> {
  if (!isPaymentIntentId(id)) return fail(400, 'Missing or malformed payment intent id');
  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    return fail(500, 'Card payments are not configured');
  }
  try {
    return { ok: true, value: await stripe.paymentIntents.retrieve(id) };
  } catch {
    return fail(400, 'Payment intent not found');
  }
}

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

/**
 * A PaymentIntent proves payment only if Stripe says it succeeded, for the
 * expected amount (in cents) and currency, and its metadata names what is
 * being paid for. Metadata values are compared case-insensitively (wallet
 * addresses); expected values left undefined are not checked.
 */
export function checkPaymentIntent(
  pi: Stripe.PaymentIntent,
  expect: { amountCents: number; atLeast?: boolean; currency?: string; metadata: Record<string, string | null | undefined> },
): Verified<Stripe.PaymentIntent> {
  if (pi.status !== 'succeeded') return fail(402, 'Payment not completed');
  if (norm(pi.currency) !== norm(expect.currency ?? 'usd')) return fail(400, 'Payment currency mismatch');
  const received = typeof pi.amount_received === 'number' ? pi.amount_received : pi.amount;
  const amountOk = expect.atLeast
    ? pi.amount >= expect.amountCents && received >= expect.amountCents
    : pi.amount === expect.amountCents && received === expect.amountCents;
  if (!Number.isFinite(expect.amountCents) || expect.amountCents <= 0 || !amountOk) return fail(400, 'Payment amount mismatch');
  for (const [key, value] of Object.entries(expect.metadata)) {
    if (value === undefined) continue;
    if (!value || norm(pi.metadata?.[key]) !== norm(value)) return fail(400, `Payment does not match (${key})`);
  }
  return { ok: true, value: pi };
}

export const usdToCents = (usd: number) => Math.round(usd * 100);
