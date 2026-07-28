// src/app/tokenize/application/[id]/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAccount, useChainId } from 'wagmi';
import { useChainConfig } from '@/hooks/useChainConfig';
import { SupportedChainId } from '@/config/chains';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Coins,
  AlertCircle,
  Loader2,
  Building2,
  FileText,
  Lock,
  TrendingUp,
  ExternalLink,
  Calendar,
  DollarSign,
  User,
  Mail,
  Phone,
  Globe,
  Wallet,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; description?: string }> = {
  pending: { 
    label: 'Pending Review', 
    color: 'bg-warning/20 text-warning border-warning/30', 
    icon: <Clock className="w-4 h-4" />,
    description: 'Your application is being reviewed by our team. Payment has been received.'
  },
  approved: { 
    label: 'Ready to Deploy', 
    color: 'bg-success/20 text-success border-success/30', 
    icon: <CheckCircle2 className="w-4 h-4" />,
    description: 'Your application is approved! You can now deploy your token.'
  },
  rejected: { 
    label: 'Rejected', 
    color: 'bg-danger/20 text-danger border-danger/30', 
    icon: <AlertCircle className="w-4 h-4" />,
    description: 'Your application was not approved. Please review the feedback and resubmit.'
  },
  completed: { 
    label: 'Deployed', 
    color: 'bg-gold-500/20 text-gold-400 border-gold-500/30', 
    icon: <CheckCircle2 className="w-4 h-4" />,
    description: 'Your token has been successfully deployed.'
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-ink-faint/20 text-ink-muted border-ink-faint/30', 
    icon: <AlertCircle className="w-4 h-4" />,
    description: 'This application has been cancelled.'
  },
};

interface Application {
  id: string;
  asset_name: string;
  asset_type: string;
  asset_description: string;
  estimated_value: number;
  fee_amount: number;
  fee_currency: string;
  status: string;
  needs_escrow: boolean;
  needs_dividends: boolean;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  token_name: string;
  token_symbol: string;
  total_supply: string;
  user_address: string;
  created_at: string;
  updated_at: string;
  documents: any;
  token_address?: string;
  nft_address?: string;
  escrow_address?: string;
  deployment_tx_hash?: string;
  chain_id?: number;
  rejection_reason?: string;
}

