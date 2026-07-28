'use client';

import React, { RefObject, useState } from 'react';
import { 
  Upload, X, FileText, CheckCircle, AlertCircle, Loader2, 
  User, Mail, Phone, MessageSquare, Info, Building2, ChevronDown, MapPin, Briefcase 
} from 'lucide-react';
import { 
  FormData, 
  FormErrors, 
  DocumentFile, 
  DocumentType,
  getRequiredDocumentsForAsset,
  getOptionalDocumentsForAsset,
  ASSET_TYPES
} from '@/types/tokenization';

interface Step3DocsContactProps {
  formData: FormData;
  errors: FormErrors;
  updateFormData: (field: keyof FormData, value: any) => void;
  documents: DocumentFile[];
  uploadingDocument: boolean;
  selectedDocType: string;
  setSelectedDocType: (type: string) => void;
  fileInputRef: RefObject<HTMLInputElement>;
  handleDocumentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeDocument: (index: number) => void;
}

// Legal entity types
const LEGAL_ENTITY_TYPES = [
  { value: '', label: 'Select entity type' },
  { value: 'corporation', label: 'Corporation (Inc., Corp.)' },
  { value: 'llc', label: 'Limited Liability Company (LLC)' },
  { value: 'partnership', label: 'Partnership (LP, LLP)' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'trust', label: 'Trust' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'individual', label: 'Individual (No Entity)' },
  { value: 'other', label: 'Other' },
];

// Common jurisdictions
const JURISDICTIONS = [
  { value: '', label: 'Select jurisdiction' },
  { value: 'us_delaware', label: 'United States - Delaware' },
  { value: 'us_wyoming', label: 'United States - Wyoming' },
  { value: 'us_nevada', label: 'United States - Nevada' },
  { value: 'us_other', label: 'United States - Other' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'switzerland', label: 'Switzerland' },
  { value: 'singapore', label: 'Singapore' },
  { value: 'uae', label: 'United Arab Emirates' },
  { value: 'cayman', label: 'Cayman Islands' },
  { value: 'bvi', label: 'British Virgin Islands' },
  { value: 'luxembourg', label: 'Luxembourg' },
  { value: 'netherlands', label: 'Netherlands' },
  { value: 'germany', label: 'Germany' },
  { value: 'france', label: 'France' },
  { value: 'hong_kong', label: 'Hong Kong' },
  { value: 'australia', label: 'Australia' },
  { value: 'canada', label: 'Canada' },
  { value: 'other', label: 'Other' },
];

