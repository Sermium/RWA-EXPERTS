// src/components/crowdfunding/create/StepReview.tsx
'use client';

import { ProjectMilestone } from '@/types/project';
import { getCurrencyByCode, formatCurrencyAmount } from '@/types/currency';
import { ipfsToHttp } from '@/utils/ipfs';
import { FEE_CONFIG } from '@/config/deployments';
import { ClipboardList, Coins, Target, Scale, Image as ImageIcon, AlertTriangle, CheckCircle2, FileText, ArrowLeft, ArrowRight } from 'lucide-react';

// Convert BPS to percentage
const PLATFORM_TOKEN_FEE_PERCENT = FEE_CONFIG.PLATFORM_TOKEN_FEE_BPS / 100; // 1%
const PLATFORM_RAISE_FEE_PERCENT = FEE_CONFIG.PLATFORM_USDT_FEE_BPS / 100; // 1.5%

interface ProjectData {
  projectName: string;
  category: string;
  description: string;
  website: string;
  localCurrency: string;
  amountToRaiseLocal: number;
  amountToRaise: number;
  exchangeRate: number;
  exchangeRateTimestamp: number;
  milestones: ProjectMilestone[];
  investorSharePercentage: number;
  projectedROI: number;
  roiTimelineMonths: number;
  tokenName: string;
  tokenSymbol: string;
  totalSupply: number;
  platformFee: number;
  platformFeeTokens: number;
  investorTokens: number;
  companyName: string;
  jurisdiction: string;
  registrationNumber: string;
  legalDocuments: File[];
  logo: File | null;
  banner: File | null;
  pitchDeck: File | null;
  images: File[];
}

interface UploadedUrls {
  logo?: string;
  banner?: string;
  pitchDeck?: string;
  legalDocs?: string[];
  images?: string[];
}

interface StepReviewProps {
  data: ProjectData;
  uploadedUrls: UploadedUrls;
  onNext: () => void;
  onBack: () => void;
  isEditMode?: boolean;
  isResubmit?: boolean;
}

