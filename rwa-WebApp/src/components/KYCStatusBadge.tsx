// src/components/KYCStatusBadge.tsx
"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, Link2, Download } from "lucide-react";
import { useKYC } from "@/contexts/KYCContext";
import { WalletLinkingModal } from "./WalletLinkingModal";
import { TIER_ICON, TIER_ICON_CLASS, TIER_BG_CLASS, TIER_BORDER_CLASS, type KYCTierName } from "@/lib/kycTierIcons";

const TIER_LABEL: Record<KYCTierName, string> = {
  None: "Unverified",
  Bronze: "Bronze",
  Silver: "Silver",
  Gold: "Gold",
  Diamond: "Diamond",
};

interface KYCStatusBadgeProps {
  showLinkOption?: boolean;
  compact?: boolean;
}

export function KYCStatusBadge({
  showLinkOption = true,
  compact = false
}: KYCStatusBadgeProps) {
  const { tier, isVerified, isLoading, tierInfo } = useKYC();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkMode, setLinkMode] = useState<"generate" | "use">("generate");

  if (isLoading) {
    return (
      <div className="animate-pulse bg-surface-overlay rounded-full h-8 w-24" />
    );
  }

  const tierName = (tier as KYCTierName) || "None";
  const Icon = TIER_ICON[tierName];
  const colorClass = TIER_ICON_CLASS[tierName];
  const badgeClass = `${TIER_BG_CLASS[tierName]} ${colorClass} ${TIER_BORDER_CLASS[tierName]}`;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${badgeClass}`}>
        {isVerified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
        {TIER_LABEL[tierName]}
      </span>
    );
  }

  return (
    <>
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${badgeClass}`}>
        <Icon className={`w-4 h-4 ${colorClass}`} />
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
                className="hover:opacity-80 transition-opacity"
                title="Link another wallet"
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setLinkMode("use");
                  setShowLinkModal(true);
                }}
                className="hover:opacity-80 transition-opacity"
                title="Link to existing KYC"
              >
                <Download className="w-3.5 h-3.5" />
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
