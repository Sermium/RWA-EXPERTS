// src/lib/sign-in-message.ts
//
// Kept apart from wallet-session.ts so the browser can build the message
// without pulling in Node's crypto.

/**
 * The message a wallet signs to start a session. The browser builds it to
 * sign (WalletSessionProvider); the server rebuilds it from the request
 * (api/auth/session), so a signature only works for this wallet, this host
 * and a recent moment.
 */
export function signInMessage(wallet: string, host: string, issuedAt: number): string {
  return [
    'RWA Experts sign-in',
    '',
    'Signing in lets this browser act for this wallet on RWA Experts for 8 hours. It sends no transaction and costs no gas.',
    '',
    `Wallet: ${wallet.toLowerCase()}`,
    `Host: ${host}`,
    `Issued at: ${issuedAt}`,
  ].join('\n');
}
