// src/app/create/page.tsx
'use client'

import { Suspense, useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useKYC, getTierInfo, meetsMinimumTier } from '@/contexts/KYCContext'
import { COMPANY } from '@/config/contacts';

import StepProjectDetails from '@/components/create/StepProjectDetails'
import StepMilestones from '@/components/create/StepMilestones'
import { ProjectMilestone } from '@/types/project'
import StepMediaLegal from '@/components/create/StepMediaLegal'
import StepReview from '@/components/create/StepReview'
import StepPayment from '@/components/create/StepPayment'
import StepSubmitted from '@/components/create/StepSubmitted';
import { Loader2 } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

export interface ProjectData {
  // Basic Info
  projectName: string
  description: string
  category: string
  website: string
  
  // Currency & Financials
  localCurrency: string
  amountToRaiseLocal: number
  amountToRaise: number
  exchangeRate: number
  exchangeRateTimestamp: number
  investorSharePercentage: number
  projectedROI: number
  roiTimelineMonths: number
  revenueModel: string
  
  // Milestones
  milestones: ProjectMilestone[]
  
  // Token Config
  tokenName: string
  tokenSymbol: string
  totalSupply: number
  tokenPrice: number
  platformFeePercent: number
  platformFee: number
  platformFeeTokens: number
  investorTokens: number
  
  // Media - Files (for upload UI state)
  logo: File | null
  banner: File | null
  pitchDeck: File | null
  images: File[]
  videoUrl: string
  
  // Media - URLs (after IPFS upload, for saving to DB)
  logoUrl: string
  bannerUrl: string
  pitchDeckUrl: string
  imageUrls: string[]
  
  // Legal
  companyName: string
  registrationNumber: string
  jurisdiction: string
  legalDocuments: File[]
  legalDocumentTypes: string[]
  legalDocumentUrls: { type: string; url: string }[]
  termsAccepted: boolean
  
  // Payment
  paymentCompleted: boolean
  paymentIntentId: string
  paymentMethod: 'card' | 'crypto' | null
}

