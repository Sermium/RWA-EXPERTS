// src/components/ui/ChainSelectorModal.tsx
"use client";

import { Fragment } from "react";
import { X, Triangle, Hexagon, Gem, CircleDot, Square, Circle, Coins, Wrench, Link2, type LucideIcon } from "lucide-react";
import { useChainConfig } from "@/hooks/useChainConfig";
import { SupportedChainId } from "@/config/contracts";

interface ChainSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const chainIcons: Record<number, { icon: LucideIcon; color: string }> = {
  43113: { icon: Triangle, color: "bg-danger" },
  43114: { icon: Triangle, color: "bg-danger" },
  137: { icon: Hexagon, color: "bg-gold-500" },
  80002: { icon: Hexagon, color: "bg-gold-500" },
  1: { icon: Gem, color: "bg-gold-500" },
  11155111: { icon: Gem, color: "bg-gold-500" },
  42161: { icon: CircleDot, color: "bg-gold-600" },
  421614: { icon: CircleDot, color: "bg-gold-600" },
  8453: { icon: Square, color: "bg-gold-400" },
  84532: { icon: Square, color: "bg-gold-400" },
  10: { icon: Circle, color: "bg-danger" },
  56: { icon: Coins, color: "bg-warning" },
  31337: { icon: Wrench, color: "bg-ink-faint" },
};

export function ChainSelectorModal({ isOpen, onClose }: ChainSelectorModalProps) {
  const { 
    chainId, 
    chainName, 
    isTestnet, 
    deployedChains, 
    switchToChain, 
    isSwitching 
  } = useChainConfig();

  if (!isOpen) return null;

  const handleChainSelect = async (newChainId: SupportedChainId) => {
    try {
      await switchToChain(newChainId);
      onClose();
    } catch (error) {
      console.error("Chain switch failed:", error);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-panel"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <h2 className="text-lg font-semibold text-ink">Select Network</h2>
              <p className="text-sm text-ink-muted mt-0.5">
                Currently on {chainName} {isTestnet && "(Testnet)"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-raised transition-colors"
            >
              <X className="w-5 h-5 text-ink-muted" />
            </button>
          </div>

          {/* Chain List */}
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {deployedChains.map((chain) => {
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
                      ? "bg-gold-900/40 border-2 border-gold-500"
                      : "bg-surface-raised border-2 border-transparent hover:border-border-strong"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center`}>
                    <ChainIcon className="w-5 h-5 text-ink" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-ink">
                      {chain.name}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {chain.testnet ? "Testnet" : "Mainnet"} • {chain.nativeCurrency}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-gold-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

          {/* Info Footer */}
          <div className="p-4 border-t border-border">
            <div className="p-3 bg-gold-900/20 border border-gold-800 rounded-xl">
              <p className="text-xs text-gold-400">
                <span className="font-medium">Note:</span> Only networks with deployed contracts are shown.
                {deployedChains.length === 1 && " More networks coming soon!"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
