// Tokenization Types

export interface DocumentFile {
  name: string;
  type: string;
  url: string;
  mimeType: string;
  size: number;
  ipfsHash?: string;
}

export interface UploadedFile {
  url: string;
  ipfsHash: string;
  ipfsUri?: string;
}

export interface FormData {
  // Step 1: Asset Info (merged)
  assetType: string;
  assetName: string;
  assetDescription: string;
  assetLocation: string;
  estimatedValue: string;
  currency: string;
  website: string;
  
  // Step 2: Tokenization Details
  tokenName: string;
  tokenSymbol: string;
  totalSupply: string;
  pricePerToken: string;
  useCase: string;
  
  // Step 3: Documents (handled separately)
  
  // Step 4: Contact
  contactName: string;
  email: string;
  phone: string;
  additionalNotes: string;
  
  // Optional Company Info
  companyName: string;
  legalEntityType: string;
  legalJurisdiction: string;
}

export interface FormErrors {
  [key: string]: string;
}

// Asset types - MUST match database constraint
export const ASSET_TYPES = [
  { value: 'real_estate', label: 'Real Estate', description: 'Properties, land, buildings' },
  { value: 'infrastructure', label: 'Infrastructure', description: 'Roads, bridges, utilities' },
  { value: 'art_collectibles', label: 'Art & Collectibles', description: 'Artwork, rare items, memorabilia' },
  { value: 'business_equity', label: 'Business Equity', description: 'Company shares, ownership stakes' },
  { value: 'revenue_based', label: 'Revenue Based', description: 'Royalties, recurring income streams' },
  { value: 'commodities', label: 'Commodities', description: 'Raw materials, precious metals' },
  { value: 'vehicles', label: 'Vehicles & Equipment', description: 'Cars, machinery, equipment' },
  { value: 'intellectual_property', label: 'Intellectual Property', description: 'Patents, trademarks, copyrights' },
  { value: 'other', label: 'Other', description: 'Other asset types' },
];

export const USE_CASES = [
  { value: 'fractional_ownership', label: 'Fractional Ownership' },
  { value: 'liquidity', label: 'Liquidity Enhancement' },
  { value: 'fundraising', label: 'Fundraising' },
  { value: 'trading', label: 'Trading & Investment' },
  { value: 'collateral', label: 'Collateral for Loans' },
  { value: 'dividend_distribution', label: 'Dividend Distribution' },
];

// ============================================================================
// DOCUMENT TYPES - Asset Specific
// ============================================================================

export interface DocumentType {
  value: string;
  label: string;
  description?: string;
  required: boolean;
  assetTypes: string[] | 'all'; // Which asset types require this doc
}

