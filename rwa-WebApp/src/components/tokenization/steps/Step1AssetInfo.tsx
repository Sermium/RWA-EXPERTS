// src/components/tokenization/create/Step1AssetInfo.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Loader2, Building2, Home, Landmark, Palette, TrendingUp, Package, HelpCircle,
  Info, ChevronDown, FileText, Shield, Users, CheckCircle2, AlertCircle, Lightbulb, 
  Scale, Target, Globe, Clock, Truck, Gem, FileCode
} from 'lucide-react';
import { FormData, FormErrors, ASSET_TYPES, CURRENCIES } from '@/types/tokenization';

interface Step1AssetInfoProps {
  formData: FormData;
  errors: FormErrors;
  updateFormData: (field: keyof FormData, value: any) => void;
}

interface LocationSuggestion {
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ASSET_ICONS: Record<string, React.ReactNode> = {
  real_estate: <Home className="w-5 h-5" />,
  infrastructure: <Landmark className="w-5 h-5" />,
  art_collectibles: <Palette className="w-5 h-5" />,
  business_equity: <Building2 className="w-5 h-5" />,
  revenue_based: <TrendingUp className="w-5 h-5" />,
  commodities: <Gem className="w-5 h-5" />,
  vehicles_equipment: <Truck className="w-5 h-5" />,
  intellectual_property: <FileCode className="w-5 h-5" />,
  other: <Package className="w-5 h-5" />,
};

// Required documents based on asset type
const REQUIRED_TOKENIZATION_DOCUMENTS: Record<string, { id: string; name: string; description: string; required: boolean }[]> = {
  real_estate: [
    { id: 'title_deed', name: 'Title Deed / Ownership Certificate', description: 'Legal proof of property ownership', required: true },
    { id: 'property_valuation', name: 'Professional Valuation Report', description: 'Recent appraisal from certified valuator', required: true },
    { id: 'property_inspection', name: 'Property Inspection Report', description: 'Condition assessment and structural report', required: true },
    { id: 'zoning_certificate', name: 'Zoning Certificate', description: 'Land use and zoning compliance', required: true },
    { id: 'tax_clearance', name: 'Property Tax Clearance', description: 'Proof of tax payments up to date', required: true },
    { id: 'insurance_policy', name: 'Insurance Policy', description: 'Current property insurance documentation', required: false },
    { id: 'lease_agreements', name: 'Lease Agreements', description: 'If property has existing tenants', required: false },
    { id: 'environmental_report', name: 'Environmental Assessment', description: 'Environmental compliance report', required: false },
  ],
  infrastructure: [
    { id: 'ownership_docs', name: 'Ownership Documentation', description: 'Legal proof of asset ownership', required: true },
    { id: 'valuation_report', name: 'Asset Valuation Report', description: 'Professional infrastructure valuation', required: true },
    { id: 'operational_permits', name: 'Operational Permits', description: 'Licenses and permits for operation', required: true },
    { id: 'technical_assessment', name: 'Technical Assessment', description: 'Engineering and condition report', required: true },
    { id: 'revenue_projections', name: 'Revenue Projections', description: 'Financial forecasts and models', required: true },
    { id: 'maintenance_records', name: 'Maintenance Records', description: 'Historical maintenance documentation', required: false },
    { id: 'contracts', name: 'Service Contracts', description: 'Existing service or supply agreements', required: false },
  ],
  art_collectibles: [
    { id: 'certificate_authenticity', name: 'Certificate of Authenticity', description: 'Proof of authenticity and provenance', required: true },
    { id: 'professional_appraisal', name: 'Professional Appraisal', description: 'Valuation from certified appraiser', required: true },
    { id: 'provenance_docs', name: 'Provenance Documentation', description: 'Ownership history and chain of custody', required: true },
    { id: 'condition_report', name: 'Condition Report', description: 'Current state and preservation status', required: true },
    { id: 'insurance_valuation', name: 'Insurance Valuation', description: 'Insurance company valuation', required: false },
    { id: 'exhibition_history', name: 'Exhibition History', description: 'Past exhibitions and displays', required: false },
    { id: 'storage_docs', name: 'Storage Documentation', description: 'Current storage and security arrangements', required: false },
  ],
  business_equity: [
    { id: 'incorporation_docs', name: 'Incorporation Documents', description: 'Articles of incorporation, bylaws', required: true },
    { id: 'shareholder_agreement', name: 'Shareholder Agreement', description: 'Current shareholder structure', required: true },
    { id: 'financial_statements', name: 'Audited Financial Statements', description: 'Last 2-3 years of audited financials', required: true },
    { id: 'business_valuation', name: 'Business Valuation Report', description: 'Professional company valuation', required: true },
    { id: 'cap_table', name: 'Capitalization Table', description: 'Current equity ownership breakdown', required: true },
    { id: 'business_plan', name: 'Business Plan', description: 'Strategic plan and projections', required: true },
    { id: 'board_resolution', name: 'Board Resolution', description: 'Approval for tokenization', required: true },
    { id: 'tax_returns', name: 'Tax Returns', description: 'Recent tax filings', required: false },
  ],
  revenue_based: [
    { id: 'revenue_contracts', name: 'Revenue Contracts', description: 'Agreements generating the revenue', required: true },
    { id: 'revenue_history', name: 'Revenue History', description: 'Historical revenue documentation', required: true },
    { id: 'financial_projections', name: 'Financial Projections', description: 'Future revenue forecasts', required: true },
    { id: 'ownership_proof', name: 'Ownership Proof', description: 'Rights to the revenue stream', required: true },
    { id: 'legal_opinion', name: 'Legal Opinion', description: 'Legal review of revenue rights', required: false },
    { id: 'audit_report', name: 'Audit Report', description: 'Independent audit of revenue claims', required: false },
  ],
  commodities: [
    { id: 'ownership_certificate', name: 'Ownership Certificate', description: 'Proof of commodity ownership', required: true },
    { id: 'storage_receipt', name: 'Storage Receipt', description: 'Warehouse or vault receipt', required: true },
    { id: 'quality_certification', name: 'Quality Certification', description: 'Purity/grade certification', required: true },
    { id: 'insurance_docs', name: 'Insurance Documentation', description: 'Coverage for stored commodities', required: true },
    { id: 'audit_verification', name: 'Audit Verification', description: 'Third-party verification of holdings', required: false },
  ],
  vehicles_equipment: [
    { id: 'title_registration', name: 'Title / Registration', description: 'Vehicle or equipment title', required: true },
    { id: 'valuation_report', name: 'Valuation Report', description: 'Professional appraisal', required: true },
    { id: 'condition_report', name: 'Condition Report', description: 'Inspection and condition assessment', required: true },
    { id: 'maintenance_history', name: 'Maintenance History', description: 'Service records and history', required: true },
    { id: 'insurance_docs', name: 'Insurance Documentation', description: 'Current insurance coverage', required: false },
  ],
  intellectual_property: [
    { id: 'ip_registration', name: 'IP Registration Certificate', description: 'Patent, trademark, or copyright registration', required: true },
    { id: 'ownership_proof', name: 'Ownership Documentation', description: 'Proof of IP ownership or assignment', required: true },
    { id: 'valuation_report', name: 'IP Valuation Report', description: 'Professional intellectual property valuation', required: true },
    { id: 'licensing_agreements', name: 'Licensing Agreements', description: 'Existing licenses and royalty agreements', required: true },
    { id: 'revenue_history', name: 'Revenue History', description: 'Historical licensing or royalty income', required: false },
    { id: 'legal_opinion', name: 'Legal Opinion', description: 'Legal review of IP rights and enforceability', required: false },
    { id: 'infringement_history', name: 'Infringement History', description: 'Past infringement cases if any', required: false },
  ],
  default: [
    { id: 'ownership_proof', name: 'Proof of Ownership', description: 'Documentation proving asset ownership', required: true },
    { id: 'valuation_report', name: 'Valuation Report', description: 'Professional asset valuation', required: true },
    { id: 'legal_opinion', name: 'Legal Opinion', description: 'Legal review of tokenization eligibility', required: true },
    { id: 'asset_description', name: 'Detailed Asset Description', description: 'Comprehensive asset documentation', required: true },
    { id: 'compliance_docs', name: 'Compliance Documentation', description: 'Regulatory compliance proof', required: false },
  ],
};

// ============================================================================
// PROJECT GUIDELINES COMPONENT
// ============================================================================

function ProjectGuidelines({ assetType }: { assetType: string }) {
  const [openSection, setOpenSection] = useState<string | null>('documents');
  
  const documents = REQUIRED_TOKENIZATION_DOCUMENTS[assetType] || REQUIRED_TOKENIZATION_DOCUMENTS['default'];
  
  const getAssetTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      real_estate: 'Real Estate',
      infrastructure: 'Infrastructure',
      art_collectibles: 'Art & Collectibles',
      business_equity: 'Business Equity',
      revenue_based: 'Revenue Based',
      commodities: 'Commodities',
      vehicles_equipment: 'Vehicles & Equipment',
      intellectual_property: 'Intellectual Property',
      other: 'Other',
    };
    return labels[type] || 'Not selected';
  };

  const sections = [
    {
      id: 'documents',
      title: 'Required Documents',
      icon: FileText,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Based on your selected asset type ({getAssetTypeLabel(assetType)}), you will need:
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
          <div className="mt-4 p-3 bg-gold-500/10 border border-gold-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-gold-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gold-400 font-medium">Professional Review Required</p>
                <p className="text-xs text-slate-400 mt-1">
                  All documents will be reviewed by our compliance team. <strong className="text-white">Legal opinions</strong> and <strong className="text-white">professional valuations</strong> must be from accredited providers.
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
      id: 'compliance',
      title: 'Compliance & Legal',
      icon: Scale,
      content: (
        <div className="space-y-3">
          <div className="p-3 bg-gold-500/10 border border-gold-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4 text-gold-400" />
              <span className="text-sm font-medium text-gold-400">Regulatory Compliance</span>
            </div>
            <p className="text-xs text-slate-400">
              All tokenized assets must comply with securities regulations in relevant jurisdictions.
            </p>
          </div>
          <div>
            <p className="text-sm text-white font-medium mb-2">Compliance Requirements:</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span>KYC/AML verification for asset owners</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Accredited investor verification for token holders</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Securities exemption documentation</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Transfer restrictions and whitelist enforcement</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Ongoing reporting and disclosure requirements</span>
              </li>
            </ul>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-400">
                <strong className="text-amber-400">Pro tip:</strong> Engage legal counsel early in the process to ensure your tokenization structure complies with all applicable regulations.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'tokenization',
      title: 'Tokenization Process',
      icon: Shield,
      content: (
        <div className="space-y-3">
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">Secure & Transparent</span>
            </div>
            <p className="text-xs text-slate-400">
              Your asset will be represented as security tokens on the blockchain with full compliance features.
            </p>
          </div>
          <div>
            <p className="text-sm text-white font-medium mb-2">Process Timeline:</p>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0 text-gold-400 font-medium">1</div>
                <div>
                  <p className="text-white font-medium">Application Review</p>
                  <p className="text-slate-500">2-5 business days</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0 text-gold-400 font-medium">2</div>
                <div>
                  <p className="text-white font-medium">Due Diligence</p>
                  <p className="text-slate-500">5-15 business days</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0 text-gold-400 font-medium">3</div>
                <div>
                  <p className="text-white font-medium">Legal Structuring</p>
                  <p className="text-slate-500">10-20 business days</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0 text-gold-400 font-medium">4</div>
                <div>
                  <p className="text-white font-medium">Token Deployment</p>
                  <p className="text-slate-500">1-3 business days</p>
                </div>
              </li>
            </ul>
          </div>
          <div className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg">
            <Clock className="w-4 h-4 text-slate-400" />
            <p className="text-xs text-slate-400">
              Total estimated time: <strong className="text-white">3-6 weeks</strong>
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'benefits',
      title: 'Tokenization Benefits',
      icon: TrendingUp,
      content: (
        <div className="space-y-3">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Fractional Ownership</p>
                <p className="text-xs text-slate-400">Enable investors to own fractions of high-value assets</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                <Globe className="w-4 h-4 text-gold-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Global Liquidity</p>
                <p className="text-xs text-slate-400">Access worldwide investor base 24/7</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-gold-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Automated Compliance</p>
                <p className="text-xs text-slate-400">Built-in transfer restrictions and investor verification</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Reduced Costs</p>
                <p className="text-xs text-slate-400">Lower transaction fees and administrative overhead</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Transparent Ownership</p>
                <p className="text-xs text-slate-400">Immutable record of ownership on blockchain</p>
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
          <Info className="w-5 h-5 text-gold-400" />
          Tokenization Guidelines
        </h3>
      </div>
      <div className="divide-y divide-slate-700">
        {sections.map((section) => (
          <div key={section.id}>
            <button
              type="button"
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
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Step1AssetInfo({ formData, errors, updateFormData }: Step1AssetInfoProps) {
  const [locationQuery, setLocationQuery] = useState(formData.assetLocation || '');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced location search
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (locationQuery.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(locationQuery)}`,
          {
            headers: {
              'Accept-Language': 'en',
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
          setShowSuggestions(data.length > 0);
        }
      } catch (error) {
        console.error('Location search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [locationQuery]);

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    const { address } = suggestion;
    const city = address.city || address.town || address.village || address.municipality || '';
    const country = address.country || '';
    const formattedLocation = [city, address.state, country].filter(Boolean).join(', ');
    
    setLocationQuery(formattedLocation);
    updateFormData('assetLocation', formattedLocation);
    setShowSuggestions(false);
  };

  const handleLocationInputChange = (value: string) => {
    setLocationQuery(value);
    updateFormData('assetLocation', value);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Main Form - 2/3 width */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Asset Information</h2>
          <p className="text-gray-400 text-sm">
            Tell us about the asset you want to tokenize
          </p>
        </div>

        {/* Asset Type Selection - 3x3 grid */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Asset Type <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {ASSET_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => updateFormData('assetType', type.value)}
                className={`
                  flex items-center gap-3 p-4 rounded-xl border transition-all text-left
                  ${formData.assetType === type.value
                    ? 'bg-gold-500/20 border-gold-500 text-white'
                    : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-gray-500'
                  }
                `}
              >
                <span className={formData.assetType === type.value ? 'text-gold-400' : 'text-gray-400'}>
                  {ASSET_ICONS[type.value] || <Package className="w-5 h-5" />}
                </span>
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            ))}
          </div>
          {errors.assetType && (
            <p className="mt-2 text-sm text-red-400">{errors.assetType}</p>
          )}
        </div>

        {/* Asset Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Asset Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.assetName}
            onChange={(e) => updateFormData('assetName', e.target.value)}
            placeholder="e.g., Downtown Office Building, Vintage Art Collection"
            className={`w-full px-4 py-3 bg-gray-700 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500 ${
              errors.assetName ? 'border-red-500' : 'border-gray-600'
            }`}
          />
          {errors.assetName && (
            <p className="mt-1 text-sm text-red-400">{errors.assetName}</p>
          )}
        </div>

        {/* Asset Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Asset Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={formData.assetDescription}
            onChange={(e) => updateFormData('assetDescription', e.target.value)}
            placeholder="Describe your asset in detail: its features, condition, history, and any unique characteristics..."
            rows={4}
            className={`w-full px-4 py-3 bg-gray-700 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500 resize-none ${
              errors.assetDescription ? 'border-red-500' : 'border-gray-600'
            }`}
          />
          {errors.assetDescription && (
            <p className="mt-1 text-sm text-red-400">{errors.assetDescription}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {formData.assetDescription.length}/1000 characters
          </p>
        </div>

        {/* Asset Location with Autocomplete */}
        <div ref={wrapperRef} className="relative">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Asset Location <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={locationQuery}
              onChange={(e) => handleLocationInputChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Start typing a city or address..."
              className={`w-full pl-10 pr-10 py-3 bg-gray-700 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500 ${
                errors.assetLocation ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
            )}
          </div>
          
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-xl shadow-lg overflow-hidden">
              {suggestions.map((suggestion, index) => {
                const { address } = suggestion;
                const city = address.city || address.town || address.village || address.municipality || '';
                const country = address.country || '';
                
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleLocationSelect(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-gold-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-white text-sm font-medium">
                          {city || suggestion.display_name.split(',')[0]}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {[address.state, country].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          
          {errors.assetLocation && (
            <p className="mt-1 text-sm text-red-400">{errors.assetLocation}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Type at least 3 characters to search for locations
          </p>
        </div>

        {/* Estimated Value & Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Estimated Value <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                {formData.currency === 'USD' ? '$' : formData.currency === 'EUR' ? '€' : formData.currency === 'GBP' ? '£' : ''}
              </span>
              <input
                type="text"
                value={formData.estimatedValue}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/[^0-9.]/g, '');
                  const parts = rawValue.split('.');
                  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  const formattedValue = parts.length > 1 
                    ? `${integerPart}.${parts[1].slice(0, 2)}`
                    : integerPart;
                  updateFormData('estimatedValue', formattedValue);
                }}
                placeholder="0.00"
                className={`w-full pl-8 pr-4 py-3 bg-gray-700 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500 ${
                  errors.estimatedValue ? 'border-red-500' : 'border-gray-600'
                }`}
              />
            </div>
            <select
              value={formData.currency}
              onChange={(e) => updateFormData('currency', e.target.value)}
              className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </select>
          </div>
          {errors.estimatedValue && (
            <p className="mt-1 text-sm text-red-400">{errors.estimatedValue}</p>
          )}
          {formData.estimatedValue && (
            <p className="mt-1 text-xs text-gray-500">
              {formData.currency === 'USD' ? '$' : formData.currency === 'EUR' ? '€' : formData.currency === 'GBP' ? '£' : ''}{formData.estimatedValue} {formData.currency}
            </p>
          )}
        </div>

        {/* Website (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Website <span className="text-gray-500">(Optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              https://
            </span>
            <input
              type="text"
              value={formData.website?.replace(/^https?:\/\//, '') || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/^https?:\/\//, '');
                updateFormData('website', value ? `https://${value}` : '');
              }}
              placeholder="example.com"
              className="w-full pl-[72px] pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
          {formData.website && (
            <p className="mt-1 text-xs text-gray-500">
              Full URL: {formData.website}
            </p>
          )}
        </div>
      </div>

      {/* Guidelines Panel - 1/3 width */}
      <div className="lg:sticky lg:top-24 h-fit">
        <ProjectGuidelines assetType={formData.assetType} />
      </div>
    </div>
  );
}
