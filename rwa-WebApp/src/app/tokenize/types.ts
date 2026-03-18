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
  { value: 'real_estate', label: 'Real Estate', icon: '🏠', description: 'Properties, land, buildings' },
  { value: 'infrastructure', label: 'Infrastructure', icon: '🏗️', description: 'Roads, bridges, utilities' },
  { value: 'art_collectibles', label: 'Art & Collectibles', icon: '🎨', description: 'Artwork, rare items, memorabilia' },
  { value: 'business_equity', label: 'Business Equity', icon: '🏢', description: 'Company shares, ownership stakes' },
  { value: 'revenue_based', label: 'Revenue Based', icon: '💰', description: 'Royalties, recurring income streams' },
  { value: 'commodities', label: 'Commodities', icon: '📦', description: 'Raw materials, precious metals' },
  { value: 'other', label: 'Other', icon: '🔷', description: 'Other asset types' },
];

export const USE_CASES = [
  { value: 'fractional_ownership', label: 'Fractional Ownership' },
  { value: 'liquidity', label: 'Liquidity Enhancement' },
  { value: 'fundraising', label: 'Fundraising' },
  { value: 'trading', label: 'Trading & Investment' },
  { value: 'collateral', label: 'Collateral for Loans' },
  { value: 'dividend_distribution', label: 'Dividend Distribution' },
];

export const DOCUMENT_TYPES = [
  { value: 'ownership_proof', label: 'Ownership Proof', required: true },
  { value: 'valuation', label: 'Valuation Report', required: true },
  { value: 'legal_opinion', label: 'Legal Opinion', required: false },
  { value: 'insurance', label: 'Insurance Certificate', required: false },
  { value: 'company_registration', label: 'Company Registration', required: false },
  { value: 'financial_statements', label: 'Financial Statements', required: false },
  { value: 'other', label: 'Other Document', required: false },
];

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
