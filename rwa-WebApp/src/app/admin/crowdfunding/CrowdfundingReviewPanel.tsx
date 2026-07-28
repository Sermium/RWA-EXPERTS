// src/app/admin/crowdfunding/CrowdfundingReviewPanel.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import {
  FileText, CheckCircle, XCircle, Clock, Loader2,
  ChevronDown, ChevronUp, ExternalLink, Eye, RefreshCw,
  AlertCircle, DollarSign, Target, Calendar, Users,
  Building2, Coins, TrendingUp, Globe, Image as ImageIcon,
  Play, FileCheck, Milestone, Percent, Timer
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Application {
  id: string;
  walletAddress: string;
  name: string;
  description: string;
  category: string;
  tokenName: string;
  tokenSymbol: string;
  fundingGoal: number;
  tokenPrice: number;
  deadlineDays: number;
  investorSharePercent: number;
  projectedROI: number;
  roiTimelineMonths: number;
  milestones: any[];
  documents: any;
  images: string[];
  website: string;
  status: string;
  submissionCount: number;
  feePaid: boolean;
  feeAmount: number;
  submittedAt: string;
  rejectionReason?: string;
  // Media URLs
  logoUrl?: string;
  bannerUrl?: string;
  pitchDeckUrl?: string;
  videoUrl?: string;
  legalDocuments?: { type: string; url: string }[];
  // Company info
  companyName?: string;
  registrationNumber?: string;
  jurisdiction?: string;
}

interface ReviewModalProps {
  application: Application;
  onClose: () => void;
  onReview: (action: 'approve' | 'reject', reason?: string) => Promise<void>;
}

interface CrowdfundingReviewPanelProps {
  onRefresh?: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getCategoryIcon(category: string) {
  const icons: Record<string, React.ReactNode> = {
    'Real Estate': <Building2 className="w-5 h-5" />,
    'Infrastructure': <Building2 className="w-5 h-5" />,
    'Business Equity': <TrendingUp className="w-5 h-5" />,
    'Revenue Based': <DollarSign className="w-5 h-5" />,
    'Art & Collectibles': <ImageIcon className="w-5 h-5" />,
  };
  return icons[category] || <Coins className="w-5 h-5" />;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Real Estate': 'from-gold-500 to-gold',
    'Infrastructure': 'from-orange-500 to-warning',
    'Business Equity': 'from-gold-500 to-gold',
    'Revenue Based': 'from-success to-success',
    'Art & Collectibles': 'from-rose-500 to-danger',
  };
  return colors[category] || 'from-surface-overlay to-surface-raised';
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

function StatCard({ 
  icon, 
  label, 
  value, 
  subValue,
  color = 'blue' 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  subValue?: string;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'cyan';
}) {
  const colorClasses = {
    blue: 'bg-gold-500/10 border-gold-500/20 text-gold-400',
    green: 'bg-success/10 border-success/20 text-success',
    yellow: 'bg-warning/10 border-warning/20 text-warning',
    purple: 'bg-gold-500/10 border-gold-500/20 text-gold-400',
    cyan: 'bg-gold/10 border-gold/20 text-gold',
  };

  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2 opacity-80">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-ink">{value}</p>
      {subValue && <p className="text-xs text-ink-muted mt-1">{subValue}</p>}
    </div>
  );
}

// ============================================================================
// APPLICATION CARD COMPONENT
// ============================================================================

