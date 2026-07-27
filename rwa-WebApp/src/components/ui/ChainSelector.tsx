// src/components/ui/ChainSelector.tsx
"use client";

import { useState } from "react";
import { useChainConfig } from "@/hooks/useChainConfig";
import { SupportedChainId } from "@/config/contracts";
import { Triangle, Hexagon, Gem, CircleDot, Square, Circle, Coins, Wrench, Link2, type LucideIcon } from "lucide-react";

interface ChainSelectorProps {
  showOnlyDeployed?: boolean;
  showStatus?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "dropdown" | "list" | "grid";
  onChainSelect?: (chainId: SupportedChainId) => void;
}

const chainIcons: Record<number, { icon: LucideIcon; color: string }> = {
  43113: { icon: Triangle, color: "bg-red-500" },
  43114: { icon: Triangle, color: "bg-red-500" },
  137: { icon: Hexagon, color: "bg-gold-500" },
  80002: { icon: Hexagon, color: "bg-gold-500" },
  1: { icon: Gem, color: "bg-gold-500" },
  11155111: { icon: Gem, color: "bg-gold-500" },
  42161: { icon: CircleDot, color: "bg-gold-600" },
  421614: { icon: CircleDot, color: "bg-gold-600" },
  8453: { icon: Square, color: "bg-gold-400" },
  84532: { icon: Square, color: "bg-gold-400" },
  10: { icon: Circle, color: "bg-red-600" },
  56: { icon: Coins, color: "bg-yellow-500" },
  31337: { icon: Wrench, color: "bg-ink-faint" },
};

export function ChainSelector({ 
  showOnlyDeployed = true, 
  showStatus = true,
  className = "",
  size = "md",
  variant = "dropdown",
  onChainSelect,
}: ChainSelectorProps) {
  const {
    chainId,
    chainName,
    isSupported,
    isDeployed,
    supportedChains,
    deployedChains,
    switchToChain,
    isSwitching,
  } = useChainConfig();

  const chains = showOnlyDeployed ? deployedChains : supportedChains;
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-3 text-base",
  };

  const handleChainSelect = async (newChainId: SupportedChainId) => {
    try {
      await switchToChain(newChainId);
      onChainSelect?.(newChainId);
    } catch (error) {
      console.error("Chain switch failed:", error);
    }
  };

  if (variant === "dropdown") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <select
          value={chainId}
          onChange={(e) => handleChainSelect(parseInt(e.target.value) as SupportedChainId)}
          disabled={isSwitching}
          className={`
            ${sizeClasses[size]}
            rounded-lg border border-border
            bg-surface-raised text-ink
            font-medium
            focus:outline-none focus:ring-2 focus:ring-gold-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
          `}
        >
          {chains.map((chain) => (
            <option key={chain.id} value={chain.id}>
              {chain.name}
              {chain.testnet ? " (Testnet)" : ""}
            </option>
          ))}
        </select>

        {showStatus && (
          <ChainStatusBadge 
            isSupported={isSupported}
            isDeployed={isDeployed}
            isSwitching={isSwitching}
            chainName={chainName}
          />
        )}
      </div>
    );
  }

  // List variant for modals
  if (variant === "list") {
    return (
      <div className={`space-y-2 ${className}`}>
        {chains.map((chain) => {
          const isSelected = chain.id === chainId;
          const { icon: ChainIcon, color } = chainIcons[chain.id] || { icon: Link2, color: "bg-ink-faint" };

          return (
            <button
              key={chain.id}
              onClick={() => handleChainSelect(chain.id)}
              disabled={isSwitching}
              className={`
                w-full flex items-center gap-3 p-3 rounded-xl
                transition-all duration-200
                ${isSelected
                  ? "bg-gold-900/30 border-2 border-gold-500"
                  : "bg-surface-raised border-2 border-transparent hover:border-border-strong"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center`}>
                <ChainIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-ink">
                  {chain.name}
                </div>
                <div className="text-xs text-ink-faint">
                  {chain.testnet ? "Testnet" : "Mainnet"} • {chain.nativeCurrency}
                </div>
              </div>
              {isSelected && (
                <div className="w-6 h-6 rounded-full bg-gold-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {isSwitching && chain.id !== chainId && (
                <div className="w-5 h-5 border-2 border-border-strong border-t-blue-500 rounded-full animate-spin" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Grid variant
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {chains.map((chain) => {
        const isSelected = chain.id === chainId;
        const { icon: ChainIcon, color } = chainIcons[chain.id] || { icon: Link2, color: "bg-ink-faint" };

        return (
          <button
            key={chain.id}
            onClick={() => handleChainSelect(chain.id)}
            disabled={isSwitching}
            className={`
              flex flex-col items-center gap-2 p-4 rounded-xl
              transition-all duration-200
              ${isSelected
                ? "bg-gold-900/30 border-2 border-gold-500"
                : "bg-surface-raised border-2 border-transparent hover:border-border-strong"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center`}>
              <ChainIcon className="w-6 h-6 text-white" />
            </div>
            <div className="text-center">
              <div className="font-medium text-ink text-sm">
                {chain.name}
              </div>
              {chain.testnet && (
                <div className="text-xs text-ink-faint">
                  Testnet
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Status badge component
function ChainStatusBadge({ 
  isSupported, 
  isDeployed, 
  isSwitching, 
  chainName 
}: { 
  isSupported: boolean; 
  isDeployed: boolean; 
  isSwitching: boolean;
  chainName: string;
}) {
  if (isSwitching) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 border border-warning border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-warning font-medium">
          Switching...
        </span>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 bg-danger rounded-full animate-pulse" />
        <span className="text-xs text-danger font-medium">Unsupported</span>
      </div>
    );
  }

  if (!isDeployed) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 bg-warning rounded-full" />
        <span className="text-xs text-warning font-medium">
          Not Deployed
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 bg-success rounded-full" />
      <span className="text-xs text-success font-medium">
        {chainName}
      </span>
    </div>
  );
}

// Compact badge for navbar
export function ChainBadge({ className = "", onClick }: { className?: string; onClick?: () => void }) {
  const { chainId, chainName, isDeployed, isTestnet } = useChainConfig();
  const ChainIcon = chainIcons[chainId]?.icon || Link2;

  return (
    <button 
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
        transition-all duration-200
        ${isTestnet
          ? "bg-warning/10 text-warning hover:bg-warning/20"
          : "bg-success/10 text-success hover:bg-success/20"
        }
        ${!isDeployed ? "opacity-50" : ""}
        ${className}
      `}
    >
      <ChainIcon className="w-3.5 h-3.5" />
      <span>{chainName}</span>
      {isTestnet && <span className="opacity-60">(Test)</span>}
      <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}
