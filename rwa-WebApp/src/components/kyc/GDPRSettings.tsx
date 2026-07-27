// src/components/kyc/GDPRSettings.tsx

'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Download, Trash2, Loader2, AlertTriangle } from 'lucide-react';

export function GDPRSettings() {
    const { address } = useAccount();
    
    const [exporting, setExporting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [earliestDeletion, setEarliestDeletion] = useState<string | null>(null);

    const handleExport = async () => {
        if (!address) return;
        
        setExporting(true);
        
        try {
            const response = await fetch(`/api/kyc/gdpr/export?address=${address}`);
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Download as JSON file
                const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `rwa-launchpad-data-export-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Export error:', error);
        } finally {
            setExporting(false);
        }
    };

    const handleDelete = async () => {
        if (!address) return;
        
        setDeleting(true);
        setDeleteError(null);
        
        try {
            const response = await fetch('/api/kyc/gdpr/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address }),
            });
            
            const result = await response.json();

            if (result.success) {
                setShowDeleteConfirm(false);
                window.location.reload();
            } else {
                setDeleteError(result.error || 'Failed to delete data');
                if (result.earliestDeletion) {
                    setEarliestDeletion(result.earliestDeletion);
                }
            }
        } catch (error) {
            console.error('Delete error:', error);
            setDeleteError('Network error. Please try again.');
        } finally {
            setDeleting(false);
        }
    };

    if (!address) {
        return (
            <div className="bg-surface rounded-xl shadow-panel p-6">
                <h2 className="text-xl font-bold text-ink mb-2">Data Privacy (GDPR)</h2>
                <p className="text-ink-muted">Connect your wallet to manage your data.</p>
            </div>
        );
    }

    return (
        <div className="bg-surface rounded-xl shadow-panel p-6">
            <h2 className="text-xl font-bold text-ink mb-2">Data Privacy (GDPR)</h2>
            <p className="text-ink-muted mb-6">
                Manage your personal data in accordance with GDPR regulations.
            </p>

            <div className="space-y-4">
                {/* Export Data */}
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                        <h3 className="font-medium text-ink">Export My Data</h3>
                        <p className="text-sm text-ink-faint">
                            Download a copy of all your personal data (Article 15 & 20)
                        </p>
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 bg-gold-600 text-ink rounded-lg hover:bg-gold-700 disabled:opacity-50"
                    >
                        {exporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Export
                    </button>
                </div>

                {/* Delete Data */}
                <div className="flex items-center justify-between p-4 border border-danger/30 rounded-lg bg-danger-muted">
                    <div>
                        <h3 className="font-medium text-danger">Delete My Data</h3>
                        <p className="text-sm text-danger/90">
                            Permanently delete your personal data (Article 17)
                        </p>
                    </div>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-ink rounded-lg hover:bg-red-700"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-surface-sunken/50 flex items-center justify-center z-50">
                    <div className="bg-surface rounded-xl shadow-panel max-w-md w-full mx-4 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-danger/20 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-danger" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-ink">Delete All Data?</h3>
                                <p className="text-sm text-ink-faint">This action cannot be undone</p>
                            </div>
                        </div>

                        <div className="bg-warning-muted border border-warning/30 rounded-lg p-3 mb-4">
                            <p className="text-sm text-warning">
                                <strong>Note:</strong> Due to legal requirements (AML/CFT), data may be retained for up to 5 years after your last activity. Minimal audit records are kept for compliance.
                            </p>
                        </div>

                        {deleteError && (
                            <div className="bg-danger-muted border border-danger/30 rounded-lg p-3 mb-4">
                                <p className="text-sm text-danger">{deleteError}</p>
                                {earliestDeletion && (
                                    <p className="text-sm text-danger/90 mt-1">
                                        Earliest deletion date: {new Date(earliestDeletion).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteError(null);
                                }}
                                className="flex-1 px-4 py-2 border border-border rounded-lg text-ink-muted hover:bg-surface-raised"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-2 bg-red-600 text-ink rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Yes, Delete Everything
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