// All possible document types
export const ALL_DOCUMENT_TYPES: DocumentType[] = [
  // ========== UNIVERSAL DOCUMENTS (All Asset Types) ==========
  { 
    value: 'ownership_proof', 
    label: 'Proof of Ownership', 
    description: 'Document proving you own the asset (deed, title, certificate)',
    required: true, 
    assetTypes: 'all' 
  },
  { 
    value: 'valuation', 
    label: 'Professional Valuation Report', 
    description: 'Independent appraisal from a certified professional',
    required: true, 
    assetTypes: 'all' 
  },
  { 
    value: 'identity_verification', 
    label: 'Identity Verification', 
    description: 'Government-issued ID of asset owner(s)',
    required: true, 
    assetTypes: 'all' 
  },

  // ========== REAL ESTATE SPECIFIC ==========
  { 
    value: 'title_deed', 
    label: 'Title Deed / Property Deed', 
    description: 'Official property ownership document',
    required: true, 
    assetTypes: ['real_estate'] 
  },
  { 
    value: 'land_registry', 
    label: 'Land Registry Extract', 
    description: 'Official registration from land registry',
    required: true, 
    assetTypes: ['real_estate'] 
  },
  { 
    value: 'property_tax', 
    label: 'Property Tax Records', 
    description: 'Recent property tax payment receipts',
    required: true, 
    assetTypes: ['real_estate'] 
  },
  { 
    value: 'property_insurance', 
    label: 'Property Insurance Certificate', 
    description: 'Current property insurance policy',
    required: true, 
    assetTypes: ['real_estate'] 
  },
  { 
    value: 'survey_plan', 
    label: 'Survey / Plot Plan', 
    description: 'Property boundaries and measurements',
    required: true, 
    assetTypes: ['real_estate'] 
  },
  { 
    value: 'zoning_certificate', 
    label: 'Zoning Certificate', 
    description: 'Land use and zoning permissions',
    required: true, 
    assetTypes: ['real_estate'] 
  },
  { 
    value: 'mortgage_lien', 
    label: 'Mortgage / Lien Documentation', 
    description: 'Any encumbrances or outstanding loans on property',
    required: true, 
    assetTypes: ['real_estate'] 
  },
  { 
    value: 'rental_agreements', 
    label: 'Rental Agreements', 
    description: 'Current lease agreements (if income-generating)',
    required: false, 
    assetTypes: ['real_estate'] 
  },
  { 
    value: 'building_permits', 
    label: 'Building Permits', 
    description: 'Construction or renovation permits',
    required: false, 
    assetTypes: ['real_estate'] 
  },
  { 
    value: 'environmental_report', 
    label: 'Environmental Report', 
    description: 'Environmental assessment (commercial/industrial)',
    required: false, 
    assetTypes: ['real_estate', 'infrastructure'] 
  },

  // ========== INFRASTRUCTURE SPECIFIC ==========
  { 
    value: 'concession_agreement', 
    label: 'Concession Agreement', 
    description: 'Government concession or operating rights',
    required: true, 
    assetTypes: ['infrastructure'] 
  },
  { 
    value: 'operating_license', 
    label: 'Operating License', 
    description: 'License to operate the infrastructure',
    required: true, 
    assetTypes: ['infrastructure'] 
  },
  { 
    value: 'engineering_report', 
    label: 'Engineering Assessment', 
    description: 'Technical condition and safety report',
    required: true, 
    assetTypes: ['infrastructure'] 
  },
  { 
    value: 'revenue_projections', 
    label: 'Revenue Projections', 
    description: 'Financial projections and toll/fee structure',
    required: true, 
    assetTypes: ['infrastructure', 'revenue_based'] 
  },

  // ========== ART & COLLECTIBLES SPECIFIC ==========
  { 
    value: 'certificate_authenticity', 
    label: 'Certificate of Authenticity', 
    description: 'Artist or gallery verification of authenticity',
    required: true, 
    assetTypes: ['art_collectibles'] 
  },
  { 
    value: 'provenance', 
    label: 'Provenance Documentation', 
    description: 'Complete ownership history',
    required: true, 
    assetTypes: ['art_collectibles'] 
  },
  { 
    value: 'condition_report', 
    label: 'Condition Report', 
    description: 'Professional assessment of current condition',
    required: true, 
    assetTypes: ['art_collectibles'] 
  },
  { 
    value: 'high_res_photos', 
    label: 'High-Resolution Photos', 
    description: 'Detailed photographs of the item',
    required: true, 
    assetTypes: ['art_collectibles'] 
  },
  { 
    value: 'art_insurance', 
    label: 'Art Insurance Certificate', 
    description: 'Specialized art/collectibles insurance',
    required: true, 
    assetTypes: ['art_collectibles'] 
  },
  { 
    value: 'import_export_docs', 
    label: 'Import/Export Documents', 
    description: 'Customs clearance documentation',
    required: false, 
    assetTypes: ['art_collectibles', 'commodities'] 
  },

  // ========== BUSINESS EQUITY SPECIFIC ==========
  { 
    value: 'company_registration', 
    label: 'Company Registration', 
    description: 'Certificate of incorporation',
    required: true, 
    assetTypes: ['business_equity'] 
  },
  { 
    value: 'shareholder_agreement', 
    label: 'Shareholder Agreement', 
    description: 'Current shareholder/operating agreement',
    required: true, 
    assetTypes: ['business_equity'] 
  },
  { 
    value: 'cap_table', 
    label: 'Capitalization Table', 
    description: 'Current ownership structure',
    required: true, 
    assetTypes: ['business_equity'] 
  },
  { 
    value: 'financial_statements', 
    label: 'Audited Financial Statements', 
    description: 'Last 2-3 years of audited financials',
    required: true, 
    assetTypes: ['business_equity'] 
  },
  { 
    value: 'board_resolution', 
    label: 'Board Resolution', 
    description: 'Board approval for tokenization',
    required: true, 
    assetTypes: ['business_equity'] 
  },
  { 
    value: 'business_plan', 
    label: 'Business Plan', 
    description: 'Current business plan and projections',
    required: false, 
    assetTypes: ['business_equity'] 
  },
  { 
    value: 'tax_returns', 
    label: 'Tax Returns', 
    description: 'Recent business tax filings',
    required: false, 
    assetTypes: ['business_equity', 'revenue_based'] 
  },

  // ========== REVENUE BASED SPECIFIC ==========
  { 
    value: 'revenue_agreement', 
    label: 'Revenue/Royalty Agreement', 
    description: 'Contract governing revenue streams',
    required: true, 
    assetTypes: ['revenue_based'] 
  },
  { 
    value: 'payment_history', 
    label: 'Payment History', 
    description: 'Historical revenue/royalty payments',
    required: true, 
    assetTypes: ['revenue_based'] 
  },
  { 
    value: 'payer_verification', 
    label: 'Payer Verification', 
    description: 'Verification of revenue source/payer',
    required: true, 
    assetTypes: ['revenue_based'] 
  },

  // ========== COMMODITIES SPECIFIC ==========
  { 
    value: 'warehouse_receipt', 
    label: 'Warehouse Receipt', 
    description: 'Proof of storage location',
    required: true, 
    assetTypes: ['commodities'] 
  },
  { 
    value: 'assay_certificate', 
    label: 'Assay Certificate', 
    description: 'Purity and quality verification',
    required: true, 
    assetTypes: ['commodities'] 
  },
  { 
    value: 'chain_of_custody', 
    label: 'Chain of Custody', 
    description: 'Origin and handling history',
    required: true, 
    assetTypes: ['commodities'] 
  },
  { 
    value: 'storage_agreement', 
    label: 'Storage Agreement', 
    description: 'Custodian/storage terms',
    required: true, 
    assetTypes: ['commodities'] 
  },
  { 
    value: 'commodity_insurance', 
    label: 'Commodity Insurance', 
    description: 'Insurance for stored commodities',
    required: true, 
    assetTypes: ['commodities'] 
  },

  // ========== VEHICLES & EQUIPMENT SPECIFIC ==========
  { 
    value: 'vehicle_title', 
    label: 'Vehicle Title / Registration', 
    description: 'Official ownership registration',
    required: true, 
    assetTypes: ['vehicles'] 
  },
  { 
    value: 'vehicle_insurance', 
    label: 'Insurance Certificate', 
    description: 'Current vehicle/equipment insurance',
    required: true, 
    assetTypes: ['vehicles'] 
  },
  { 
    value: 'maintenance_records', 
    label: 'Maintenance Records', 
    description: 'Service and repair history',
    required: true, 
    assetTypes: ['vehicles'] 
  },
  { 
    value: 'inspection_report', 
    label: 'Inspection Report', 
    description: 'Recent professional inspection',
    required: true, 
    assetTypes: ['vehicles'] 
  },
  { 
    value: 'lien_release', 
    label: 'Lien Release', 
    description: 'Proof of no outstanding loans',
    required: false, 
    assetTypes: ['vehicles'] 
  },

  // ========== INTELLECTUAL PROPERTY SPECIFIC ==========
  { 
    value: 'ip_registration', 
    label: 'IP Registration Certificate', 
    description: 'Patent, trademark, or copyright registration',
    required: true, 
    assetTypes: ['intellectual_property'] 
  },
  { 
    value: 'ip_assignment', 
    label: 'Assignment Agreement', 
    description: 'IP transfer/assignment documentation',
    required: true, 
    assetTypes: ['intellectual_property'] 
  },
  { 
    value: 'ip_valuation', 
    label: 'IP Valuation Report', 
    description: 'Professional IP valuation',
    required: true, 
    assetTypes: ['intellectual_property'] 
  },
  { 
    value: 'licensing_agreements', 
    label: 'Licensing Agreements', 
    description: 'Existing licenses granted',
    required: false, 
    assetTypes: ['intellectual_property'] 
  },
  { 
    value: 'ip_revenue_history', 
    label: 'Revenue History', 
    description: 'Historical licensing/royalty income',
    required: false, 
    assetTypes: ['intellectual_property', 'revenue_based'] 
  },

  // ========== OPTIONAL FOR ALL ==========
  { 
    value: 'legal_opinion', 
    label: 'Legal Opinion', 
    description: 'Legal review of tokenization compliance',
    required: false, 
    assetTypes: 'all' 
  },
  { 
    value: 'spv_documents', 
    label: 'SPV/Legal Entity Documents', 
    description: 'If asset is held through a legal entity',
    required: false, 
    assetTypes: 'all' 
  },
  { 
    value: 'other', 
    label: 'Other Document', 
    description: 'Additional supporting documentation',
    required: false, 
    assetTypes: 'all' 
  },
];

