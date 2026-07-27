'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface-sunken flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl p-8 max-w-md w-full text-center border border-border">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-danger" />
        <h2 className="text-2xl font-bold text-ink mb-2">Something went wrong!</h2>
        <p className="text-ink-muted mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="bg-gold-600 hover:bg-gold-700 text-ink px-6 py-3 rounded-xl font-medium transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
