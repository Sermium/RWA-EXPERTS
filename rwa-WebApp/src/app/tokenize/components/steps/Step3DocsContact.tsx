'use client';

import React, { RefObject } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2, User, Mail, Phone, MessageSquare, Info } from 'lucide-react';
import { 
  FormData, 
  FormErrors, 
  DocumentFile, 
  DocumentType,
  getRequiredDocumentsForAsset,
  getOptionalDocumentsForAsset,
  ASSET_TYPES
} from '../../types';

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
        <h2 className="text-xl font-semibold text-white mb-2">Required Documents</h2>
        <p className="text-gray-400 text-sm mb-4">
          Upload documents to verify your {assetLabel.toLowerCase()} ownership and valuation
        </p>

        {/* Asset Type Info */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-blue-300 font-medium">
                Document requirements for {assetLabel}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {totalRequired} required document{totalRequired !== 1 ? 's' : ''} • {optionalDocs.length} optional
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Upload Progress</span>
            <span className={progressPercent === 100 ? 'text-green-400' : 'text-yellow-400'}>
              {uploadedRequired} / {totalRequired} required
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                progressPercent === 100 ? 'bg-green-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Required Documents Status */}
        <div className={`p-4 rounded-xl border mb-6 ${
          missingRequiredDocs.length === 0 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-yellow-500/10 border-yellow-500/30'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {missingRequiredDocs.length === 0 ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-400" />
            )}
            <span className={missingRequiredDocs.length === 0 ? 'text-green-400' : 'text-yellow-400'}>
              {missingRequiredDocs.length === 0 
                ? 'All required documents uploaded' 
                : `${missingRequiredDocs.length} required document(s) missing`}
            </span>
          </div>
          {missingRequiredDocs.length > 0 && (
            <p className="text-sm text-gray-400">
              Missing: {missingRequiredDocs.slice(0, 3).map(d => d.label).join(', ')}
              {missingRequiredDocs.length > 3 && ` and ${missingRequiredDocs.length - 3} more...`}
            </p>
          )}
        </div>

        {/* Required Documents */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">
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
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-gray-700/50 border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {uploaded ? (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : (
                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{docType.label}</p>
                      {docType.description && !uploaded && (
                        <p className="text-gray-500 text-xs truncate">{docType.description}</p>
                      )}
                      {uploaded && (
                        <p className="text-gray-400 text-xs truncate">{uploaded.name}</p>
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
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg flex-shrink-0 ml-2"
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Additional Documents <span className="text-gray-500">({optionalDocs.length} optional)</span>
            </label>
            <div className="flex gap-2">
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white"
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
                className="px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white rounded-xl"
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
            <p className="text-sm text-gray-400">Uploaded optional documents:</p>
            {documents
              .filter(d => !requiredDocs.some(r => r.value === d.type))
              .map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-white text-sm">{doc.name}</p>
                      <p className="text-gray-400 text-xs">
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
      <div className="border-t border-gray-700" />

      {/* Contact Section - unchanged */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Contact Information</h2>
        <p className="text-gray-400 text-sm mb-6">
          How can we reach you about your application?
        </p>

        <div className="space-y-4">
          {/* Contact Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contact Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => updateFormData('contactName', e.target.value)}
                placeholder="John Doe"
                className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.contactName ? 'border-red-500' : 'border-gray-600'
                }`}
              />
            </div>
            {errors.contactName && (
              <p className="mt-1 text-sm text-red-400">{errors.contactName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder="john@example.com"
                className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-600'
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-400">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number <span className="text-gray-500">(Optional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData('phone', e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Additional Notes <span className="text-gray-500">(Optional)</span>
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                value={formData.additionalNotes}
                onChange={(e) => updateFormData('additionalNotes', e.target.value)}
                placeholder="Any additional information about your asset or requirements..."
                rows={3}
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