// Required legal documents by category
export const REQUIRED_LEGAL_DOCUMENTS: Record<string, RequiredDocument[]> = {
  'Real Estate': [
    { id: 'business_plan', name: 'Business Plan', description: 'Detailed business plan with financial projections', required: true },
    { id: 'pitch_deck', name: 'Pitch Deck', description: 'Investor presentation deck', required: true },
    { id: 'property_deed', name: 'Property Deed / Title', description: 'Proof of property ownership', required: true },
    { id: 'valuation_report', name: 'Valuation Report', description: 'Professional property valuation', required: true },
    { id: 'legal_opinion', name: 'Legal Opinion', description: 'Legal opinion on tokenization compliance', required: false },
  ],
  'Infrastructure': [
    { id: 'business_plan', name: 'Business Plan', description: 'Detailed business plan with financial projections', required: true },
    { id: 'pitch_deck', name: 'Pitch Deck', description: 'Investor presentation deck', required: true },
    { id: 'permits', name: 'Permits & Licenses', description: 'All required permits and licenses', required: true },
    { id: 'environmental', name: 'Environmental Assessment', description: 'Environmental impact assessment', required: true },
    { id: 'engineering_report', name: 'Engineering Report', description: 'Technical feasibility study', required: false },
  ],
  'Art & Collectibles': [
    { id: 'business_plan', name: 'Business Plan', description: 'Investment thesis and exit strategy', required: true },
    { id: 'pitch_deck', name: 'Pitch Deck', description: 'Investor presentation deck', required: true },
    { id: 'authenticity_cert', name: 'Certificate of Authenticity', description: 'Proof of authenticity from recognized authority', required: true },
    { id: 'provenance', name: 'Provenance Documentation', description: 'History of ownership', required: true },
    { id: 'appraisal', name: 'Professional Appraisal', description: 'Recent valuation from certified appraiser', required: true },
  ],
  'Business Equity': [
    { id: 'business_plan', name: 'Business Plan', description: 'Detailed business plan with financial projections', required: true },
    { id: 'pitch_deck', name: 'Pitch Deck', description: 'Investor presentation deck', required: true },
    { id: 'financial_statements', name: 'Financial Statements', description: 'Audited financial statements (last 2 years)', required: true },
    { id: 'incorporation_docs', name: 'Incorporation Documents', description: 'Certificate of incorporation, bylaws', required: true },
    { id: 'cap_table', name: 'Cap Table', description: 'Current capitalization table', required: true },
    { id: 'shareholder_agreement', name: 'Shareholder Agreement', description: 'Existing shareholder agreements', required: false },
  ],
  'Revenue Based': [
    { id: 'business_plan', name: 'Business Plan', description: 'Detailed business plan with revenue projections', required: true },
    { id: 'pitch_deck', name: 'Pitch Deck', description: 'Investor presentation deck', required: true },
    { id: 'financial_statements', name: 'Financial Statements', description: 'Revenue history and financial statements', required: true },
    { id: 'revenue_contracts', name: 'Revenue Contracts', description: 'Contracts or agreements generating revenue', required: true },
    { id: 'audit_report', name: 'Audit Report', description: 'Independent audit of revenue streams', required: false },
  ],
  'Commodities': [
    { id: 'business_plan', name: 'Business Plan', description: 'Detailed business plan with market analysis', required: true },
    { id: 'pitch_deck', name: 'Pitch Deck', description: 'Investor presentation deck', required: true },
    { id: 'ownership_proof', name: 'Proof of Ownership', description: 'Documentation proving commodity ownership', required: true },
    { id: 'storage_agreement', name: 'Storage Agreement', description: 'Custody or storage arrangement details', required: true },
    { id: 'quality_certification', name: 'Quality Certification', description: 'Certification of commodity grade/quality', required: false },
  ],
  'Vehicles & Equipment': [
    { id: 'business_plan', name: 'Business Plan', description: 'Detailed business plan with utilization projections', required: true },
    { id: 'pitch_deck', name: 'Pitch Deck', description: 'Investor presentation deck', required: true },
    { id: 'title_registration', name: 'Title / Registration', description: 'Vehicle or equipment registration documents', required: true },
    { id: 'valuation_report', name: 'Valuation Report', description: 'Professional asset valuation', required: true },
    { id: 'maintenance_records', name: 'Maintenance Records', description: 'Service and maintenance history', required: false },
    { id: 'insurance', name: 'Insurance Documentation', description: 'Current insurance coverage details', required: false },
  ],
  'Intellectual Property': [
    { id: 'business_plan', name: 'Business Plan', description: 'Commercialization strategy and projections', required: true },
    { id: 'pitch_deck', name: 'Pitch Deck', description: 'Investor presentation deck', required: true },
    { id: 'ip_registration', name: 'IP Registration', description: 'Patent, trademark, or copyright registration', required: true },
    { id: 'ownership_assignment', name: 'Ownership Assignment', description: 'Documentation of IP ownership rights', required: true },
    { id: 'valuation_report', name: 'IP Valuation Report', description: 'Professional IP valuation', required: true },
    { id: 'licensing_agreements', name: 'Licensing Agreements', description: 'Existing licensing arrangements', required: false },
  ],
  'Other': [
    { id: 'business_plan', name: 'Business Plan', description: 'Detailed business plan with financial projections', required: true },
    { id: 'pitch_deck', name: 'Pitch Deck', description: 'Investor presentation deck', required: true },
    { id: 'ownership_proof', name: 'Proof of Ownership', description: 'Documentation proving asset ownership', required: true },
    { id: 'valuation_report', name: 'Valuation Report', description: 'Professional valuation of the asset', required: true },
    { id: 'legal_opinion', name: 'Legal Opinion', description: 'Legal opinion on tokenization compliance', required: false },
  ],
  'default': [
    { id: 'business_plan', name: 'Business Plan', description: 'Detailed business plan with financial projections', required: true },
    { id: 'pitch_deck', name: 'Pitch Deck', description: 'Investor presentation deck', required: true },
    { id: 'ownership_proof', name: 'Proof of Ownership', description: 'Documentation proving asset ownership', required: true },
    { id: 'valuation_report', name: 'Valuation Report', description: 'Professional valuation of the asset', required: true },
  ],
};

// Submission fee amount
export const SUBMISSION_FEE_USD = 500

// ============================================================================
// INITIAL DATA
// ============================================================================

