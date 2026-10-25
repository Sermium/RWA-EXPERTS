// src/components/admin/AdminSessionGate.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Loader2, Shield } from 'lucide-react';
import { useWalletSession } from '@/components/WalletSessionProvider';

type GateState = 'checking' | 'ready' | 'needs-sign-in';

/**
 * Admin API routes only accept a signed session (a cookie set by
 * /api/auth/session after the wallet signs a message). WalletSessionProvider
 * would ask for that signature on the first refused request anyway; this
 * asks a connected admin up front, before the admin pages load, so they open
 * signed in.
 *
 * Wallets that are not connected, or not admins, go straight through to the
 * page, which shows its own "Connect wallet" or "Access denied".
 */
export function AdminSessionGate({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();
  const { signIn: signInWallet } = useWalletSession();
  const [state, setState] = useState<GateState>('checking');
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!address) {
      setState('ready');
      return;
    }
    try {
      const session = await fetch('/api/auth/session', { cache: 'no-store', headers: { 'x-wallet-address': address } });
      if (session.ok) {
        const { wallet } = await session.json();
        if (wallet === address.toLowerCase()) {
          setState('ready');
          return;
        }
      }
      // No session for this wallet. Only an admin has anything to sign in to.
      const role = await fetch('/api/admin/check', { headers: { 'x-wallet-address': address } });
      const { isAdmin } = await role.json().catch(() => ({ isAdmin: false }));
      setState(isAdmin ? 'needs-sign-in' : 'ready');
    } catch {
      setState('ready');
    }
  }, [address]);

  useEffect(() => {
    setState('checking');
    check();
  }, [check]);

  // The session lasts 8 hours; coming back to the tab is when it may have run out.
  useEffect(() => {
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [check]);

  const signIn = async () => {
    if (!address) return;
    setSigningIn(true);
    setError(null);
    try {
      if (await signInWallet()) setState('ready');
      else setError('Sign-in was cancelled or failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  if (state === 'ready') return <>{children}</>;

  return (
    <div className="min-h-screen bg-surface-sunken">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-surface border border-border rounded-xl p-8 text-center">
          {state === 'checking' ? (
            <>
              <Loader2 className="w-12 h-12 text-gold-500 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-bold text-ink mb-2">Verifying Access</h2>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-gold-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-gold-500" />
              </div>
              <h2 className="text-2xl font-bold text-ink mb-3">Admin sign-in</h2>
              <p className="text-ink-muted mb-6">
                Sign a message with your wallet to prove it is yours. It sends no transaction and costs no gas.
              </p>
              <button
                onClick={signIn}
                disabled={signingIn}
                className="w-full py-3 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-surface-sunken font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {signingIn && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign in as admin
              </button>
              {error && <p className="text-danger text-sm mt-3">{error}</p>}
              <p className="text-ink-faint text-xs font-mono mt-4">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