export function Step3DocsContact({
  formData,
  errors,
  updateFormData,
  documents,
  uploadingDocument,
  selectedDocType,
  setSelectedDocType,
  fileInputRef,
  handleDocumentUpload,
  removeDocument,
}: Step3DocsContactProps) {
  const [showCompanyInfo, setShowCompanyInfo] = useState(
    !!(formData.companyName || formData.legalEntityType || formData.legalJurisdiction)
  );
  
  // Get asset-specific document requirements
  const assetType = formData.assetType;
  const assetLabel = ASSET_TYPES.find(a => a.value === assetType)?.label || 'Asset';
  
  const requiredDocs = getRequiredDocumentsForAsset(assetType);
  const optionalDocs = getOptionalDocumentsForAsset(assetType);
  
  const uploadedRequiredTypes = documents
    .filter(d => requiredDocs.some(r => r.value === d.type))
    .map(d => d.type);
  const missingRequiredDocs = requiredDocs.filter(d => !uploadedRequiredTypes.includes(d.value));

  const totalRequired = requiredDocs.length;
  const uploadedRequired = uploadedRequiredTypes.length;
  const progressPercent = totalRequired > 0 ? Math.round((uploadedRequired / totalRequired) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Documents Section */}
      <div>
        <h2 className="text-xl font-semibold text-ink mb-2">Required Documents</h2>
        <p className="text-ink-muted text-sm mb-4">
          Upload documents to verify your {assetLabel.toLowerCase()} ownership and valuation
        </p>

        {/* Asset Type Info */}
        <div className="p-4 bg-gold-500/10 border border-gold-500/30 rounded-xl mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gold-400 mt-0.5" />
            <div>
              <p className="text-gold-300 font-medium">
                Document requirements for {assetLabel}
              </p>
              <p className="text-ink-muted text-sm mt-1">
                {totalRequired} required document{totalRequired !== 1 ? 's' : ''} • {optionalDocs.length} optional
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-ink-muted">Upload Progress</span>
            <span className={progressPercent === 100 ? 'text-success' : 'text-warning'}>
              {uploadedRequired} / {totalRequired} required
            </span>
          </div>
          <div className="h-2 bg-surface-overlay rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                progressPercent === 100 ? 'bg-success' : 'bg-warning'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Required Documents Status */}
        <div className={`p-4 rounded-xl border mb-6 ${
          missingRequiredDocs.length === 0 
            ? 'bg-success/10 border-success/30' 
            : 'bg-warning-muted border-warning/30'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {missingRequiredDocs.length === 0 ? (
              <CheckCircle className="w-5 h-5 text-success" />
            ) : (
              <AlertCircle className="w-5 h-5 text-warning" />
            )}
            <span className={missingRequiredDocs.length === 0 ? 'text-success' : 'text-warning'}>
              {missingRequiredDocs.length === 0 
                ? 'All required documents uploaded' 
                : `${missingRequiredDocs.length} required document(s) missing`}
            </span>
          </div>
          {missingRequiredDocs.length > 0 && (
            <p className="text-sm text-ink-muted">
              Missing: {missingRequiredDocs.slice(0, 3).map(d => d.label).join(', ')}
              {missingRequiredDocs.length > 3 && ` and ${missingRequiredDocs.length - 3} more...`}
            </p>
          )}
        </div>

        {/* Required Documents */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-ink-muted mb-3">
            Required Documents ({requiredDocs.length})
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {requiredDocs.map((docType) => {
              const uploaded = documents.find(d => d.type === docType.value);
              return (
                <div
                  key={docType.value}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    uploaded 
                      ? 'bg-success/10 border-success/30' 
                      : 'bg-surface-overlay/50 border-border-strong'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {uploaded ? (
                      <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                    ) : (
                      <FileText className="w-5 h-5 text-ink-muted flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-ink text-sm font-medium truncate">{docType.label}</p>
                      {docType.description && !uploaded && (
                        <p className="text-ink-faint text-xs truncate">{docType.description}</p>
                      )}
                      {uploaded && (
                        <p className="text-ink-muted text-xs truncate">{uploaded.name}</p>
                      )}
                    </div>
                  </div>
                  {uploaded ? (
                    <button
                      onClick={() => {
                        const index = documents.findIndex(d => d.type === docType.value);
                        if (index !== -1) removeDocument(index);
                      }}
                      className="p-1 text-red-400 hover:text-red-300 flex-shrink-0 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedDocType(docType.value);
                        setTimeout(() => fileInputRef.current?.click(), 100);
                      }}
                      disabled={uploadingDocument}
                      className="px-3 py-1 bg-gold-500 hover:bg-gold-600 text-ink text-sm rounded-lg flex-shrink-0 ml-2"
                    >
                      {uploadingDocument && selectedDocType === docType.value ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Upload'
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Optional Documents */}
        {optionalDocs.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Additional Documents <span className="text-ink-faint">({optionalDocs.length} optional)</span>
            </label>
            <div className="flex gap-2">
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="flex-1 px-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink"
              >
                <option value="">Select document type</option>
                {optionalDocs.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                    {documents.some(d => d.type === type.value) ? ' ✓' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedDocType || uploadingDocument}
                className="px-4 py-3 bg-gold hover:bg-gold-light disabled:bg-border-strong text-surface-sunken rounded-lg"
              >
                {uploadingDocument ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleDocumentUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Uploaded Optional Documents List */}
        {documents.filter(d => !requiredDocs.some(r => r.value === d.type)).length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-ink-muted">Uploaded optional documents:</p>
            {documents
              .filter(d => !requiredDocs.some(r => r.value === d.type))
              .map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-surface-overlay/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gold-400" />
                    <div>
                      <p className="text-ink text-sm">{doc.name}</p>
                      <p className="text-ink-muted text-xs">
                        {optionalDocs.find(t => t.value === doc.type)?.label || doc.type}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeDocument(documents.indexOf(doc))}
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
          </div>
        )}

        {(errors.documents || errors.valuation) && (
          <p className="mt-2 text-sm text-red-400">{errors.documents || errors.valuation}</p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Contact Section */}
      <div>
        <h2 className="text-xl font-semibold text-ink mb-2">Contact Information</h2>
        <p className="text-ink-muted text-sm mb-6">
          How can we reach you about your application?
        </p>

        <div className="space-y-4">
          {/* Contact Name */}
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Contact Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => updateFormData('contactName', e.target.value)}
                placeholder="John Doe"
                className={`w-full pl-10 pr-4 py-3 bg-surface-overlay border rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-gold-500 ${
                  errors.contactName ? 'border-red-500' : 'border-border-strong'
                }`}
              />
            </div>
            {errors.contactName && (
              <p className="mt-1 text-sm text-red-400">{errors.contactName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Email Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder="john@example.com"
                className={`w-full pl-10 pr-4 py-3 bg-surface-overlay border rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-gold-500 ${
                  errors.email ? 'border-red-500' : 'border-border-strong'
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-400">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Phone Number <span className="text-ink-faint">(Optional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData('phone', e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full pl-10 pr-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Additional Notes <span className="text-ink-faint">(Optional)</span>
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-ink-muted" />
              <textarea
                value={formData.additionalNotes}
                onChange={(e) => updateFormData('additionalNotes', e.target.value)}
                placeholder="Any additional information about your asset or requirements..."
                rows={3}
                className="w-full pl-10 pr-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-gold-500 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Company Information Section (Collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setShowCompanyInfo(!showCompanyInfo)}
          className="w-full flex items-center justify-between p-4 bg-surface border border-border rounded-xl hover:bg-surface-overlay transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-gold-400" />
            </div>
            <div className="text-left">
              <h3 className="text-ink font-medium">Company Information</h3>
              <p className="text-ink-muted text-sm">Optional - Add if asset is held by a legal entity</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-ink-muted transition-transform ${showCompanyInfo ? 'rotate-180' : ''}`} />
        </button>

        {showCompanyInfo && (
          <div className="mt-4 p-6 bg-surface/50 border border-border rounded-xl space-y-4">
            <div className="p-3 bg-gold-500/10 border border-gold-500/20 rounded-lg mb-4">
              <p className="text-gold-300 text-sm">
                If your asset is owned by a company, trust, or other legal entity, please provide the details below. 
                This helps with compliance and legal structuring.
              </p>
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-2">
                Company / Entity Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => updateFormData('companyName', e.target.value)}
                  placeholder="Acme Holdings LLC"
                  className="w-full pl-10 pr-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
            </div>

            {/* Entity Type and Jurisdiction - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Legal Entity Type */}
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Entity Type
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
                  <select
                    value={formData.legalEntityType}
                    onChange={(e) => updateFormData('legalEntityType', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-gold appearance-none"
                  >
                    {LEGAL_ENTITY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted pointer-events-none" />
                </div>
              </div>

              {/* Jurisdiction */}
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Jurisdiction
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
                  <select
                    value={formData.legalJurisdiction}
                    onChange={(e) => updateFormData('legalJurisdiction', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface-overlay border border-border-strong rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-gold appearance-none"
                  >
                    {JURISDICTIONS.map((j) => (
                      <option key={j.value} value={j.value}>
                        {j.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Clear Company Info Button */}
            {(formData.companyName || formData.legalEntityType || formData.legalJurisdiction) && (
              <button
                type="button"
                onClick={() => {
                  updateFormData('companyName', '');
                  updateFormData('legalEntityType', '');
                  updateFormData('legalJurisdiction', '');
                }}
                className="text-sm text-ink-muted hover:text-ink-muted underline"
              >
                Clear company information
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
