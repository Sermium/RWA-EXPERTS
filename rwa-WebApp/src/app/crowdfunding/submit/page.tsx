// src/app/crowdfunding/submit/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useChainId } from 'wagmi';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle,
  Upload, Plus, Trash2, DollarSign, Target, Calendar,
  FileText, Image, Link as LinkIcon, Info
} from 'lucide-react';
import { PROJECT_LIMITS } from '@/config/deployments';

// ============================================================================
// TYPES
// ============================================================================

interface Milestone {
  title: string;
  description: string;
  percentageOfFunds: number;
  targetDate: string;
}

interface FormData {
  // Basic Info
  name: string;
  description: string;
  category: string;
  website: string;
  
  // Token Info
  tokenName: string;
  tokenSymbol: string;
  
  // Funding Info
  fundingGoal: number;
  tokenPrice: number;
  deadlineDays: number;
  minInvestment: number;
  maxInvestment: number;
  
  // Investment Terms
  investorSharePercent: number;
  projectedROI: number;
  roiTimelineMonths: number;
  
  // Milestones
  milestones: Milestone[];
  
  // Documents & Images
  pitchDeckUrl: string;
  legalDocsUrl: string;
  logoUrl: string;
  bannerUrl: string;
}

const CATEGORIES = [
  'Real Estate',
  'Agriculture',
  'Energy',
  'Infrastructure',
  'Art & Collectibles',
  'Commodities',
  'Equipment',
  'Vehicles',
  'Other',
];

const INITIAL_FORM_DATA: FormData = {
  name: '',
  description: '',
  category: '',
  website: '',
  tokenName: '',
  tokenSymbol: '',
  fundingGoal: 100000,
  tokenPrice: 1,
  deadlineDays: 90,
  minInvestment: 100,
  maxInvestment: 0,
  investorSharePercent: 80,
  projectedROI: 15,
  roiTimelineMonths: 24,
  milestones: [
    { title: '', description: '', percentageOfFunds: 25, targetDate: '' },
  ],
  pitchDeckUrl: '',
  legalDocsUrl: '',
  logoUrl: '',
  bannerUrl: '',
};

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface StepProps {
  formData: FormData;
  setFormData: (data: FormData) => void;
  errors: Record<string, string>;
}

