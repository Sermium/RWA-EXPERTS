// src/app/kyc/GDPRDataManagement.tsx
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import { useKYC } from "@/contexts/KYCContext";
import { CONTACT } from '@/config/contacts';

// ============================================================================
// TYPES
// ============================================================================

type ActionState = "idle" | "confirming" | "processing" | "success" | "error";

// ============================================================================
// COMPONENTS
// ============================================================================

function DataCategoryCard({
  icon,
  title,
  description,
  items,
}: {
  icon: string;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="bg-surface rounded-xl p-4 border border-border">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <h3 className="font-medium text-ink">{title}</h3>
          <p className="text-sm text-ink-muted mb-2">{description}</p>
          <ul className="text-xs text-ink-faint space-y-1">
            {items.map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ExportSection({
  onExport,
  isProcessing,
  error,
  success,
}: {
  onExport: () => void;
  isProcessing: boolean;
  error: string | null;
  success: boolean;
}) {
  return (
    <div className="bg-surface rounded-xl p-6 border border-border">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center text-2xl">
          📥
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-ink mb-1">
            Export Your Data
          </h3>
          <p className="text-ink-muted text-sm mb-4">
            Download a complete copy of all your KYC data in JSON format.
            This includes your personal information, verification history,
            linked wallets, and document metadata.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-danger/30 border border-danger/30 rounded-lg text-danger text-sm">
              {error}
            </div>
          )}

          {success ? (
            <div className="p-3 bg-success/30 border border-success/30 rounded-lg text-success text-sm flex items-center gap-2">
              <span>✓</span>
              <span>Download started! Check your downloads folder.</span>
            </div>
          ) : (
            <button
              onClick={onExport}
              disabled={isProcessing}
              className="px-6 py-2 bg-gold-600 hover:bg-gold-500 disabled:bg-border-strong disabled:cursor-not-allowed rounded-lg text-ink font-medium transition-colors flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Preparing Export...
                </>
              ) : (
                <>
                  <span>📄</span>
                  Download My Data
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteSection({
  onDelete,
  state,
  error,
  onConfirm,
  onCancel,
}: {
  onDelete: () => void;
  state: ActionState;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [acknowledged, setAcknowledged] = useState<boolean[]>([false, false, false]);

  const allAcknowledged = acknowledged.every(Boolean);
  const confirmTextValid = confirmText === "DELETE MY DATA";

  const handleAcknowledge = (index: number) => {
    setAcknowledged((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  if (state === "success") {
    return (
      <div className="bg-surface rounded-xl p-6 border border-border text-center">
        <div className="text-5xl mb-4">🗑️</div>
        <h3 className="text-xl font-semibold text-ink mb-2">
          Data Deleted Successfully
        </h3>
        <p className="text-ink-muted">
          All your KYC data has been permanently removed from our systems.
          Your wallet is no longer verified.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl p-6 border border-danger/30">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center text-2xl">
          🗑️
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-ink mb-1">
            Delete Your Data
          </h3>
          <p className="text-ink-muted text-sm mb-4">
            Permanently delete all your KYC data from our systems.
            This action cannot be undone.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-danger/30 border border-danger/30 rounded-lg text-danger text-sm">
              {error}
            </div>
          )}

          {state === "confirming" ? (
            <div className="space-y-4">
              {/* Warning Banner */}
              <div className="p-4 bg-danger/30 border border-danger/30 rounded-lg">
                <h4 className="text-danger font-semibold mb-2 flex items-center gap-2">
                  <span>⚠️</span>
                  Warning: This action is irreversible
                </h4>
                <p className="text-ink-muted text-sm">
                  Once deleted, your data cannot be recovered. You will need to
                  complete KYC verification again to use investment features.
                </p>
              </div>

              {/* Acknowledgment Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledged[0]}
                    onChange={() => handleAcknowledge(0)}
                    className="mt-1 w-4 h-4 rounded border-border-strong bg-surface-overlay text-danger focus:ring-danger"
                  />
                  <span className="text-sm text-ink-muted">
                    I understand that all my KYC data will be permanently deleted,
                    including personal information, documents, and verification history.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledged[1]}
                    onChange={() => handleAcknowledge(1)}
                    className="mt-1 w-4 h-4 rounded border-border-strong bg-surface-overlay text-danger focus:ring-danger"
                  />
                  <span className="text-sm text-ink-muted">
                    I understand that all linked wallets will lose their verified status
                    and will need to complete KYC again.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledged[2]}
                    onChange={() => handleAcknowledge(2)}
                    className="mt-1 w-4 h-4 rounded border-border-strong bg-surface-overlay text-danger focus:ring-danger"
                  />
                  <span className="text-sm text-ink-muted">
                    I understand that this action cannot be undone and I will not be
                    able to recover my data.
                  </span>
                </label>
              </div>

              {/* Confirmation Input */}
              <div>
                <label className="block text-sm text-ink-muted mb-2">
                  Type <span className="font-mono text-danger">DELETE MY DATA</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="DELETE MY DATA"
                  className="w-full px-4 py-2 bg-surface-sunken border border-border rounded-lg text-ink font-mono focus:outline-none focus:border-danger"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 py-2 bg-surface-overlay hover:bg-border-strong rounded-lg text-ink font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={!allAcknowledged || !confirmTextValid}
                  className="flex-1 py-2 bg-danger hover:bg-danger disabled:bg-border-strong disabled:cursor-not-allowed rounded-lg text-ink font-medium transition-colors"
                >
                  Permanently Delete
                </button>
              </div>
            </div>
          ) : state === "processing" ? (
            <div className="flex items-center gap-3 text-ink-muted">
              <span className="animate-spin text-xl">⟳</span>
              <span>Deleting your data...</span>
            </div>
          ) : (
            <button
              onClick={onDelete}
              className="px-6 py-2 bg-danger/20 hover:bg-danger/30 border border-danger/30 rounded-lg text-danger font-medium transition-colors flex items-center gap-2"
            >
              <span>🗑️</span>
              Request Data Deletion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GDPRDataManagement() {
  const { address, isConnected } = useAccount();
  const { tier, status, isVerified, refreshKYC } = useKYC();

  const [exportState, setExportState] = useState<ActionState>("idle");
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<ActionState>("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Handle export
  const handleExport = useCallback(async () => {
    if (!address) return;
    
    setExportState("processing");
    setExportError(null);

    try {
      const response = await fetch(`/api/kyc/gdpr/export?address=${address}`);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to export data");
      }

      // Create download link
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kyc-export-${address?.slice(0, 8)}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportState("success");
      
      // Reset after 5 seconds
      setTimeout(() => setExportState("idle"), 5000);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
      setExportState("error");
    }
  }, [address]);

  // Handle delete initiation
  const handleDeleteInitiate = useCallback(() => {
    setDeleteState("confirming");
    setDeleteError(null);
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!address) return;
    
    setDeleteState("processing");
    setDeleteError(null);

    try {
      const response = await fetch('/api/kyc/gdpr/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Deletion failed");
      }

      setDeleteState("success");
      
      // Refresh KYC status after deletion
      await refreshKYC();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Deletion failed");
      setDeleteState("error");
    }
  }, [address, refreshKYC]);

  // Handle delete cancel
  const handleDeleteCancel = useCallback(() => {
    setDeleteState("idle");
    setDeleteError(null);
  }, []);

  // Not connected state
  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h2 className="text-2xl font-bold text-ink mb-2">Connect Your Wallet</h2>
        <p className="text-ink-muted">
          Please connect your wallet to manage your data.
        </p>
      </div>
    );
  }

  // No KYC data state
  const hasKYCData = tier !== 'None' || status !== 'None';
  if (!hasKYCData) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="text-6xl mb-4">📭</div>
        <h2 className="text-2xl font-bold text-ink mb-2">No Data Found</h2>
        <p className="text-ink-muted">
          You haven't submitted any KYC data yet. There's nothing to export or delete.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink mb-2">Data Privacy</h1>
        <p className="text-ink-muted">
          Manage your personal data in compliance with GDPR
        </p>
      </div>

      {/* Your Rights Section */}
      <div className="bg-gradient-to-br from-gold-500/10 to-gold-light-500/10 rounded-xl p-6 border border-gold-500/20">
        <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <span>⚖️</span>
          Your Data Rights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex gap-3">
            <span className="text-gold-400">✓</span>
            <div>
              <p className="text-ink font-medium">Right to Access</p>
              <p className="text-ink-muted">View and download all your data</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-gold-400">✓</span>
            <div>
              <p className="text-ink font-medium">Right to Portability</p>
              <p className="text-ink-muted">Export data in machine-readable format</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-gold-400">✓</span>
            <div>
              <p className="text-ink font-medium">Right to Erasure</p>
              <p className="text-ink-muted">Request deletion of all your data</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-gold-400">✓</span>
            <div>
              <p className="text-ink font-medium">Right to Rectification</p>
              <p className="text-ink-muted">Update incorrect information</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Categories */}
      <div>
        <h2 className="text-lg font-semibold text-ink mb-4">
          Data We Store
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DataCategoryCard
            icon="👤"
            title="Personal Information"
            description="Basic identity details"
            items={[
              "Full name (encrypted)",
              "Email address (encrypted)",
              "Date of birth (encrypted)",
              "Country of residence",
            ]}
          />
          <DataCategoryCard
            icon="📄"
            title="Identity Documents"
            description="Verification documents"
            items={[
              "ID document images",
              "Selfie photos",
              "Proof of address",
              "Accreditation documents",
            ]}
          />
          <DataCategoryCard
            icon="✅"
            title="Verification Data"
            description="KYC process information"
            items={[
              "Verification level",
              "Submission timestamps",
              "Approval/rejection history",
              "Verification scores",
            ]}
          />
          <DataCategoryCard
            icon="👛"
            title="Wallet Information"
            description="Blockchain identifiers"
            items={[
              "Linked wallet addresses",
              "Wallet hash (anonymized)",
              "On-chain registration status",
              "Link code history",
            ]}
          />
        </div>
      </div>

      {/* Data Security Notice */}
      <div className="bg-surface rounded-xl p-6 border border-border">
        <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <span>🔒</span>
          How We Protect Your Data
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center p-4">
            <div className="text-3xl mb-2">🔐</div>
            <p className="text-ink font-medium">AES-256 Encryption</p>
            <p className="text-ink-muted text-xs mt-1">
              All PII is encrypted at rest
            </p>
          </div>
          <div className="text-center p-4">
            <div className="text-3xl mb-2">🌐</div>
            <p className="text-ink font-medium">TLS 1.3 in Transit</p>
            <p className="text-ink-muted text-xs mt-1">
              Secure data transmission
            </p>
          </div>
          <div className="text-center p-4">
            <div className="text-3xl mb-2">🗄️</div>
            <p className="text-ink font-medium">Isolated Storage</p>
            <p className="text-ink-muted text-xs mt-1">
              Documents stored separately
            </p>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <ExportSection
        onExport={handleExport}
        isProcessing={exportState === "processing"}
        error={exportError}
        success={exportState === "success"}
      />

      {/* Delete Section */}
      <DeleteSection
        onDelete={handleDeleteInitiate}
        state={deleteState}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* Contact Section */}
      <div className="bg-surface rounded-xl p-6 border border-border text-center">
        <h3 className="text-lg font-semibold text-ink mb-2">
          Questions About Your Data?
        </h3>
        <p className="text-ink-muted text-sm mb-4">
          If you have questions about how we handle your data or want to exercise
          other rights, please contact our Data Protection Officer.
        </p>
        <a
          href={`mailto:${CONTACT.privacy}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface-overlay hover:bg-border-strong rounded-lg text-ink transition-colors"
        >
          <span>✉️</span>
          {CONTACT.privacy}
        </a>
      </div>
    </div>
  );
}

export default GDPRDataManagement;
