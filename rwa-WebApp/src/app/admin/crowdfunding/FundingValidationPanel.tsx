'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  DollarSign,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Coins,
  CreditCard,
  Wallet,
  ArrowRight,
  Clock,
  Target
} from 'lucide-react';

interface OffchainPayment {
  id: string;
  investorAddress: string;
  investorEmail: string;
  amountUsd: number;
  paymentMethod: string;
  paymentIntentId: string;
  status: string;
  createdAt: string;
}

interface ProjectFunding {
  id: string;
  chainId: number;
  projectId: number;
  name: string;
  fundingGoal: number;
  totalRaisedOnChain: number;
  totalOffchainPending: number;
  offchainPayments: OffchainPayment[];
  status: string;
  tokenAddress: string;
  escrowAddress: string;
}

export default function FundingValidationPanel() {
  const { address } = useAccount();
  const [projects, setProjects] = useState<ProjectFunding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<Record<string, unknown> | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/crowdfunding/admin/pending-funding');
      
      if (!response.ok) {
        throw new Error('Failed to load projects');
      }

      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleValidateFunding = async (project: ProjectFunding) => {
    if (!address) return;

    setValidatingId(project.id);
    setError(null);
    setValidationResult(null);

    try {
      const response = await fetch('/api/crowdfunding/admin/validate-funding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId: project.chainId,
          projectId: project.projectId,
          adminAddress: address.toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Validation failed');
      }

      setValidationResult(data);
      
      // Refresh the list after successful validation
      setTimeout(() => {
        loadProjects();
        setValidationResult(null);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setValidatingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Funding Validation</h2>
          <p className="text-gray-400">Validate completed fundraises and distribute tokens</p>
        </div>
        
        <button
          onClick={loadProjects}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-400 mb-2">
                Funding Validated Successfully!
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Total Raised</p>
                  <p className="text-white font-medium">
                    {formatCurrency((validationResult.summary as Record<string, number>)?.totalRaised || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Platform Fee</p>
                  <p className="text-white font-medium">
                    {formatCurrency((validationResult.summary as Record<string, number>)?.platformFee || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Tokens Minted</p>
                  <p className="text-white font-medium">
                    {((validationResult.summary as Record<string, number>)?.tokensMinted || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Off-chain Converted</p>
                  <p className="text-white font-medium">
                    {formatCurrency((validationResult.summary as Record<string, number>)?.offchainConverted || 0)}
                  </p>
                </div>
              </div>
              {(validationResult.txHashes as Record<string, string>)?.injection && (
                <p className="text-gray-500 text-sm mt-3">
                  Injection TX: <span className="font-mono text-gray-400">
                    {(validationResult.txHashes as Record<string, string>).injection.slice(0, 20)}...
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Projects List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/50 border border-gray-700 rounded-xl">
          <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No projects pending funding validation</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const totalRaised = project.totalRaisedOnChain + project.totalOffchainPending;
            const progress = (totalRaised / project.fundingGoal) * 100;
            const isExpanded = expandedId === project.id;

            return (
              <div
                key={project.id}
                className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden"
              >
                {/* Project Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-800/70 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : project.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                          Ready to Validate
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>Chain ID: {project.chainId}</span>
                        <span>Project #{project.projectId}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{formatCurrency(totalRaised)}</p>
                      <p className="text-sm text-gray-500">
                        of {formatCurrency(project.fundingGoal)} goal ({progress.toFixed(1)}%)
                      </p>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-700 p-4 space-y-4">
                    {/* Funding Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Wallet className="w-5 h-5 text-blue-400" />
                          <span className="text-gray-400 text-sm">On-Chain (Crypto)</span>
                        </div>
                        <p className="text-xl font-bold text-white">
                          {formatCurrency(project.totalRaisedOnChain)}
                        </p>
                      </div>

                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <CreditCard className="w-5 h-5 text-purple-400" />
                          <span className="text-gray-400 text-sm">Off-Chain (Stripe)</span>
                        </div>
                        <p className="text-xl font-bold text-white">
                          {formatCurrency(project.totalOffchainPending)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {project.offchainPayments.length} payment(s) pending conversion
                        </p>
                      </div>

                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Coins className="w-5 h-5 text-green-400" />
                          <span className="text-gray-400 text-sm">Total Raised</span>
                        </div>
                        <p className="text-xl font-bold text-white">
                          {formatCurrency(totalRaised)}
                        </p>
                      </div>
                    </div>

                    {/* Off-Chain Payments List */}
                    {project.offchainPayments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-3">
                          Pending Off-Chain Payments ({project.offchainPayments.length})
                        </h4>
                        <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-700">
                                <th className="text-left p-3 text-gray-500 font-medium">Investor</th>
                                <th className="text-left p-3 text-gray-500 font-medium">Amount</th>
                                <th className="text-left p-3 text-gray-500 font-medium">Method</th>
                                <th className="text-left p-3 text-gray-500 font-medium">Date</th>
                                <th className="text-left p-3 text-gray-500 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {project.offchainPayments.map((payment) => (
                                <tr key={payment.id} className="border-b border-gray-800">
                                  <td className="p-3">
                                    <div>
                                      <p className="text-white font-mono">
                                        {formatAddress(payment.investorAddress)}
                                      </p>
                                      {payment.investorEmail && (
                                        <p className="text-gray-500 text-xs">{payment.investorEmail}</p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 text-white font-medium">
                                    {formatCurrency(payment.amountUsd)}
                                  </td>
                                  <td className="p-3 text-gray-400">
                                    {payment.paymentMethod}
                                  </td>
                                  <td className="p-3 text-gray-400">
                                    {new Date(payment.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="p-3">
                                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                                      {payment.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Contract Addresses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-900/50 rounded-lg">
                        <p className="text-gray-500 text-xs mb-1">Token Address</p>
                        <p className="text-white font-mono text-sm">
                          {project.tokenAddress || 'Not deployed'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-900/50 rounded-lg">
                        <p className="text-gray-500 text-xs mb-1">Escrow Address</p>
                        <p className="text-white font-mono text-sm">
                          {formatAddress(project.escrowAddress)}
                        </p>
                      </div>
                    </div>

                    {/* Validation Action */}
                    <div className="pt-4 border-t border-gray-700">
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                        <h4 className="text-blue-400 font-medium mb-2">Validation Process</h4>
                        <ol className="text-sm text-gray-400 space-y-1">
                          <li>1. Platform fee ({((project.totalRaisedOnChain > 0 ? 1.5 : 0))}% crypto + 2.9% Stripe) will be collected</li>
                          <li>2. Off-chain payments will be converted to USDC and injected into escrow</li>
                          <li>3. Security tokens will be minted to all investors</li>
                          <li>4. Project will be marked as FUNDED and ready for milestone execution</li>
                        </ol>
                      </div>

                      <button
                        onClick={() => handleValidateFunding(project)}
                        disabled={validatingId === project.id}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed rounded-lg text-white font-medium"
                      >
                        {validatingId === project.id ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Validating Funding...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Validate & Complete Funding
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
