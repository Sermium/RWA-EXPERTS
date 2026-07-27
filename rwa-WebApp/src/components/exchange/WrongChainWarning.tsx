'use client';

interface WrongChainWarningProps {
  chainName: string;
  chainId: number;
  onSwitchNetwork: (chainId: number) => void;
  isSwitching: boolean;
}

export function WrongChainWarning({ 
  chainName, 
  chainId, 
  onSwitchNetwork, 
  isSwitching 
}: WrongChainWarningProps) {
  return (
    <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium text-warning">Wrong Network</p>
            <p className="text-sm text-ink-muted">Please switch to {chainName} to use the exchange</p>
          </div>
        </div>
        <button
          onClick={() => onSwitchNetwork(chainId)}
          disabled={isSwitching}
          className="px-4 py-2 bg-warning hover:bg-warning/90 disabled:opacity-50 text-surface-sunken font-medium rounded-lg transition-colors"
        >
          {isSwitching ? 'Switching...' : `Switch to ${chainName}`}
        </button>
      </div>
    </div>
  );
}