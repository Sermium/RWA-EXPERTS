// src/app/admin/kyc/components/ResultMessage.tsx
'use client';

import { CheckCircle, XCircle, Info, AlertTriangle, X, ExternalLink } from 'lucide-react';
import { ResultMessage as ResultMessageType } from '../types';

interface ResultMessageProps {
  result: ResultMessageType;
  explorerUrl: string;
  onClose: () => void;
}

export function ResultMessage({ result, explorerUrl, onClose }: ResultMessageProps) {
  const config = {
    success: {
      bg: 'bg-success/20',
      border: 'border-success/30',
      text: 'text-success',
      icon: CheckCircle
    },
    error: {
      bg: 'bg-danger/20',
      border: 'border-danger/30',
      text: 'text-danger',
      icon: XCircle
    },
    info: {
      bg: 'bg-gold-500/20',
      border: 'border-gold-500/30',
      text: 'text-gold-400',
      icon: Info
    },
    warning: {
      bg: 'bg-warning/20',
      border: 'border-warning/30',
      text: 'text-warning',
      icon: AlertTriangle
    }
  }[result.type];

  const Icon = config.icon;

  return (
    <div className={`${config.bg} ${config.border} border rounded-xl p-4 mb-6`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 ${config.text} mt-0.5 flex-shrink-0`} />
          <div>
            <p className={config.text}>{result.message}</p>
            {result.txHash && (
              <a
                href={`${explorerUrl}/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-gold-400 hover:text-gold-300 mt-2"
              >
                View Transaction
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-ink-muted hover:text-ink transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