function StepBasicInfo({ formData, setFormData, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink mb-2">Basic Information</h2>
        <p className="text-ink-muted">Tell us about your project</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-muted mb-2">
          Project Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Green Energy Solar Farm"
          className={`w-full px-4 py-3 bg-surface-overlay border rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:border-gold-500 ${
            errors.name ? 'border-danger' : 'border-border-strong'
          }`}
        />
        {errors.name && <p className="text-danger text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-muted mb-2">
          Description *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your project, its goals, and why investors should participate..."
          rows={5}
          className={`w-full px-4 py-3 bg-surface-overlay border rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:border-gold-500 resize-none ${
            errors.description ? 'border-danger' : 'border-border-strong'
          }`}
        />
        {errors.description && <p className="text-danger text-sm mt-1">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-muted mb-2">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className={`w-full px-4 py-3 bg-surface-overlay border rounded-xl text-ink focus:outline-none focus:border-gold-500 ${
              errors.category ? 'border-danger' : 'border-border-strong'
            }`}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {errors.category && <p className="text-danger text-sm mt-1">{errors.category}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-muted mb-2">
            Website
          </label>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://yourproject.com"
            className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:border-gold-500"
          />
        </div>
      </div>
    </div>
  );
}

function StepTokenInfo({ formData, setFormData, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink mb-2">Token Information</h2>
        <p className="text-ink-muted">Configure your security token</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-muted mb-2">
            Token Name *
          </label>
          <input
            type="text"
            value={formData.tokenName}
            onChange={(e) => setFormData({ ...formData, tokenName: e.target.value })}
            placeholder="e.g., Green Energy Token"
            className={`w-full px-4 py-3 bg-surface-overlay border rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:border-gold-500 ${
              errors.tokenName ? 'border-danger' : 'border-border-strong'
            }`}
          />
          {errors.tokenName && <p className="text-danger text-sm mt-1">{errors.tokenName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-muted mb-2">
            Token Symbol *
          </label>
          <input
            type="text"
            value={formData.tokenSymbol}
            onChange={(e) => setFormData({ ...formData, tokenSymbol: e.target.value.toUpperCase().slice(0, 6) })}
            placeholder="e.g., GRN"
            maxLength={6}
            className={`w-full px-4 py-3 bg-surface-overlay border rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:border-gold-500 uppercase ${
              errors.tokenSymbol ? 'border-danger' : 'border-border-strong'
            }`}
          />
          {errors.tokenSymbol && <p className="text-danger text-sm mt-1">{errors.tokenSymbol}</p>}
        </div>
      </div>

      <div className="p-4 bg-gold-500/10 border border-gold-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gold-300">
            <p className="font-medium mb-1">About Security Tokens</p>
            <p className="text-gold-400/80">
              Your token will be an ERC-20 compliant security token with built-in compliance features.
              Investors will receive tokens proportional to their investment after the funding goal is reached.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepFundingInfo({ formData, setFormData, errors }: StepProps) {
  const totalSupply = formData.fundingGoal / formData.tokenPrice;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink mb-2">Funding Details</h2>
        <p className="text-ink-muted">Set your funding goal and parameters</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-muted mb-2">
            Funding Goal (USD) *
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" />
            <input
              type="number"
              value={formData.fundingGoal}
              onChange={(e) => setFormData({ ...formData, fundingGoal: Number(e.target.value) })}
              min={PROJECT_LIMITS.MIN_FUNDING_GOAL}
              max={PROJECT_LIMITS.MAX_FUNDING_GOAL}
              className={`w-full pl-10 pr-4 py-3 bg-surface-overlay border rounded-xl text-ink focus:outline-none focus:border-gold-500 ${
                errors.fundingGoal ? 'border-danger' : 'border-border-strong'
              }`}
            />
          </div>
          {errors.fundingGoal && <p className="text-danger text-sm mt-1">{errors.fundingGoal}</p>}
          <p className="text-xs text-ink-faint mt-1">
            Min: ${PROJECT_LIMITS.MIN_FUNDING_GOAL.toLocaleString()}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-muted mb-2">
            Token Price (USD) *
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" />
            <input
              type="number"
              value={formData.tokenPrice}
              onChange={(e) => setFormData({ ...formData, tokenPrice: Number(e.target.value) })}
              min={0.01}
              step={0.01}
              className={`w-full pl-10 pr-4 py-3 bg-surface-overlay border rounded-xl text-ink focus:outline-none focus:border-gold-500 ${
                errors.tokenPrice ? 'border-danger' : 'border-border-strong'
              }`}
            />
          </div>
          {errors.tokenPrice && <p className="text-danger text-sm mt-1">{errors.tokenPrice}</p>}
        </div>
      </div>

      <div className="p-4 bg-surface-overlay/50 rounded-xl">
        <p className="text-sm text-ink-muted">
          Total Token Supply: <span className="text-ink font-semibold">{totalSupply.toLocaleString()}</span> {formData.tokenSymbol || 'tokens'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-muted mb-2">
            Campaign Duration (days) *
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" />
            <input
              type="number"
              value={formData.deadlineDays}
              onChange={(e) => setFormData({ ...formData, deadlineDays: Number(e.target.value) })}
              min={PROJECT_LIMITS.MIN_FUNDRAISE_DAYS}
              max={PROJECT_LIMITS.MAX_FUNDRAISE_DAYS}
              className="w-full pl-10 pr-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:border-gold-500"
            />
          </div>
          <p className="text-xs text-ink-faint mt-1">
            {PROJECT_LIMITS.MIN_FUNDRAISE_DAYS}-{PROJECT_LIMITS.MAX_FUNDRAISE_DAYS} days
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-muted mb-2">
            Min Investment (USD)
          </label>
          <input
            type="number"
            value={formData.minInvestment}
            onChange={(e) => setFormData({ ...formData, minInvestment: Number(e.target.value) })}
            min={PROJECT_LIMITS.MIN_INVESTMENT}
            className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:border-gold-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-muted mb-2">
            Max Investment (USD)
          </label>
          <input
            type="number"
            value={formData.maxInvestment}
            onChange={(e) => setFormData({ ...formData, maxInvestment: Number(e.target.value) })}
            placeholder="No limit"
            className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:border-gold-500"
          />
          <p className="text-xs text-ink-faint mt-1">Leave 0 for no limit</p>
        </div>
      </div>
    </div>
  );
}

function StepInvestmentTerms({ formData, setFormData, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink mb-2">Investment Terms</h2>
        <p className="text-ink-muted">Define returns for your investors</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-muted mb-2">
            Investor Share (%)
          </label>
          <input
            type="number"
            value={formData.investorSharePercent}
            onChange={(e) => setFormData({ ...formData, investorSharePercent: Number(e.target.value) })}
            min={1}
            max={100}
            className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:border-gold-500"
          />
          <p className="text-xs text-ink-faint mt-1">% of profits shared with investors</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-muted mb-2">
            Projected ROI (%)
          </label>
          <input
            type="number"
            value={formData.projectedROI}
            onChange={(e) => setFormData({ ...formData, projectedROI: Number(e.target.value) })}
            min={0}
            className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:border-gold-500"
          />
          <p className="text-xs text-ink-faint mt-1">Expected annual return</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-muted mb-2">
            ROI Timeline (months)
          </label>
          <input
            type="number"
            value={formData.roiTimelineMonths}
            onChange={(e) => setFormData({ ...formData, roiTimelineMonths: Number(e.target.value) })}
            min={1}
            className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:border-gold-500"
          />
          <p className="text-xs text-ink-faint mt-1">Expected payback period</p>
        </div>
      </div>

      <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm text-warning">
            <p className="font-medium mb-1">Disclaimer</p>
            <p className="text-warning/80">
              Projected ROI is an estimate and not guaranteed. Past performance does not guarantee future results.
              All investments carry risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepMilestones({ formData, setFormData, errors }: StepProps) {
  const addMilestone = () => {
    if (formData.milestones.length >= PROJECT_LIMITS.MAX_MILESTONES) return;
    setFormData({
      ...formData,
      milestones: [
        ...formData.milestones,
        { title: '', description: '', percentageOfFunds: 0, targetDate: '' },
      ],
    });
  };

  const removeMilestone = (index: number) => {
    if (formData.milestones.length <= 1) return;
    setFormData({
      ...formData,
      milestones: formData.milestones.filter((_, i) => i !== index),
    });
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string | number) => {
    const updated = [...formData.milestones];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, milestones: updated });
  };

  const totalPercentage = formData.milestones.reduce((sum, m) => sum + m.percentageOfFunds, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink mb-2">Milestones</h2>
          <p className="text-ink-muted">Define how funds will be released</p>
        </div>
        <button
          onClick={addMilestone}
          disabled={formData.milestones.length >= PROJECT_LIMITS.MAX_MILESTONES}
          className="flex items-center gap-2 px-4 py-2 bg-gold-600 hover:bg-gold-700 disabled:bg-border-strong disabled:cursor-not-allowed text-ink rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Milestone
        </button>
      </div>

      {totalPercentage !== 100 && (
        <div className={`p-3 rounded-lg ${totalPercentage > 100 ? 'bg-danger/10 border border-danger/30' : 'bg-warning/10 border border-warning/30'}`}>
          <p className={`text-sm ${totalPercentage > 100 ? 'text-danger' : 'text-warning'}`}>
            Total milestone percentage: {totalPercentage}% (must equal 100%)
          </p>
        </div>
      )}

      <div className="space-y-4">
        {formData.milestones.map((milestone, index) => (
          <div key={index} className="p-4 bg-surface-overlay/50 border border-border-strong rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-ink font-medium">Milestone {index + 1}</h3>
              {formData.milestones.length > 1 && (
                <button
                  onClick={() => removeMilestone(index)}
                  className="p-1 hover:bg-danger/15 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-danger" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-ink-muted mb-1">Title *</label>
                <input
                  type="text"
                  value={milestone.title}
                  onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                  placeholder="e.g., Land Acquisition"
                  className="w-full px-3 py-2 bg-surface-overlay border border-border-strong rounded-lg text-ink text-sm focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-ink-muted mb-1">% of Funds *</label>
                  <input
                    type="number"
                    value={milestone.percentageOfFunds}
                    onChange={(e) => updateMilestone(index, 'percentageOfFunds', Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-full px-3 py-2 bg-surface-overlay border border-border-strong rounded-lg text-ink text-sm focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-ink-muted mb-1">Target Date</label>
                  <input
                    type="date"
                    value={milestone.targetDate}
                    onChange={(e) => updateMilestone(index, 'targetDate', e.target.value)}
                    className="w-full px-3 py-2 bg-surface-overlay border border-border-strong rounded-lg text-ink text-sm focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-ink-muted mb-1">Description</label>
                <textarea
                  value={milestone.description}
                  onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                  placeholder="Describe what will be accomplished..."
                  rows={2}
                  className="w-full px-3 py-2 bg-surface-overlay border border-border-strong rounded-lg text-ink text-sm focus:outline-none focus:border-gold-500 resize-none"
                />
              </div>
            </div>

            <div className="mt-3 text-sm text-ink-muted">
              Amount: ${((formData.fundingGoal * milestone.percentageOfFunds) / 100).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepDocuments({ formData, setFormData, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink mb-2">Documents & Media</h2>
        <p className="text-ink-muted">Upload supporting documents and images</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-muted mb-2">
            <FileText className="w-4 h-4 inline mr-2" />
            Pitch Deck URL
          </label>
          <input
            type="url"
            value={formData.pitchDeckUrl}
            onChange={(e) => setFormData({ ...formData, pitchDeckUrl: e.target.value })}
            placeholder="https://... or ipfs://..."
            className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:border-gold-500"
          />
          <p className="text-xs text-ink-faint mt-1">PDF, PPT, or Google Slides link</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-muted mb-2">
            <FileText className="w-4 h-4 inline mr-2" />
            Legal Documents URL
          </label>
          <input
            type="url"
            value={formData.legalDocsUrl}
            onChange={(e) => setFormData({ ...formData, legalDocsUrl: e.target.value })}
            placeholder="https://... or ipfs://..."
            className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:border-gold-500"
          />
          <p className="text-xs text-ink-faint mt-1">Terms, agreements, compliance docs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-muted mb-2">
            <Image className="w-4 h-4 inline mr-2" />
            Logo URL
          </label>
          <input
            type="url"
            value={formData.logoUrl}
            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
            placeholder="https://... or ipfs://..."
            className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:border-gold-500"
          />
          <p className="text-xs text-ink-faint mt-1">Square image, 400x400px recommended</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-muted mb-2">
            <Image className="w-4 h-4 inline mr-2" />
            Banner URL
          </label>
          <input
            type="url"
            value={formData.bannerUrl}
            onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
            placeholder="https://... or ipfs://..."
            className="w-full px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:border-gold-500"
          />
          <p className="text-xs text-ink-faint mt-1">Wide image, 1920x600px recommended</p>
        </div>
      </div>

      <div className="p-4 bg-gold-500/10 border border-gold-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gold-300">
            <p className="font-medium mb-1">IPFS Recommended</p>
            <p className="text-gold-400/80">
              For permanent storage, upload your files to IPFS via Pinata or similar services.
              Use ipfs:// URLs for maximum decentralization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepReview({ formData }: { formData: FormData }) {
  const totalSupply = formData.fundingGoal / formData.tokenPrice;
  const totalMilestonePercent = formData.milestones.reduce((sum, m) => sum + m.percentageOfFunds, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink mb-2">Review & Submit</h2>
        <p className="text-ink-muted">Please review your project details before submitting</p>
      </div>

      {/* Basic Info */}
      <div className="bg-surface-overlay/50 rounded-xl p-4">
        <h3 className="text-ink font-medium mb-3">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-ink-muted">Project Name:</span>
            <p className="text-ink">{formData.name || '-'}</p>
          </div>
          <div>
            <span className="text-ink-muted">Category:</span>
            <p className="text-ink">{formData.category || '-'}</p>
          </div>
          <div className="col-span-2">
            <span className="text-ink-muted">Description:</span>
            <p className="text-ink line-clamp-3">{formData.description || '-'}</p>
          </div>
        </div>
      </div>

      {/* Token & Funding */}
      <div className="bg-surface-overlay/50 rounded-xl p-4">
        <h3 className="text-ink font-medium mb-3">Token & Funding</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-ink-muted">Token:</span>
            <p className="text-ink">{formData.tokenName} ({formData.tokenSymbol})</p>
          </div>
          <div>
            <span className="text-ink-muted">Funding Goal:</span>
            <p className="text-ink">${formData.fundingGoal.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-ink-muted">Token Price:</span>
            <p className="text-ink">${formData.tokenPrice}</p>
          </div>
          <div>
            <span className="text-ink-muted">Total Supply:</span>
            <p className="text-ink">{totalSupply.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-ink-muted">Duration:</span>
            <p className="text-ink">{formData.deadlineDays} days</p>
          </div>
          <div>
            <span className="text-ink-muted">Min Investment:</span>
            <p className="text-ink">${formData.minInvestment}</p>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-surface-overlay/50 rounded-xl p-4">
        <h3 className="text-ink font-medium mb-3">
          Milestones ({formData.milestones.length})
          <span className={`ml-2 text-sm ${totalMilestonePercent === 100 ? 'text-success' : 'text-danger'}`}>
            ({totalMilestonePercent}%)
          </span>
        </h3>
        <div className="space-y-2">
          {formData.milestones.map((m, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-ink-muted">{m.title || `Milestone ${i + 1}`}</span>
              <span className="text-ink">{m.percentageOfFunds}% (${((formData.fundingGoal * m.percentageOfFunds) / 100).toLocaleString()})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fee Notice */}
      <div className="p-4 bg-success/10 border border-success/30 rounded-xl">
        <div className="flex items-start gap-3">
          <DollarSign className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div className="text-sm text-success">
            <p className="font-medium mb-1">Submission Fee: $500</p>
            <p className="text-success/80">
              A one-time $500 submission fee is required. This fee covers unlimited resubmissions
              if your project needs revisions. You'll be redirected to payment after submission.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const STEPS = [
  { id: 'basic', title: 'Basic Info', component: StepBasicInfo },
  { id: 'token', title: 'Token', component: StepTokenInfo },
  { id: 'funding', title: 'Funding', component: StepFundingInfo },
  { id: 'terms', title: 'Terms', component: StepInvestmentTerms },
  { id: 'milestones', title: 'Milestones', component: StepMilestones },
  { id: 'documents', title: 'Documents', component: StepDocuments },
  { id: 'review', title: 'Review', component: StepReview },
];

export default function CrowdfundingSubmitPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Basic Info
        if (!formData.name.trim()) newErrors.name = 'Project name is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.category) newErrors.category = 'Category is required';
        break;
      case 1: // Token Info
        if (!formData.tokenName.trim()) newErrors.tokenName = 'Token name is required';
        if (!formData.tokenSymbol.trim()) newErrors.tokenSymbol = 'Token symbol is required';
        if (formData.tokenSymbol.length < 2) newErrors.tokenSymbol = 'Symbol must be at least 2 characters';
        break;
      case 2: // Funding Info
        if (formData.fundingGoal < PROJECT_LIMITS.MIN_FUNDING_GOAL) {
          newErrors.fundingGoal = `Minimum funding goal is $${PROJECT_LIMITS.MIN_FUNDING_GOAL.toLocaleString()}`;
        }
        if (formData.tokenPrice <= 0) newErrors.tokenPrice = 'Token price must be greater than 0';
        break;
      case 4: // Milestones
        const totalPercent = formData.milestones.reduce((sum, m) => sum + m.percentageOfFunds, 0);
        if (totalPercent !== 100) {
          newErrors.milestones = 'Milestone percentages must total 100%';
        }
        if (formData.milestones.some(m => !m.title.trim())) {
          newErrors.milestones = 'All milestones must have a title';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!isConnected || !address) {
      setSubmitError('Please connect your wallet');
      return;
    }

    // Validate all steps
    for (let i = 0; i < STEPS.length - 1; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/crowdfunding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          chainId,
          ...formData,
          documents: {
            pitchDeck: formData.pitchDeckUrl,
            legalDocs: formData.legalDocsUrl,
          },
          images: [formData.logoUrl, formData.bannerUrl].filter(Boolean),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      if (data.requiresPayment) {
        // Redirect to payment page
        router.push(`/crowdfunding/payment?applicationId=${data.application.id}`);
      } else {
        // Redirect to success page
        router.push(`/crowdfunding/submitted?applicationId=${data.application.id}`);
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      setSubmitError(error.message || 'Failed to submit project');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-surface-sunken flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-warning mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-ink mb-2">Connect Wallet</h2>
          <p className="text-ink-muted mb-6">Please connect your wallet to submit a crowdfunding project.</p>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = STEPS[currentStep].component;

  return (
    <div className="min-h-screen bg-surface-sunken py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard?tab=owner"
            className="text-ink-muted hover:text-ink flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-ink">Submit Crowdfunding Project</h1>
          <p className="text-ink-muted mt-2">Complete all steps to submit your project for review</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    index < currentStep
                      ? 'bg-green-600 text-ink'
                      : index === currentStep
                      ? 'bg-gold-600 text-ink'
                      : 'bg-surface-overlay text-ink-muted'
                  }`}
                >
                  {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-full h-1 mx-2 ${
                      index < currentStep ? 'bg-green-600' : 'bg-surface-overlay'
                    }`}
                    style={{ width: '40px' }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((step, index) => (
              <span
                key={step.id}
                className={`text-xs ${
                  index === currentStep ? 'text-ink' : 'text-ink-faint'
                }`}
              >
                {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-surface rounded-2xl border border-border p-6 mb-6">
          {currentStep === STEPS.length - 1 ? (
            <StepReview formData={formData} />
          ) : (
            <CurrentStepComponent
              formData={formData}
              setFormData={setFormData}
              errors={errors}
            />
          )}
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
            <p className="text-danger">{submitError}</p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 py-4 bg-surface-overlay hover:bg-border-strong text-ink font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          )}

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className="flex-1 py-4 bg-gold-600 hover:bg-gold-700 text-ink font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-border-strong disabled:cursor-not-allowed text-ink font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Submit & Pay $500
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