// Helper function to get document types for a specific asset type
export function getDocumentTypesForAsset(assetType: string): DocumentType[] {
  if (!assetType) return [];
  
  return ALL_DOCUMENT_TYPES.filter(doc => 
    doc.assetTypes === 'all' || doc.assetTypes.includes(assetType)
  );
}

// Helper function to get required documents for a specific asset type
export function getRequiredDocumentsForAsset(assetType: string): DocumentType[] {
  return getDocumentTypesForAsset(assetType).filter(doc => doc.required);
}

// Helper function to get optional documents for a specific asset type
export function getOptionalDocumentsForAsset(assetType: string): DocumentType[] {
  return getDocumentTypesForAsset(assetType).filter(doc => !doc.required);
}

// Legacy export for backward compatibility (returns universal docs only)
export const DOCUMENT_TYPES = ALL_DOCUMENT_TYPES.filter(doc => doc.assetTypes === 'all');

export const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CHF', label: 'CHF' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'AED', label: 'AED' },
  { value: 'SGD', label: 'SGD' },
];

export const INITIAL_FORM_DATA: FormData = {
  assetType: '',
  assetName: '',
  assetDescription: '',
  assetLocation: '',
  estimatedValue: '',
  currency: 'USD',
  website: '',
  tokenName: '',
  tokenSymbol: '',
  totalSupply: '',
  pricePerToken: '',
  useCase: '',
  companyName: '',
  legalEntityType: '',
  legalJurisdiction: '',
  contactName: '',
  email: '',
  phone: '',
  additionalNotes: '',
};