const INITIAL_DATA: ProjectData = {
  // Basic Info
  projectName: '',
  description: '',
  category: '',
  website: '',
  
  // Currency & Financials
  localCurrency: 'USD',
  amountToRaiseLocal: 0,
  amountToRaise: 0,
  exchangeRate: 1,
  exchangeRateTimestamp: 0,
  investorSharePercentage: 80,
  projectedROI: 0,
  roiTimelineMonths: 12,
  revenueModel: '',
  
  // Milestones
  milestones: [],
  
  // Token Config
  tokenName: '',
  tokenSymbol: '',
  totalSupply: 0,
  tokenPrice: 0,
  platformFeePercent: 1.5,
  platformFee: 0,
  platformFeeTokens: 0,
  investorTokens: 0,
  
  // Media - Files
  logo: null,
  banner: null,
  pitchDeck: null,
  images: [],
  videoUrl: '',
  
  // Media - URLs
  logoUrl: '',
  bannerUrl: '',
  pitchDeckUrl: '',
  imageUrls: [],
  
  // Legal
  companyName: '',
  registrationNumber: '',
  jurisdiction: '',
  legalDocuments: [],
  legalDocumentTypes: [],
  legalDocumentUrls: [],
  termsAccepted: false,
  
  // Payment
  paymentCompleted: false,
  paymentIntentId: '',
  paymentMethod: null,
}

// ============================================================================
// STEPS CONFIG
// ============================================================================

