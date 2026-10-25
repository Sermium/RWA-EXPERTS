'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { useState, type ReactNode } from 'react';
import { config } from '@/config/wagmi';
import { KYCProvider } from '@/contexts/KYCContext';
import { WalletSessionProvider } from '@/components/WalletSessionProvider';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletSessionProvider>
          <KYCProvider>
            {children}
          </KYCProvider>
        </WalletSessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
