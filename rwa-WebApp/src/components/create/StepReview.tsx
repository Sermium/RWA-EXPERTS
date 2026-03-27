// src/components/create/StepReview.tsx
'use client';

import { ProjectMilestone } from '@/types/project';
import { getCurrencyByCode, formatCurrencyAmount } from '@/types/currency';
import { ipfsToHttp } from '@/utils/ipfs';
import { FEE_CONFIG } from '@/config/deployments';

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
      <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl p-6 border border-green-500/20">
        <h3 className="text-xl font-semibold text-white mb-2">Review Your Project</h3>
        <p className="text-gray-400">
          Please review all details carefully before deploying. Some settings cannot be changed after deployment.
        </p>
      </div>

      {/* Basic Information */}
      <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-sm">📋</span>
          Basic Information
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-gray-400">Project Name</label>
            <p className="text-white font-medium mt-1">{data.projectName}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Category</label>
            <p className="text-white font-medium mt-1">{data.category}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Website</label>
            <p className="text-white font-medium mt-1">
              {data.website ? (
                <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  {data.website}
                </a>
              ) : (
                <span className="text-gray-500">Not provided</span>
              )}
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-400">Description</label>
            <p className="text-gray-300 mt-1 whitespace-pre-wrap">{data.description}</p>
          </div>
        </div>
      </section>

      {/* Currency & Financials */}
      <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-sm">💰</span>
          Currency & Financials
        </h4>

        {/* Currency Info Banner */}
        {isLocalCurrency && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currency?.flag}</span>
              <div>
                <p className="text-white font-medium">
                  Local Currency: {currency?.name} ({data.localCurrency})
                </p>
                <p className="text-sm text-gray-400">
                  Exchange Rate: 1 USD = {data.exchangeRate.toFixed(4)} {data.localCurrency}
                  <span className="text-gray-500 ml-2">(as of {exchangeRateDate})</span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Funding Target */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <label className="text-sm text-gray-400">Funding Target (USD)</label>
            <p className="text-2xl font-bold text-green-400 mt-1">
              ${data.amountToRaise.toLocaleString()}
            </p>
            {isLocalCurrency && (
              <p className="text-sm text-gray-400 mt-1">
                {formatCurrencyAmount(data.amountToRaiseLocal, data.localCurrency)}
              </p>
            )}
          </div>

          {/* Platform Fee */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <label className="text-sm text-gray-400">Platform Fee ({PLATFORM_RAISE_FEE_PERCENT}%)</label>
            <p className="text-2xl font-bold text-yellow-400 mt-1">
              ${platformRaiseFee.toLocaleString()}
            </p>
            {isLocalCurrency && (
              <p className="text-sm text-gray-400 mt-1">
                {formatCurrencyAmount(data.amountToRaiseLocal * (PLATFORM_RAISE_FEE_PERCENT / 100), data.localCurrency)}
              </p>
            )}
          </div>

          {/* Net to Project */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <label className="text-sm text-gray-400">Net to Project</label>
            <p className="text-2xl font-bold text-blue-400 mt-1">
              ${netToProject.toLocaleString()}
            </p>
            {isLocalCurrency && (
              <p className="text-sm text-gray-400 mt-1">
                {formatCurrencyAmount(data.amountToRaiseLocal * ((100 - PLATFORM_RAISE_FEE_PERCENT) / 100), data.localCurrency)}
              </p>
            )}
          </div>

          {/* Investor Share */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <label className="text-sm text-gray-400">Investor Share</label>
            <p className="text-2xl font-bold text-purple-400 mt-1">
              {data.investorSharePercentage}%
            </p>
            {data.projectedROI > 0 && (
              <p className="text-sm text-gray-400 mt-1">
                ROI: {data.projectedROI}% / {data.roiTimelineMonths}mo
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-sm">🎯</span>
          Milestones
          <span className="ml-auto text-sm font-normal text-gray-400">
            {data.milestones.length} milestones • {totalMilestonePercentage}% allocated
          </span>
        </h4>

        {/* Milestones Summary Bar */}
        <div className="mb-6">
          <div className="h-4 bg-gray-700 rounded-full overflow-hidden flex">
            {data.milestones.map((milestone, index) => {
              const colors = [
                'bg-blue-500',
                'bg-green-500',
                'bg-purple-500',
                'bg-yellow-500',
                'bg-pink-500',
                'bg-cyan-500',
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
          <div className="flex justify-between mt-2 text-xs text-gray-500">
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
              className="bg-gray-700/30 rounded-lg p-4 border border-gray-600"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 font-bold text-sm">{index + 1}</span>
                  </div>
                  <div>
                    <h5 className="font-semibold text-white">{milestone.title}</h5>
                    {milestone.description && (
                      <p className="text-sm text-gray-400 mt-1">{milestone.description}</p>
                    )}
                    
                    {/* Deliverables */}
                    {milestone.deliverables && milestone.deliverables.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-1">Deliverables:</p>
                        <div className="flex flex-wrap gap-2">
                          {milestone.deliverables.map((deliverable, dIndex) => (
                            <span
                              key={dIndex}
                              className="inline-flex items-center gap-1 text-xs bg-gray-600/50 text-gray-300 px-2 py-1 rounded"
                            >
                              <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
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
                  <div className="text-lg font-bold text-green-400">
                    {milestone.percentageOfFunds}%
                  </div>
                  <div className="text-sm text-white">
                    ${milestone.amountUSD.toLocaleString()}
                  </div>
                  {isLocalCurrency && (
                    <div className="text-xs text-gray-400">
                      {formatCurrencyAmount(milestone.amountLocal, data.localCurrency)}
                    </div>
                  )}
                  {milestone.targetDate && (
                    <div className="text-xs text-gray-500 mt-1">
                      Target: {new Date(milestone.targetDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Milestones Total */}
        <div className="mt-4 pt-4 border-t border-gray-600 flex justify-between items-center">
          <span className="text-gray-400">Total Milestone Allocation</span>
          <div className="text-right">
            <span className={`font-bold ${totalMilestonePercentage === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
              {totalMilestonePercentage}%
            </span>
            <span className="text-gray-400 mx-2">•</span>
            <span className="text-white font-medium">${totalMilestoneUSD.toLocaleString()}</span>
            {isLocalCurrency && (
              <>
                <span className="text-gray-400 mx-2">•</span>
                <span className="text-gray-400">
                  {formatCurrencyAmount(data.amountToRaiseLocal, data.localCurrency)}
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Token Configuration */}
      <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center text-sm">🪙</span>
          Token Configuration
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <label className="text-sm text-gray-400">Token Name</label>
            <p className="text-white font-medium mt-1">{data.tokenName}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <label className="text-sm text-gray-400">Token Symbol</label>
            <p className="text-white font-medium mt-1">{data.tokenSymbol}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <label className="text-sm text-gray-400">Total Supply</label>
            <p className="text-white font-medium mt-1">{data.totalSupply.toLocaleString()}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <label className="text-sm text-gray-400">Token Price</label>
            <p className="text-white font-medium mt-1">${tokenPrice.toFixed(4)} USD</p>
          </div>
        </div>

        {/* Info banner when platform fee comes from investors */}
        {platformFeeFromInvestors && (
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 mb-4 flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-blue-300">
              With {data.investorSharePercentage}% investor allocation, the {PLATFORM_TOKEN_FEE_PERCENT}% platform fee is deducted from investor tokens. 
              Effective investor share: {investorEffectivePercentage.toFixed(1)}%
            </p>
          </div>
        )}

        {/* Token Distribution */}
        <div>
          <label className="text-sm text-gray-400 mb-3 block">Token Distribution</label>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden flex">
              <div
                className="bg-blue-500 h-full"
                style={{ width: `${investorEffectivePercentage}%` }}
              />
              <div
                className="bg-amber-500 h-full"
                style={{ width: `${PLATFORM_TOKEN_FEE_PERCENT}%` }}
              />
              {ownerPercentage > 0 && (
                <div
                  className="bg-purple-500 h-full"
                  style={{ width: `${ownerPercentage}%` }}
                />
              )}
            </div>
          </div>
          <div className={`grid gap-2 text-xs ${ownerPercentage > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-blue-400">
                Investors: {investorEffectivePercentage.toFixed(1)}% ({investorTokens.toLocaleString()} tokens)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-amber-400">
                Platform: {PLATFORM_TOKEN_FEE_PERCENT}% ({platformFeeTokens.toLocaleString()} tokens)
              </span>
            </div>
            {ownerPercentage > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-purple-400">
                  Project: {ownerPercentage.toFixed(1)}% ({ownerTokens.toLocaleString()} tokens)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Platform Fees Summary */}
        <div className="mt-6 bg-amber-900/20 border border-amber-700/50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-amber-300 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Platform Fees Summary
          </h5>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex justify-between">
                <span className="text-gray-400">Token Fee ({PLATFORM_TOKEN_FEE_PERCENT}%)</span>
                <span className="text-white">{platformFeeTokens.toLocaleString()} tokens</span>
              </div>
              {platformFeeFromInvestors && (
                <p className="text-xs text-amber-400 mt-1">* Deducted from investor allocation</p>
              )}
            </div>
            <div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fundraise Fee ({PLATFORM_RAISE_FEE_PERCENT}%)</span>
                <span className="text-white">${platformRaiseFee.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-2">
          <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-yellow-400">
            Token configuration cannot be changed after deployment. Please verify all details are correct.
          </p>
        </div>
      </section>

      {/* Legal Information */}
      <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center text-sm">⚖️</span>
          Legal Information
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm text-gray-400">Company Name</label>
            <p className="text-white font-medium mt-1">
              {data.companyName || <span className="text-gray-500">Not provided</span>}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Jurisdiction</label>
            <p className="text-white font-medium mt-1">
              {data.jurisdiction || <span className="text-gray-500">Not provided</span>}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Registration Number</label>
            <p className="text-white font-medium mt-1">
              {data.registrationNumber || <span className="text-gray-500">Not provided</span>}
            </p>
          </div>
        </div>

        {data.legalDocuments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <label className="text-sm text-gray-400 mb-2 block">Legal Documents</label>
            <div className="flex flex-wrap gap-2">
              {data.legalDocuments.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-gray-700/50 px-3 py-2 rounded-lg"
                >
                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-300">{doc.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Media */}
      <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-pink-500/20 rounded-full flex items-center justify-center text-sm">🖼️</span>
          Media
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Logo */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Logo</label>
            {data.logo || uploadedUrls.logo ? (
              <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden">
                <img
                  src={uploadedUrls.logo 
                    ? ipfsToHttp(uploadedUrls.logo) 
                    : (data.logo ? URL.createObjectURL(data.logo) : '')}
                  alt="Project Logo"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square bg-gray-700/50 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 text-sm">No logo</span>
              </div>
            )}
          </div>

          {/* Banner */}
          <div className="md:col-span-2">
            <label className="text-sm text-gray-400 mb-2 block">Banner</label>
            {data.banner || uploadedUrls.banner ? (
              <div className="aspect-[3/1] bg-gray-700 rounded-lg overflow-hidden">
                <img
                  src={uploadedUrls.banner 
                    ? ipfsToHttp(uploadedUrls.banner) 
                    : (data.banner ? URL.createObjectURL(data.banner) : '')}
                  alt="Project Banner"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[3/1] bg-gray-700/50 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 text-sm">No banner</span>
              </div>
            )}
          </div>

          {/* Pitch Deck */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Pitch Deck</label>
            {data.pitchDeck || uploadedUrls.pitchDeck ? (
              <div className="aspect-square bg-gray-700 rounded-lg flex flex-col items-center justify-center p-4">
                <svg className="w-10 h-10 text-red-400 mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-gray-400 text-center truncate max-w-full">
                  {data.pitchDeck?.name || 'pitch-deck.pdf'}
                </span>
              </div>
            ) : (
              <div className="aspect-square bg-gray-700/50 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 text-sm">No pitch deck</span>
              </div>
            )}
          </div>
        </div>

        {/* Additional Images */}
        {data.images.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <label className="text-sm text-gray-400 mb-2 block">Additional Images ({data.images.length})</label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {data.images.map((image, index) => (
                <div key={index} className="w-20 h-20 flex-shrink-0 bg-gray-700 rounded-lg overflow-hidden">
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
      <section className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20">
        <h4 className="text-lg font-semibold text-white mb-4">Deployment Summary</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-400">
              ${data.amountToRaise.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Funding Target</div>
            {isLocalCurrency && (
              <div className="text-xs text-gray-500">
                {formatCurrencyAmount(data.amountToRaiseLocal, data.localCurrency)}
              </div>
            )}
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">
              {data.milestones.length}
            </div>
            <div className="text-sm text-gray-400">Milestones</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">
              {data.totalSupply.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">{data.tokenSymbol} Tokens</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-cyan-400">
              ${tokenPrice.toFixed(4)}
            </div>
            <div className="text-sm text-gray-400">Token Price</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">
              {investorEffectivePercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400">Investor Share</div>
          </div>
        </div>
      </section>

      {/* Final Warning */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
        <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="text-red-400 font-medium">Before You Deploy</p>
          <ul className="text-sm text-red-400/80 mt-1 space-y-1">
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
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Edit
        </button>
        <button
          onClick={onNext}
          type="button"
          className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
        >
          {isResubmit ? 'Resubmit for Review' : 'Continue to Payment'}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
