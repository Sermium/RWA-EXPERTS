// src/app/admin/kyc/components/Modals.tsx
'use client';

import { useState } from 'react';
import { X, AlertTriangle, CheckCircle, XCircle, RotateCcw, Loader2 } from 'lucide-react';
import { TIER_NAMES } from '../types';
import { formatAddress } from '../utils';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  children: React.ReactNode;
}

function BaseModal({ isOpen, onClose, title, icon, iconBg, children }: BaseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-sunken rounded-xl w-full max-w-md border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
              {icon}
            </div>
            <h3 className="text-lg font-semibold text-ink">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-overlay rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-ink-muted" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ============================================================================
// APPROVE MODAL
// ============================================================================

interface ApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  currentTier: number;
  onApprove: (tier: number) => void;
  isProcessing: boolean;
}

export function ApproveModal({ 
  isOpen, 
  onClose, 
  address, 
  currentTier,
  onApprove, 
  isProcessing 
}: ApproveModalProps) {
  const [selectedTier, setSelectedTier] = useState(currentTier || 1);

  const handleApprove = () => {
    onApprove(selectedTier);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Approve KYC"
      icon={<CheckCircle className="w-5 h-5 text-success" />}
      iconBg="bg-green-500/20"
    >
      <div className="space-y-4">
        <div className="p-3 bg-surface/50 rounded-lg">
          <p className="text-xs text-ink-muted mb-1">Address</p>
          <p className="text-ink font-mono text-sm">{formatAddress(address)}</p>
        </div>

        <div>
          <label className="block text-sm text-ink-muted mb-2">Select Tier to Approve</label>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`p-3 rounded-lg border transition-colors ${
                  selectedTier === tier
                    ? 'bg-green-500/20 border-green-500/50 text-success'
                    : 'bg-surface/50 border-border text-ink-muted hover:bg-surface-overlay/50'
                }`}
              >
                <div className="font-medium">Tier {tier}</div>
                <div className="text-xs opacity-70">{TIER_NAMES[tier]}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm text-success">
            This will approve the KYC submission and grant {TIER_NAMES[selectedTier]} access level.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-surface-overlay hover:bg-gray-600 disabled:bg-surface-raised text-ink font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-surface-overlay text-ink font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Approve
              </>
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

// ============================================================================
// REJECT MODAL
// ============================================================================

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  onReject: (reason: string) => void;
  isProcessing: boolean;
}

