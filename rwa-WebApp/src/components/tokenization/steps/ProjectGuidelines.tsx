// src/components/tokenization/create/ProjectGuidelines.tsx
'use client';

import { useState } from 'react';
import { 
  Info, ChevronDown, FileText, Shield, Users, 
  CheckCircle2, AlertCircle, Lightbulb, Scale, 
  Building2, TrendingUp, Target, Globe, Clock
} from 'lucide-react';

// Required documents based on asset type
export const REQUIRED_TOKENIZATION_DOCUMENTS: Record<string, { id: string; name: string; description: string; required: boolean }[]> = {
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
  default: [
    { id: 'ownership_proof', name: 'Proof of Ownership', description: 'Documentation proving asset ownership', required: true },
    { id: 'valuation_report', name: 'Valuation Report', description: 'Professional asset valuation', required: true },
    { id: 'legal_opinion', name: 'Legal Opinion', description: 'Legal review of tokenization eligibility', required: true },
    { id: 'asset_description', name: 'Detailed Asset Description', description: 'Comprehensive asset documentation', required: true },
    { id: 'compliance_docs', name: 'Compliance Documentation', description: 'Regulatory compliance proof', required: false },
  ],
};

interface ProjectGuidelinesProps {
  assetType: string;
}

export function ProjectGuidelines({ assetType }: ProjectGuidelinesProps) {
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

export default ProjectGuidelines;
