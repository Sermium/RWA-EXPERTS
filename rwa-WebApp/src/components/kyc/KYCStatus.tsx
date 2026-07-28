// src/components/kyc/KYCStatus.tsx

'use client';

import { useKYC } from '@/contexts/KYCContext';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

export function KYCStatus() {
    const { 
        tier, 
        status, 
        isVerified, 
        isLoading, 
        kycData,
        tierInfo 
    } = useKYC();

    if (isLoading) {
        return (
            <div className="animate-pulse bg-gray-100 rounded-lg p-4">
                <div className="h-4 bg-border-strong rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-border-strong rounded w-1/3"></div>
            </div>
        );
    }

    if (tier === 'None' && status === 'None') {
        return (
            <div className="bg-warning border border-warning rounded-lg p-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    <span className="font-medium text-warning">KYC Required</span>
                </div>
                <p className="text-sm text-warning mt-1">
                    Complete identity verification to invest
                </p>
            </div>
        );
    }

    const statusConfig = {
        Approved: { icon: CheckCircle, color: 'green', label: 'Verified' },
        Pending: { icon: Clock, color: 'yellow', label: 'Pending' },
        ManualReview: { icon: Clock, color: 'blue', label: 'Under Review' },
        AutoVerifying: { icon: Clock, color: 'blue', label: 'Verifying' },
        Rejected: { icon: XCircle, color: 'red', label: 'Rejected' },
        Expired: { icon: AlertTriangle, color: 'orange', label: 'Expired' },
        None: { icon: AlertTriangle, color: 'gray', label: 'Not Started' }
    };

    const displayStatus = kycData.isExpired ? 'Expired' : status;
    const config = statusConfig[displayStatus as keyof typeof statusConfig] || statusConfig.Pending;
    const Icon = config.icon;

    // Use explicit Tailwind classes (dynamic classes don't work with Tailwind)
    const colorClasses = {
        green: { bg: 'bg-success', border: 'border-success', icon: 'text-success', text: 'text-success' },
        yellow: { bg: 'bg-warning', border: 'border-warning', icon: 'text-warning', text: 'text-warning' },
        blue: { bg: 'bg-gold-50', border: 'border-gold-200', icon: 'text-gold-600', text: 'text-gold-800' },
        red: { bg: 'bg-danger', border: 'border-danger', icon: 'text-danger', text: 'text-danger' },
        orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', text: 'text-orange-800' },
        gray: { bg: 'bg-surface-overlay', border: 'border-border-strong', icon: 'text-ink-faint', text: 'text-surface' },
    };
    
    const colors = colorClasses[config.color as keyof typeof colorClasses] || colorClasses.gray;

    return (
        <div className={`${colors.bg} border ${colors.border} rounded-lg p-4`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${colors.icon}`} />
                    <span className={`font-medium ${colors.text}`}>
                        {config.label}
                    </span>
                </div>
                {isVerified && (
                    <span className="text-sm bg-success text-success px-2 py-1 rounded flex items-center gap-1">
                        <tierInfo.icon className="w-4 h-4" /> {tier}
                    </span>
                )}
            </div>
            
            {kycData.expiresAt && (
                <p className="text-sm text-ink-faint mt-2">
                    {kycData.isExpired ? 'Expired' : 'Expires'}: {' '}
                    {new Date(kycData.expiresAt).toLocaleDateString()}
                </p>
            )}
            
            {isVerified && (
                <p className="text-xs text-ink-faint mt-1">
                    Limit: {tierInfo.formattedLimit}
                </p>
            )}
        </div>
    );
}
