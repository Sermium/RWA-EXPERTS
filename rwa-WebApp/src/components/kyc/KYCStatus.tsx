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
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
        );
    }

    if (tier === 'None' && status === 'None') {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">KYC Required</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
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
        green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', text: 'text-green-800' },
        yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', text: 'text-yellow-800' },
        blue: { bg: 'bg-gold-50', border: 'border-gold-200', icon: 'text-gold-600', text: 'text-gold-800' },
        red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', text: 'text-red-800' },
        orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', text: 'text-orange-800' },
        gray: { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'text-gray-600', text: 'text-gray-800' },
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
                    <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1">
                        <tierInfo.icon className="w-4 h-4" /> {tier}
                    </span>
                )}
            </div>
            
            {kycData.expiresAt && (
                <p className="text-sm text-gray-600 mt-2">
                    {kycData.isExpired ? 'Expired' : 'Expires'}: {' '}
                    {new Date(kycData.expiresAt).toLocaleDateString()}
                </p>
            )}
            
            {isVerified && (
                <p className="text-xs text-gray-500 mt-1">
                    Limit: {tierInfo.formattedLimit}
                </p>
            )}
        </div>
    );
}
