// src/lib/admin-sign-in-message.ts
//
// Kept apart from admin-session.ts so the browser can build the message
// without pulling in Node's crypto.

/**
 * The message a wallet signs to start an admin session. The browser builds
 * it to sign (AdminSessionGate); the server rebuilds it from the request
 * (api/admin/auth/session), so a signature only works for this wallet, this
 * host and a recent moment.
 */
export function adminSignInMessage(wallet: string, host: string, issuedAt: number): string {
  return [
    'RWA Experts admin sign-in',
    '',
    'Signing in gives this browser admin access for 8 hours. It sends no transaction and costs no gas.',
    '',
    `Wallet: ${wallet.toLowerCase()}`,
    `Host: ${host}`,
    `Issued at: ${issuedAt}`,
  ].join('\n');
}