// Explorer name mapping for different chains
const EXPLORER_NAMES: Record<number, string> = {
  43113: 'SnowTrace',
  43114: 'SnowTrace',
  137: 'PolygonScan',
  80002: 'PolygonScan',
  1: 'Etherscan',
  11155111: 'Etherscan',
  42161: 'Arbiscan',
  8453: 'BaseScan',
  10: 'Optimism Explorer',
  56: 'BscScan',
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();
  const applicationId = params.id as string;

  // Check if coming from dashboard
  const fromDashboard = searchParams.get('from') === 'dashboard';
  const backUrl = fromDashboard ? '/dashboard' : '/tokenize';
  const backLabel = fromDashboard ? 'Back to Dashboard' : 'Back to Applications';

  // Chain config for multichain support
  const {
    chainId,
    chainName,
    explorerUrl,
    isDeployed,
    isTestnet,
    nativeCurrency,
    switchToChain,
    isSwitching,
    deployedChains
  } = useChainConfig();

  // Check for wrong chain
  const isWrongChain = useMemo(() => 
    isConnected && walletChainId !== chainId,
    [isConnected, walletChainId, chainId]
  );

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Get the explorer URL for the application's chain (might differ from current chain)
  const getApplicationExplorerUrl = useMemo(() => {
    if (!application?.chain_id) return explorerUrl;
    
    // Map chain IDs to their explorer URLs
    const explorerUrls: Record<number, string> = {
      43113: 'https://testnet.snowtrace.io',
      43114: 'https://snowtrace.io',
      137: 'https://polygonscan.com',
      80002: 'https://amoy.polygonscan.com',
      1: 'https://etherscan.io',
      11155111: 'https://sepolia.etherscan.io',
      42161: 'https://arbiscan.io',
      8453: 'https://basescan.org',
      10: 'https://optimistic.etherscan.io',
      56: 'https://bscscan.com',
    };
    
    return explorerUrls[application.chain_id] || explorerUrl;
  }, [application?.chain_id, explorerUrl]);

  const explorerName = useMemo(() => {
    const appChainId = application?.chain_id || chainId;
    return EXPLORER_NAMES[appChainId] || 'Explorer';
  }, [application?.chain_id, chainId]);

  useEffect(() => {
    if (address && applicationId) {
      fetchApplication();
    }
  }, [address, applicationId]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tokenization/${applicationId}`, {
        headers: { 
          'x-wallet-address': address!,
          'x-chain-id': chainId.toString()
        },
      });

      if (!response.ok) {
        throw new Error('Application not found');
      }

      const data = await response.json();
      setApplication(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this application?')) return;

    setCancelling(true);
    try {
      const response = await fetch(`/api/tokenization/${applicationId}/cancel`, {
        method: 'POST',
        headers: { 
          'x-wallet-address': address!,
          'x-chain-id': chainId.toString()
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel application');
      }

      await fetchApplication();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleSwitchNetwork = async (targetChainId: SupportedChainId) => {
    try {
      await switchToChain(targetChainId);
    } catch (err) {
      console.error('Failed to switch network:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Get chain name for display
  const getChainName = (chainIdNum: number): string => {
    const chainNames: Record<number, string> = {
      43113: 'Avalanche Fuji',
      43114: 'Avalanche',
      137: 'Polygon',
      80002: 'Polygon Amoy',
      1: 'Ethereum',
      11155111: 'Sepolia',
      42161: 'Arbitrum One',
      8453: 'Base',
      10: 'Optimism',
      56: 'BNB Chain',
    };
    return chainNames[chainIdNum] || `Chain ${chainIdNum}`;
  };

  // Parse documents
  const getDocuments = () => {
    if (!application?.documents) return [];
    try {
      const parsed = typeof application.documents === 'string'
        ? JSON.parse(application.documents)
        : application.documents;
      return parsed?.files || (Array.isArray(parsed) ? parsed : []);
    } catch {
      return [];
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-surface-sunken">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <Wallet className="w-16 h-16 text-ink-faint mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-ink mb-2">Connect Your Wallet</h2>
          <p className="text-ink-muted">Please connect your wallet to view this application.</p>
        </div>
      </div>
    );
  }

  // Network not supported
  if (!isDeployed) {
   
    return (
      <div className="min-h-screen bg-surface-sunken">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <Globe className="w-16 h-16 text-warning mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-ink mb-2">Network Not Supported</h2>
            <p className="text-ink-muted mb-6">
              Tokenization is not available on {chainName}. Please switch to a supported network.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {deployedChains.slice(0, 4).map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => handleSwitchNetwork(chain.id as SupportedChainId)}
                  disabled={isSwitching}
                  className="px-6 py-3 bg-gold-600 hover:bg-gold-700 disabled:bg-border-strong rounded-lg text-ink font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isSwitching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {chain.name}
                  {chain.testnet && (
                    <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded">
                      Testnet
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Wrong chain warning
  if (isWrongChain) {
    return (
      <div className="min-h-screen bg-surface-sunken">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-warning mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-ink mb-2">Wrong Network</h2>
            <p className="text-ink-muted mb-6">
              Please switch to {chainName} to continue.
            </p>
            <button
              onClick={() => handleSwitchNetwork(chainId)}
              disabled={isSwitching}
              className="px-6 py-3 bg-gold-600 hover:bg-gold-700 disabled:bg-border-strong rounded-lg text-ink font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              {isSwitching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Switch to {chainName}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-sunken">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-surface-sunken">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-danger mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-ink mb-2">Error</h2>
            <p className="text-ink-muted mb-6">{error || 'Application not found'}</p>
            <Link
              href={backUrl}
              className="inline-flex items-center gap-2 text-gold-400 hover:text-gold-300"
            >
              <ArrowLeft className="w-4 h-4" /> {backLabel}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[application.status] || STATUS_CONFIG.pending;
  const documents = getDocuments();
  const applicationChainName = application.chain_id ? getChainName(application.chain_id) : chainName;

  return (
    <div className="min-h-screen bg-surface-sunken">

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 text-ink-muted hover:text-ink mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </Link>

        {/* Header */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ink mb-2">{application.asset_name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <p className="text-ink-muted">
                  Application ID: {application.id}
                </p>
                {/* Network Badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                  isTestnet 
                    ? 'bg-warning/20 text-warning' 
                    : 'bg-success/20 text-success'
                }`}>
                  <Globe className="w-3 h-3" />
                  {applicationChainName}
                  {isTestnet && ' (Testnet)'}
                </span>
              </div>
            </div>

            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${statusConfig.color}`}>
              {statusConfig.icon}
              <span className="font-medium">{statusConfig.label}</span>
            </div>
          </div>

          <p className="text-ink-muted mt-4">{statusConfig.description}</p>

          {/* Rejection Reason */}
          {application.status === 'rejected' && application.rejection_reason && (
            <div className="mt-4 p-4 bg-danger/10 border border-danger/30 rounded-lg">
              <p className="text-danger font-medium mb-1">Rejection Reason:</p>
              <p className="text-ink-muted">{application.rejection_reason}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-6">
            {/* Show deploy button when approved (payment already done at submission) */}
            {application.status === 'approved' && (
              <Link
                href={`/tokenize/create/${application.id}${fromDashboard ? '?from=dashboard' : ''}`}
                className="px-6 py-2 bg-gold-600 hover:bg-gold-500 text-ink font-medium rounded-lg transition inline-flex items-center gap-2"
              >
                <Coins className="w-4 h-4" />
                Create Token
              </Link>
            )}

            {/* Resubmit button for rejected applications */}
            {application.status === 'rejected' && (
              <Link
                href={`/tokenize/edit/${application.id}?resubmit=true${fromDashboard ? '&from=dashboard' : ''}`}
                className="px-6 py-2 bg-danger hover:bg-danger text-ink font-medium rounded-lg transition inline-flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Edit & Resubmit
              </Link>
            )}

            {['pending'].includes(application.status) && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 bg-surface-overlay hover:bg-border-strong text-ink-muted rounded-lg transition inline-flex items-center gap-2 disabled:opacity-50"
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Cancel Application
              </button>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Asset Info */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold-400" />
              Asset Details
            </h2>

            <div className="space-y-3">
              <div>
                <span className="text-ink-muted text-sm">Asset Type</span>
                <p className="text-ink">{application.asset_type.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <span className="text-ink-muted text-sm">Estimated Value</span>
                <p className="text-ink font-semibold">{formatCurrency(application.estimated_value)}</p>
              </div>
              <div>
                <span className="text-ink-muted text-sm">Description</span>
                <p className="text-ink-muted text-sm">{application.asset_description}</p>
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gold-400" />
              Company Info
            </h2>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-ink-faint" />
                <span className="text-ink">{application.contact_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-ink-faint" />
                <span className="text-ink">{application.company_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-ink-faint" />
                <a href={`mailto:${application.email}`} className="text-gold-400 hover:underline">
                  {application.email}
                </a>
              </div>
              {application.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-ink-faint" />
                  <span className="text-ink">{application.phone}</span>
                </div>
              )}
              {application.website && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-ink-faint" />
                  <a href={application.website} target="_blank" rel="noopener noreferrer" className="text-gold-400 hover:underline">
                    {application.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Fee & Add-ons */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-success" />
              Fee & Add-ons
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-ink-muted">Total Fee</span>
                <span className="text-success font-bold">${application.fee_amount} {application.fee_currency}</span>
              </div>

              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex items-center gap-2">
                  {application.needs_escrow ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <XCircle className="w-4 h-4 text-ink-faint" />
                  )}
                  <span className={application.needs_escrow ? 'text-ink' : 'text-ink-faint'}>
                    Trade Escrow
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {application.needs_dividends ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <XCircle className="w-4 h-4 text-ink-faint" />
                  )}
                  <span className={application.needs_dividends ? 'text-ink' : 'text-ink-faint'}>
                    Dividend Distributor
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Token Preferences */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-warning" />
              Token Preferences
            </h2>

            <div className="space-y-3">
              <div>
                <span className="text-ink-muted text-sm">Token Name</span>
                <p className="text-ink">{application.token_name || 'To be decided'}</p>
              </div>
              <div>
                <span className="text-ink-muted text-sm">Symbol</span>
                <p className="text-ink font-mono">{application.token_symbol || 'TBD'}</p>
              </div>
              <div>
                <span className="text-ink-muted text-sm">Total Supply</span>
                <p className="text-ink">{application.total_supply || 'To be decided'}</p>
              </div>
              <div>
                <span className="text-ink-muted text-sm">Network</span>
                <p className="text-ink flex items-center gap-2">
                  {applicationChainName}
                  {isTestnet && (
                    <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded">
                      Testnet
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Documents */}
        {documents.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-6 mt-6">
            <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold" />
              Documents ({documents.length})
            </h2>

            <div className="grid gap-2">
              {documents.map((doc: any, idx: number) => (
                <a
                  key={idx}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-surface-overlay/50 rounded-lg hover:bg-surface-overlay transition group"
                >
                  <FileText className="w-5 h-5 text-ink-muted group-hover:text-ink" />
                  <div className="flex-1 min-w-0">
                    <p className="text-ink text-sm truncate">{doc.name}</p>
                    <p className="text-ink-faint text-xs">{doc.type}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-ink-muted group-hover:text-ink" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Deployment Info (if completed) */}
        {application.status === 'completed' && (application.token_address || application.nft_address) && (
          <div className="bg-success/10 border border-success/30 rounded-xl p-6 mt-6">
            <h2 className="text-lg font-semibold text-success mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Deployment Information
            </h2>

            {/* Deployed Network Info */}
            {application.chain_id && (
              <div className="mb-4 pb-4 border-b border-success/20">
                <span className="text-ink-muted text-sm">Deployed Network</span>
                <p className="text-ink flex items-center gap-2 mt-1">
                  <Globe className="w-4 h-4 text-success" />
                  {getChainName(application.chain_id)}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {application.token_address && (
                <div>
                  <span className="text-ink-muted text-sm">Token Address</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-ink bg-surface px-2 py-1 rounded text-sm font-mono">
                      {application.token_address}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(application.token_address!)} 
                      className="text-ink-muted hover:text-ink transition"
                      title="Copy address"
                    >
                      {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a 
                      href={`${getApplicationExplorerUrl}/address/${application.token_address}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-gold-400 hover:text-gold-300 transition"
                      title={`View on ${explorerName}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {application.nft_address && (
                <div>
                  <span className="text-ink-muted text-sm">NFT Address</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-ink bg-surface px-2 py-1 rounded text-sm font-mono">
                      {application.nft_address}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(application.nft_address!)} 
                      className="text-ink-muted hover:text-ink transition"
                      title="Copy address"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a 
                      href={`${getApplicationExplorerUrl}/address/${application.nft_address}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-gold-400 hover:text-gold-300 transition"
                      title={`View on ${explorerName}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {application.escrow_address && (
                <div>
                  <span className="text-ink-muted text-sm">Escrow Address</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-ink bg-surface px-2 py-1 rounded text-sm font-mono">
                      {application.escrow_address}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(application.escrow_address!)} 
                      className="text-ink-muted hover:text-ink transition"
                      title="Copy address"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a 
                      href={`${getApplicationExplorerUrl}/address/${application.escrow_address}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-gold-400 hover:text-gold-300 transition"
                      title={`View on ${explorerName}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {application.deployment_tx_hash && (
                <div>
                  <span className="text-ink-muted text-sm">Deployment Transaction</span>
                  <div className="flex items-center gap-2 mt-1">
                    <a 
                      href={`${getApplicationExplorerUrl}/tx/${application.deployment_tx_hash}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-gold-400 hover:text-gold-300 hover:underline inline-flex items-center gap-2"
                    >
                      <span className="font-mono text-sm">
                        {application.deployment_tx_hash.slice(0, 10)}...{application.deployment_tx_hash.slice(-8)}
                      </span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-surface border border-border rounded-xl p-6 mt-6">
          <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-ink-muted" />
            Timeline
          </h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">Submitted</span>
              <span className="text-ink">{formatDate(application.created_at)}</span>
            </div>
            {application.updated_at !== application.created_at && (
              <div className="flex justify-between">
                <span className="text-ink-muted">Last Updated</span>
                <span className="text-ink">{formatDate(application.updated_at)}</span>
              </div>
            )}
            {application.chain_id && (
              <div className="flex justify-between pt-2 border-t border-border mt-2">
                <span className="text-ink-muted">Network</span>
                <span className="text-ink">{getChainName(application.chain_id)}</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
