// src/app/admin/kyc/components/SubmissionDetails.tsx
'use client';

import { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Globe, 
  Briefcase,
  DollarSign,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Shield,
  AlertTriangle,
  TrendingUp,
  Eye
} from 'lucide-react';
import { 
  StoredSubmission, 
  OnChainKYCData, 
  UpgradeRequest,
  DOCUMENT_TYPE_NAMES 
} from '../types';
import { 
  formatAddress, 
  formatDate, 
  formatUSD, 
  resolveIPFSUrl,
  getRiskLevelName,
  getRiskLevelColor,
  getScoreColor,
  getScoreBarColor,
  copyToClipboard
} from '../utils';
import { StatusBadge, TierBadge, UpgradeStatusBadge } from './StatusBadge';
import { DocumentViewer } from './DocumentViewer';

interface SubmissionDetailsProps {
  submission: StoredSubmission;
  onChainData: OnChainKYCData | null;
  totalInvested: bigint;
  isValid: boolean;
  upgradeRequest: UpgradeRequest | null;
  explorerUrl: string;
  currencySymbol: string;
  onApprove: (address: string, tier: number) => void;
  onReject: (address: string) => void;
  onReset: (address: string) => void;
  onApproveUpgrade: (address: string) => void;
  onRejectUpgrade: (address: string) => void;
}

