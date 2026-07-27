'use client';

import { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { useRouter } from 'next/navigation';
import {
  Coins, Download, RefreshCw, CheckCircle, Clock, XCircle,
  Filter, ChevronDown, ChevronUp, Users, DollarSign, Send,
  FileText, AlertCircle, Check, X, Loader2, Copy, ExternalLink
} from 'lucide-react';

interface Allocation {
  id: string;
  wallet_address: string;
  tokens_amount: string;
  tokens_usd_value: string;
  type: 'purchase' | 'referral_bonus' | 'platform_bonus';
  status: 'pending' | 'confirmed' | 'distributed' | 'cancelled';
  round_id: string;
  referral_code: string | null;
  distribution_tx_hash: string | null;
  distributed_at: string | null;
  created_at: string;
  fundraising_rounds?: {
    display_name: string;
    round_name: string;
    token_price_usd: number;
  };
}

interface Stats {
  totalAllocations: number;
  totalTokens: number;
  totalValue: number;
  byType: {
    purchase: { count: number; tokens: number };
    referral_bonus: { count: number; tokens: number };
    platform_bonus: { count: number; tokens: number };
  };
  byStatus: {
    pending: { count: number; tokens: number };
    confirmed: { count: number; tokens: number };
    distributed: { count: number; tokens: number };
    cancelled: { count: number; tokens: number };
  };
}

export default function AdminAllocationsPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const router = useRouter();

  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Distribution modal
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [distributeTxHash, setDistributeTxHash] = useState('');
  const [distributeNotes, setDistributeNotes] = useState('');

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, adminLoading, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllocations();
    }
  }, [isAdmin, statusFilter, typeFilter, page]);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        type: typeFilter,
        page: page.toString(),
        limit: '50',
      });

      const res = await fetch(`/api/admin/allocations?${params}`);
      const data = await res.json();

      if (res.ok) {
        setAllocations(data.allocations || []);
        setStats(data.stats || null);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching allocations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === allocations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allocations.map(a => a.id));
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleMarkDistributed = async () => {
    if (selectedIds.length === 0) return;

    setUpdating(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/admin/allocations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocationIds: selectedIds,
          status: 'distributed',
          distributionTxHash: distributeTxHash || null,
          notes: distributeNotes || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(`${data.updated} allocations marked as distributed`);
        setSelectedIds([]);
        setShowDistributeModal(false);
        setDistributeTxHash('');
        setDistributeNotes('');
        fetchAllocations();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to update allocations');
      }
    } catch (error) {
      setErrorMessage('Failed to update allocations');
    } finally {
      setUpdating(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json' | 'airdrop') => {
    const params = new URLSearchParams({
      status: statusFilter === 'all' ? 'confirmed' : statusFilter,
      format,
    });

    const url = `/api/admin/allocations/export?${params}`;

    if (format === 'csv') {
      window.open(url, '_blank');
    } else {
      try {
        const res = await fetch(url);
        const data = await res.json();
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `allocations_${format}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(downloadUrl);
      } catch (error) {
        setErrorMessage('Failed to export allocations');
      }
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatNumber = (num: number) => num.toLocaleString();
  const formatCurrency = (num: number) => `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock },
      confirmed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
      distributed: { bg: 'bg-gold-500/20', text: 'text-gold-400', icon: Send },
      cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle },
    };
    const style = styles[status] || styles.pending;
    const Icon = style.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      purchase: 'bg-gold-500/20 text-gold-400',
      referral_bonus: 'bg-green-500/20 text-green-400',
      platform_bonus: 'bg-gold-500/20 text-gold-400',
    };
    const labels: Record<string, string> = {
      purchase: 'Purchase',
      referral_bonus: 'Referral',
      platform_bonus: 'Platform',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[type] || ''}`}>
        {labels[type] || type}
      </span>
    );
  };

  if (adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-surface-sunken flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-sunken text-ink p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Token Allocations</h1>
            <p className="text-ink-muted mt-1">Manage and distribute token allocations</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchAllocations()}
              className="px-4 py-2 bg-surface hover:bg-surface-overlay rounded-lg flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {errorMessage}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-500/20 rounded-lg">
                  <Coins className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <p className="text-ink-muted text-sm">Total Tokens</p>
                  <p className="text-xl font-bold">{formatNumber(stats.totalTokens)}</p>
                </div>
              </div>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-ink-muted text-sm">Total Value</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.totalValue)}</p>
                </div>
              </div>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <p className="text-ink-muted text-sm">Confirmed</p>
                  <p className="text-xl font-bold">{formatNumber(stats.byStatus.confirmed.tokens)}</p>
                </div>
              </div>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-ink-muted text-sm">Pending</p>
                  <p className="text-xl font-bold">{formatNumber(stats.byStatus.pending.tokens)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-surface rounded-xl p-4 border border-border">
          <div className="flex flex-wrap gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-surface-sunken border border-border rounded-lg text-sm focus:outline-none focus:border-gold-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="distributed">Distributed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-surface-sunken border border-border rounded-lg text-sm focus:outline-none focus:border-gold-500"
            >
              <option value="all">All Types</option>
              <option value="purchase">Purchase</option>
              <option value="referral_bonus">Referral Bonus</option>
              <option value="platform_bonus">Platform Bonus</option>
            </select>
          </div>

          <div className="flex gap-2">
            {/* Export Buttons */}
            <div className="relative group">
              <button className="px-4 py-2 bg-surface-overlay hover:bg-border-strong rounded-lg flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-xl hidden group-hover:block z-10">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-2 text-left hover:bg-surface-overlay rounded-t-lg text-sm"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full px-4 py-2 text-left hover:bg-surface-overlay text-sm"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => handleExport('airdrop')}
                  className="w-full px-4 py-2 text-left hover:bg-surface-overlay rounded-b-lg text-sm"
                >
                  Airdrop Format
                </button>
              </div>
            </div>

            {/* Mark Distributed */}
            {selectedIds.length > 0 && (
              <button
                onClick={() => setShowDistributeModal(true)}
                className="px-4 py-2 bg-gold-600 hover:bg-gold-500 rounded-lg flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Mark Distributed ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Allocations Table */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-ink-faint" />
            </div>
          ) : allocations.length === 0 ? (
            <div className="p-12 text-center text-ink-faint">
              <Coins className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No allocations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-sunken/50">
                  <tr className="text-left text-xs text-ink-muted uppercase">
                    <th className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === allocations.length}
                        onChange={handleSelectAll}
                        className="rounded bg-surface-overlay border-border-strong"
                      />
                    </th>
                    <th className="p-4">Wallet</th>
                    <th className="p-4">Round</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Tokens</th>
                    <th className="p-4">Value</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">TX</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allocations.map((alloc) => (
                    <tr key={alloc.id} className="hover:bg-gray-750">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(alloc.id)}
                          onChange={() => handleSelect(alloc.id)}
                          className="rounded bg-surface-overlay border-border-strong"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{formatAddress(alloc.wallet_address)}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(alloc.wallet_address)}
                            className="p-1 hover:bg-surface-overlay rounded"
                          >
                            <Copy className="w-3 h-3 text-ink-faint" />
                          </button>
                        </div>
                        {alloc.referral_code && (
                          <div className="text-xs text-ink-faint mt-1">
                            Ref: {alloc.referral_code}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-sm">
                        {alloc.fundraising_rounds?.display_name || '-'}
                      </td>
                      <td className="p-4">{getTypeBadge(alloc.type)}</td>
                      <td className="p-4 font-medium">
                        {formatNumber(parseFloat(alloc.tokens_amount))} RWA
                      </td>
                      <td className="p-4 text-sm text-ink-muted">
                        {formatCurrency(parseFloat(alloc.tokens_usd_value || '0'))}
                      </td>
                      <td className="p-4">{getStatusBadge(alloc.status)}</td>
                      <td className="p-4 text-sm text-ink-muted">
                        {new Date(alloc.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        {alloc.distribution_tx_hash ? (
                          <a
                            href={`https://snowtrace.io/tx/${alloc.distribution_tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gold-400 hover:text-gold-300 flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-ink-faint">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-ink-muted">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-surface-overlay hover:bg-border-strong disabled:opacity-50 disabled:cursor-not-allowed rounded"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-surface-overlay hover:bg-border-strong disabled:opacity-50 disabled:cursor-not-allowed rounded"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Distribution Modal */}
        {showDistributeModal && (
          <div className="fixed inset-0 bg-surface-sunken/70 flex items-center justify-center z-50 p-4">
            <div className="bg-surface-sunken rounded-xl border border-border w-full max-w-md">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-bold">Mark as Distributed</h2>
                <p className="text-ink-muted text-sm mt-1">
                  Mark {selectedIds.length} allocation(s) as distributed
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-ink-muted mb-1">
                    Distribution TX Hash (optional)
                  </label>
                  <input
                    type="text"
                    value={distributeTxHash}
                    onChange={(e) => setDistributeTxHash(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:border-gold-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-ink-muted mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={distributeNotes}
                    onChange={(e) => setDistributeNotes(e.target.value)}
                    placeholder="Distribution batch #1, etc."
                    rows={2}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:border-gold-500 text-sm"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-border flex justify-end gap-3">
                <button
                  onClick={() => setShowDistributeModal(false)}
                  className="px-4 py-2 bg-surface-overlay hover:bg-border-strong rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkDistributed}
                  disabled={updating}
                  className="px-4 py-2 bg-gold-600 hover:bg-gold-500 disabled:bg-border-strong rounded-lg flex items-center gap-2"
                >
                  {updating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Mark Distributed</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
