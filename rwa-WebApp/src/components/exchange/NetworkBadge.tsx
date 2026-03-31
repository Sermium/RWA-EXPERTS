'use client';

interface NetworkBadgeProps {
  chainName: string;
  isTestnet: boolean;
}

export function NetworkBadge({ chainName, isTestnet }: NetworkBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-yellow-500' : 'bg-green-500'}`} />
      <span className="text-sm text-gray-400">{chainName}</span>
      {isTestnet && (
        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
          Testnet
        </span>
      )}
    </div>
  );
}