export function SubmissionDetails({
  submission,
  onChainData,
  totalInvested,
  isValid,
  upgradeRequest,
  explorerUrl,
  currencySymbol,
  onApprove,
  onReject,
  onReset,
  onApproveUpgrade,
  onRejectUpgrade
}: SubmissionDetailsProps) {
  const [copied, setCopied] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{ url: string; type: string } | null>(null);
  const [selectedTierForApproval, setSelectedTierForApproval] = useState(submission.tier || 1);

  const handleCopy = async () => {
    const success = await copyToClipboard(submission.address);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const { personalInfo, documentUrls, validationScores } = submission;

  // Get documents that have URLs
  const availableDocuments = Object.entries(documentUrls || {})
    .filter(([_, url]) => url && url.length > 0)
    .map(([type, url]) => ({
      type,
      url: resolveIPFSUrl(url as string),
      label: type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    }));

  return (
    <div className="mt-6 space-y-6">
      {/* Header */}
      <div className="bg-surface-sunken/50 rounded-xl p-6 border border-border/50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-ink">
                {personalInfo?.fullName || 'Unknown User'}
              </h3>
              <StatusBadge status={submission.status} />
              <TierBadge tier={submission.tier} showLevel />
            </div>
            <div className="flex items-center gap-2 text-ink-muted">
              <span className="font-mono text-sm">{formatAddress(submission.address)}</span>
              <button onClick={handleCopy} className="hover:text-ink transition-colors">
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={`${explorerUrl}/address/${submission.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-ink transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm ${isValid ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
              {isValid ? 'Valid' : 'Invalid'}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-surface/50 rounded-lg p-3">
            <p className="text-xs text-ink-muted mb-1">Total Invested</p>
            <p className="text-lg font-bold text-ink">{formatUSD(totalInvested)}</p>
          </div>
          <div className="bg-surface/50 rounded-lg p-3">
            <p className="text-xs text-ink-muted mb-1">Submitted</p>
            <p className="text-sm font-medium text-ink">{formatDate(submission.submittedAt)}</p>
          </div>
          <div className="bg-surface/50 rounded-lg p-3">
            <p className="text-xs text-ink-muted mb-1">Expires</p>
            <p className="text-sm font-medium text-ink">{formatDate(submission.expiresAt)}</p>
          </div>
          <div className="bg-surface/50 rounded-lg p-3">
            <p className="text-xs text-ink-muted mb-1">Risk Level</p>
            <p className={`text-sm font-medium ${getRiskLevelColor(validationScores?.riskLevel || 0)}`}>
              {getRiskLevelName(validationScores?.riskLevel || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-surface-sunken/50 rounded-xl p-6 border border-border/50">
        <h4 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-gold-400" />
          Personal Information
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {personalInfo?.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-ink-muted" />
              <div>
                <p className="text-xs text-ink-muted">Email</p>
                <p className="text-ink">{personalInfo.email}</p>
              </div>
            </div>
          )}
          
          {personalInfo?.phoneNumber && (
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-ink-muted" />
              <div>
                <p className="text-xs text-ink-muted">Phone</p>
                <p className="text-ink">{personalInfo.phoneNumber}</p>
              </div>
            </div>
          )}
          
          {personalInfo?.dateOfBirth && (
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-ink-muted" />
              <div>
                <p className="text-xs text-ink-muted">Date of Birth</p>
                <p className="text-ink">{personalInfo.dateOfBirth}</p>
              </div>
            </div>
          )}
          
          {personalInfo?.nationality && (
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-ink-muted" />
              <div>
                <p className="text-xs text-ink-muted">Nationality</p>
                <p className="text-ink">{personalInfo.nationality}</p>
              </div>
            </div>
          )}
          
          {personalInfo?.residenceCountry && (
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-ink-muted" />
              <div>
                <p className="text-xs text-ink-muted">Residence</p>
                <p className="text-ink">
                  {personalInfo.residenceAddress && `${personalInfo.residenceAddress}, `}
                  {personalInfo.postalCode && `${personalInfo.postalCode}, `}
                  {personalInfo.residenceCountry}
                </p>
              </div>
            </div>
          )}
          
          {personalInfo?.occupation && (
            <div className="flex items-center gap-3">
              <Briefcase className="w-4 h-4 text-ink-muted" />
              <div>
                <p className="text-xs text-ink-muted">Occupation</p>
                <p className="text-ink">{personalInfo.occupation}</p>
              </div>
            </div>
          )}
          
          {personalInfo?.sourceOfFunds && (
            <div className="flex items-center gap-3">
              <DollarSign className="w-4 h-4 text-ink-muted" />
              <div>
                <p className="text-xs text-ink-muted">Source of Funds</p>
                <p className="text-ink">{personalInfo.sourceOfFunds}</p>
              </div>
            </div>
          )}
          
          {personalInfo?.expectedInvestmentRange && (
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-ink-muted" />
              <div>
                <p className="text-xs text-ink-muted">Expected Investment</p>
                <p className="text-ink">{personalInfo.expectedInvestmentRange}</p>
              </div>
            </div>
          )}
        </div>

        {personalInfo?.politicallyExposed && (
          <div className="mt-4 p-3 bg-warning/20 border border-warning/30 rounded-lg">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Politically Exposed Person (PEP)</span>
            </div>
          </div>
        )}

        {personalInfo?.taxId && (
          <div className="mt-4 p-3 bg-surface/50 rounded-lg">
            <p className="text-xs text-ink-muted mb-1">Tax ID</p>
            <p className="text-ink font-mono">{personalInfo.taxId}</p>
          </div>
        )}

        {personalInfo?.additionalInfo && (
          <div className="mt-4 p-3 bg-surface/50 rounded-lg">
            <p className="text-xs text-ink-muted mb-1">Additional Information</p>
            <p className="text-ink">{personalInfo.additionalInfo}</p>
          </div>
        )}
      </div>

      {/* Validation Scores */}
      {validationScores && (
        <div className="bg-surface-sunken/50 rounded-xl p-6 border border-border/50">
          <h4 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gold-400" />
            Validation Scores
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Document', score: validationScores.documentScore },
              { label: 'Address', score: validationScores.addressScore },
              { label: 'Identity', score: validationScores.identityScore },
              { label: 'Overall', score: validationScores.overallScore }
            ].map(({ label, score }) => (
              <div key={label} className="bg-surface/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-ink-muted">{label}</span>
                  <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}%</span>
                </div>
                <div className="h-2 bg-surface-overlay rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getScoreBarColor(score)} transition-all`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {availableDocuments.length > 0 && (
        <div className="bg-surface-sunken/50 rounded-xl p-6 border border-border/50">
          <h4 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gold-400" />
            Documents
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableDocuments.map(({ type, url, label }) => (
              <button
                key={type}
                onClick={() => setViewingDocument({ url, type: label })}
                className="flex items-center gap-3 p-3 bg-surface/50 rounded-lg hover:bg-surface-overlay/50 transition-colors text-left"
              >
                <FileText className="w-5 h-5 text-gold-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-ink font-medium truncate">{label}</p>
                  <p className="text-xs text-ink-muted truncate">{url}</p>
                </div>
                <Eye className="w-4 h-4 text-ink-muted" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade Request */}
      {upgradeRequest && upgradeRequest.status !== 0 && (
        <div className="bg-surface-sunken/50 rounded-xl p-6 border border-gold-500/30">
          <h4 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gold-400" />
            Upgrade Request
          </h4>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <TierBadge tier={upgradeRequest.currentTier} />
              <span className="text-ink-muted">→</span>
              <TierBadge tier={upgradeRequest.requestedTier} />
            </div>
            <UpgradeStatusBadge status={upgradeRequest.status} />
          </div>
          
          {upgradeRequest.reason && (
            <div className="p-3 bg-surface/50 rounded-lg mb-4">
              <p className="text-xs text-ink-muted mb-1">Reason</p>
              <p className="text-ink">{upgradeRequest.reason}</p>
            </div>
          )}
          
          <p className="text-sm text-ink-muted">
            Requested: {formatDate(upgradeRequest.requestedAt)}
          </p>

          {upgradeRequest.status === 1 && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => onApproveUpgrade(submission.address)}
                className="px-4 py-2 bg-success hover:bg-success/90 text-ink font-medium rounded-lg transition-colors"
              >
                Approve Upgrade
              </button>
              <button
                onClick={() => onRejectUpgrade(submission.address)}
                className="px-4 py-2 bg-danger hover:bg-danger/90 text-ink font-medium rounded-lg transition-colors"
              >
                Reject Upgrade
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {submission.status === 1 && (
        <div className="bg-surface-sunken/50 rounded-xl p-6 border border-border/50">
          <h4 className="text-lg font-semibold text-ink mb-4">Actions</h4>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-ink-muted">Approve as Tier:</label>
              <select
                value={selectedTierForApproval}
                onChange={(e) => setSelectedTierForApproval(Number(e.target.value))}
                className="px-3 py-2 bg-surface border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value={1}>Basic (T1)</option>
                <option value={2}>Standard (T2)</option>
                <option value={3}>Enhanced (T3)</option>
                <option value={4}>Premium (T4)</option>
              </select>
              <button
                onClick={() => onApprove(submission.address, selectedTierForApproval)}
                className="px-4 py-2 bg-success hover:bg-success/90 text-ink font-medium rounded-lg transition-colors"
              >
                Approve
              </button>
            </div>
            
            <button
              onClick={() => onReject(submission.address)}
              className="px-4 py-2 bg-danger hover:bg-danger/90 text-ink font-medium rounded-lg transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Reset Button for Approved/Rejected */}
      {(submission.status === 2 || submission.status === 3) && (
        <div className="bg-surface-sunken/50 rounded-xl p-6 border border-border/50">
          <h4 className="text-lg font-semibold text-ink mb-4">Actions</h4>
          <button
            onClick={() => onReset(submission.address)}
            className="px-4 py-2 bg-warning hover:bg-warning/90 text-ink font-medium rounded-lg transition-colors"
          >
            Reset KYC Status
          </button>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          url={viewingDocument.url}
          type={viewingDocument.type}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}
