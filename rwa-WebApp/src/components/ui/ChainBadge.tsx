// src/components/ui/ChainBadge.tsx
"use client";

import { useChainConfig } from "@/hooks/useChainConfig";
import { Triangle, Hexagon, Gem, CircleDot, Square, Circle, Coins, Wrench, Link2, type LucideIcon } from "lucide-react";

const chainIcons: Record<number, LucideIcon> = {
  43113: Triangle, 43114: Triangle,
  137: Hexagon, 80002: Hexagon,
  1: Gem, 11155111: Gem,
  42161: CircleDot, 421614: CircleDot,
  8453: Square, 84532: Square,
  10: Circle,
  56: Coins,
  31337: Wrench,
};

interface ChainBadgeProps {
  onClick?: () => void;
  className?: string;
}

export function ChainBadge({ onClick, className = "" }: ChainBadgeProps) {
  const { chainId, chainName, isDeployed, isTestnet, isSwitching } = useChainConfig();
  const ChainIcon = chainIcons[chainId] || Link2;

  return (
    <button
      onClick={onClick}
      disabled={isSwitching}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all
        ${isTestnet
          ? "bg-yellow-900/30 border-yellow-600 text-yellow-400 hover:bg-yellow-900/50"
          : "bg-green-900/30 border-green-600 text-green-400 hover:bg-green-900/50"
        }
        ${!isDeployed ? "opacity-50" : ""}
        disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isSwitching ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <ChainIcon className="w-4 h-4" />
      )}
      <span className="text-sm font-medium hidden sm:inline">
        {isSwitching ? "Switching..." : chainName}
      </span>
      <span className="text-sm font-medium sm:hidden">
        {isSwitching ? "..." : null}
      </span>
      {!isSwitching && (
        <svg 
          className="w-3 h-3 opacity-60" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  );
}
