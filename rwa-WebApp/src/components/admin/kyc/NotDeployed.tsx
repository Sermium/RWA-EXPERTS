// src/app/admin/kyc/components/NotDeployed.tsx
'use client';

import { AlertTriangle, ArrowRight } from 'lucide-react';

interface Chain {
  id: number;
  name: string;
  isTestnet: boolean;
}

interface NotDeployedProps {
  chainName: string;
  deployedChains: Chain[];
  onSwitch: (chainId: number) => void;
  isSwitching: boolean;
}

export function NotDeployed({
  chainName,
  deployedChains,
  onSwitch,
  isSwitching
}: NotDeployedProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full bg-surface/50 rounded-xl border border-border/50 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-warning" />
        </div>
        
        <h2 className="text-xl font-bold text-ink mb-2">
          KYC Manager Not Deployed
        </h2>
        
        <p className="text-ink-muted mb-6">
          The KYC Manager contract is not deployed on <span className="text-ink font-medium">{chainName}</span>.
          Please switch to a supported network.
        </p>

        {deployedChains.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-ink-faint">Available Networks:</p>
            <div className="flex flex-col gap-2">
              {deployedChains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => onSwitch(chain.id)}
                  disabled={isSwitching}
                  className="w-full px-4 py-3 bg-gold-600 hover:bg-gold-700 disabled:bg-surface-overlay text-ink font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span>{chain.name}</span>
                  {chain.isTestnet && (
                    <span className="text-xs opacity-70">(Testnet)</span>
                  )}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
