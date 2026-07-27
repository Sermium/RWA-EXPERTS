// src/app/admin/kyc/components/PendingList.tsx
'use client';

import { useState } from 'react';
import { Clock, TrendingUp, ChevronDown, ChevronUp, User, ExternalLink } from 'lucide-react';
import { PendingSubmission, PendingUpgrade } from '../types';
import { formatAddress, formatDate } from '../utils';
import { StatusBadge, TierBadge, UpgradeStatusBadge } from './StatusBadge';

interface PendingSubmissionsListProps {
  submissions: PendingSubmission[];
  explorerUrl: string;
  onSelect: (address: string) => void;
  isLoading: boolean;
}

export function PendingSubmissionsList({ 
  submissions, 
  explorerUrl, 
  onSelect,
  isLoading 
}: PendingSubmissionsListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-surface/50 rounded-xl border border-border/50 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-overlay/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-warning" />
          <h3 className="text-lg font-semibold text-ink">Pending Submissions</h3>
          <span className="px-2 py-0.5 bg-warning/20 text-warning text-sm rounded-full">
            {submissions.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-ink-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-ink-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-border/50">
          {isLoading ? (
            <div className="p-8 text-center text-ink-muted">
              Loading pending submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-8 text-center text-ink-muted">
              No pending submissions
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {submissions.map((submission) => (
                <div
                  key={submission.address}
                  className="p-4 hover:bg-surface-overlay/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-surface-overlay flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-ink-muted" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-ink">
                            {formatAddress(submission.address)}
                          </span>
                          <a
                            href={`${explorerUrl}/address/${submission.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ink-muted hover:text-ink"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <TierBadge tier={submission.tier} size="sm" />
                          <span className="text-xs text-ink-muted">
                            {formatDate(submission.submittedAt)}
                          </span>
                        </div>
                        {submission.storedData?.personalInfo?.fullName && (
                          <p className="text-sm text-ink-muted mt-1 truncate">
                            {submission.storedData.personalInfo.fullName}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => onSelect(submission.address)}
                      className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-ink text-sm font-medium rounded-lg transition-colors flex-shrink-0"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PendingUpgradesListProps {
  upgrades: PendingUpgrade[];
  explorerUrl: string;
  onSelect: (address: string) => void;
  isLoading: boolean;
}

export function PendingUpgradesList({ 
  upgrades, 
  explorerUrl, 
  onSelect,
  isLoading 
}: PendingUpgradesListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-surface/50 rounded-xl border border-border/50 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-overlay/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-gold-400" />
          <h3 className="text-lg font-semibold text-ink">Pending Upgrades</h3>
          <span className="px-2 py-0.5 bg-gold-500/20 text-gold-400 text-sm rounded-full">
            {upgrades.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-ink-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-ink-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-border/50">
          {isLoading ? (
            <div className="p-8 text-center text-ink-muted">
              Loading pending upgrades...
            </div>
          ) : upgrades.length === 0 ? (
            <div className="p-8 text-center text-ink-muted">
              No pending upgrades
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {upgrades.map((upgrade) => (
                <div
                  key={upgrade.address}
                  className="p-4 hover:bg-surface-overlay/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-5 h-5 text-gold-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-ink">
                            {formatAddress(upgrade.address)}
                          </span>
                          <a
                            href={`${explorerUrl}/address/${upgrade.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ink-muted hover:text-ink"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <TierBadge tier={upgrade.currentTier} size="sm" />
                          <span className="text-ink-muted">→</span>
                          <TierBadge tier={upgrade.requestedTier} size="sm" />
                        </div>
                        {upgrade.reason && (
                          <p className="text-sm text-ink-muted mt-1 truncate">
                            {upgrade.reason}
                          </p>
                        )}
                        <p className="text-xs text-ink-faint mt-1">
                          {formatDate(upgrade.requestedAt)}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => onSelect(upgrade.address)}
                      className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-ink text-sm font-medium rounded-lg transition-colors flex-shrink-0"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
