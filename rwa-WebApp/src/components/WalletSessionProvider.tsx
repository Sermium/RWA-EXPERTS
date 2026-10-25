// src/components/WalletSessionProvider.tsx
'use client';

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { signInMessage } from '@/lib/sign-in-message';

const SIGN_IN_REQUIRED = 'SIGN_IN_REQUIRED';
const SESSION_PATH = '/api/auth/session';

interface WalletSessionValue {
  /** Ask the connected wallet to sign in. Resolves false if there is no wallet or the user declines. */
  signIn: () => Promise<boolean>;
}

const WalletSessionContext = createContext<WalletSessionValue>({ signIn: async () => false });

export function useWalletSession() {
  return useContext(WalletSessionContext);
}

/**
 * API routes know who is calling only from a signed session cookie, which
 * the wallet gets by signing a message (see lib/wallet-session.ts). Rather
 * than have every page sign in before its requests, this wraps fetch once:
 * when one of the app's own /api requests comes back 401 SIGN_IN_REQUIRED,
 * it asks the connected wallet to sign in -- once, however many requests
 * are waiting -- and sends the request again.
 */
export function WalletSessionProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // The fetch wrapper is installed once; it reads the current wallet from here.
  const current = useRef({ address, signMessageAsync });
  current.current = { address, signMessageAsync };
  const pending = useRef<Promise<boolean> | null>(null);
  const originalFetch = useRef<typeof fetch | null>(null);

  const signIn = useCallback(async (): Promise<boolean> => {
    if (pending.current) return pending.current;
    const run = (async () => {
      const { address, signMessageAsync } = current.current;
      const doFetch = originalFetch.current ?? fetch;
      if (!address) return false;
      try {
        const issuedAt = Math.floor(Date.now() / 1000);
        const signature = await signMessageAsync({ message: signInMessage(address, window.location.host, issuedAt) });
        const res = await doFetch(SESSION_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet: address, issuedAt, signature }),
        });
        return res.ok;
      } catch {
        return false; // declined, or the wallet is unavailable
      }
    })();
    pending.current = run;
    try {
      return await run;
    } finally {
      pending.current = null;
    }
  }, []);

  useEffect(() => {
    const original = window.fetch.bind(window);
    originalFetch.current = original;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.href);
      const ours = url.origin === window.location.origin && url.pathname.startsWith('/api/') && url.pathname !== SESSION_PATH;
      if (!ours) return original(input, init);

      // A Request's body can be read only once; keep a copy for the retry.
      const retry = input instanceof Request ? input.clone() : input;
      const res = await original(input, init);
      if (res.status !== 401) return res;
      const body = await res.clone().json().catch(() => null);
      if (body?.code !== SIGN_IN_REQUIRED) return res;

      return (await signIn()) ? original(retry, init) : res;
    };

    return () => {
      window.fetch = original;
    };
  }, [signIn]);

  return <WalletSessionContext.Provider value={{ signIn }}>{children}</WalletSessionContext.Provider>;
}
