// src/app/kyc/WalletLinking.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useKYC } from "@/contexts/KYCContext";
import {
  Crown, Wallet, Check, Clipboard, Loader2, Link2, PartyPopper, Lock,
  CheckCircle2, AlertTriangle, Download, ArrowLeft, Zap, Gift, Hash,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type LinkingMode = "none" | "generate" | "use";

interface LinkedWallet {
  address: string;
  isPrimary: boolean;
  linkedAt: string;
  label?: string;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function LinkedWalletCard({
  wallet,
  isCurrentWallet,
  onUnlink,
}: {
  wallet: LinkedWallet;
  isCurrentWallet: boolean;
  onUnlink?: () => void;
}) {
  return (
    <div
      className={`
        flex items-center justify-between p-4 rounded-xl border transition-colors
        ${isCurrentWallet
          ? "bg-gold/10 border-gold/30"
          : "bg-surface border-border"
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center
          ${wallet.isPrimary ? "bg-gold/20" : "bg-surface-overlay"}
        `}>
          {wallet.isPrimary ? <Crown className="w-5 h-5 text-gold" /> : <Wallet className="w-5 h-5 text-ink-muted" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-ink">
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </p>
            {isCurrentWallet && (
              <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs rounded-full">
                Current
              </span>
            )}
            {wallet.isPrimary && (
              <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs rounded-full">
                Primary
              </span>
            )}
          </div>
          <p className="text-xs text-ink-faint">
            Linked {new Date(wallet.linkedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {!wallet.isPrimary && !isCurrentWallet && onUnlink && (
        <button
          onClick={onUnlink}
          className="px-3 py-1 text-sm text-danger hover:text-danger/80 hover:bg-danger/10 rounded-lg transition-colors"
        >
          Unlink
        </button>
      )}
    </div>
  );
}

function GenerateCodeSection({
  onGenerate,
  linkCode,
  isGenerating,
  error,
}: {
  onGenerate: () => void;
  linkCode: { code: string; expiresAt: string } | null;
  isGenerating: boolean;
  error: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Countdown timer
  useEffect(() => {
    if (!linkCode) return;

    const updateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const expiresAtTimestamp = Math.floor(new Date(linkCode.expiresAt).getTime() / 1000);
      const remaining = expiresAtTimestamp - now;
      setTimeLeft(Math.max(0, remaining));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [linkCode]);

  const copyCode = useCallback(() => {
    if (!linkCode) return;
    navigator.clipboard.writeText(linkCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [linkCode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-xl p-6">
        <h3 className="text-lg font-semibold text-ink mb-2">
          Generate Link Code
        </h3>
        <p className="text-ink-muted text-sm mb-4">
          Generate a one-time code to link another wallet to your KYC verification.
          The code expires after 15 minutes.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}

        {linkCode && timeLeft > 0 ? (
          <div className="space-y-4">
            <div className="bg-surface-sunken rounded-lg p-6 text-center">
              <p className="text-ink-faint text-sm mb-2">Your Link Code</p>
              <div className="flex items-center justify-center gap-3">
                <p className="text-4xl font-mono font-bold text-ink tracking-widest">
                  {linkCode.code}
                </p>
                <button
                  onClick={copyCode}
                  className="p-2 hover:bg-surface-overlay rounded-lg transition-colors"
                  title="Copy code"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Clipboard className="w-4 h-4 text-ink-muted" />
                  )}
                </button>
              </div>
              <p className="text-ink-faint text-sm mt-4">
                Expires in{" "}
                <span className={timeLeft < 60 ? "text-danger" : "text-ink"}>
                  {formatTime(timeLeft)}
                </span>
              </p>
            </div>

            <div className="bg-gold/10 border border-gold/30 rounded-lg p-4">
              <h4 className="text-gold font-medium mb-2">Instructions:</h4>
              <ol className="text-sm text-ink-muted space-y-1 list-decimal list-inside">
                <li>Open this page on your other wallet</li>
                <li>Click "Link Existing Wallet"</li>
                <li>Enter this code: <span className="font-mono text-ink">{linkCode.code}</span></li>
                <li>Sign the verification message</li>
              </ol>
            </div>

            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="w-full py-2 text-ink-muted hover:text-ink hover:bg-surface-overlay rounded-lg transition-colors text-sm"
            >
              Generate New Code
            </button>
          </div>
        ) : (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full py-3 bg-gold hover:bg-gold-light disabled:bg-border-strong disabled:cursor-not-allowed rounded-lg text-surface-sunken font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                Generate Link Code
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function UseCodeSection({
  onUseCode,
  isLinking,
  error,
  success,
}: {
  onUseCode: (code: string) => void;
  isLinking: boolean;
  error: string | null;
  success: boolean;
}) {
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 8) {
      onUseCode(code.toUpperCase());
    }
  };

  // Format code input (uppercase, max 8 chars)
  const handleCodeChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    setCode(formatted);
  };

  if (success) {
    return (
      <div className="bg-surface rounded-xl p-6 text-center">
        <PartyPopper className="w-12 h-12 text-gold mb-4 mx-auto" />
        <h3 className="text-xl font-semibold text-ink mb-2">
          Wallet Linked Successfully!
        </h3>
        <p className="text-ink-muted">
          This wallet now shares KYC verification with the primary wallet.
          You can use all investment features immediately.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-xl p-6">
        <h3 className="text-lg font-semibold text-ink mb-2">
          Link to Existing KYC
        </h3>
        <p className="text-ink-muted text-sm mb-4">
          Enter a link code from your verified wallet to share KYC verification
          with this wallet.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-danger-muted border border-danger/30 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-ink-muted mb-2">
              Link Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="Enter 8-character code"
              className="w-full px-4 py-3 bg-surface-sunken border border-border-strong rounded-lg text-ink text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-gold uppercase"
              maxLength={8}
            />
            <p className="text-xs text-ink-faint mt-2 text-center">
              {code.length}/8 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={code.length !== 8 || isLinking}
            className="w-full py-3 bg-success hover:bg-success/80 disabled:bg-border-strong disabled:cursor-not-allowed rounded-lg text-ink font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isLinking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Linking Wallet...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Link This Wallet
              </>
            )}
          </button>
        </form>

        <div className="mt-4 p-4 bg-surface-sunken rounded-lg">
          <h4 className="text-ink-muted text-sm font-medium mb-2">
            How to get a link code:
          </h4>
          <ol className="text-xs text-ink-faint space-y-1 list-decimal list-inside">
            <li>Connect your verified wallet</li>
            <li>Go to KYC → Wallet Linking</li>
            <li>Click "Generate Link Code"</li>
            <li>Copy the code and enter it here</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WalletLinking() {
  const { address, isConnected } = useAccount();
  const {
    tier,
    tierInfo,
    isVerified,
    isLoading,
    kycData,
    generateLinkCode,
    useLinkCode,
    linkError,
    refreshKYC,
  } = useKYC();

  const [mode, setMode] = useState<LinkingMode>("none");
  const [linkCode, setLinkCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);

  // Load linked wallets on mount
  useEffect(() => {
    if (isConnected && address) {
      fetchLinkedWallets();
    }
  }, [isConnected, address]);

  // Sync linkError from context
  useEffect(() => {
    if (linkError) {
      setLocalError(linkError);
    }
  }, [linkError]);

  // Fetch linked wallets from API
  const fetchLinkedWallets = useCallback(async () => {
    if (!address) return;
    
    try {
      const response = await fetch(`/api/kyc/link/list?wallet=${address}`)
      const data = await response.json();
      
      if (data.success && data.wallets) {
        setLinkedWallets(data.wallets);
      }
    } catch (error) {
      console.error('Failed to fetch linked wallets:', error);
    }
  }, [address]);

  // Handle generate link code
  const handleGenerateCode = useCallback(async () => {
    setIsGenerating(true);
    setLocalError(null);

    try {
      const code = await generateLinkCode();
      if (code) {
        setLinkCode(code);
      } else {
        setLocalError("Failed to generate link code. Make sure you have approved KYC.");
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to generate code");
    } finally {
      setIsGenerating(false);
    }
  }, [generateLinkCode]);

  // Handle use link code
  const handleUseLinkCode = useCallback(async (code: string) => {
    setIsLinking(true);
    setLocalError(null);

    try {
      const success = await useLinkCode(code);
      if (success) {
        setLinkSuccess(true);
        // Refresh linked wallets and KYC status
        await fetchLinkedWallets();
        await refreshKYC();
      } else {
        // Error will be set via linkError from context
        if (!linkError) {
          setLocalError("Failed to link wallet");
        }
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to link wallet");
    } finally {
      setIsLinking(false);
    }
  }, [useLinkCode, fetchLinkedWallets, refreshKYC, linkError]);

  // Not connected state
  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <Lock className="w-14 h-14 text-ink-faint mb-4 mx-auto" />
        <h2 className="text-2xl font-display font-medium text-ink mb-2">Connect Your Wallet</h2>
        <p className="text-ink-muted">
          Please connect your wallet to manage linked wallets.
        </p>
      </div>
    );
  }

  // Check if current wallet has KYC
  const hasKYC = isVerified && tier !== 'None';
  const isPrimaryWallet = linkedWallets.some(
    (w) => w.address.toLowerCase() === address?.toLowerCase() && w.isPrimary
  );
  const isLinkedWallet = linkedWallets.some(
    (w) => w.address.toLowerCase() === address?.toLowerCase() && !w.isPrimary
  );

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink mb-2">Wallet Linking</h1>
        <p className="text-ink-muted">
          Link multiple wallets to share your KYC verification
        </p>
      </div>

      {/* Current Status */}
      <div className={`
        rounded-xl p-4 border
        ${hasKYC 
          ? "bg-success/10 border-success/30" 
          : "bg-warning-muted border-warning/30"
        }
      `}>
        <div className="flex items-center gap-3">
          {hasKYC ? <CheckCircle2 className="w-6 h-6 text-success" /> : <AlertTriangle className="w-6 h-6 text-warning" />}
          <div>
            <p className={`font-medium ${hasKYC ? "text-success" : "text-warning"}`}>
              {hasKYC 
                ? `KYC Verified - ${tier} (${tierInfo.formattedLimit})` 
                : "KYC Not Verified"
              }
            </p>
            <p className="text-sm text-ink-muted">
              {hasKYC
                ? isPrimaryWallet
                  ? "This is your primary verified wallet"
                  : isLinkedWallet
                  ? "This wallet is linked to a verified identity"
                  : "You can link additional wallets"
                : "Complete KYC verification or link to an existing verified wallet"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Linked Wallets List */}
      {linkedWallets.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">
            Linked Wallets ({linkedWallets.length})
          </h2>
          {linkedWallets.map((wallet) => (
            <LinkedWalletCard
              key={wallet.address}
              wallet={wallet}
              isCurrentWallet={wallet.address.toLowerCase() === address?.toLowerCase()}
            />
          ))}
        </div>
      )}

      {/* Action Selection */}
      {mode === "none" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Generate Code Option */}
          <button
            onClick={() => {
              setMode("generate");
              setLocalError(null);
              setLinkCode(null);
            }}
            disabled={!hasKYC}
            className={`
              p-6 rounded-xl border-2 text-left transition-all
              ${hasKYC 
                ? "border-gold/30 hover:border-gold hover:bg-gold/10 cursor-pointer" 
                : "border-border-strong opacity-50 cursor-not-allowed"
              }
            `}
          >
            <Link2 className="w-8 h-8 text-gold mb-3" />
            <h3 className="text-lg font-semibold text-ink mb-1">
              Link Another Wallet
            </h3>
            <p className="text-sm text-ink-muted">
              Generate a code to share your KYC with another wallet you own
            </p>
            {!hasKYC && (
              <p className="text-xs text-warning mt-2">
                Requires verified KYC
              </p>
            )}
          </button>

          {/* Use Code Option */}
          <button
            onClick={() => {
              setMode("use");
              setLocalError(null);
              setLinkSuccess(false);
            }}
            disabled={hasKYC}
            className={`
              p-6 rounded-xl border-2 text-left transition-all
              ${!hasKYC 
                ? "border-success/30 hover:border-success hover:bg-success/10 cursor-pointer" 
                : "border-border-strong opacity-50 cursor-not-allowed"
              }
            `}
          >
            <Download className="w-8 h-8 text-success mb-3" />
            <h3 className="text-lg font-semibold text-ink mb-1">
              Link to Existing KYC
            </h3>
            <p className="text-sm text-ink-muted">
              Enter a link code from your verified wallet
            </p>
            {hasKYC && (
              <p className="text-xs text-gold mt-2">
                This wallet already has KYC
              </p>
            )}
          </button>
        </div>
      )}

      {/* Generate Code View */}
      {mode === "generate" && (
        <>
          <GenerateCodeSection
            onGenerate={handleGenerateCode}
            linkCode={linkCode}
            isGenerating={isGenerating}
            error={localError}
          />
          <button
            onClick={() => {
              setMode("none");
              setLinkCode(null);
              setLocalError(null);
            }}
            className="w-full py-2 flex items-center justify-center gap-1.5 text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </>
      )}

      {/* Use Code View */}
      {mode === "use" && (
        <>
          <UseCodeSection
            onUseCode={handleUseLinkCode}
            isLinking={isLinking}
            error={localError}
            success={linkSuccess}
          />
          {!linkSuccess && (
            <button
              onClick={() => {
                setMode("none");
                setLocalError(null);
              }}
              className="w-full py-2 flex items-center justify-center gap-1.5 text-ink-muted hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
        </>
      )}

      {/* Info Section */}
      <div className="bg-surface rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-ink">
          About Wallet Linking
        </h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex gap-3">
            <Lock className="w-5 h-5 text-gold flex-shrink-0" />
            <div>
              <p className="text-ink font-medium">Privacy Preserved</p>
              <p className="text-ink-muted">
                Your KYC data stays encrypted. Only the verification status is shared.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Zap className="w-5 h-5 text-gold flex-shrink-0" />
            <div>
              <p className="text-ink font-medium">Instant Linking</p>
              <p className="text-ink-muted">
                Linked wallets can immediately use investment features.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Gift className="w-5 h-5 text-gold flex-shrink-0" />
            <div>
              <p className="text-ink font-medium">Free to Link</p>
              <p className="text-ink-muted">
                No additional fees for linking wallets after initial KYC.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Hash className="w-5 h-5 text-gold flex-shrink-0" />
            <div>
              <p className="text-ink font-medium">Up to 10 Wallets</p>
              <p className="text-ink-muted">
                Link up to 10 wallets per verified identity.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-ink">
          Frequently Asked Questions
        </h3>

        <details className="bg-surface rounded-lg">
          <summary className="p-4 cursor-pointer text-ink hover:text-ink-muted">
            Why would I link multiple wallets?
          </summary>
          <div className="px-4 pb-4 text-sm text-ink-muted">
            You might use different wallets for different purposes (e.g., a hardware 
            wallet for long-term holdings and a hot wallet for active trading). 
            Linking allows you to use any of these wallets for KYC-gated features 
            without completing verification multiple times.
          </div>
        </details>

        <details className="bg-surface rounded-lg">
          <summary className="p-4 cursor-pointer text-ink hover:text-ink-muted">
            Can I unlink a wallet?
          </summary>
          <div className="px-4 pb-4 text-sm text-ink-muted">
            You can unlink secondary wallets at any time. However, the primary wallet 
            (the one where you originally completed KYC) cannot be unlinked. If you 
            need to change your primary wallet, please contact support.
          </div>
        </details>

        <details className="bg-surface rounded-lg">
          <summary className="p-4 cursor-pointer text-ink hover:text-ink-muted">
            What happens if I delete my KYC data?
          </summary>
          <div className="px-4 pb-4 text-sm text-ink-muted">
            If you request deletion of your KYC data (GDPR right to be forgotten), 
            all linked wallets will lose their verified status. You would need to 
            complete KYC again to regain access to investment features.
          </div>
        </details>

        <details className="bg-surface rounded-lg">
          <summary className="p-4 cursor-pointer text-ink hover:text-ink-muted">
            Is linking secure?
          </summary>
          <div className="px-4 pb-4 text-sm text-ink-muted">
            Yes. Link codes expire after 15 minutes and can only be used once. 
            Both wallets must sign messages to prove ownership. No private keys 
            are ever shared or exposed during the process.
          </div>
        </details>
      </div>
    </div>
  );
}

export default WalletLinking;
