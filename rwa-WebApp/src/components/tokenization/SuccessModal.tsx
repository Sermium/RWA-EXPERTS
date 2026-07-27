'use client';

import React from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface SuccessModalProps {
  onClose: () => void;
}

export function SuccessModal({ onClose }: SuccessModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>

        <h2 className="text-2xl font-display font-bold text-ink mb-2">Application Submitted!</h2>
        <p className="text-ink-muted mb-6">
          Your tokenization application has been received. Our team will review it 
          and get back to you within 2-3 business days.
        </p>

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-3 bg-gold-500 hover:bg-gold-600 text-white font-medium rounded-xl transition-colors"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          
          <button
            onClick={onClose}
            className="w-full py-3 bg-surface-raised hover:bg-surface-overlay text-ink-muted font-medium rounded-xl transition-colors"
          >
            Submit Another Application
          </button>
        </div>
      </div>
    </div>
  );
}
