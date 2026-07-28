'use client';

interface NetworkBadgeProps {
  chainName: string;
  isTestnet: boolean;
}

export function NetworkBadge({ chainName, isTestnet }: NetworkBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-warning' : 'bg-success'}`} />
      <span className="text-sm text-ink-muted">{chainName}</span>
      {isTestnet && (
        <span className="text-xs bg-warning/20 text-warning px-1.5 py-0.5 rounded">
          Testnet
        </span>
      )}
    </div>
  );
}