export default function StepReview({ data, uploadedUrls, onNext, onBack, isEditMode = false, isResubmit = false, }: StepReviewProps) {
  const currency = getCurrencyByCode(data.localCurrency);
  const isLocalCurrency = data.localCurrency !== 'USD';
  
  // Calculate milestone totals
  const totalMilestonePercentage = data.milestones.reduce((sum, m) => sum + m.percentageOfFunds, 0);
  const totalMilestoneUSD = data.milestones.reduce((sum, m) => sum + m.amountUSD, 0);

  // Format exchange rate date
  const exchangeRateDate = data.exchangeRateTimestamp 
    ? new Date(data.exchangeRateTimestamp).toLocaleString()
    : 'Unknown';

  // Calculate token distribution with correct fee logic
  const platformFeeTokens = Math.round((data.totalSupply * FEE_CONFIG.PLATFORM_TOKEN_FEE_BPS) / FEE_CONFIG.BPS_DENOMINATOR);
  const platformRaiseFee = (data.amountToRaise * FEE_CONFIG.PLATFORM_USDT_FEE_BPS) / FEE_CONFIG.BPS_DENOMINATOR;
  const netToProject = data.amountToRaise - platformRaiseFee;

  // Calculate investor and owner tokens
  let investorTokens: number;
  let ownerTokens: number;
  let investorEffectivePercentage: number;
  let ownerPercentage: number;
  const platformFeeFromInvestors = data.investorSharePercentage >= 99;

  if (data.investorSharePercentage >= 99) {
    // Platform tokens come from investor allocation
    investorTokens = Math.round(data.totalSupply * (data.investorSharePercentage / 100)) - platformFeeTokens;
    ownerTokens = data.totalSupply - investorTokens - platformFeeTokens;
    investorEffectivePercentage = (investorTokens / data.totalSupply) * 100;
    ownerPercentage = (ownerTokens / data.totalSupply) * 100;
  } else {
    // Normal case: platform comes from remainder
    investorTokens = Math.round(data.totalSupply * (data.investorSharePercentage / 100));
    ownerTokens = data.totalSupply - investorTokens - platformFeeTokens;
    investorEffectivePercentage = data.investorSharePercentage;
    ownerPercentage = 100 - data.investorSharePercentage - PLATFORM_TOKEN_FEE_PERCENT;
  }

  // Ensure no negative values
  if (ownerTokens < 0) {
    ownerTokens = 0;
    investorTokens = data.totalSupply - platformFeeTokens;
    investorEffectivePercentage = (investorTokens / data.totalSupply) * 100;
    ownerPercentage = 0;
  }

  // Token price
  const tokenPrice = data.totalSupply > 0 ? data.amountToRaise / data.totalSupply : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-gold/10 to-gold-light/10 rounded-xl p-6 border border-gold/20">
        <h3 className="text-xl font-semibold text-ink mb-2">Review Your Project</h3>
        <p className="text-ink-muted">
          Please review all details carefully before deploying. Some settings cannot be changed after deployment.
        </p>
      </div>

      {/* Basic Information */}
      <section className="bg-surface rounded-xl p-6 border border-border">
        <h4 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-gold/15 text-gold rounded-full flex items-center justify-center"><ClipboardList className="w-4 h-4" /></span>
          Basic Information
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-ink-muted">Project Name</label>
            <p className="text-ink font-medium mt-1">{data.projectName}</p>
          </div>
          <div>
            <label className="text-sm text-ink-muted">Category</label>
            <p className="text-ink font-medium mt-1">{data.category}</p>
          </div>
          <div>
            <label className="text-sm text-ink-muted">Website</label>
            <p className="text-ink font-medium mt-1">
              {data.website ? (
                <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                  {data.website}
                </a>
              ) : (
                <span className="text-ink-faint">Not provided</span>
              )}
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-ink-muted">Description</label>
            <p className="text-ink-muted mt-1 whitespace-pre-wrap">{data.description}</p>
          </div>
        </div>
      </section>

      {/* Currency & Financials */}
      <section className="bg-surface rounded-xl p-6 border border-border">
        <h4 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-gold/15 text-gold rounded-full flex items-center justify-center"><Coins className="w-4 h-4" /></span>
          Currency & Financials
        </h4>

        {/* Currency Info Banner */}
        {isLocalCurrency && (
          <div className="bg-gold/10 border border-gold/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currency?.flag}</span>
              <div>
                <p className="text-ink font-medium">
                  Local Currency: {currency?.name} ({data.localCurrency})
                </p>
                <p className="text-sm text-ink-muted">
                  Exchange Rate: 1 USD = {data.exchangeRate.toFixed(4)} {data.localCurrency}
                  <span className="text-ink-faint ml-2">(as of {exchangeRateDate})</span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Funding Target */}
          <div className="bg-surface-overlay/50 rounded-lg p-4">
            <label className="text-sm text-ink-muted">Funding Target (USD)</label>
            <p className="text-2xl font-bold text-success mt-1">
              ${data.amountToRaise.toLocaleString()}
            </p>
            {isLocalCurrency && (
              <p className="text-sm text-ink-muted mt-1">
                {formatCurrencyAmount(data.amountToRaiseLocal, data.localCurrency)}
              </p>
            )}
          </div>

          {/* Platform Fee */}
          <div className="bg-surface-overlay/50 rounded-lg p-4">
            <label className="text-sm text-ink-muted">Platform Fee ({PLATFORM_RAISE_FEE_PERCENT}%)</label>
            <p className="text-2xl font-bold text-warning mt-1">
              ${platformRaiseFee.toLocaleString()}
            </p>
            {isLocalCurrency && (
              <p className="text-sm text-ink-muted mt-1">
                {formatCurrencyAmount(data.amountToRaiseLocal * (PLATFORM_RAISE_FEE_PERCENT / 100), data.localCurrency)}
              </p>
            )}
          </div>

          {/* Net to Project */}
          <div className="bg-surface-overlay/50 rounded-lg p-4">
            <label className="text-sm text-ink-muted">Net to Project</label>
            <p className="text-2xl font-bold text-gold mt-1">
              ${netToProject.toLocaleString()}
            </p>
            {isLocalCurrency && (
              <p className="text-sm text-ink-muted mt-1">
                {formatCurrencyAmount(data.amountToRaiseLocal * ((100 - PLATFORM_RAISE_FEE_PERCENT) / 100), data.localCurrency)}
              </p>
            )}
          </div>

          {/* Investor Share */}
          <div className="bg-surface-overlay/50 rounded-lg p-4">
            <label className="text-sm text-ink-muted">Investor Share</label>
            <p className="text-2xl font-bold text-gold mt-1">
              {data.investorSharePercentage}%
            </p>
            {data.projectedROI > 0 && (
              <p className="text-sm text-ink-muted mt-1">
                ROI: {data.projectedROI}% / {data.roiTimelineMonths}mo
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="bg-surface rounded-xl p-6 border border-border">
        <h4 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-gold/15 text-gold rounded-full flex items-center justify-center"><Target className="w-4 h-4" /></span>
          Milestones
          <span className="ml-auto text-sm font-normal text-ink-muted">
            {data.milestones.length} milestones • {totalMilestonePercentage}% allocated
          </span>
        </h4>

        {/* Milestones Summary Bar */}
        <div className="mb-6">
          <div className="h-4 bg-surface-overlay rounded-full overflow-hidden flex">
            {data.milestones.map((milestone, index) => {
              const colors = [
                'bg-gold',
                'bg-gold-dark',
                'bg-gold-light',
                'bg-ink-muted',
              ];
              return (
                <div
                  key={milestone.id}
                  className={`${colors[index % colors.length]} h-full transition-all`}
                  style={{ width: `${milestone.percentageOfFunds}%` }}
                  title={`${milestone.title}: ${milestone.percentageOfFunds}%`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-ink-faint">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Milestones List */}
        <div className="space-y-4">
          {data.milestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className="bg-surface-overlay/30 rounded-lg p-4 border border-border-strong"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gold/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-gold font-bold text-sm">{index + 1}</span>
                  </div>
                  <div>
                    <h5 className="font-semibold text-ink">{milestone.title}</h5>
                    {milestone.description && (
                      <p className="text-sm text-ink-muted mt-1">{milestone.description}</p>
                    )}
                    
                    {/* Deliverables */}
                    {milestone.deliverables && milestone.deliverables.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-ink-faint mb-1">Deliverables:</p>
                        <div className="flex flex-wrap gap-2">
                          {milestone.deliverables.map((deliverable, dIndex) => (
                            <span
                              key={dIndex}
                              className="inline-flex items-center gap-1 text-xs bg-border-strong/50 text-ink-muted px-2 py-1 rounded"
                            >
                              <CheckCircle2 className="w-3 h-3 text-success" />
                              {deliverable}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Milestone Financials */}
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-success">
                    {milestone.percentageOfFunds}%
                  </div>
                  <div className="text-sm text-ink">
                    ${milestone.amountUSD.toLocaleString()}
                  </div>
                  {isLocalCurrency && (
                    <div className="text-xs text-ink-muted">
                      {formatCurrencyAmount(milestone.amountLocal, data.localCurrency)}
                    </div>
                  )}
                  {milestone.targetDate && (
                    <div className="text-xs text-ink-faint mt-1">
                      Target: {new Date(milestone.targetDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Milestones Total */}
        <div className="mt-4 pt-4 border-t border-border-strong flex justify-between items-center">
          <span className="text-ink-muted">Total Milestone Allocation</span>
          <div className="text-right">
            <span className={`font-bold ${totalMilestonePercentage === 100 ? 'text-success' : 'text-warning'}`}>
              {totalMilestonePercentage}%
            </span>
            <span className="text-ink-muted mx-2">•</span>
            <span className="text-ink font-medium">${totalMilestoneUSD.toLocaleString()}</span>
            {isLocalCurrency && (
              <>
                <span className="text-ink-muted mx-2">•</span>
                <span className="text-ink-muted">
                  {formatCurrencyAmount(data.amountToRaiseLocal, data.localCurrency)}
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Token Configuration */}
      <section className="bg-surface rounded-xl p-6 border border-border">
        <h4 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-gold/15 text-gold rounded-full flex items-center justify-center"><Coins className="w-4 h-4" /></span>
          Token Configuration
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface-overlay/50 rounded-lg p-4">
            <label className="text-sm text-ink-muted">Token Name</label>
            <p className="text-ink font-medium mt-1">{data.tokenName}</p>
          </div>
          <div className="bg-surface-overlay/50 rounded-lg p-4">
            <label className="text-sm text-ink-muted">Token Symbol</label>
            <p className="text-ink font-medium mt-1">{data.tokenSymbol}</p>
          </div>
          <div className="bg-surface-overlay/50 rounded-lg p-4">
            <label className="text-sm text-ink-muted">Total Supply</label>
            <p className="text-ink font-medium mt-1">{data.totalSupply.toLocaleString()}</p>
          </div>
          <div className="bg-surface-overlay/50 rounded-lg p-4">
            <label className="text-sm text-ink-muted">Token Price</label>
            <p className="text-ink font-medium mt-1">${tokenPrice.toFixed(4)} USD</p>
          </div>
        </div>

        {/* Info banner when platform fee comes from investors */}
        {platformFeeFromInvestors && (
          <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gold">
              With {data.investorSharePercentage}% investor allocation, the {PLATFORM_TOKEN_FEE_PERCENT}% platform fee is deducted from investor tokens. 
              Effective investor share: {investorEffectivePercentage.toFixed(1)}%
            </p>
          </div>
        )}

        {/* Token Distribution */}
        <div>
          <label className="text-sm text-ink-muted mb-3 block">Token Distribution</label>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-6 bg-surface-overlay rounded-full overflow-hidden flex">
              <div
                className="bg-gold h-full"
                style={{ width: `${investorEffectivePercentage}%` }}
              />
              <div
                className="bg-warning h-full"
                style={{ width: `${PLATFORM_TOKEN_FEE_PERCENT}%` }}
              />
              {ownerPercentage > 0 && (
                <div
                  className="bg-gold h-full"
                  style={{ width: `${ownerPercentage}%` }}
                />
              )}
            </div>
          </div>
          <div className={`grid gap-2 text-xs ${ownerPercentage > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gold" />
              <span className="text-gold">
                Investors: {investorEffectivePercentage.toFixed(1)}% ({investorTokens.toLocaleString()} tokens)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span className="text-warning">
                Platform: {PLATFORM_TOKEN_FEE_PERCENT}% ({platformFeeTokens.toLocaleString()} tokens)
              </span>
            </div>
            {ownerPercentage > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gold" />
                <span className="text-gold">
                  Project: {ownerPercentage.toFixed(1)}% ({ownerTokens.toLocaleString()} tokens)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Platform Fees Summary */}
        <div className="mt-6 bg-warning-muted border border-warning/30 rounded-lg p-4">
          <h5 className="text-sm font-medium text-warning mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Platform Fees Summary
          </h5>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Token Fee ({PLATFORM_TOKEN_FEE_PERCENT}%)</span>
                <span className="text-ink">{platformFeeTokens.toLocaleString()} tokens</span>
              </div>
              {platformFeeFromInvestors && (
                <p className="text-xs text-warning mt-1">* Deducted from investor allocation</p>
              )}
            </div>
            <div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Fundraise Fee ({PLATFORM_RAISE_FEE_PERCENT}%)</span>
                <span className="text-ink">${platformRaiseFee.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-4 bg-warning-muted border border-warning/30 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-sm text-warning">
            Token configuration cannot be changed after deployment. Please verify all details are correct.
          </p>
        </div>
      </section>

      {/* Legal Information */}
      <section className="bg-surface rounded-xl p-6 border border-border">
        <h4 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-gold/15 text-gold rounded-full flex items-center justify-center"><Scale className="w-4 h-4" /></span>
          Legal Information
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm text-ink-muted">Company Name</label>
            <p className="text-ink font-medium mt-1">
              {data.companyName || <span className="text-ink-faint">Not provided</span>}
            </p>
          </div>
          <div>
            <label className="text-sm text-ink-muted">Jurisdiction</label>
            <p className="text-ink font-medium mt-1">
              {data.jurisdiction || <span className="text-ink-faint">Not provided</span>}
            </p>
          </div>
          <div>
            <label className="text-sm text-ink-muted">Registration Number</label>
            <p className="text-ink font-medium mt-1">
              {data.registrationNumber || <span className="text-ink-faint">Not provided</span>}
            </p>
          </div>
        </div>

        {data.legalDocuments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <label className="text-sm text-ink-muted mb-2 block">Legal Documents</label>
            <div className="flex flex-wrap gap-2">
              {data.legalDocuments.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-surface-overlay/50 px-3 py-2 rounded-lg"
                >
                  <FileText className="w-4 h-4 text-danger" />
                  <span className="text-sm text-ink-muted">{doc.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Media */}
      <section className="bg-surface rounded-xl p-6 border border-border">
        <h4 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-gold/15 text-gold rounded-full flex items-center justify-center"><ImageIcon className="w-4 h-4" /></span>
          Media
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Logo */}
          <div>
            <label className="text-sm text-ink-muted mb-2 block">Logo</label>
            {data.logo || uploadedUrls.logo ? (
              <div className="aspect-square bg-surface-overlay rounded-lg overflow-hidden">
                <img
                  src={uploadedUrls.logo 
                    ? ipfsToHttp(uploadedUrls.logo) 
                    : (data.logo ? URL.createObjectURL(data.logo) : '')}
                  alt="Project Logo"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square bg-surface-overlay/50 rounded-lg flex items-center justify-center">
                <span className="text-ink-faint text-sm">No logo</span>
              </div>
            )}
          </div>

          {/* Banner */}
          <div className="md:col-span-2">
            <label className="text-sm text-ink-muted mb-2 block">Banner</label>
            {data.banner || uploadedUrls.banner ? (
              <div className="aspect-[3/1] bg-surface-overlay rounded-lg overflow-hidden">
                <img
                  src={uploadedUrls.banner 
                    ? ipfsToHttp(uploadedUrls.banner) 
                    : (data.banner ? URL.createObjectURL(data.banner) : '')}
                  alt="Project Banner"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[3/1] bg-surface-overlay/50 rounded-lg flex items-center justify-center">
                <span className="text-ink-faint text-sm">No banner</span>
              </div>
            )}
          </div>

          {/* Pitch Deck */}
          <div>
            <label className="text-sm text-ink-muted mb-2 block">Pitch Deck</label>
            {data.pitchDeck || uploadedUrls.pitchDeck ? (
              <div className="aspect-square bg-surface-overlay rounded-lg flex flex-col items-center justify-center p-4">
                <FileText className="w-10 h-10 text-danger mb-2" />
                <span className="text-xs text-ink-muted text-center truncate max-w-full">
                  {data.pitchDeck?.name || 'pitch-deck.pdf'}
                </span>
              </div>
            ) : (
              <div className="aspect-square bg-surface-overlay/50 rounded-lg flex items-center justify-center">
                <span className="text-ink-faint text-sm">No pitch deck</span>
              </div>
            )}
          </div>
        </div>

        {/* Additional Images */}
        {data.images.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <label className="text-sm text-ink-muted mb-2 block">Additional Images ({data.images.length})</label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {data.images.map((image, index) => (
                <div key={index} className="w-20 h-20 flex-shrink-0 bg-surface-overlay rounded-lg overflow-hidden">
                  <img
                    src={uploadedUrls.images?.[index] 
                      ? ipfsToHttp(uploadedUrls.images[index]) 
                      : URL.createObjectURL(image)}
                    alt={`Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Summary Card */}
      <section className="bg-gradient-to-r from-gold/10 to-gold-light/10 rounded-xl p-6 border border-gold/20">
        <h4 className="text-lg font-semibold text-ink mb-4">Deployment Summary</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-success">
              ${data.amountToRaise.toLocaleString()}
            </div>
            <div className="text-sm text-ink-muted">Funding Target</div>
            {isLocalCurrency && (
              <div className="text-xs text-ink-faint">
                {formatCurrencyAmount(data.amountToRaiseLocal, data.localCurrency)}
              </div>
            )}
          </div>
          <div>
            <div className="text-2xl font-bold text-gold">
              {data.milestones.length}
            </div>
            <div className="text-sm text-ink-muted">Milestones</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gold">
              {data.totalSupply.toLocaleString()}
            </div>
            <div className="text-sm text-ink-muted">{data.tokenSymbol} Tokens</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gold">
              ${tokenPrice.toFixed(4)}
            </div>
            <div className="text-sm text-ink-muted">Token Price</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gold">
              {investorEffectivePercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-ink-muted">Investor Share</div>
          </div>
        </div>
      </section>

      {/* Final Warning */}
      <div className="bg-danger-muted border border-danger/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-danger flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-danger font-medium">Before You Deploy</p>
          <ul className="text-sm text-danger/80 mt-1 space-y-1">
            <li>• Token configuration, milestone structure, and funding target are permanent</li>
            <li>• Deploying will require gas fees on Avalanche Fuji</li>
            <li>• Make sure all legal documents and business plan are accurate</li>
            <li>• Platform fees: {PLATFORM_TOKEN_FEE_PERCENT}% of tokens + {PLATFORM_RAISE_FEE_PERCENT}% of funds raised</li>
            {isLocalCurrency && (
              <li>• Exchange rate ({data.exchangeRate.toFixed(4)} {data.localCurrency}/USD) was captured at {exchangeRateDate}</li>
            )}
          </ul>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          type="button"
          className="px-6 py-3 bg-surface-overlay hover:bg-border-strong text-ink rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Edit
        </button>
        <button
          onClick={onNext}
          type="button"
          className="px-8 py-3 bg-gold hover:bg-gold-light text-surface-sunken rounded-lg font-semibold transition-colors flex items-center gap-2"
        >
          {isResubmit ? 'Resubmit for Review' : 'Continue to Payment'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
