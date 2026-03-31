'use client';

import { useState, useEffect } from 'react';
import { 
  Rocket, Lock, CheckCircle, TrendingUp, Users, DollarSign, 
  Edit, Eye, Check, X, RefreshCw, Clock, AlertCircle,
  ChevronDown, ChevronUp, Wallet, Mail, Calendar, Save,
  Plus, Trash2, GripVertical
} from 'lucide-react';

interface Round {
  id: string;
  round_name: string;
  display_name: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  token_allocation_percent: number;
  token_allocation_amount: number;
  token_price_usd: number;
  target_amount_usd: number;
  raised_amount_usd: number;
  tokens_sold: number;
  min_investment_usd: number;
  max_investment_usd: number;
  vesting_months: number;
  investor_count: number;
  deliverables: string[];
  timeline: string;
  start_date: string | null;
  end_date: string | null;
}

interface Investment {
  id: string;
  round_id: string;
  wallet_address: string;
  investor_email: string;
  investor_name: string;
  investment_amount_usd: number;
  token_amount: number;
  payment_status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  payment_tx_hash: string;
  kyc_verified: boolean;
  invested_at: string;
  confirmed_at: string;
  fundraising_rounds?: { display_name: string };
}

interface EditModalProps {
  round: Round;
  onClose: () => void;
  onSave: (updates: Partial<Round>) => Promise<void>;
}

