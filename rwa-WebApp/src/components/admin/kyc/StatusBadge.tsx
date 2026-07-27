// src/app/admin/kyc/components/StatusBadge.tsx
'use client';

import { 
  STATUS_NAMES, 
  STATUS_BADGE_COLORS, 
  TIER_NAMES, 
  TIER_BADGE_COLORS,
  UPGRADE_STATUS_NAMES 
} from '../types';
import { Clock, CheckCircle, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function StatusBadge({ status, size = 'md', showIcon = true }: StatusBadgeProps) {
  const colors = STATUS_BADGE_COLORS[status] || STATUS_BADGE_COLORS[0];
  const name = STATUS_NAMES[status] || 'Unknown';
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  const iconSize = {
    sm: 10,
    md: 12,
    lg: 14
  };

  const StatusIcon = () => {
    switch (status) {
      case 1: return <Clock size={iconSize[size]} />;
      case 2: return <CheckCircle size={iconSize[size]} />;
      case 3: return <XCircle size={iconSize[size]} />;
      case 4: return <AlertTriangle size={iconSize[size]} />;
      default: return <HelpCircle size={iconSize[size]} />;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
      {showIcon && <StatusIcon />}
      {name}
    </span>
  );
}

interface TierBadgeProps {
  tier: number;
  size?: 'sm' | 'md' | 'lg';
  showLevel?: boolean;
}

export function TierBadge({ tier, size = 'md', showLevel = false }: TierBadgeProps) {
  const colors = TIER_BADGE_COLORS[tier] || TIER_BADGE_COLORS[0];
  const name = TIER_NAMES[tier] || 'Unknown';
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
      {showLevel && <span className="font-bold">T{tier}</span>}
      {name}
    </span>
  );
}

interface UpgradeStatusBadgeProps {
  status: number;
  size?: 'sm' | 'md' | 'lg';
}

export function UpgradeStatusBadge({ status, size = 'md' }: UpgradeStatusBadgeProps) {
  const name = UPGRADE_STATUS_NAMES[status] || 'Unknown';
  
  const colors = {
    0: { bg: 'bg-surface-overlay', text: 'text-ink-muted', border: 'border-border' },
    1: { bg: 'bg-warning/20', text: 'text-warning', border: 'border-warning/30' },
    2: { bg: 'bg-success/20', text: 'text-success', border: 'border-success/30' },
    3: { bg: 'bg-danger/20', text: 'text-danger', border: 'border-danger/30' }
  }[status] || { bg: 'bg-surface-overlay', text: 'text-ink-muted', border: 'border-border' };
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
      {name}
    </span>
  );
}
