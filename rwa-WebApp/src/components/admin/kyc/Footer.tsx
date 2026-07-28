// src/app/admin/kyc/components/Footer.tsx
'use client';

import { ExternalLink, Shield } from 'lucide-react';
import { formatAddress } from '../utils';

interface FooterProps {
  chainName: string;
  chainId: number | undefined;
  currencySymbol: string;
  contractAddress: string | undefined;
  explorerUrl: string;
  isTestnet: boolean;
}

export function Footer({
  chainName,
  chainId,
  currencySymbol,
  contractAddress,
  explorerUrl,
  isTestnet
}: FooterProps) {
  return (
    <footer className="mt-8 pt-6 border-t border-border/50">
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-ink-muted">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>KYC Manager</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-ink-faint">|</span>
            <span>{chainName}</span>
            {isTestnet && (
              <span className="px-1.5 py-0.5 text-xs bg-warning/20 text-warning rounded">
                Testnet
              </span>
            )}
          </div>
          
          {chainId && (
            <div className="flex items-center gap-2">
              <span className="text-ink-faint">|</span>
              <span>Chain ID: {chainId}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <span className="text-ink-faint">|</span>
            <span>Currency: {currencySymbol}</span>
          </div>
        </div>

        {contractAddress && (
          <div className="flex items-center gap-2">
            <span>Contract:</span>
            <a
              href={`${explorerUrl}/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-gold-400 hover:text-gold-300 flex items-center gap-1"
            >
              {formatAddress(contractAddress)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </footer>
  );
}
