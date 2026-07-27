// src/components/WalletLinkingModal.tsx
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import { useKYC } from "@/contexts/KYCContext";

interface WalletLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "generate" | "use";
}

export function WalletLinkingModal({
  isOpen,
  onClose,
  mode: initialMode,
}: WalletLinkingModalProps) {
  const { address } = useAccount();
  const { generateLinkCode, useLinkCode, linkError, refreshKYC } = useKYC();

  const [mode, setMode] = useState<"generate" | "use">(initialMode);
  const [linkCode, setLinkCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [inputCode, setInputCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setLinkCode(null);
      setInputCode("");
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, initialMode]);

  // Countdown timer for generated code
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

  // Sync linkError from context
  useEffect(() => {
    if (linkError) {
      setError(linkError);
    }
  }, [linkError]);

  // Generate code handler
  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const code = await generateLinkCode();
      if (code) {
        setLinkCode(code);
      } else {
        setError("Failed to generate code. Make sure you have verified KYC.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate code");
    } finally {
      setIsLoading(false);
    }
  }, [generateLinkCode]);

  // Use code handler
  const handleUseCode = useCallback(async () => {
    if (inputCode.length !== 8) return;

    setIsLoading(true);
    setError(null);

    try {
      const success = await useLinkCode(inputCode.toUpperCase());
      if (success) {
        setSuccess(true);
        await refreshKYC();
      } else {
        // Error will be set via linkError from context
        if (!linkError) {
          setError("Failed to link wallet");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to link wallet");
    } finally {
      setIsLoading(false);
    }
  }, [inputCode, useLinkCode, refreshKYC, linkError]);

  // Copy code handler
  const handleCopy = useCallback(() => {
    if (!linkCode) return;
    navigator.clipboard.writeText(linkCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [linkCode]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-raised rounded-2xl max-w-md w-full p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink text-xl"
        >
          ×
        </button>

        {/* Success State */}
        {success ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-display font-bold text-ink mb-2">
              Wallet Linked!
            </h2>
            <p className="text-ink-muted mb-6">
              Your wallet is now linked and can access all KYC-gated features.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-success hover:bg-success/80 rounded-lg text-ink font-medium transition-colors"
            >
              Done
            </button>
          </div>
        ) : mode === "generate" ? (
          /* Generate Code Mode */
          <div>
            <h2 className="text-xl font-display font-bold text-ink mb-2">
              Generate Link Code
            </h2>
            <p className="text-ink-muted text-sm mb-6">
              Share this code with your other wallet to link it to your KYC.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-danger-muted border border-danger/30 rounded-lg text-danger text-sm">
                {error}
              </div>
            )}

            {linkCode && timeLeft > 0 ? (
              <div className="space-y-4">
                <div className="bg-surface rounded-xl p-6 text-center">
                  <p className="text-ink-faint text-sm mb-2">Your Link Code</p>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-3xl font-mono font-bold text-ink tracking-widest">
                      {linkCode.code}
                    </p>
                    <button
                      onClick={handleCopy}
                      className="p-2 hover:bg-surface-overlay rounded-lg transition-colors"
                    >
                      {copied ? "✓" : "📋"}
                    </button>
                  </div>
                  <p className={`text-sm mt-3 ${timeLeft < 60 ? "text-danger" : "text-ink-faint"}`}>
                    Expires in {formatTime(timeLeft)}
                  </p>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full py-2 text-ink-muted hover:text-ink hover:bg-surface-overlay rounded-lg transition-colors text-sm"
                >
                  Generate New Code
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full py-3 bg-gold-600 hover:bg-gold-500 disabled:bg-border-strong rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    Generating...
                  </>
                ) : (
                  "Generate Code"
                )}
              </button>
            )}
          </div>
        ) : (
          /* Use Code Mode */
          <div>
            <h2 className="text-xl font-display font-bold text-ink mb-2">
              Link Wallet
            </h2>
            <p className="text-ink-muted text-sm mb-6">
              Enter the 8-character code from your verified wallet.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-danger-muted border border-danger/30 rounded-lg text-danger text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                placeholder="XXXXXXXX"
                className="w-full px-4 py-4 bg-surface border border-border rounded-xl text-ink text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-gold-500 uppercase"
                maxLength={8}
              />

              <button
                onClick={handleUseCode}
                disabled={inputCode.length !== 8 || isLoading}
                className="w-full py-3 bg-success hover:bg-success/80 disabled:bg-border-strong disabled:cursor-not-allowed rounded-lg text-ink font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    Linking...
                  </>
                ) : (
                  "Link Wallet"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Toggle Mode */}
        {!success && (
          <button
            onClick={() => {
              setMode(mode === "generate" ? "use" : "generate");
              setError(null);
              setLinkCode(null);
              setInputCode("");
            }}
            className="w-full mt-4 py-2 text-ink-faint hover:text-ink-muted text-sm transition-colors"
          >
            {mode === "generate" 
              ? "I have a code to enter →" 
              : "← I need to generate a code"
            }
          </button>
        )}
      </div>
    </div>
  );
}

export default WalletLinkingModal;
