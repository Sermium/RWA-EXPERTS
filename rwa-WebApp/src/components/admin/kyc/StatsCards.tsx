// src/app/admin/kyc/components/StatsCards.tsx
'use client';

import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Shield,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import { formatNativeCurrency } from '../utils';
import { KYCSettings, PendingSubmission, PendingUpgrade } from '../types';

interface StatsCardsProps {
  pendingSubmissions: PendingSubmission[];
  pendingUpgrades: PendingUpgrade[];
  settings: KYCSettings | null;
  currencySymbol: string;
}

export function StatsCards({ 
  pendingSubmissions, 
  pendingUpgrades, 
  settings,
  currencySymbol 
}: StatsCardsProps) {
  const stats = [
    {
      label: 'Pending Submissions',
      value: pendingSubmissions.length,
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/20',
      border: 'border-warning/30'
    },
    {
      label: 'Pending Upgrades',
      value: pendingUpgrades.length,
      icon: TrendingUp,
      color: 'text-gold-400',
      bg: 'bg-gold-500/20',
      border: 'border-gold-500/30'
    },
    {
      label: 'KYC Fee',
      value: settings ? formatNativeCurrency(settings.kycFee, currencySymbol) : '-',
      icon: DollarSign,
      color: 'text-success',
      bg: 'bg-success/20',
      border: 'border-success/30'
    },
    {
      label: 'Contract Status',
      value: settings?.isPaused ? 'Paused' : 'Active',
      icon: settings?.isPaused ? AlertTriangle : Shield,
      color: settings?.isPaused ? 'text-danger' : 'text-success',
      bg: settings?.isPaused ? 'bg-danger/20' : 'bg-success/20',
      border: settings?.isPaused ? 'border-danger/30' : 'border-success/30'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`${stat.bg} ${stat.border} border rounded-xl p-4`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-muted">{stat.label}</span>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
          <p className={`text-2xl font-bold ${stat.color}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