export function RejectModal({ 
  isOpen, 
  onClose, 
  address, 
  onReject, 
  isProcessing 
}: RejectModalProps) {
  const [reason, setReason] = useState('');

  const handleReject = () => {
    if (!reason.trim()) return;
    onReject(reason);
  };

  const quickReasons = [
    'Invalid or unreadable documents',
    'Document expired',
    'Information mismatch',
    'Suspected fraud',
    'Incomplete submission',
    'Failed identity verification'
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Reject KYC"
      icon={<XCircle className="w-5 h-5 text-danger" />}
      iconBg="bg-red-500/20"
    >
      <div className="space-y-4">
        <div className="p-3 bg-surface/50 rounded-lg">
          <p className="text-xs text-ink-muted mb-1">Address</p>
          <p className="text-ink font-mono text-sm">{formatAddress(address)}</p>
        </div>

        <div>
          <label className="block text-sm text-ink-muted mb-2">Rejection Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter the reason for rejection..."
            rows={3}
            className="w-full px-4 py-3 bg-surface/50 border border-border rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
        </div>

        <div>
          <p className="text-xs text-ink-muted mb-2">Quick Reasons</p>
          <div className="flex flex-wrap gap-2">
            {quickReasons.map((qr) => (
              <button
                key={qr}
                onClick={() => setReason(qr)}
                className="px-2 py-1 text-xs bg-surface/50 hover:bg-surface-overlay/50 border border-border rounded text-ink-muted transition-colors"
              >
                {qr}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
            <p className="text-sm text-danger">
              This will reject the KYC submission. The user will need to resubmit their documents.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-surface-overlay hover:bg-gray-600 disabled:bg-surface-raised text-ink font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={isProcessing || !reason.trim()}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-surface-overlay text-ink font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Reject
              </>
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

// ============================================================================
// RESET MODAL
// ============================================================================

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  onReset: (reason: string) => void;
  isProcessing: boolean;
}

export function ResetModal({ 
  isOpen, 
  onClose, 
  address, 
  onReset, 
  isProcessing 
}: ResetModalProps) {
  const [reason, setReason] = useState('');

  const handleReset = () => {
    if (!reason.trim()) return;
    onReset(reason);
  };

  const quickReasons = [
    'User requested reset',
    'Documents need re-verification',
    'Information update required',
    'Tier upgrade requirement',
    'Expiration reset',
    'Administrative correction'
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset KYC Status"
      icon={<RotateCcw className="w-5 h-5 text-warning" />}
      iconBg="bg-yellow-500/20"
    >
      <div className="space-y-4">
        <div className="p-3 bg-surface/50 rounded-lg">
          <p className="text-xs text-ink-muted mb-1">Address</p>
          <p className="text-ink font-mono text-sm">{formatAddress(address)}</p>
        </div>

        <div>
          <label className="block text-sm text-ink-muted mb-2">Reset Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter the reason for reset..."
            rows={3}
            className="w-full px-4 py-3 bg-surface/50 border border-border rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
          />
        </div>

        <div>
          <p className="text-xs text-ink-muted mb-2">Quick Reasons</p>
          <div className="flex flex-wrap gap-2">
            {quickReasons.map((qr) => (
              <button
                key={qr}
                onClick={() => setReason(qr)}
                className="px-2 py-1 text-xs bg-surface/50 hover:bg-surface-overlay/50 border border-border rounded text-ink-muted transition-colors"
              >
                {qr}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
            <p className="text-sm text-warning">
              This will reset the KYC status to pending. The submission will need to be reviewed again.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-surface-overlay hover:bg-gray-600 disabled:bg-surface-raised text-ink font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReset}
            disabled={isProcessing || !reason.trim()}
            className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-surface-overlay text-ink font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Reset
              </>
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

// ============================================================================
// APPROVE UPGRADE MODAL
// ============================================================================

interface ApproveUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  currentTier: number;
  requestedTier: number;
  onApprove: () => void;
  isProcessing: boolean;
}

export function ApproveUpgradeModal({ 
  isOpen, 
  onClose, 
  address, 
  currentTier,
  requestedTier,
  onApprove, 
  isProcessing 
}: ApproveUpgradeModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Approve Tier Upgrade"
      icon={<CheckCircle className="w-5 h-5 text-gold-400" />}
      iconBg="bg-gold-500/20"
    >
      <div className="space-y-4">
        <div className="p-3 bg-surface/50 rounded-lg">
          <p className="text-xs text-ink-muted mb-1">Address</p>
          <p className="text-ink font-mono text-sm">{formatAddress(address)}</p>
        </div>

        <div className="p-4 bg-surface/50 rounded-lg">
          <p className="text-sm text-ink-muted mb-3">Upgrade Details</p>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="px-3 py-2 bg-surface-overlay rounded-lg mb-1">
                <span className="text-lg font-bold text-ink">Tier {currentTier}</span>
              </div>
              <span className="text-xs text-ink-muted">{TIER_NAMES[currentTier]}</span>
            </div>
            <div className="text-2xl text-ink-faint">→</div>
            <div className="text-center">
              <div className="px-3 py-2 bg-gold-500/20 border border-gold-500/30 rounded-lg mb-1">
                <span className="text-lg font-bold text-gold-400">Tier {requestedTier}</span>
              </div>
              <span className="text-xs text-gold-400">{TIER_NAMES[requestedTier]}</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-gold-500/10 border border-gold-500/20 rounded-lg">
          <p className="text-sm text-gold-400">
            This will upgrade the user to {TIER_NAMES[requestedTier]} tier with higher investment limits.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-surface-overlay hover:bg-gray-600 disabled:bg-surface-raised text-ink font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onApprove}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-gold-600 hover:bg-gold-700 disabled:bg-surface-overlay text-ink font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Approve Upgrade
              </>
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

// ============================================================================
// REJECT UPGRADE MODAL
// ============================================================================

interface RejectUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  currentTier: number;
  requestedTier: number;
  onReject: (reason: string) => void;
  isProcessing: boolean;
}

export function RejectUpgradeModal({ 
  isOpen, 
  onClose, 
  address, 
  currentTier,
  requestedTier,
  onReject, 
  isProcessing 
}: RejectUpgradeModalProps) {
  const [reason, setReason] = useState('');

  const handleReject = () => {
    if (!reason.trim()) return;
    onReject(reason);
  };

  const quickReasons = [
    'Insufficient documentation',
    'Investment history not met',
    'Additional verification required',
    'Does not meet tier requirements',
    'Suspicious activity detected',
    'Incomplete upgrade request'
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Reject Tier Upgrade"
      icon={<XCircle className="w-5 h-5 text-danger" />}
      iconBg="bg-red-500/20"
    >
      <div className="space-y-4">
        <div className="p-3 bg-surface/50 rounded-lg">
          <p className="text-xs text-ink-muted mb-1">Address</p>
          <p className="text-ink font-mono text-sm">{formatAddress(address)}</p>
        </div>

        <div className="p-4 bg-surface/50 rounded-lg">
          <p className="text-sm text-ink-muted mb-3">Requested Upgrade</p>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="px-3 py-2 bg-surface-overlay rounded-lg mb-1">
                <span className="text-lg font-bold text-ink">Tier {currentTier}</span>
              </div>
              <span className="text-xs text-ink-muted">{TIER_NAMES[currentTier]}</span>
            </div>
            <div className="text-2xl text-ink-faint">→</div>
            <div className="text-center">
              <div className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg mb-1">
                <span className="text-lg font-bold text-danger line-through">Tier {requestedTier}</span>
              </div>
              <span className="text-xs text-danger">{TIER_NAMES[requestedTier]}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-ink-muted mb-2">Rejection Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter the reason for rejecting the upgrade..."
            rows={3}
            className="w-full px-4 py-3 bg-surface/50 border border-border rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
        </div>

        <div>
          <p className="text-xs text-ink-muted mb-2">Quick Reasons</p>
          <div className="flex flex-wrap gap-2">
            {quickReasons.map((qr) => (
              <button
                key={qr}
                onClick={() => setReason(qr)}
                className="px-2 py-1 text-xs bg-surface/50 hover:bg-surface-overlay/50 border border-border rounded text-ink-muted transition-colors"
              >
                {qr}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
            <p className="text-sm text-danger">
              The user will remain at {TIER_NAMES[currentTier]} tier and will be notified of the rejection.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-surface-overlay hover:bg-gray-600 disabled:bg-surface-raised text-ink font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={isProcessing || !reason.trim()}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-surface-overlay text-ink font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Reject Upgrade
              </>
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

// ============================================================================
// CONFIRM ACTION MODAL
// ============================================================================

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: 'red' | 'green' | 'yellow' | 'blue';
  onConfirm: () => void;
  isProcessing: boolean;
}

export function ConfirmActionModal({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel,
  confirmColor = 'blue',
  onConfirm,
  isProcessing
}: ConfirmActionModalProps) {
  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700',
    green: 'bg-green-600 hover:bg-green-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
    blue: 'bg-gold-600 hover:bg-gold-700'
  };

  const iconColors = {
    red: 'text-danger',
    green: 'text-success',
    yellow: 'text-warning',
    blue: 'text-gold-400'
  };

  const bgColors = {
    red: 'bg-red-500/20',
    green: 'bg-green-500/20',
    yellow: 'bg-yellow-500/20',
    blue: 'bg-gold-500/20'
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={<AlertTriangle className={`w-5 h-5 ${iconColors[confirmColor]}`} />}
      iconBg={bgColors[confirmColor]}
    >
      <div className="space-y-4">
        <p className="text-ink-muted">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-surface-overlay hover:bg-gray-600 disabled:bg-surface-raised text-ink font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`flex-1 px-4 py-3 ${colorClasses[confirmColor]} disabled:bg-surface-overlay text-ink font-medium rounded-lg transition-colors flex items-center justify-center gap-2`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
