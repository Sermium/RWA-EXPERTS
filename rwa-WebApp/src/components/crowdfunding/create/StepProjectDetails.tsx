// src/components/crowdfunding/create/StepProjectDetails.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Info, ChevronDown, ChevronUp, FileText, Building2, 
  Target, Shield, TrendingUp, Users, Clock, CheckCircle, CheckCircle2,
  AlertCircle, DollarSign, Percent, Calendar, Globe, Package, Lightbulb,
  Briefcase, MapPin, Hash, Coins, Calculator, Factory, Palette, Gem, Car,
  Loader2
} from 'lucide-react'
import { ProjectData, REQUIRED_LEGAL_DOCUMENTS } from '@/app/crowdfunding/create/page'
import { FEE_CONFIG } from '@/config/deployments'
import { usePublicClient } from 'wagmi'
import { useChainConfig } from '@/hooks/useChainConfig'

// ============================================================================
// TYPES
// ============================================================================

interface StepProjectDetailsProps {
  data: ProjectData
  updateData: (updates: Partial<ProjectData>) => void
  onNext: () => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Convert BPS to percentage
const PLATFORM_TOKEN_FEE_PERCENT = FEE_CONFIG.PLATFORM_TOKEN_FEE_BPS / 100 // 1%
const PLATFORM_RAISE_FEE_PERCENT = FEE_CONFIG.PLATFORM_USDT_FEE_BPS / 100 // 1.5%
const INVESTOR_TOKEN_PERCENT = FEE_CONFIG.INVESTOR_TOKEN_BPS / 100 // 99%

// ABI for name check
const PROJECT_NFT_ABI = [
  {
    name: 'isNameTaken',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_name', type: 'string' }],
    outputs: [{ type: 'bool' }],
  },
] as const

const CATEGORIES = [
  { id: 'Real Estate', icon: Building2, description: 'Properties, land, developments' },
  { id: 'Infrastructure', icon: Factory, description: 'Energy, utilities, transport' },
  { id: 'Art & Collectibles', icon: Palette, description: 'Fine art, collectibles, antiques' },
  { id: 'Business Equity', icon: Briefcase, description: 'Company shares, startups' },
  { id: 'Revenue Based', icon: TrendingUp, description: 'Royalties, recurring revenue' },
  { id: 'Commodities', icon: Gem, description: 'Precious metals, resources' },
  { id: 'Vehicles & Equipment', icon: Car, description: 'Vehicles, machinery, equipment' },
  { id: 'Intellectual Property', icon: FileText, description: 'Patents, trademarks, copyrights' },
  { id: 'Other', icon: Package, description: 'Other asset types' },
];

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  { value: 'AED', label: 'UAE Dirham', symbol: 'AED' },
  { value: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
]

const JURISDICTIONS = [
  'United States',
  'United Kingdom',
  'Switzerland',
  'Singapore',
  'United Arab Emirates',
  'Cayman Islands',
  'British Virgin Islands',
  'Luxembourg',
  'Netherlands',
  'Germany',
  'France',
  'Other',
]

// ============================================================================
// INFO PANEL COMPONENT
// ============================================================================

const InfoPanel = ({ category }: { category: string }) => {
  const [openSection, setOpenSection] = useState<string | null>('documents');
  
  const documents = REQUIRED_LEGAL_DOCUMENTS[category] || REQUIRED_LEGAL_DOCUMENTS['default'];
  
  const sections = [
    {
      id: 'documents',
      title: 'Required Documents',
      icon: FileText,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Based on your selected asset type ({category || 'not selected'}), you will need:
          </p>
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-start gap-2">
                <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${doc.required ? 'bg-red-400' : 'bg-slate-500'}`} />
                <div>
                  <span className={`text-sm ${doc.required ? 'text-white font-medium' : 'text-slate-400'}`}>
                    {doc.name}
                    {doc.required && <span className="text-red-400 ml-1">*</span>}
                  </span>
                  <p className="text-xs text-slate-500">{doc.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-400 font-medium">Don't forget!</p>
                <p className="text-xs text-slate-400 mt-1">
                  A detailed <strong className="text-white">Business Plan</strong> and professional <strong className="text-white">Pitch Deck</strong> are required for all projects. These are critical for investor confidence.
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            <span className="text-red-400">*</span> Required documents
          </p>
        </div>
      ),
    },
    {
      id: 'milestones',
      title: 'Milestones & Escrow',
      icon: Shield,
      content: (
        <div className="space-y-3">
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">100% Escrow Protected</span>
            </div>
            <p className="text-xs text-slate-400">
              All funds raised are held in a secure smart contract escrow until milestones are approved by investors.
            </p>
          </div>
          <div>
            <p className="text-sm text-white font-medium mb-2">Why Milestones Matter:</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Builds investor trust through transparent progress</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Funds released only when milestones are verified</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Reduces risk for both project owners and investors</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Demonstrates professional project management</span>
              </li>
            </ul>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-400">
                <strong className="text-amber-400">Pro tip:</strong> Use 3-5 milestones with clear deliverables. Each milestone should represent a significant project achievement.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'investors',
      title: 'What Investors Look For',
      icon: Users,
      content: (
        <div className="space-y-3">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Clear ROI Projections</p>
                <p className="text-xs text-slate-400">Realistic returns with supporting data</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Complete Documentation</p>
                <p className="text-xs text-slate-400">Business plan, pitch deck, legal docs</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Defined Milestones</p>
                <p className="text-xs text-slate-400">Clear goals with measurable outcomes</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Escrow Protection</p>
                <p className="text-xs text-slate-400">Funds secured until milestones met</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Company Credibility</p>
                <p className="text-xs text-slate-400">Registered entity with track record</p>
              </div>
            </li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          Project Guidelines
        </h3>
      </div>
      <div className="divide-y divide-slate-700">
        {sections.map((section) => (
          <div key={section.id}>
            <button
              onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <section.icon className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-white">{section.title}</span>
              </div>
              <ChevronDown 
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  openSection === section.id ? 'rotate-180' : ''
                }`} 
              />
            </button>
            {openSection === section.id && (
              <div className="px-4 pb-4">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// TOKEN ECONOMICS CALCULATOR
// ============================================================================

interface TokenEconomicsProps {
  amountToRaise: number
  totalSupply: number
  investorSharePercentage: number
  onSupplyChange: (supply: number) => void
}

function TokenEconomicsCalculator({
  amountToRaise,
  totalSupply,
  investorSharePercentage,
  onSupplyChange,
}: TokenEconomicsProps) {
  const [inputMode, setInputMode] = useState<'supply' | 'price'>('supply')
  const [priceInput, setPriceInput] = useState<string>('1.00')

  // Calculate derived values
  const tokenPrice = totalSupply > 0 ? amountToRaise / totalSupply : 0
  
  // Platform always gets 1% of total supply
  const platformFeeTokens = Math.round((totalSupply * FEE_CONFIG.PLATFORM_TOKEN_FEE_BPS) / FEE_CONFIG.BPS_DENOMINATOR)
  
  // Calculate investor and owner tokens based on investor share percentage
  // If investor share >= 99%, platform tokens come from investor allocation
  // Otherwise, platform tokens come from the remaining (owner) allocation
  let investorTokens: number
  let ownerTokens: number
  let investorEffectivePercentage: number
  let ownerPercentage: number

  if (investorSharePercentage >= 99) {
    // Investors get their percentage minus platform fee (which comes from their share)
    investorTokens = Math.round(totalSupply * (investorSharePercentage / 100)) - platformFeeTokens
    ownerTokens = totalSupply - investorTokens - platformFeeTokens
    investorEffectivePercentage = (investorTokens / totalSupply) * 100
    ownerPercentage = (ownerTokens / totalSupply) * 100
  } else {
    // Normal case: investors get their full percentage, platform comes from remainder
    investorTokens = Math.round(totalSupply * (investorSharePercentage / 100))
    ownerTokens = totalSupply - investorTokens - platformFeeTokens
    investorEffectivePercentage = investorSharePercentage
    ownerPercentage = 100 - investorSharePercentage - PLATFORM_TOKEN_FEE_PERCENT
  }

  // Ensure no negative values
  if (ownerTokens < 0) {
    ownerTokens = 0
    investorTokens = totalSupply - platformFeeTokens
    investorEffectivePercentage = (investorTokens / totalSupply) * 100
    ownerPercentage = 0
  }

  // Platform fee on funds raised (in BPS for precision)
  const platformRaiseFee = (amountToRaise * FEE_CONFIG.PLATFORM_USDT_FEE_BPS) / FEE_CONFIG.BPS_DENOMINATOR
  const netToProject = amountToRaise - platformRaiseFee

  // Fee distribution breakdown
  const feeToReceiver = (platformRaiseFee * FEE_CONFIG.FEE_RECEIVER_BPS) / FEE_CONFIG.BPS_DENOMINATOR
  const feeToLiquidity = (platformRaiseFee * FEE_CONFIG.LIQUIDITY_WALLET_BPS) / FEE_CONFIG.BPS_DENOMINATOR
  const feeToTreasury = (platformRaiseFee * FEE_CONFIG.TREASURY_WALLET_BPS) / FEE_CONFIG.BPS_DENOMINATOR

  // Token fee distribution
  const tokensToLiquidity = Math.round((platformFeeTokens * FEE_CONFIG.TOKEN_LIQUIDITY_BPS) / FEE_CONFIG.BPS_DENOMINATOR)
  const tokensToTreasury = Math.round((platformFeeTokens * FEE_CONFIG.TOKEN_TREASURY_BPS) / FEE_CONFIG.BPS_DENOMINATOR)

  // Check if platform fee is deducted from investor share
  const platformFeeFromInvestors = investorSharePercentage >= 99

  // Handle price input change - calculate supply from price
  const handlePriceChange = (price: string) => {
    setPriceInput(price)
    const priceNum = parseFloat(price)
    if (priceNum > 0 && amountToRaise > 0) {
      const calculatedSupply = Math.round(amountToRaise / priceNum)
      onSupplyChange(calculatedSupply)
    }
  }

  // Handle supply input change
  const handleSupplyChange = (supply: number) => {
    onSupplyChange(supply)
    if (supply > 0 && amountToRaise > 0) {
      const calculatedPrice = (amountToRaise / supply).toFixed(4)
      setPriceInput(calculatedPrice)
    }
  }

  // Sync price when supply or amount changes externally
  useEffect(() => {
    if (totalSupply > 0 && amountToRaise > 0 && inputMode === 'supply') {
      const calculatedPrice = (amountToRaise / totalSupply).toFixed(4)
      setPriceInput(calculatedPrice)
    }
  }, [totalSupply, amountToRaise, inputMode])

  if (amountToRaise <= 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 text-center">
        <Coins className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">Enter the amount to raise to configure token economics</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-400" />
          Token Economics
        </h4>
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setInputMode('supply')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              inputMode === 'supply'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Set Supply
          </button>
          <button
            type="button"
            onClick={() => setInputMode('price')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              inputMode === 'price'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Set Price
          </button>
        </div>
      </div>

      {/* Input Section */}
      <div className="grid md:grid-cols-2 gap-4">
        {inputMode === 'supply' ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Total Token Supply <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={totalSupply || ''}
                onChange={(e) => handleSupplyChange(parseInt(e.target.value) || 0)}
                placeholder="e.g., 100000"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500">Total number of tokens to mint</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">
                Calculated Token Price
              </label>
              <div className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                <span className="text-2xl font-bold text-green-400">
                  ${tokenPrice.toFixed(4)}
                </span>
                <span className="text-gray-500 ml-2">per token</span>
              </div>
              <p className="text-xs text-gray-500">Based on funding goal ÷ supply</p>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Token Price (USD) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={priceInput}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder="1.00"
                  className="w-full pl-8 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500">Price per token in USD</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">
                Calculated Total Supply
              </label>
              <div className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                <span className="text-2xl font-bold text-blue-400">
                  {totalSupply.toLocaleString()}
                </span>
                <span className="text-gray-500 ml-2">tokens</span>
              </div>
              <p className="text-xs text-gray-500">Based on funding goal ÷ price</p>
            </div>
          </>
        )}
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-400">Quick Presets</label>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '$0.01', price: 0.01 },
            { label: '$0.10', price: 0.1 },
            { label: '$1.00', price: 1 },
            { label: '$10', price: 10 },
            { label: '$100', price: 100 },
          ].map((preset) => {
            const presetSupply = Math.round(amountToRaise / preset.price)
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  handlePriceChange(preset.price.toString())
                  onSupplyChange(presetSupply)
                }}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  Math.abs(tokenPrice - preset.price) < 0.001
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
                }`}
              >
                {preset.label}/token
                <span className="text-xs text-gray-500 ml-1">({presetSupply.toLocaleString()})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Token Distribution Breakdown */}
      {totalSupply > 0 && (
        <div className="space-y-4">
          <h5 className="text-sm font-medium text-white">Token Distribution</h5>

          {/* Info banner when platform fee comes from investors */}
          {platformFeeFromInvestors && (
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300">
                With {investorSharePercentage}% investor allocation, the {PLATFORM_TOKEN_FEE_PERCENT}% platform fee is deducted from investor tokens. 
                Effective investor share: {investorEffectivePercentage.toFixed(1)}%
              </p>
            </div>
          )}
          
          {/* Visual Bar */}
          <div className="h-8 rounded-lg overflow-hidden flex">
            <div 
              className="bg-blue-500 flex items-center justify-center"
              style={{ width: `${investorEffectivePercentage}%` }}
            >
              {investorEffectivePercentage >= 15 && (
                <span className="text-xs text-white font-medium">{investorEffectivePercentage.toFixed(1)}%</span>
              )}
            </div>
            <div 
              className="bg-amber-500 flex items-center justify-center"
              style={{ width: `${PLATFORM_TOKEN_FEE_PERCENT}%` }}
              title={`Platform: ${PLATFORM_TOKEN_FEE_PERCENT}%`}
            />
            {ownerPercentage > 0 && (
              <div 
                className="bg-purple-500 flex items-center justify-center"
                style={{ width: `${ownerPercentage}%` }}
              >
                {ownerPercentage >= 15 && (
                  <span className="text-xs text-white font-medium">{ownerPercentage.toFixed(1)}%</span>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className={`grid gap-4 ${ownerPercentage > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs text-gray-400">Investors</span>
              </div>
              <p className="text-lg font-bold text-white">{investorTokens.toLocaleString()}</p>
              <p className="text-xs text-gray-500">
                {investorEffectivePercentage.toFixed(1)}% · ${(investorTokens * tokenPrice).toLocaleString()}
              </p>
              {platformFeeFromInvestors && (
                <p className="text-xs text-blue-400 mt-1">
                  ({investorSharePercentage}% - {PLATFORM_TOKEN_FEE_PERCENT}% fee)
                </p>
              )}
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-xs text-gray-400">Platform</span>
              </div>
              <p className="text-lg font-bold text-white">{platformFeeTokens.toLocaleString()}</p>
              <p className="text-xs text-gray-500">
                {PLATFORM_TOKEN_FEE_PERCENT}% · ${(platformFeeTokens * tokenPrice).toLocaleString()}
              </p>
            </div>
            {ownerPercentage > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-xs text-gray-400">Project Owner</span>
                </div>
                <p className="text-lg font-bold text-white">{ownerTokens.toLocaleString()}</p>
                <p className="text-xs text-gray-500">
                  {ownerPercentage.toFixed(1)}% · ${(ownerTokens * tokenPrice).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Platform Fees Summary */}
          <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 space-y-3">
            <h5 className="text-sm font-medium text-amber-300 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Platform Fees
            </h5>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Token Fee */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Token Fee ({PLATFORM_TOKEN_FEE_PERCENT}%)</span>
                  <span className="text-white font-medium">{platformFeeTokens.toLocaleString()} tokens</span>
                </div>
                <div className="text-xs text-gray-500 space-y-1 pl-3 border-l-2 border-gray-700">
                  <div className="flex justify-between">
                    <span>→ Liquidity (50%)</span>
                    <span>{tokensToLiquidity.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>→ Treasury (50%)</span>
                    <span>{tokensToTreasury.toLocaleString()}</span>
                  </div>
                </div>
                {platformFeeFromInvestors && (
                  <p className="text-xs text-amber-400 italic">
                    * Deducted from investor allocation
                  </p>
                )}
              </div>

              {/* USDT Fee */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Fundraise Fee ({PLATFORM_RAISE_FEE_PERCENT}%)</span>
                  <span className="text-white font-medium">${platformRaiseFee.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500 space-y-1 pl-3 border-l-2 border-gray-700">
                  <div className="flex justify-between">
                    <span>→ Fee Receiver (34%)</span>
                    <span>${feeToReceiver.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>→ Liquidity (33%)</span>
                    <span>${feeToLiquidity.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>→ Treasury (33%)</span>
                    <span>${feeToTreasury.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-amber-700/30">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Net to Project (after fees)</span>
                <span className="text-green-400 font-bold text-lg">${netToProject.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Deployment Summary Box */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-400">Total Supply</p>
                <p className="text-xl font-bold text-white">{totalSupply.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Token Price</p>
                <p className="text-xl font-bold text-blue-400">${tokenPrice.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Funding Goal</p>
                <p className="text-xl font-bold text-green-400">${amountToRaise.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StepProjectDetails({
  data,
  updateData,
  onNext,
}: StepProjectDetailsProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoadingRate, setIsLoadingRate] = useState(false)
  
  // Name availability check state
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)
  const [nameCheckError, setNameCheckError] = useState<string | null>(null)
  
  const publicClient = usePublicClient()
  const { contracts } = useChainConfig()

  // Debounced name check
  const checkNameAvailability = useCallback(async (name: string) => {
    if (!name.trim() || !publicClient || !contracts?.RWAProjectNFT) {
      setNameAvailable(null)
      setNameCheckError(null)
      return
    }

    setIsCheckingName(true)
    setNameCheckError(null)

    try {
      // Try to call isNameTaken if it exists
      const isTaken = await publicClient.readContract({
        address: contracts.RWAProjectNFT as `0x${string}`,
        abi: PROJECT_NFT_ABI,
        functionName: 'isNameTaken',
        args: [name.trim()],
      })

      setNameAvailable(!isTaken)
      if (isTaken) {
        setNameCheckError('This project name is already taken')
      }
    } catch (err: any) {
      // If isNameTaken doesn't exist, try simulation approach
      console.log('isNameTaken not available, trying simulation...')
      try {
        await publicClient.simulateContract({
          address: contracts.RWAProjectNFT as `0x${string}`,
          abi: [
            {
              name: 'createProject',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: '_owner', type: 'address' },
                { name: '_name', type: 'string' },
                { name: '_category', type: 'string' },
                { name: '_fundingGoal', type: 'uint256' },
                { name: '_uri', type: 'string' },
              ],
              outputs: [{ type: 'uint256' }],
            },
          ],
          functionName: 'createProject',
          args: [
            '0x0000000000000000000000000000000000000001', // dummy address
            name.trim(),
            'Other',
            BigInt(100000000000), // 100k in 6 decimals
            'ipfs://test',
          ],
        })
        // If simulation passes, name is available
        setNameAvailable(true)
      } catch (simErr: any) {
        if (simErr.message?.includes('NameAlreadyExists') || 
            simErr.message?.includes('name already exists') ||
            simErr.message?.includes('execution reverted')) {
          setNameAvailable(false)
          setNameCheckError('This project name is already taken')
        } else {
          // Some other error - don't block the user
          console.error('Name check error:', simErr)
          setNameAvailable(null)
        }
      }
    } finally {
      setIsCheckingName(false)
    }
  }, [publicClient, contracts?.RWAProjectNFT])

  // Debounce the name check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (data.projectName.trim().length >= 3) {
        checkNameAvailability(data.projectName)
      } else {
        setNameAvailable(null)
        setNameCheckError(null)
      }
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [data.projectName, checkNameAvailability])

  // Fetch exchange rate when currency changes
  useEffect(() => {
    const fetchExchangeRate = async () => {
      if (data.localCurrency === 'USD') {
        updateData({ exchangeRate: 1, exchangeRateTimestamp: Date.now() })
        return
      }

      setIsLoadingRate(true)
      try {
        const response = await fetch(`/api/exchange-rate?from=${data.localCurrency}&to=USD`)
        if (response.ok) {
          const result = await response.json()
          updateData({ 
            exchangeRate: result.rate,
            exchangeRateTimestamp: Date.now(),
          })
        }
      } catch (err) {
        console.error('Failed to fetch exchange rate:', err)
      } finally {
        setIsLoadingRate(false)
      }
    }

    fetchExchangeRate()
  }, [data.localCurrency])

  // Update USD amount when local amount or rate changes
  useEffect(() => {
    if (data.amountToRaiseLocal && data.exchangeRate) {
      const usdAmount = Math.round(data.amountToRaiseLocal * data.exchangeRate)
      updateData({ amountToRaise: usdAmount })
    }
  }, [data.amountToRaiseLocal, data.exchangeRate])

  // Handle token supply change and update related fields
  const handleSupplyChange = (supply: number) => {
    const tokenPrice = supply > 0 ? data.amountToRaise / supply : 0
    const platformFeeTokens = Math.round((supply * FEE_CONFIG.PLATFORM_TOKEN_FEE_BPS) / FEE_CONFIG.BPS_DENOMINATOR)
    const platformRaiseFee = (data.amountToRaise * FEE_CONFIG.PLATFORM_USDT_FEE_BPS) / FEE_CONFIG.BPS_DENOMINATOR
    
    let investorTokens: number
    
    if (data.investorSharePercentage >= 99) {
      // Platform fee comes from investor allocation
      investorTokens = Math.round(supply * (data.investorSharePercentage / 100)) - platformFeeTokens
    } else {
      // Normal case
      investorTokens = Math.round(supply * (data.investorSharePercentage / 100))
    }
    
    // Ensure no negative values
    if (investorTokens < 0) {
      investorTokens = supply - platformFeeTokens
    }
    
    updateData({
      totalSupply: supply,
      tokenPrice,
      investorTokens,
      platformFeeTokens,
      platformFee: platformRaiseFee,
      platformFeePercent: FEE_CONFIG.PLATFORM_USDT_FEE_BPS / 100,
    })
  }

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!data.projectName.trim()) {
      newErrors.projectName = 'Project name is required'
    } else if (nameAvailable === false) {
      newErrors.projectName = 'This project name is already taken. Please choose a different name.'
    }

    if (!data.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (data.description.length < 100) {
      newErrors.description = 'Description should be at least 100 characters'
    }

    if (!data.category) {
      newErrors.category = 'Please select a category'
    }

    if (!data.amountToRaiseLocal || data.amountToRaiseLocal <= 0) {
      newErrors.amountToRaiseLocal = 'Please enter the amount to raise'
    } else if (data.amountToRaise < 1000) {
      newErrors.amountToRaiseLocal = 'Minimum funding goal is $1,000 USD'
    }

    if (!data.totalSupply || data.totalSupply <= 0) {
      newErrors.totalSupply = 'Please set the token supply'
    }

    if (data.investorSharePercentage < 1 || data.investorSharePercentage > 100) {
      newErrors.investorSharePercentage = 'Investor share must be between 1% and 100%'
    }

    if (!data.projectedROI || data.projectedROI <= 0) {
      newErrors.projectedROI = 'Please enter projected ROI'
    }

    if (!data.roiTimelineMonths || data.roiTimelineMonths < 1) {
      newErrors.roiTimelineMonths = 'Please enter ROI timeline'
    }

    if (!data.companyName.trim()) {
      newErrors.companyName = 'Company name is required'
    }

    if (!data.jurisdiction) {
      newErrors.jurisdiction = 'Please select a jurisdiction'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    } else {
      // Scroll to first error
      const firstErrorKey = Object.keys(errors)[0]
      if (firstErrorKey) {
        const element = document.querySelector(`[name="${firstErrorKey}"]`)
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const selectedCurrency = CURRENCIES.find(c => c.value === data.localCurrency)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Project & Financial Details</h2>
        <p className="text-gray-400">
          Provide information about your project and funding requirements
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        {/* Main Form */}
        <div className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-gray-700 pb-2">
              <Briefcase className="w-5 h-5 text-blue-400" />
              Basic Information
            </h3>

            {/* Project Name with availability check */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Project Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="projectName"
                  value={data.projectName}
                  onChange={(e) => updateData({ projectName: e.target.value })}
                  placeholder="Enter your project name"
                  className={`w-full px-4 py-3 pr-12 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 ${
                    errors.projectName || nameAvailable === false 
                      ? 'border-red-500' 
                      : nameAvailable === true 
                        ? 'border-green-500' 
                        : 'border-gray-700'
                  }`}
                />
                {/* Status indicator */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {isCheckingName && (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  )}
                  {!isCheckingName && nameAvailable === true && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {!isCheckingName && nameAvailable === false && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              {/* Status messages */}
              {isCheckingName && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking availability...
                </p>
              )}
              {!isCheckingName && nameAvailable === true && (
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  This name is available
                </p>
              )}
              {!isCheckingName && nameCheckError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {nameCheckError}
                </p>
              )}
              {errors.projectName && !nameCheckError && (
                <p className="text-xs text-red-400">{errors.projectName}</p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Category <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => updateData({ category: cat.id })}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      data.category === cat.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        data.category === cat.id ? 'bg-blue-500/20' : 'bg-slate-700'
                      }`}>
                        <cat.icon className={`w-5 h-5 ${
                          data.category === cat.id ? 'text-blue-400' : 'text-slate-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{cat.id}</p>
                        <p className="text-xs text-slate-400">{cat.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {errors.category && (
                <p className="text-xs text-red-400">{errors.category}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={data.description}
                onChange={(e) => updateData({ description: e.target.value })}
                placeholder="Describe your project in detail. What is it? What problem does it solve? Why should investors be interested?"
                rows={5}
                className={`w-full px-4 py-3 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none ${
                  errors.description ? 'border-red-500' : 'border-gray-700'
                }`}
              />
              <div className="flex justify-between">
                {errors.description ? (
                  <p className="text-xs text-red-400">{errors.description}</p>
                ) : (
                  <p className="text-xs text-gray-500">Minimum 100 characters</p>
                )}
                <p className={`text-xs ${data.description.length >= 100 ? 'text-green-400' : 'text-gray-500'}`}>
                  {data.description.length}/100
                </p>
              </div>
            </div>

            {/* Website */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Website (Optional)
              </label>
              <input
                type="text"
                name="website"
                value={data.website}
                onChange={(e) => {
                  let value = e.target.value.trim();
                  if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                    if (value.includes('.')) {
                      value = `https://${value}`;
                    }
                  }
                  updateData({ website: value });
                }}
                onBlur={(e) => {
                  let value = e.target.value.trim();
                  if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                    if (value.includes('.')) {
                      updateData({ website: `https://${value}` });
                    }
                  }
                }}
                placeholder="https://example.com"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Company Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-gray-700 pb-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              Company Information
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Company Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  Company / Entity Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={data.companyName}
                  onChange={(e) => updateData({ companyName: e.target.value })}
                  placeholder="Legal entity name"
                  className={`w-full px-4 py-3 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 ${
                    errors.companyName ? 'border-red-500' : 'border-gray-700'
                  }`}
                />
                {errors.companyName && (
                  <p className="text-xs text-red-400">{errors.companyName}</p>
                )}
              </div>

              {/* Registration Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Registration Number
                </label>
                <input
                  type="text"
                  value={data.registrationNumber}
                  onChange={(e) => updateData({ registrationNumber: e.target.value })}
                  placeholder="Company registration number"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Jurisdiction */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Jurisdiction <span className="text-red-400">*</span>
              </label>
              <select
                value={data.jurisdiction}
                onChange={(e) => updateData({ jurisdiction: e.target.value })}
                className={`w-full px-4 py-3 bg-gray-900 border rounded-lg text-white focus:outline-none focus:border-blue-500 ${
                  errors.jurisdiction ? 'border-red-500' : 'border-gray-700'
                }`}
              >
                <option value="">Select jurisdiction</option>
                {JURISDICTIONS.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
              {errors.jurisdiction && (
                <p className="text-xs text-red-400">{errors.jurisdiction}</p>
              )}
            </div>
          </div>

          {/* Financial Details */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-gray-700 pb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Financial Details
            </h3>

            {/* Currency and Amount */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Currency</label>
                <select
                  value={data.localCurrency}
                  onChange={(e) => updateData({ localCurrency: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.symbol} - {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  Amount to Raise <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    {selectedCurrency?.symbol}
                  </span>
                  <input
                    type="number"
                    value={data.amountToRaiseLocal || ''}
                    onChange={(e) => updateData({ amountToRaiseLocal: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className={`w-full pl-12 pr-4 py-3 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 ${
                      errors.amountToRaiseLocal ? 'border-red-500' : 'border-gray-700'
                    }`}
                  />
                </div>
                {errors.amountToRaiseLocal && (
                  <p className="text-xs text-red-400">{errors.amountToRaiseLocal}</p>
                )}
                {data.localCurrency !== 'USD' && data.amountToRaise > 0 && (
                  <p className="text-xs text-gray-500">
                    ≈ ${data.amountToRaise.toLocaleString()} USD
                    {isLoadingRate && ' (loading rate...)'}
                  </p>
                )}
              </div>
            </div>

            {/* Investor Share and ROI */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Investor Share % <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={data.investorSharePercentage || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0
                    updateData({ investorSharePercentage: value })
                    if (data.totalSupply > 0) {
                      handleSupplyChange(data.totalSupply)
                    }
                  }}
                  placeholder="30"
                  className={`w-full px-4 py-3 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 ${
                    errors.investorSharePercentage ? 'border-red-500' : 'border-gray-700'
                  }`}
                />
                {errors.investorSharePercentage && (
                  <p className="text-xs text-red-400">{errors.investorSharePercentage}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Projected ROI % <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={data.projectedROI || ''}
                  onChange={(e) => updateData({ projectedROI: parseFloat(e.target.value) || 0 })}
                  placeholder="25"
                  className={`w-full px-4 py-3 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 ${
                    errors.projectedROI ? 'border-red-500' : 'border-gray-700'
                  }`}
                />
                {errors.projectedROI && (
                  <p className="text-xs text-red-400">{errors.projectedROI}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  ROI Timeline (months) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={data.roiTimelineMonths || ''}
                  onChange={(e) => updateData({ roiTimelineMonths: parseInt(e.target.value) || 0 })}
                  placeholder="12"
                  className={`w-full px-4 py-3 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 ${
                    errors.roiTimelineMonths ? 'border-red-500' : 'border-gray-700'
                  }`}
                />
                {errors.roiTimelineMonths && (
                  <p className="text-xs text-red-400">{errors.roiTimelineMonths}</p>
                )}
              </div>
            </div>

            {/* Revenue Model */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Revenue Model
              </label>
              <textarea
                value={data.revenueModel}
                onChange={(e) => updateData({ revenueModel: e.target.value })}
                placeholder="Explain how the project will generate returns for investors..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Token Economics */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-gray-700 pb-2">
              <Coins className="w-5 h-5 text-amber-400" />
              Token Configuration
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Token Name</label>
                <input
                  type="text"
                  value={data.tokenName}
                  onChange={(e) => updateData({ tokenName: e.target.value })}
                  placeholder="e.g., Dubai Property Token"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Token Symbol</label>
                <input
                  type="text"
                  value={data.tokenSymbol}
                  onChange={(e) => updateData({ tokenSymbol: e.target.value.toUpperCase() })}
                  placeholder="e.g., DPT"
                  maxLength={5}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>
            </div>

            {/* Token Economics Calculator */}
            <TokenEconomicsCalculator
              amountToRaise={data.amountToRaise}
              totalSupply={data.totalSupply}
              investorSharePercentage={data.investorSharePercentage}
              onSupplyChange={handleSupplyChange}
            />
            {errors.totalSupply && (
              <p className="text-xs text-red-400">{errors.totalSupply}</p>
            )}
          </div>
        </div>

        {/* Info Panel (Right Side) */}
        <div className="lg:sticky lg:top-6 h-fit">
          <InfoPanel category={data.category} />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-6 border-t border-gray-700">
        <button
          onClick={handleNext}
          disabled={isCheckingName || nameAvailable === false}
          className={`px-8 py-3 font-semibold rounded-lg transition-colors ${
            isCheckingName || nameAvailable === false
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          type="button"
        >
          {isCheckingName ? 'Checking name...' : 'Continue to Milestones'}
        </button>
      </div>
    </div>
  )
}