function ApplicationCard({
  app,
  isExpanded,
  onToggle,
  onReview,
  getStatusBadge,
}: {
  app: Application;
  isExpanded: boolean;
  onToggle: () => void;
  onReview: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
}) {
  const totalSupply = app.tokenPrice > 0 ? app.fundingGoal / app.tokenPrice : 0;

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden hover:border-border-strong transition-all">
      {/* Banner */}
      {app.bannerUrl && (
        <div className="relative h-32 bg-gradient-to-r from-surface-overlay to-surface overflow-hidden">
          <Image
            src={app.bannerUrl}
            alt={`${app.name} banner`}
            fill
            className="object-cover opacity-80"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
        </div>
      )}

      {/* Header Row */}
      <div
        className={`p-4 flex items-center justify-between cursor-pointer hover:bg-surface-overlay/30 transition-colors ${app.bannerUrl ? '-mt-12 relative z-10' : ''}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className={`w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 border-border bg-gradient-to-br ${getCategoryColor(app.category)}`}>
            {app.logoUrl ? (
              <Image
                src={app.logoUrl}
                alt={app.name}
                width={56}
                height={56}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-ink">
                {getCategoryIcon(app.category)}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-ink font-semibold text-lg">{app.name}</h3>
              <span className="px-2 py-0.5 bg-surface-overlay text-ink-muted rounded text-xs font-medium">
                {app.tokenSymbol}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-ink-muted flex items-center gap-1">
                <Target className="w-3 h-3" />
                {formatCurrency(app.fundingGoal)}
              </span>
              <span className="text-ink-faint">•</span>
              <span className="text-sm text-ink-muted">{app.category}</span>
              <span className="text-ink-faint">•</span>
              <span className="text-sm text-ink-faint">{formatDate(app.submittedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {app.feePaid && (
            <span className="px-2.5 py-1 bg-success/10 text-success border border-success/20 rounded-lg text-xs font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Paid
            </span>
          )}
          {getStatusBadge(app.status)}
          <div className="p-1.5 rounded-lg bg-surface-overlay/50">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-ink-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-ink-muted" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border/50">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 py-4">
            <div className="bg-surface-overlay/30 rounded-lg p-3 text-center">
              <p className="text-xs text-ink-faint mb-1">Token Price</p>
              <p className="text-ink font-semibold">${app.tokenPrice}</p>
            </div>
            <div className="bg-surface-overlay/30 rounded-lg p-3 text-center">
              <p className="text-xs text-ink-faint mb-1">Total Supply</p>
              <p className="text-ink font-semibold">{totalSupply.toLocaleString()}</p>
            </div>
            <div className="bg-surface-overlay/30 rounded-lg p-3 text-center">
              <p className="text-xs text-ink-faint mb-1">Investor Share</p>
              <p className="text-ink font-semibold">{app.investorSharePercent}%</p>
            </div>
            <div className="bg-surface-overlay/30 rounded-lg p-3 text-center">
              <p className="text-xs text-ink-faint mb-1">Projected ROI</p>
              <p className="text-success font-semibold">{app.projectedROI}%</p>
            </div>
            <div className="bg-surface-overlay/30 rounded-lg p-3 text-center">
              <p className="text-xs text-ink-faint mb-1">ROI Timeline</p>
              <p className="text-ink font-semibold">{app.roiTimelineMonths} mo</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-ink-muted text-sm mb-4 line-clamp-3">{app.description}</p>

          {/* Milestones Preview */}
          {app.milestones && app.milestones.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-ink-faint mb-2 flex items-center gap-1">
                <Milestone className="w-3 h-3" />
                {app.milestones.length} Milestones
              </p>
              <div className="flex gap-1">
                {app.milestones.slice(0, 5).map((m, i) => (
                  <div
                    key={i}
                    className="flex-1 h-2 rounded-full bg-gold-500/30"
                    title={m.title || `Milestone ${i + 1}: ${m.percentage || m.percentageOfFunds}%`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="flex flex-wrap gap-2 mb-4">
            {app.website && (
              <a
                href={app.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-overlay/50 hover:bg-surface-overlay rounded-lg text-ink-muted text-xs transition-colors"
              >
                <Globe className="w-3 h-3" />
                Website
              </a>
            )}
            {app.pitchDeckUrl && (
              <a
                href={app.pitchDeckUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-overlay/50 hover:bg-surface-overlay rounded-lg text-ink-muted text-xs transition-colors"
              >
                <FileText className="w-3 h-3" />
                Pitch Deck
              </a>
            )}
            {app.videoUrl && (
              <a
                href={app.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-overlay/50 hover:bg-surface-overlay rounded-lg text-ink-muted text-xs transition-colors"
              >
                <Play className="w-3 h-3" />
                Video
              </a>
            )}
            {app.legalDocuments && app.legalDocuments.length > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-overlay/50 rounded-lg text-ink-muted text-xs">
                <FileCheck className="w-3 h-3" />
                {app.legalDocuments.length} Documents
              </span>
            )}
          </div>

          {/* Rejection Reason */}
          {app.rejectionReason && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg">
              <p className="text-xs text-danger font-medium mb-1">Rejection Reason:</p>
              <p className="text-sm text-danger/80">{app.rejectionReason}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReview();
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gold-600 hover:bg-gold-700 text-ink rounded-lg text-sm font-medium transition-colors"
            >
              <Eye className="w-4 h-4" />
              Full Review
            </button>
            {app.status === 'pending_review' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Quick approve logic here if needed
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-success/10 hover:bg-success/20 text-success border border-success/30 rounded-lg text-sm font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Quick Approve
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// REVIEW MODAL
// ============================================================================

function ReviewModal({ application, onClose, onReview }: ReviewModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'financials' | 'milestones' | 'documents'>('overview');

  const handleSubmit = async () => {
    if (!action) return;
    if (action === 'reject' && !rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onReview(action, rejectionReason);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSupply = application.tokenPrice > 0 
    ? application.fundingGoal / application.tokenPrice 
    : 0;

  const sections = [
    { id: 'overview', label: 'Overview', icon: <Eye className="w-4 h-4" /> },
    { id: 'financials', label: 'Financials', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'milestones', label: 'Milestones', icon: <Milestone className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-surface-sunken/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-sunken rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-border shadow-2xl">
        {/* Banner Header */}
        <div className="relative h-48 bg-gradient-to-r from-surface to-surface-overlay overflow-hidden">
          {application.bannerUrl && (
            <Image
              src={application.bannerUrl}
              alt={`${application.name} banner`}
              fill
              className="object-cover opacity-60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-sunken via-surface-sunken/50 to-transparent" />
          
          {/* Close Button */}
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 bg-surface-sunken/50 hover:bg-surface-sunken/70 rounded-full text-ink transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>

          {/* Project Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end gap-4">
              {/* Logo */}
              <div className={`w-20 h-20 rounded-xl overflow-hidden border-4 border-surface-sunken bg-gradient-to-br ${getCategoryColor(application.category)} flex-shrink-0`}>
                {application.logoUrl ? (
                  <Image
                    src={application.logoUrl}
                    alt={application.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink text-2xl">
                    {getCategoryIcon(application.category)}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-ink truncate">{application.name}</h2>
                  <span className="px-2 py-1 bg-ink/10 text-ink rounded-lg text-sm font-medium">
                    {application.tokenSymbol}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-ink-muted">
                  <span className="flex items-center gap-1">
                    {getCategoryIcon(application.category)}
                    {application.category}
                  </span>
                  <span>•</span>
                  <span>Submitted {formatDate(application.submittedAt)}</span>
                  <span>•</span>
                  <span className="font-mono text-xs bg-surface-sunken/30 px-2 py-0.5 rounded">
                    {application.walletAddress.slice(0, 6)}...{application.walletAddress.slice(-4)}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex-shrink-0">
                {application.status === 'pending_review' && (
                  <span className="px-4 py-2 bg-warning/10 text-warning border border-warning/40 rounded-xl text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Pending Review
                  </span>
                )}
                {application.status === 'approved' && (
                  <span className="px-4 py-2 bg-success/10 text-success border border-success/40 rounded-xl text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Approved
                  </span>
                )}
                {application.status === 'rejected' && (
                  <span className="px-4 py-2 bg-danger/10 text-danger border border-danger/40 rounded-xl text-sm font-medium flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Rejected
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="border-b border-border px-6">
          <div className="flex gap-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeSection === section.id
                    ? 'text-gold-400 border-gold-400'
                    : 'text-ink-muted border-transparent hover:text-ink'
                }`}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-380px)]">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={<Target className="w-4 h-4" />}
                  label="Funding Goal"
                  value={formatCurrency(application.fundingGoal)}
                  color="blue"
                />
                <StatCard
                  icon={<DollarSign className="w-4 h-4" />}
                  label="Token Price"
                  value={`$${application.tokenPrice}`}
                  color="green"
                />
                <StatCard
                  icon={<Coins className="w-4 h-4" />}
                  label="Total Supply"
                  value={totalSupply.toLocaleString()}
                  color="purple"
                />
                <StatCard
                  icon={<Calendar className="w-4 h-4" />}
                  label="Duration"
                  value={`${application.deadlineDays} days`}
                  color="cyan"
                />
              </div>

              {/* Description */}
              <div className="bg-surface/50 rounded-xl p-5 border border-border">
                <h3 className="text-ink font-medium mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-ink-muted" />
                  Project Description
                </h3>
                <p className="text-ink-muted whitespace-pre-wrap leading-relaxed">{application.description}</p>
              </div>

              {/* Company Info */}
              {(application.companyName || application.jurisdiction) && (
                <div className="bg-surface/50 rounded-xl p-5 border border-border">
                  <h3 className="text-ink font-medium mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-ink-muted" />
                    Company Information
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {application.companyName && (
                      <div>
                        <p className="text-xs text-ink-faint mb-1">Company Name</p>
                        <p className="text-ink">{application.companyName}</p>
                      </div>
                    )}
                    {application.registrationNumber && (
                      <div>
                        <p className="text-xs text-ink-faint mb-1">Registration #</p>
                        <p className="text-ink font-mono">{application.registrationNumber}</p>
                      </div>
                    )}
                    {application.jurisdiction && (
                      <div>
                        <p className="text-xs text-ink-faint mb-1">Jurisdiction</p>
                        <p className="text-ink">{application.jurisdiction}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Previous Rejection */}
              {application.rejectionReason && (
                <div className="bg-danger/10 border border-danger/30 rounded-xl p-5">
                  <h3 className="text-danger font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Previous Rejection Reason
                  </h3>
                  <p className="text-danger/80">{application.rejectionReason}</p>
                </div>
              )}
            </div>
          )}

          {/* Financials Section */}
          {activeSection === 'financials' && (
            <div className="space-y-6">
              {/* Token Economics */}
              <div className="bg-surface/50 rounded-xl p-5 border border-border">
                <h3 className="text-ink font-medium mb-4 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-ink-muted" />
                  Token Economics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-surface-overlay/50 rounded-lg p-4">
                    <p className="text-xs text-ink-muted mb-1">Token Name</p>
                    <p className="text-ink font-semibold">{application.tokenName}</p>
                  </div>
                  <div className="bg-surface-overlay/50 rounded-lg p-4">
                    <p className="text-xs text-ink-muted mb-1">Token Symbol</p>
                    <p className="text-ink font-semibold">{application.tokenSymbol}</p>
                  </div>
                  <div className="bg-surface-overlay/50 rounded-lg p-4">
                    <p className="text-xs text-ink-muted mb-1">Token Price</p>
                    <p className="text-ink font-semibold">${application.tokenPrice}</p>
                  </div>
                  <div className="bg-surface-overlay/50 rounded-lg p-4">
                    <p className="text-xs text-ink-muted mb-1">Total Supply</p>
                    <p className="text-ink font-semibold">{totalSupply.toLocaleString()}</p>
                  </div>
                  <div className="bg-surface-overlay/50 rounded-lg p-4">
                    <p className="text-xs text-ink-muted mb-1">Funding Goal</p>
                    <p className="text-ink font-semibold">${application.fundingGoal.toLocaleString()}</p>
                  </div>
                  <div className="bg-surface-overlay/50 rounded-lg p-4">
                    <p className="text-xs text-ink-muted mb-1">Campaign Duration</p>
                    <p className="text-ink font-semibold">{application.deadlineDays} days</p>
                  </div>
                </div>
              </div>

              {/* Investment Terms */}
              <div className="bg-surface/50 rounded-xl p-5 border border-border">
                <h3 className="text-ink font-medium mb-4 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-ink-muted" />
                  Investment Terms
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-gold-500/10 to-gold-light-600/5 border border-gold-500/20 rounded-xl p-5 text-center">
                    <Users className="w-6 h-6 text-gold-400 mx-auto mb-2" />
                    <p className="text-xs text-ink-muted mb-1">Investor Share</p>
                    <p className="text-2xl font-bold text-ink">{application.investorSharePercent}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-success/10 to-success/5 border border-success/20 rounded-xl p-5 text-center">
                    <TrendingUp className="w-6 h-6 text-success mx-auto mb-2" />
                    <p className="text-xs text-ink-muted mb-1">Projected ROI</p>
                    <p className="text-2xl font-bold text-success">{application.projectedROI}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-gold-500/10 to-gold-light-600/5 border border-gold-500/20 rounded-xl p-5 text-center">
                    <Timer className="w-6 h-6 text-gold-400 mx-auto mb-2" />
                    <p className="text-xs text-ink-muted mb-1">ROI Timeline</p>
                    <p className="text-2xl font-bold text-ink">{application.roiTimelineMonths} mo</p>
                  </div>
                </div>
              </div>

              {/* Fee Status */}
              <div className="bg-surface/50 rounded-xl p-5 border border-border">
                <h3 className="text-ink font-medium mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-ink-muted" />
                  Submission Fee
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${application.feePaid ? 'bg-success/20' : 'bg-danger/20'}`}>
                      {application.feePaid ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <XCircle className="w-5 h-5 text-danger" />
                      )}
                    </div>
                    <div>
                      <p className="text-ink font-medium">
                        {application.feePaid ? 'Fee Paid' : 'Fee Not Paid'}
                      </p>
                      <p className="text-sm text-ink-muted">
                        Submission #{application.submissionCount}
                      </p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-ink">${application.feeAmount}</p>
                </div>
              </div>
            </div>
          )}

          {/* Milestones Section */}
          {activeSection === 'milestones' && (
            <div className="space-y-4">
              {application.milestones && application.milestones.length > 0 ? (
                <>
                  {/* Progress Bar */}
                  <div className="bg-surface/50 rounded-xl p-5 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-ink font-medium">Milestone Distribution</h3>
                      <span className="text-sm text-ink-muted">{application.milestones.length} milestones</span>
                    </div>
                    <div className="flex h-4 rounded-full overflow-hidden bg-surface-overlay">
                      {application.milestones.map((m, i) => {
                        const colors = ['bg-gold-500', 'bg-success', 'bg-gold-500', 'bg-gold', 'bg-gold', 'bg-orange-500'];
                        return (
                          <div
                            key={i}
                            className={`${colors[i % colors.length]} first:rounded-l-full last:rounded-r-full`}
                            style={{ width: `${m.percentage || m.percentageOfFunds}%` }}
                            title={`${m.title}: ${m.percentage || m.percentageOfFunds}%`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Milestone Cards */}
                  {application.milestones.map((m, i) => (
                    <div key={i} className="bg-surface/50 rounded-xl p-5 border border-border">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center font-bold text-sm">
                            {i + 1}
                          </div>
                          <div>
                            <h4 className="text-ink font-medium">{m.title || `Milestone ${i + 1}`}</h4>
                            {m.deadline && (
                              <p className="text-xs text-ink-faint">Due: {m.deadline}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-ink font-semibold">{m.percentage || m.percentageOfFunds}%</p>
                          <p className="text-sm text-success">
                            ${((application.fundingGoal * (m.percentage || m.percentageOfFunds)) / 100).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {m.description && (
                        <p className="text-ink-muted text-sm">{m.description}</p>
                      )}
                      {m.deliverables && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-ink-faint mb-1">Deliverables:</p>
                          <p className="text-sm text-ink-muted">{m.deliverables}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-12 bg-surface/30 rounded-xl border border-border">
                  <Milestone className="w-12 h-12 text-ink-faint mx-auto mb-3" />
                  <p className="text-ink-muted">No milestones defined</p>
                </div>
              )}
            </div>
          )}

          {/* Documents Section */}
          {activeSection === 'documents' && (
            <div className="space-y-6">
              {/* Media */}
              <div className="bg-surface/50 rounded-xl p-5 border border-border">
                <h3 className="text-ink font-medium mb-4 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-ink-muted" />
                  Media Assets
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {application.logoUrl && (
                    <div>
                      <p className="text-xs text-ink-faint mb-2">Logo</p>
                      <div className="w-24 h-24 rounded-xl overflow-hidden border border-border-strong">
                        <Image
                          src={application.logoUrl}
                          alt="Logo"
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  {application.bannerUrl && (
                    <div>
                      <p className="text-xs text-ink-faint mb-2">Banner</p>
                      <div className="h-24 rounded-xl overflow-hidden border border-border-strong">
                        <Image
                          src={application.bannerUrl}
                          alt="Banner"
                          width={300}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
                {application.images && application.images.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-ink-faint mb-2">Additional Images ({application.images.length})</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {application.images.map((img, i) => (
                        <div key={i} className="w-20 h-20 rounded-lg overflow-hidden border border-border-strong flex-shrink-0">
                          <Image
                            src={img}
                            alt={`Image ${i + 1}`}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Documents & Links */}
              <div className="bg-surface/50 rounded-xl p-5 border border-border">
                <h3 className="text-ink font-medium mb-4 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-ink-muted" />
                  Documents & Links
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {application.pitchDeckUrl && (
                    <a
                      href={application.pitchDeckUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-surface-overlay/50 hover:bg-surface-overlay rounded-xl transition-colors group"
                    >
                      <div className="p-2 bg-gold-500/20 rounded-lg">
                        <FileText className="w-5 h-5 text-gold-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-ink font-medium">Pitch Deck</p>
                        <p className="text-xs text-ink-muted truncate">View presentation</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-ink-faint group-hover:text-ink transition-colors" />
                    </a>
                  )}
                  {application.videoUrl && (
                    <a
                      href={application.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-surface-overlay/50 hover:bg-surface-overlay rounded-xl transition-colors group"
                    >
                      <div className="p-2 bg-danger/20 rounded-lg">
                        <Play className="w-5 h-5 text-danger" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-ink font-medium">Video</p>
                        <p className="text-xs text-ink-muted truncate">Watch presentation</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-ink-faint group-hover:text-ink transition-colors" />
                    </a>
                  )}
                  {application.website && (
                    <a
                      href={application.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-surface-overlay/50 hover:bg-surface-overlay rounded-xl transition-colors group"
                    >
                      <div className="p-2 bg-success/20 rounded-lg">
                        <Globe className="w-5 h-5 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-ink font-medium">Website</p>
                        <p className="text-xs text-ink-muted truncate">{application.website}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-ink-faint group-hover:text-ink transition-colors" />
                    </a>
                  )}
                </div>

                {/* Legal Documents */}
                {application.legalDocuments && application.legalDocuments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-ink-muted mb-3">Legal Documents ({application.legalDocuments.length})</p>
                    <div className="space-y-2">
                      {application.legalDocuments.map((doc, i) => (
                        <a
                          key={i}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-surface-overlay/30 hover:bg-surface-overlay/50 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-ink-muted" />
                            <span className="text-ink text-sm">{doc.type || `Document ${i + 1}`}</span>
                          </div>
                          <ExternalLink className="w-4 h-4 text-ink-faint" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Documents */}
                {!application.pitchDeckUrl && !application.videoUrl && !application.website && 
                 (!application.legalDocuments || application.legalDocuments.length === 0) && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-ink-faint mx-auto mb-3" />
                    <p className="text-ink-muted">No documents uploaded</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-4 p-4 bg-danger/10 border border-danger/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
            <p className="text-danger">{error}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-6 border-t border-border bg-surface/50">
          <div className="flex flex-col gap-4">
            {/* Action Selection */}
            {application.status === 'pending_review' && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setAction('approve')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    action === 'approve'
                      ? 'border-success bg-success/20 shadow-lg shadow-success/20'
                      : 'border-border-strong hover:border-success/50 bg-surface/50'
                  }`}
                >
                  <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${action === 'approve' ? 'text-success' : 'text-ink-faint'}`} />
                  <p className={`font-medium text-center ${action === 'approve' ? 'text-success' : 'text-ink-muted'}`}>
                    Approve
                  </p>
                  <p className="text-xs text-ink-faint text-center mt-1">Ready for deployment</p>
                </button>
                <button
                  onClick={() => setAction('reject')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    action === 'reject'
                      ? 'border-danger bg-danger/20 shadow-lg shadow-danger/20'
                      : 'border-border-strong hover:border-danger/50 bg-surface/50'
                  }`}
                >
                  <XCircle className={`w-8 h-8 mx-auto mb-2 ${action === 'reject' ? 'text-danger' : 'text-ink-faint'}`} />
                  <p className={`font-medium text-center ${action === 'reject' ? 'text-danger' : 'text-ink-muted'}`}>
                    Reject
                  </p>
                  <p className="text-xs text-ink-faint text-center mt-1">Request changes</p>
                </button>
              </div>
            )}

            {/* Rejection Reason */}
            {action === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Rejection Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this application is being rejected and what needs to be fixed..."
                  rows={3}
                  className="w-full px-4 py-3 bg-surface border border-border-strong rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:border-danger resize-none"
                />
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-surface-overlay hover:bg-surface-overlay text-ink font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              {application.status === 'pending_review' && (
                <button
                  onClick={handleSubmit}
                  disabled={!action || isSubmitting}
                  className={`flex-1 py-3 font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    action === 'approve'
                      ? 'bg-success hover:bg-success/90 text-ink shadow-lg shadow-success/25'
                      : action === 'reject'
                      ? 'bg-danger hover:bg-danger/90 text-ink shadow-lg shadow-danger/25'
                      : 'bg-surface-overlay text-ink-faint'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : action === 'approve' ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Approve Application
                    </>
                  ) : action === 'reject' ? (
                    <>
                      <XCircle className="w-5 h-5" />
                      Reject Application
                    </>
                  ) : (
                    'Select an action'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CrowdfundingReviewPanel({ onRefresh }: CrowdfundingReviewPanelProps) {
  const { address } = useAccount();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'pending_review' | 'approved' | 'rejected' | 'all'>('pending_review');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [allApplications, setAllApplications] = useState<Application[]>([]);

  const loadApplications = useCallback(async () => {
  setIsLoading(true);
  try {
    // Fetch filtered applications for display
    const response = await fetch(`/api/crowdfunding/admin/list?status=${filter}`);
    if (response.ok) {
      const data = await response.json();
      setApplications(data.applications || []);
    }
    
    // Fetch all applications for stats (only if not already loaded or on refresh)
    const allResponse = await fetch(`/api/crowdfunding/admin/list?status=all`);
    if (allResponse.ok) {
      const allData = await allResponse.json();
      setAllApplications(allData.applications || []);
    }
  } catch (error) {
    console.error('Failed to load applications:', error);
    setApplications([]);
  } finally {
    setIsLoading(false);
  }
}, [filter]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleReview = async (action: 'approve' | 'reject', reason?: string) => {
    if (!selectedApp || !address) return;

    const response = await fetch('/api/crowdfunding/admin/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: selectedApp.id,
        adminAddress: address,
        action,
        rejectionReason: reason,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to review');
    }

    await loadApplications();
    onRefresh?.();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review':
        return (
          <span className="px-3 py-1.5 bg-warning/10 text-warning border border-warning/40 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1.5 bg-success/10 text-success border border-success/40 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1.5 bg-danger/10 text-danger border border-danger/40 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case 'deployed':
        return (
          <span className="px-3 py-1.5 bg-gold-500/20 text-gold-400 border border-gold-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3" />
            Deployed
          </span>
        );
      default:
        return (
          <span className="px-3 py-1.5 bg-surface-overlay text-ink-faint border border-border rounded-lg text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  // Update stats to use allApplications
  const stats = {
    total: allApplications.length,
    pending: allApplications.filter(a => a.status === 'pending_review').length,
    approved: allApplications.filter(a => a.status === 'approved').length,
    rejected: allApplications.filter(a => a.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Crowdfunding Applications</h2>
          <p className="text-ink-muted mt-1">Review and manage project submissions</p>
        </div>
        <button
          onClick={() => {
            loadApplications();
            onRefresh?.();
          }}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-surface-overlay hover:bg-surface-overlay rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-ink-muted ${isLoading ? 'animate-spin' : ''}`} />
          <span className="text-ink-muted text-sm font-medium">Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setFilter('all')}
          className={`bg-surface rounded-xl p-4 border cursor-pointer transition-all ${
            filter === 'all' ? 'border-gold-500 ring-2 ring-gold/20' : 'border-border hover:border-border-strong'
          }`}
        >
          <p className="text-sm text-ink-muted mb-1">Total</p>
          <p className="text-3xl font-bold text-ink">{stats.total}</p>
        </div>
        <div 
          onClick={() => setFilter('pending_review')}
          className={`bg-surface rounded-xl p-4 border cursor-pointer transition-all ${
            filter === 'pending_review' ? 'border-warning ring-2 ring-warning/20' : 'border-border hover:border-border-strong'
          }`}
        >
          <p className="text-sm text-ink-muted mb-1">Pending Review</p>
          <p className="text-3xl font-bold text-warning">{stats.pending}</p>
        </div>
        <div 
          onClick={() => setFilter('approved')}
          className={`bg-surface rounded-xl p-4 border cursor-pointer transition-all ${
            filter === 'approved' ? 'border-success ring-2 ring-success/20' : 'border-border hover:border-border-strong'
          }`}
        >
          <p className="text-sm text-ink-muted mb-1">Approved</p>
          <p className="text-3xl font-bold text-success">{stats.approved}</p>
        </div>
        <div 
          onClick={() => setFilter('rejected')}
          className={`bg-surface rounded-xl p-4 border cursor-pointer transition-all ${
            filter === 'rejected' ? 'border-danger ring-2 ring-danger/20' : 'border-border hover:border-border-strong'
          }`}
        >
          <p className="text-sm text-ink-muted mb-1">Rejected</p>
          <p className="text-3xl font-bold text-danger">{stats.rejected}</p>
        </div>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-surface/50 rounded-xl border border-border">
          <Loader2 className="w-10 h-10 text-gold-500 animate-spin mb-4" />
          <p className="text-ink-muted">Loading applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16 bg-surface/50 rounded-xl border border-border">
          <div className="w-16 h-16 bg-surface-overlay rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-ink-faint" />
          </div>
          <p className="text-ink-muted font-medium text-lg mb-1">No Applications Found</p>
          <p className="text-ink-faint">
            {filter === 'pending_review' 
              ? 'No applications awaiting review' 
              : filter === 'all'
              ? 'No applications have been submitted yet'
              : `No ${filter} applications`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              isExpanded={expandedId === app.id}
              onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
              onReview={() => setSelectedApp(app)}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedApp && (
        <ReviewModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onReview={handleReview}
        />
      )}
    </div>
  );
}
