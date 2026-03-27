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
    'Real Estate': 'from-blue-500 to-cyan-500',
    'Infrastructure': 'from-orange-500 to-amber-500',
    'Business Equity': 'from-purple-500 to-pink-500',
    'Revenue Based': 'from-green-500 to-emerald-500',
    'Art & Collectibles': 'from-rose-500 to-red-500',
  };
  return colors[category] || 'from-gray-500 to-gray-600';
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
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  };

  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2 opacity-80">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
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
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-all">
      {/* Banner */}
      {app.bannerUrl && (
        <div className="relative h-32 bg-gradient-to-r from-gray-700 to-gray-800 overflow-hidden">
          <Image
            src={app.bannerUrl}
            alt={`${app.name} banner`}
            fill
            className="object-cover opacity-80"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent" />
        </div>
      )}

      {/* Header Row */}
      <div
        className={`p-4 flex items-center justify-between cursor-pointer hover:bg-gray-700/30 transition-colors ${app.bannerUrl ? '-mt-12 relative z-10' : ''}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className={`w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 border-gray-700 bg-gradient-to-br ${getCategoryColor(app.category)}`}>
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
              <div className="w-full h-full flex items-center justify-center text-white">
                {getCategoryIcon(app.category)}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold text-lg">{app.name}</h3>
              <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs font-medium">
                {app.tokenSymbol}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-400 flex items-center gap-1">
                <Target className="w-3 h-3" />
                {formatCurrency(app.fundingGoal)}
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-sm text-gray-400">{app.category}</span>
              <span className="text-gray-600">•</span>
              <span className="text-sm text-gray-500">{formatDate(app.submittedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {app.feePaid && (
            <span className="px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Paid
            </span>
          )}
          {getStatusBadge(app.status)}
          <div className="p-1.5 rounded-lg bg-gray-700/50">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-700/50">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 py-4">
            <div className="bg-gray-700/30 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Token Price</p>
              <p className="text-white font-semibold">${app.tokenPrice}</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Total Supply</p>
              <p className="text-white font-semibold">{totalSupply.toLocaleString()}</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Investor Share</p>
              <p className="text-white font-semibold">{app.investorSharePercent}%</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Projected ROI</p>
              <p className="text-green-400 font-semibold">{app.projectedROI}%</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">ROI Timeline</p>
              <p className="text-white font-semibold">{app.roiTimelineMonths} mo</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-300 text-sm mb-4 line-clamp-3">{app.description}</p>

          {/* Milestones Preview */}
          {app.milestones && app.milestones.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Milestone className="w-3 h-3" />
                {app.milestones.length} Milestones
              </p>
              <div className="flex gap-1">
                {app.milestones.slice(0, 5).map((m, i) => (
                  <div
                    key={i}
                    className="flex-1 h-2 rounded-full bg-blue-500/30"
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-gray-300 text-xs transition-colors"
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-gray-300 text-xs transition-colors"
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-gray-300 text-xs transition-colors"
              >
                <Play className="w-3 h-3" />
                Video
              </a>
            )}
            {app.legalDocuments && app.legalDocuments.length > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/50 rounded-lg text-gray-400 text-xs">
                <FileCheck className="w-3 h-3" />
                {app.legalDocuments.length} Documents
              </span>
            )}
          </div>

          {/* Rejection Reason */}
          {app.rejectionReason && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-400 font-medium mb-1">Rejection Reason:</p>
              <p className="text-sm text-red-300">{app.rejectionReason}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReview();
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
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
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded-lg text-sm font-medium transition-colors"
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-gray-700 shadow-2xl">
        {/* Banner Header */}
        <div className="relative h-48 bg-gradient-to-r from-gray-800 to-gray-700 overflow-hidden">
          {application.bannerUrl && (
            <Image
              src={application.bannerUrl}
              alt={`${application.name} banner`}
              fill
              className="object-cover opacity-60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
          
          {/* Close Button */}
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>

          {/* Project Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end gap-4">
              {/* Logo */}
              <div className={`w-20 h-20 rounded-xl overflow-hidden border-4 border-gray-900 bg-gradient-to-br ${getCategoryColor(application.category)} flex-shrink-0`}>
                {application.logoUrl ? (
                  <Image
                    src={application.logoUrl}
                    alt={application.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-2xl">
                    {getCategoryIcon(application.category)}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-white truncate">{application.name}</h2>
                  <span className="px-2 py-1 bg-white/20 text-white rounded-lg text-sm font-medium">
                    {application.tokenSymbol}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="flex items-center gap-1">
                    {getCategoryIcon(application.category)}
                    {application.category}
                  </span>
                  <span>•</span>
                  <span>Submitted {formatDate(application.submittedAt)}</span>
                  <span>•</span>
                  <span className="font-mono text-xs bg-black/30 px-2 py-0.5 rounded">
                    {application.walletAddress.slice(0, 6)}...{application.walletAddress.slice(-4)}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex-shrink-0">
                {application.status === 'pending_review' && (
                  <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-xl text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Pending Review
                  </span>
                )}
                {application.status === 'approved' && (
                  <span className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Approved
                  </span>
                )}
                {application.status === 'rejected' && (
                  <span className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-sm font-medium flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Rejected
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="border-b border-gray-700 px-6">
          <div className="flex gap-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeSection === section.id
                    ? 'text-blue-400 border-blue-400'
                    : 'text-gray-400 border-transparent hover:text-white'
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
              <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  Project Description
                </h3>
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{application.description}</p>
              </div>

              {/* Company Info */}
              {(application.companyName || application.jurisdiction) && (
                <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    Company Information
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {application.companyName && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Company Name</p>
                        <p className="text-white">{application.companyName}</p>
                      </div>
                    )}
                    {application.registrationNumber && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Registration #</p>
                        <p className="text-white font-mono">{application.registrationNumber}</p>
                      </div>
                    )}
                    {application.jurisdiction && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Jurisdiction</p>
                        <p className="text-white">{application.jurisdiction}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Previous Rejection */}
              {application.rejectionReason && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
                  <h3 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Previous Rejection Reason
                  </h3>
                  <p className="text-red-300">{application.rejectionReason}</p>
                </div>
              )}
            </div>
          )}

          {/* Financials Section */}
          {activeSection === 'financials' && (
            <div className="space-y-6">
              {/* Token Economics */}
              <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-gray-400" />
                  Token Economics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Token Name</p>
                    <p className="text-white font-semibold">{application.tokenName}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Token Symbol</p>
                    <p className="text-white font-semibold">{application.tokenSymbol}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Token Price</p>
                    <p className="text-white font-semibold">${application.tokenPrice}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Total Supply</p>
                    <p className="text-white font-semibold">{totalSupply.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Funding Goal</p>
                    <p className="text-white font-semibold">${application.fundingGoal.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Campaign Duration</p>
                    <p className="text-white font-semibold">{application.deadlineDays} days</p>
                  </div>
                </div>
              </div>

              {/* Investment Terms */}
              <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-gray-400" />
                  Investment Terms
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-5 text-center">
                    <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-1">Investor Share</p>
                    <p className="text-2xl font-bold text-white">{application.investorSharePercent}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-5 text-center">
                    <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-1">Projected ROI</p>
                    <p className="text-2xl font-bold text-green-400">{application.projectedROI}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-5 text-center">
                    <Timer className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-1">ROI Timeline</p>
                    <p className="text-2xl font-bold text-white">{application.roiTimelineMonths} mo</p>
                  </div>
                </div>
              </div>

              {/* Fee Status */}
              <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  Submission Fee
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${application.feePaid ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {application.feePaid ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {application.feePaid ? 'Fee Paid' : 'Fee Not Paid'}
                      </p>
                      <p className="text-sm text-gray-400">
                        Submission #{application.submissionCount}
                      </p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">${application.feeAmount}</p>
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
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-medium">Milestone Distribution</h3>
                      <span className="text-sm text-gray-400">{application.milestones.length} milestones</span>
                    </div>
                    <div className="flex h-4 rounded-full overflow-hidden bg-gray-700">
                      {application.milestones.map((m, i) => {
                        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-cyan-500', 'bg-pink-500', 'bg-orange-500'];
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
                    <div key={i} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                            {i + 1}
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{m.title || `Milestone ${i + 1}`}</h4>
                            {m.deadline && (
                              <p className="text-xs text-gray-500">Due: {m.deadline}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">{m.percentage || m.percentageOfFunds}%</p>
                          <p className="text-sm text-green-400">
                            ${((application.fundingGoal * (m.percentage || m.percentageOfFunds)) / 100).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {m.description && (
                        <p className="text-gray-400 text-sm">{m.description}</p>
                      )}
                      {m.deliverables && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <p className="text-xs text-gray-500 mb-1">Deliverables:</p>
                          <p className="text-sm text-gray-300">{m.deliverables}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700">
                  <Milestone className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No milestones defined</p>
                </div>
              )}
            </div>
          )}

          {/* Documents Section */}
          {activeSection === 'documents' && (
            <div className="space-y-6">
              {/* Media */}
              <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                  Media Assets
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {application.logoUrl && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Logo</p>
                      <div className="w-24 h-24 rounded-xl overflow-hidden border border-gray-600">
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
                      <p className="text-xs text-gray-500 mb-2">Banner</p>
                      <div className="h-24 rounded-xl overflow-hidden border border-gray-600">
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
                    <p className="text-xs text-gray-500 mb-2">Additional Images ({application.images.length})</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {application.images.map((img, i) => (
                        <div key={i} className="w-20 h-20 rounded-lg overflow-hidden border border-gray-600 flex-shrink-0">
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
              <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-gray-400" />
                  Documents & Links
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {application.pitchDeckUrl && (
                    <a
                      href={application.pitchDeckUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition-colors group"
                    >
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium">Pitch Deck</p>
                        <p className="text-xs text-gray-400 truncate">View presentation</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                    </a>
                  )}
                  {application.videoUrl && (
                    <a
                      href={application.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition-colors group"
                    >
                      <div className="p-2 bg-red-500/20 rounded-lg">
                        <Play className="w-5 h-5 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium">Video</p>
                        <p className="text-xs text-gray-400 truncate">Watch presentation</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                    </a>
                  )}
                  {application.website && (
                    <a
                      href={application.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition-colors group"
                    >
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <Globe className="w-5 h-5 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium">Website</p>
                        <p className="text-xs text-gray-400 truncate">{application.website}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                    </a>
                  )}
                </div>

                {/* Legal Documents */}
                {application.legalDocuments && application.legalDocuments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400 mb-3">Legal Documents ({application.legalDocuments.length})</p>
                    <div className="space-y-2">
                      {application.legalDocuments.map((doc, i) => (
                        <a
                          key={i}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-gray-400" />
                            <span className="text-white text-sm">{doc.type || `Document ${i + 1}`}</span>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-500" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Documents */}
                {!application.pitchDeckUrl && !application.videoUrl && !application.website && 
                 (!application.legalDocuments || application.legalDocuments.length === 0) && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No documents uploaded</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-700 bg-gray-800/50">
          <div className="flex flex-col gap-4">
            {/* Action Selection */}
            {application.status === 'pending_review' && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setAction('approve')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    action === 'approve'
                      ? 'border-green-500 bg-green-500/20 shadow-lg shadow-green-500/20'
                      : 'border-gray-600 hover:border-green-500/50 bg-gray-800/50'
                  }`}
                >
                  <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${action === 'approve' ? 'text-green-400' : 'text-gray-500'}`} />
                  <p className={`font-medium text-center ${action === 'approve' ? 'text-green-400' : 'text-gray-400'}`}>
                    Approve
                  </p>
                  <p className="text-xs text-gray-500 text-center mt-1">Ready for deployment</p>
                </button>
                <button
                  onClick={() => setAction('reject')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    action === 'reject'
                      ? 'border-red-500 bg-red-500/20 shadow-lg shadow-red-500/20'
                      : 'border-gray-600 hover:border-red-500/50 bg-gray-800/50'
                  }`}
                >
                  <XCircle className={`w-8 h-8 mx-auto mb-2 ${action === 'reject' ? 'text-red-400' : 'text-gray-500'}`} />
                  <p className={`font-medium text-center ${action === 'reject' ? 'text-red-400' : 'text-gray-400'}`}>
                    Reject
                  </p>
                  <p className="text-xs text-gray-500 text-center mt-1">Request changes</p>
                </button>
              </div>
            )}

            {/* Rejection Reason */}
            {action === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rejection Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this application is being rejected and what needs to be fixed..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none"
                />
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              {application.status === 'pending_review' && (
                <button
                  onClick={handleSubmit}
                  disabled={!action || isSubmitting}
                  className={`flex-1 py-3 font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/25'
                      : action === 'reject'
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25'
                      : 'bg-gray-600 text-gray-400'
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
          <span className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case 'deployed':
        return (
          <span className="px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3" />
            Deployed
          </span>
        );
      default:
        return (
          <span className="px-3 py-1.5 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-lg text-xs font-medium">
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
          <h2 className="text-2xl font-bold text-white">Crowdfunding Applications</h2>
          <p className="text-gray-400 mt-1">Review and manage project submissions</p>
        </div>
        <button
          onClick={() => {
            loadApplications();
            onRefresh?.();
          }}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="text-gray-300 text-sm font-medium">Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setFilter('all')}
          className={`bg-gray-800 rounded-xl p-4 border cursor-pointer transition-all ${
            filter === 'all' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <p className="text-sm text-gray-400 mb-1">Total</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div 
          onClick={() => setFilter('pending_review')}
          className={`bg-gray-800 rounded-xl p-4 border cursor-pointer transition-all ${
            filter === 'pending_review' ? 'border-yellow-500 ring-2 ring-yellow-500/20' : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <p className="text-sm text-gray-400 mb-1">Pending Review</p>
          <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
        </div>
        <div 
          onClick={() => setFilter('approved')}
          className={`bg-gray-800 rounded-xl p-4 border cursor-pointer transition-all ${
            filter === 'approved' ? 'border-green-500 ring-2 ring-green-500/20' : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <p className="text-sm text-gray-400 mb-1">Approved</p>
          <p className="text-3xl font-bold text-green-400">{stats.approved}</p>
        </div>
        <div 
          onClick={() => setFilter('rejected')}
          className={`bg-gray-800 rounded-xl p-4 border cursor-pointer transition-all ${
            filter === 'rejected' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <p className="text-sm text-gray-400 mb-1">Rejected</p>
          <p className="text-3xl font-bold text-red-400">{stats.rejected}</p>
        </div>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-gray-800/50 rounded-xl border border-gray-700">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-400">Loading applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/50 rounded-xl border border-gray-700">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-300 font-medium text-lg mb-1">No Applications Found</p>
          <p className="text-gray-500">
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
