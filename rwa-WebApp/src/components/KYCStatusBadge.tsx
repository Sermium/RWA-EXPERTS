// src/components/KYCStatusBadge.tsx
"use client";

import React, { useState } from "react";
import { useKYC } from "@/contexts/KYCContext";
import { WalletLinkingModal } from "./WalletLinkingModal";

const TIER_CONFIG = {
  None: { name: "Unverified", color: "gray", icon: "○" },
  Bronze: { name: "Bronze", color: "amber", icon: "🥉" },
  Silver: { name: "Silver", color: "gray", icon: "🥈" },
  Gold: { name: "Gold", color: "yellow", icon: "🥇" },
  Diamond: { name: "Diamond", color: "cyan", icon: "💎" },
};

const COLOR_CLASSES = {
  gray: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  cyan: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

interface KYCStatusBadgeProps {
  showLinkOption?: boolean;
  compact?: boolean;
}

export function KYCStatusBadge({ 
  showLinkOption = true, 
  compact = false 
}: KYCStatusBadgeProps) {
  const { tier, tierNumber, isVerified, isLoading, tierInfo } = useKYC();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkMode, setLinkMode] = useState<"generate" | "use">("generate");

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-700 rounded-full h-8 w-24" />
    );
  }

  const config = TIER_CONFIG[tier] || TIER_CONFIG.None;
  const colorClass = COLOR_CLASSES[config.color as keyof typeof COLOR_CLASSES] || COLOR_CLASSES.gray;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
        {isVerified ? "✓" : "○"} {config.name}
      </span>
    );
  }

  return (
    <>
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${colorClass}`}>
        <span className="text-sm">{config.icon}</span>
        <div>
          <p className="text-sm font-medium">
            {isVerified ? `${tier} Tier` : "Not Verified"}
          </p>
          <p className="text-xs opacity-70">
            {isVerified ? tierInfo.formattedLimit : "Complete KYC"}
          </p>
        </div>
        
        {showLinkOption && (
          <div className="ml-2 pl-2 border-l border-current/20">
            {isVerified ? (
              <button
                onClick={() => {
                  setLinkMode("generate");
                  setShowLinkModal(true);
                }}
                className="text-xs hover:opacity-80 transition-opacity"
                title="Link another wallet"
              >
                🔗
              </button>
            ) : (
              <button
                onClick={() => {
                  setLinkMode("use");
                  setShowLinkModal(true);
                }}
                className="text-xs hover:opacity-80 transition-opacity"
                title="Link to existing KYC"
              >
                📥
              </button>
            )}
          </div>
        )}
      </div>

      <WalletLinkingModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        mode={linkMode}
      />
    </>
  );
}

export default KYCStatusBadge;