const STEPS = [
  { id: 'details', title: 'Project & Financials', icon: '📋' },
  { id: 'milestones', title: 'Milestones', icon: '🎯' },
  { id: 'media', title: 'Media & Legal', icon: '📁' },
  { id: 'review', title: 'Review', icon: '✅' },
  { id: 'payment', title: 'Payment', icon: '💳' },
  { id: 'submitted', title: 'Submitted', icon: '🎉' },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getRequiredDocuments(category: string) {
  return REQUIRED_LEGAL_DOCUMENTS[category] || REQUIRED_LEGAL_DOCUMENTS['default']
}

export function getMissingRequiredDocuments(category: string, uploadedTypes: string[]): string[] {
  const required = getRequiredDocuments(category)
  return required
    .filter(doc => doc.required && !uploadedTypes.includes(doc.id))
    .map(doc => doc.name)
}

export function hasAllRequiredDocuments(category: string, uploadedTypes: string[]): boolean {
  const missing = getMissingRequiredDocuments(category, uploadedTypes)
  return missing.length === 0
}

// ============================================================================
// KYC GATE COMPONENT
// ============================================================================

function KYCRequirementGate({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount()
  const { kycData, tierInfo, isLoading } = useKYC()
  
  const requiredTier = 'Gold'
  const requiredTierInfo = getTierInfo(requiredTier)

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">🔗</div>
          <h2 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to create a new project on the {COMPANY.name}.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Verifying KYC status...</p>
      </div>
    )
  }

  if (kycData.status !== 'Approved') {
    const isPending = ['Pending', 'AutoVerifying', 'ManualReview'].includes(kycData.status)
    const isRejected = kycData.status === 'Rejected'
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
        <div className="max-w-lg text-center">
          <div className="text-6xl mb-6">
            {isPending ? '⏳' : isRejected ? '❌' : '🔒'}
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            {isPending ? 'Verification In Progress' : 
             isRejected ? 'KYC Verification Failed' :
             'KYC Verification Required'}
          </h2>
          <p className="text-gray-400 mb-6">
            {isPending 
              ? `Your KYC verification is being processed. You'll be able to create projects once approved with Gold tier or higher.`
              : isRejected
              ? `Your KYC application was rejected. Please resubmit with correct information.`
              : `To create projects on ${COMPANY.name}, you need to complete KYC verification and achieve Gold tier or higher.`
            }
          </p>
          
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6 text-left">
            <h3 className="text-lg font-semibold text-white mb-4">Project Creator Requirements</h3>
            <div className="flex items-center gap-4 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
              <span className="text-3xl">{requiredTierInfo.icon}</span>
              <div>
                <div className={`font-semibold ${requiredTierInfo.color}`}>
                  {requiredTierInfo.label} Tier Required
                </div>
                <div className="text-sm text-gray-400">
                  Investment limit: {requiredTierInfo.limit}
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/kyc"
            className="inline-block px-8 py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-semibold rounded-lg transition-all"
          >
            {isPending ? 'View Verification Status' : 'Start KYC Verification'}
          </Link>
        </div>
      </div>
    )
  }

  if (!meetsMinimumTier(kycData.tier, requiredTier)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
        <div className="max-w-lg text-center">
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center">
              <div className="text-4xl mb-2">{tierInfo.icon}</div>
              <div className={`text-sm font-medium ${tierInfo.color}`}>Your Tier</div>
              <div className="text-lg font-bold text-white">{tierInfo.label}</div>
            </div>
            <div className="text-3xl text-gray-600">→</div>
            <div className="text-center">
              <div className="text-4xl mb-2">{requiredTierInfo.icon}</div>
              <div className={`text-sm font-medium ${requiredTierInfo.color}`}>Required</div>
              <div className="text-lg font-bold text-white">{requiredTierInfo.label}</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            Upgrade to {requiredTierInfo.label} Tier
          </h2>
          <p className="text-gray-400 mb-6">
            You're currently at <span className={tierInfo.color}>{tierInfo.label}</span> tier. 
            To create projects, you need to upgrade to <span className={requiredTierInfo.color}>{requiredTierInfo.label}</span> tier or higher.
          </p>

          <Link
            href="/kyc"
            className="inline-block px-8 py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-semibold rounded-lg transition-all"
          >
            Upgrade to {requiredTierInfo.label}
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// ============================================================================
// CREATOR BADGE
// ============================================================================

function CreatorBadge() {
  const { tierInfo } = useKYC()
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${tierInfo.bgColor} border ${tierInfo.borderColor}`}>
      <span>{tierInfo.icon}</span>
      <span className={`text-sm font-medium ${tierInfo.color}`}>
        Creating as {tierInfo.label}
      </span>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CreateProjectContent () {
  const { isConnected, address } = useAccount()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<ProjectData>(INITIAL_DATA)
  const [uploadedUrls, setUploadedUrls] = useState<{
    logo?: string
    banner?: string
    pitchDeck?: string
    legalDocs: string[]
    images?: string[]
  }>({ legalDocs: [] })
  const [applicationId, setApplicationId] = useState<string | null>(null)
  
  // Edit mode states
  const [isLoadingApplication, setIsLoadingApplication] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [originalStatus, setOriginalStatus] = useState<string | null>(null)

  // Fetch existing application when editing
  useEffect(() => {
  const fetchApplication = async () => {
    console.log('>>> EDIT EFFECT TRIGGERED')
    console.log('Edit ID:', editId)
    console.log('Address:', address)
    
    if (!editId || !address) {
      console.log('>>> SKIPPING: Missing editId or address')
      return
    }
    
    console.log('>>> STARTING FETCH')
    setIsLoadingApplication(true)
    setLoadError(null)
    
    const url = `/api/crowdfunding/applications?id=${editId}&wallet=${address}`
    console.log('>>> FETCH URL:', url)
    
    try {
      const response = await fetch(url)
      console.log('>>> RESPONSE STATUS:', response.status)
      
      const result = await response.json()
      console.log('>>> RESPONSE DATA:', result)
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load application')
      }
      
      const { application } = result
      
      if (!application) {
        throw new Error('Application not found')
      }
      
      console.log('>>> APPLICATION LOADED:', application.project_name)
        
        // Store original status and application ID
        setApplicationId(application.id)
        setOriginalStatus(application.status)
        setIsEditMode(true)
        
        // Map database fields to ProjectData
        setData({
          // Basic Info
          projectName: application.project_name || '',
          description: application.description || '',
          category: application.category || '',
          website: application.website || '',
          
          // Currency & Financials
          localCurrency: application.local_currency || 'USD',
          amountToRaiseLocal: application.funding_goal * (application.exchange_rate || 1),
          amountToRaise: application.funding_goal || 0,
          exchangeRate: application.exchange_rate || 1,
          exchangeRateTimestamp: 0,
          investorSharePercentage: application.investor_share_percentage || 80,
          projectedROI: application.projected_roi || 0,
          roiTimelineMonths: application.roi_timeline_months || 12,
          revenueModel: application.revenue_model || '',
          
          // Milestones
          milestones: application.milestones || [],
          
          // Token Config
          tokenName: application.token_name || '',
          tokenSymbol: application.token_symbol || '',
          totalSupply: application.total_supply || 0,
          tokenPrice: application.token_price || 0,
          platformFeePercent: 1.5,
          platformFee: application.platform_fee || 0,
          platformFeeTokens: application.platform_fee_tokens || 0,
          investorTokens: application.investor_tokens || 0,
          
          // Media - Files (empty, we use URLs)
          logo: null,
          banner: null,
          pitchDeck: null,
          images: [],
          videoUrl: application.video_url || '',
          
          // Media - URLs
          logoUrl: application.logo_url || '',
          bannerUrl: application.banner_url || '',
          pitchDeckUrl: application.pitch_deck_url || '',
          imageUrls: application.images || [],
          
          // Legal
          companyName: application.company_name || '',
          registrationNumber: application.registration_number || '',
          jurisdiction: application.jurisdiction || '',
          legalDocuments: [],
          legalDocumentTypes: (application.legal_documents || []).map((d: any) => d.type || d),
          legalDocumentUrls: application.legal_documents || [],
          termsAccepted: application.terms_accepted || false,
          
          // Payment - already paid for rejected apps
          paymentCompleted: application.payment_status === 'paid',
          paymentIntentId: application.payment_intent_id || '',
          paymentMethod: application.payment_method || null,
        })
        
        // Restore uploaded URLs for display
        setUploadedUrls({
          logo: application.logo_url || undefined,
          banner: application.banner_url || undefined,
          pitchDeck: application.pitch_deck_url || undefined,
          images: application.images || [],
          legalDocs: (application.legal_documents || []).map((d: any) => d.url || d),
        })
        
      } catch (err) {
        console.error('Error loading application:', err)
        setLoadError(err instanceof Error ? err.message : 'Failed to load application')
      } finally {
        setIsLoadingApplication(false)
      }
    }
    
    fetchApplication()
  }, [editId, address])

  const updateData = (updates: Partial<ProjectData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates }
      
      // Auto-calculate token economics when USD amount changes
      if (updates.amountToRaise !== undefined) {
        const amount = updates.amountToRaise
        newData.totalSupply = amount
        newData.platformFee = amount * 0.05
        newData.platformFeeTokens = amount * 0.05
        newData.investorTokens = Math.round(amount * (newData.investorSharePercentage / 100))
      }
      
      // Auto-suggest token name from project name
      if (updates.projectName !== undefined && !prev.tokenName) {
        newData.tokenName = `${updates.projectName} Token`
      }
      
      return newData
    })
  }

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, STEPS.length - 1))
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 0))
  const goToStep = (stepIndex: number) => {
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex)
    } else if (stepIndex === 5 && data.paymentCompleted) {
      setCurrentStep(stepIndex)
    }
  }

  const canProceedToPayment = () => {
    if (!hasAllRequiredDocuments(data.category, data.legalDocumentTypes)) {
      return false
    }
    if (!data.termsAccepted) {
      return false
    }
    return true
  }

  const handlePaymentSuccess = (paymentIntentId: string, method: 'card' | 'crypto') => {
    updateData({
      paymentCompleted: true,
      paymentIntentId,
      paymentMethod: method,
    })
    nextStep()
  }

  // Handle resubmit for rejected applications
  const handleResubmit = async () => {
    if (!applicationId || !address) return
    
    try {
      const response = await fetch('/api/crowdfunding/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: applicationId,
          // Update all editable fields
          projectName: data.projectName,
          category: data.category,
          description: data.description,
          website: data.website,
          companyName: data.companyName,
          registrationNumber: data.registrationNumber,
          jurisdiction: data.jurisdiction,
          fundingGoal: data.amountToRaise,
          localCurrency: data.localCurrency,
          exchangeRate: data.exchangeRate,
          investorSharePercentage: data.investorSharePercentage,
          projectedROI: data.projectedROI,
          roiTimelineMonths: data.roiTimelineMonths,
          revenueModel: data.revenueModel,
          tokenName: data.tokenName,
          tokenSymbol: data.tokenSymbol,
          totalSupply: data.totalSupply,
          tokenPrice: data.tokenPrice,
          investorTokens: data.investorTokens,
          platformFeeTokens: data.platformFeeTokens,
          platformFee: data.platformFee,
          milestones: data.milestones,
          logoUrl: data.logoUrl,
          bannerUrl: data.bannerUrl,
          pitchDeckUrl: data.pitchDeckUrl,
          images: data.imageUrls,
          videoUrl: data.videoUrl,
          legalDocuments: data.legalDocumentUrls,
          termsAccepted: data.termsAccepted,
          // Set status back to pending_review
          status: 'pending_review',
        }),
      })
      
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to resubmit')
      }
      
      // Go to submitted step
      setCurrentStep(5)
      
    } catch (err) {
      console.error('Error resubmitting:', err)
      alert(err instanceof Error ? err.message : 'Failed to resubmit application')
    }
  }

  // Show loading state when fetching existing application
  if (isLoadingApplication) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading application...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-white mb-2">Failed to Load Application</h2>
          <p className="text-gray-400 mb-6">{loadError}</p>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <KYCRequirementGate>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {isEditMode ? 'Edit Application' : 'Create New Project'}
              </h1>
              <p className="text-gray-400">
                {isEditMode 
                  ? originalStatus === 'rejected'
                    ? 'Make corrections and resubmit for review'
                    : 'Update your application details'
                  : 'Launch your tokenized investment opportunity'
                }
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isEditMode && originalStatus === 'rejected' && (
                <span className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium">
                  Editing Rejected Application
                </span>
              )}
              <CreatorBadge />
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                // For rejected apps with payment done, skip payment step visually
                const isPaymentStep = index === 4
                const skipPayment = isEditMode && data.paymentCompleted && isPaymentStep
                
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <button
                      onClick={() => {
                        // For resubmit flow, allow jumping to review (step 3) directly
                        if (isEditMode && data.paymentCompleted && index <= 3) {
                          setCurrentStep(index)
                        } else {
                          goToStep(index)
                        }
                      }}
                      disabled={
                        !isEditMode && index > currentStep && !(index === 5 && data.paymentCompleted)
                      }
                      className={`flex flex-col items-center ${
                        (isEditMode && data.paymentCompleted && index <= 3) ||
                        index <= currentStep || 
                        (index === 5 && data.paymentCompleted)
                          ? 'cursor-pointer' 
                          : 'cursor-not-allowed'
                      }`}
                    >
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg transition-colors
                        ${index === currentStep 
                          ? 'bg-blue-600 text-white ring-4 ring-blue-600/30' 
                          : index < currentStep || (isEditMode && data.paymentCompleted && index < 4)
                            ? 'bg-green-500 text-white' 
                            : data.paymentCompleted && index === 5
                              ? 'bg-green-500 text-white'
                              : skipPayment
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-700 text-gray-400'}`}
                      >
                        {index < currentStep || (isEditMode && data.paymentCompleted && index <= 4) 
                          ? '✓' 
                          : step.icon}
                      </div>
                      <span className={`mt-2 text-xs sm:text-sm font-medium hidden sm:block text-center
                        ${index === currentStep ? 'text-blue-400' : 'text-gray-500'}`}>
                        {step.title}
                      </span>
                    </button>
                    {index < STEPS.length - 1 && (
                      <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded ${
                        index < currentStep || (isEditMode && data.paymentCompleted && index < 4)
                          ? 'bg-green-500' 
                          : 'bg-gray-700'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 sm:p-6 md:p-8">
            {currentStep === 0 && (
              <StepProjectDetails
                data={data}
                updateData={updateData}
                onNext={nextStep}
              />
            )}

            {currentStep === 1 && (
              <StepMilestones
                data={{
                  milestones: data.milestones || [],
                  amountToRaise: data.amountToRaise || 0,
                  amountToRaiseLocal: data.amountToRaiseLocal || 0,
                  localCurrency: data.localCurrency || 'USD',
                  projectName: data.projectName || '',
                  category: data.category || '',
                }}
                updateData={updateData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}

            {currentStep === 2 && (
              <StepMediaLegal
                data={data}
                updateData={updateData}
                onNext={nextStep}
                onBack={prevStep}
                uploadedUrls={uploadedUrls}
                setUploadedUrls={setUploadedUrls}
                requiredDocuments={getRequiredDocuments(data.category)}
              />
            )}

            {currentStep === 3 && (
              <StepReview
                data={data}
                uploadedUrls={uploadedUrls}
                onNext={() => {
                  // For edit mode with payment done, resubmit instead of going to payment
                  if (isEditMode && data.paymentCompleted) {
                    handleResubmit()
                  } else {
                    nextStep()
                  }
                }}
                onBack={prevStep}
                isEditMode={isEditMode}
                isResubmit={isEditMode && data.paymentCompleted && originalStatus === 'rejected'}
              />
            )}

            {currentStep === 4 && (
              <StepPayment
                data={data}
                applicationId={applicationId}
                setApplicationId={setApplicationId}
                submissionFee={SUBMISSION_FEE_USD}
                onPaymentSuccess={handlePaymentSuccess}
                onBack={prevStep}
                walletAddress={address}
              />
            )}

            {currentStep === 5 && (
              <StepSubmitted
                projectName={data.projectName}
                applicationId={applicationId}
                paymentMethod={data.paymentMethod}
                isResubmit={isEditMode && originalStatus === 'rejected'}
              />
            )}
          </div>
        </KYCRequirementGate>
      </main>
    </div>
  )
}

// ============================================================================
// MAIN EXPORT WITH SUSPENSE
// ============================================================================

export default function CreateProjectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <CreateProjectContent />
    </Suspense>
  )
}