function EditRoundModal({ round, onClose, onSave }: EditModalProps) {
  // Parse deliverables - handle both array and JSON string
  const parseDeliverables = (d: any): string[] => {
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (typeof d === 'string') { try { return JSON.parse(d);} catch { return [];}}
    return [];
  };

  const [form, setForm] = useState({
    display_name: round.display_name,
    token_price_usd: round.token_price_usd,
    min_investment_usd: round.min_investment_usd,
    max_investment_usd: round.max_investment_usd,
    target_amount_usd: round.target_amount_usd,
    token_allocation_percent: round.token_allocation_percent,
    vesting_months: round.vesting_months,
    timeline: round.timeline || '',
    deliverables: parseDeliverables(round.deliverables),
  });

  const [newDeliverable, setNewDeliverable] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addDeliverable = () => {
    if (newDeliverable.trim()) {
      setForm(f => ({ ...f, deliverables: [...f.deliverables, newDeliverable.trim()] }));
      setNewDeliverable('');
    }
  };

  const removeDeliverable = (index: number) => {
    setForm(f => ({ ...f, deliverables: f.deliverables.filter((_, i) => i !== index) }));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold">Edit Round: {round.display_name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Display Name</label>
              <input
                type="text"
                value={form.display_name}
                onChange={(e) => setForm(f => ({ ...f, display_name: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Timeline</label>
              <input
                type="text"
                value={form.timeline}
                onChange={(e) => setForm(f => ({ ...f, timeline: e.target.value }))}
                placeholder="e.g., Q1-Q2 2026"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Pricing & Limits</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Token Price (USD)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={form.token_price_usd}
                  onChange={(e) => setForm(f => ({ ...f, token_price_usd: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Min Investment (USD)</label>
                <input
                  type="number"
                  value={form.min_investment_usd}
                  onChange={(e) => setForm(f => ({ ...f, min_investment_usd: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Investment (USD)</label>
                <input
                  type="number"
                  value={form.max_investment_usd}
                  onChange={(e) => setForm(f => ({ ...f, max_investment_usd: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Allocation */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Target Raise (USD)</label>
              <input
                type="number"
                value={form.target_amount_usd}
                onChange={(e) => setForm(f => ({ ...f, target_amount_usd: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Token Allocation (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.token_allocation_percent}
                onChange={(e) => setForm(f => ({ ...f, token_allocation_percent: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Vesting (months)</label>
              <input
                type="number"
                value={form.vesting_months}
                onChange={(e) => setForm(f => ({ ...f, vesting_months: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Deliverables */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Deliverables & Milestones</h3>
            <div className="space-y-2 mb-3">
              {form.deliverables.map((d, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                  <GripVertical className="w-4 h-4 text-gray-600" />
                  <span className="flex-1 text-sm">{d}</span>
                  <button
                    type="button"
                    onClick={() => removeDeliverable(i)}
                    className="p-1 hover:bg-red-500/20 rounded text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDeliverable}
                onChange={(e) => setNewDeliverable(e.target.value)}
                placeholder="Add new deliverable..."
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDeliverable())}
              />
              <button
                type="button"
                onClick={addDeliverable}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg flex items-center gap-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FundraisingManagement() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rounds' | 'investments'>('rounds');
  const [expandedRound, setExpandedRound] = useState<string | null>(null);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [roundsRes, investmentsRes] = await Promise.all([
        fetch('/api/fundraising/rounds'),
        fetch('/api/admin/fundraising/investments')
      ]);
      
      const roundsData = await roundsRes.json();
      const investmentsData = await investmentsRes.json();
      
      setRounds(roundsData.rounds || []);
      setInvestments(investmentsData.investments || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRoundStatus = async (roundId: string, newStatus: string) => {
    setUpdating(roundId);
    try {
      const res = await fetch('/api/admin/fundraising/rounds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId, status: newStatus })
      });
      
      if (res.ok) {
        setSuccessMessage(`Round ${newStatus === 'active' ? 'activated' : 'updated'} successfully`);
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update round');
      }
    } catch (error) {
      console.error('Update error:', error);
    } finally {
      setUpdating(null);
    }
  };

  const saveRoundEdits = async (updates: Partial<Round>) => {
    if (!editingRound) return;
    
    const res = await fetch('/api/admin/fundraising/rounds', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundId: editingRound.id, ...updates })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to save');
    }
    
    setSuccessMessage('Round updated successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
    fetchData();
  };

  const confirmInvestment = async (investmentId: string, confirm: boolean) => {
    setUpdating(investmentId);
    try {
      const res = await fetch('/api/fundraising/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          investmentId, 
          status: confirm ? 'confirmed' : 'failed' 
        })
      });
      
      if (res.ok) {
        setSuccessMessage(`Investment ${confirm ? 'confirmed' : 'rejected'}`);
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchData();
      }
    } catch (error) {
      console.error('Confirm error:', error);
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: any }> = {
      active: { bg: 'bg-green-500/20', text: 'text-green-400', icon: Rocket },
      upcoming: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: Lock },
      completed: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: CheckCircle },
      cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', icon: X },
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock },
      confirmed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: Check },
      failed: { bg: 'bg-red-500/20', text: 'text-red-400', icon: X },
      refunded: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: RefreshCw }
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status.toUpperCase()}
      </span>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  const totalRaised = rounds.reduce((sum, r) => sum + parseFloat(String(r.raised_amount_usd || 0)), 0);
  const totalTarget = rounds.reduce((sum, r) => sum + parseFloat(String(r.target_amount_usd)), 0);
  const totalInvestors = rounds.reduce((sum, r) => sum + (r.investor_count || 0), 0);
  const pendingInvestments = investments.filter(i => i.payment_status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Raised</p>
              <p className="text-xl font-bold">{formatCurrency(totalRaised)}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Target</p>
              <p className="text-xl font-bold">{formatCurrency(totalTarget)}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Investors</p>
              <p className="text-xl font-bold">{totalInvestors}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Pending</p>
              <p className="text-xl font-bold">{pendingInvestments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab('rounds')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === 'rounds' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Rounds ({rounds.length})
        </button>
        <button
          onClick={() => setActiveTab('investments')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'investments' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Investments ({investments.length})
          {pendingInvestments > 0 && (
            <span className="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full">{pendingInvestments}</span>
          )}
        </button>
      </div>

      {/* Rounds Tab */}
      {activeTab === 'rounds' && (
        <div className="space-y-4">
          {rounds.map((round) => (
            <div key={round.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-750"
                onClick={() => setExpandedRound(expandedRound === round.id ? null : round.id)}
              >
                <div className="flex items-center gap-4">
                  {getStatusBadge(round.status)}
                  <div>
                    <h3 className="font-bold text-lg">{round.display_name}</h3>
                    <p className="text-gray-400 text-sm">
                      {formatCurrency(parseFloat(String(round.raised_amount_usd || 0)))} / {formatCurrency(parseFloat(String(round.target_amount_usd)))}
                      {' • '}{round.investor_count || 0} investors
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingRound(round); }}
                    className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                    title="Edit Round"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <div className="text-right mr-4">
                    <p className="font-mono text-sm">${parseFloat(String(round.token_price_usd)).toFixed(6)}</p>
                    <p className="text-gray-500 text-xs">{round.token_allocation_percent}% allocation</p>
                  </div>
                  {expandedRound === round.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>

              {expandedRound === round.id && (
                <div className="border-t border-gray-700 p-4 bg-gray-850">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-300">Round Details</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-gray-500">Token Price:</span>
                        <span className="font-mono">${parseFloat(String(round.token_price_usd)).toFixed(6)}</span>
                        <span className="text-gray-500">Allocation:</span>
                        <span>{(round.token_allocation_amount / 1e6).toFixed(0)}M RWA ({round.token_allocation_percent}%)</span>
                        <span className="text-gray-500">Min Investment:</span>
                        <span>{formatCurrency(round.min_investment_usd)}</span>
                        <span className="text-gray-500">Max Investment:</span>
                        <span>{formatCurrency(round.max_investment_usd)}</span>
                        <span className="text-gray-500">Vesting:</span>
                        <span>{round.vesting_months} months</span>
                        <span className="text-gray-500">Timeline:</span>
                        <span>{round.timeline || 'Not set'}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-300">Status Actions</h4>
                      <div className="flex flex-wrap gap-2">
                        {round.status === 'upcoming' && (
                          <button
                            onClick={() => updateRoundStatus(round.id, 'active')}
                            disabled={updating === round.id}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg text-sm font-medium flex items-center gap-2"
                          >
                            {updating === round.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                            Activate Round
                          </button>
                        )}
                        {round.status === 'active' && (
                          <>
                            <button
                              onClick={() => updateRoundStatus(round.id, 'completed')}
                              disabled={updating === round.id}
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-sm font-medium flex items-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" /> Complete Round
                            </button>
                            <button
                              onClick={() => updateRoundStatus(round.id, 'cancelled')}
                              disabled={updating === round.id}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg text-sm font-medium flex items-center gap-2"
                            >
                              <X className="w-4 h-4" /> Cancel
                            </button>
                          </>
                        )}
                        {(round.status === 'completed' || round.status === 'cancelled') && (
                          <button
                            onClick={() => updateRoundStatus(round.id, 'upcoming')}
                            disabled={updating === round.id}
                            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 rounded-lg text-sm font-medium flex items-center gap-2"
                          >
                            <RefreshCw className="w-4 h-4" /> Reset to Upcoming
                          </button>
                        )}
                      </div>
                      <div className="mt-4">
                        <h5 className="text-sm text-gray-400 mb-2">Deliverables</h5>
                        {(() => {
                          // Parse deliverables from JSONB
                          let deliverables: string[] = [];
                          if (round.deliverables) {
                            if (Array.isArray(round.deliverables)) {
                              deliverables = round.deliverables;
                            } else if (typeof round.deliverables === 'string') {
                              try {
                                deliverables = JSON.parse(round.deliverables);
                              } catch {}
                            }
                          }
                          
                          return deliverables.length > 0 ? (
                            <ul className="text-sm space-y-1">
                              {deliverables.map((d, i) => (
                                <li key={i} className="text-gray-300 flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  {d}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-500 text-sm italic">No deliverables set. Click Edit to add.</p>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Investments Tab */}
      {activeTab === 'investments' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2">
            {['all', 'pending', 'confirmed', 'failed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Investments List */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-750">
                  <tr className="text-left text-gray-400 text-sm">
                    <th className="p-4">Investor</th>
                    <th className="p-4">Round</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Tokens</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {investments
                    .filter(i => statusFilter === 'all' || i.payment_status === statusFilter)
                    .map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-750">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-gray-500" />
                            <div>
                              <p className="font-mono text-sm">{inv.wallet_address.slice(0, 6)}...{inv.wallet_address.slice(-4)}</p>
                              {inv.investor_email && (
                                <p className="text-gray-500 text-xs flex items-center gap-1">
                                  <Mail className="w-3 h-3" /> {inv.investor_email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm">{inv.fundraising_rounds?.display_name || '-'}</td>
                        <td className="p-4 font-medium">{formatCurrency(inv.investment_amount_usd)}</td>
                        <td className="p-4 text-sm font-mono">{inv.token_amount?.toLocaleString() || 0} RWA</td>
                        <td className="p-4">{getStatusBadge(inv.payment_status)}</td>
                        <td className="p-4 text-sm text-gray-400">{formatDate(inv.invested_at)}</td>
                        <td className="p-4">
                          {inv.payment_status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => confirmInvestment(inv.id, true)}
                                disabled={updating === inv.id}
                                className="p-2 bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                                title="Confirm"
                              >
                                {updating === inv.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => confirmInvestment(inv.id, false)}
                                disabled={updating === inv.id}
                                className="p-2 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          {inv.payment_tx_hash && (
                            <a 
                              href={`https://snowtrace.io/tx/${inv.payment_tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline text-sm"
                            >
                              View TX
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  {investments.filter(i => statusFilter === 'all' || i.payment_status === statusFilter).length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        No investments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRound && (
        <EditRoundModal
          round={editingRound}
          onClose={() => setEditingRound(null)}
          onSave={saveRoundEdits}
        />
      )}
    </div>
  );
}
