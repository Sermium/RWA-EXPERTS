'use client';

import React, { useEffect, RefObject } from 'react';
import { Coins, Tag, Hash, DollarSign, Target, Calculator, Image, X, Loader2 } from 'lucide-react';
import { FormData, FormErrors, UploadedFile, USE_CASES } from '../../types';

interface Step2TokenizationProps {
  formData: FormData;
  errors: FormErrors;
  updateFormData: (field: keyof FormData, value: any) => void;
  logoFile: UploadedFile | null;
  bannerFile: UploadedFile | null;
  uploadingLogo: boolean;
  uploadingBanner: boolean;
  logoInputRef: RefObject<HTMLInputElement>;
  bannerInputRef: RefObject<HTMLInputElement>;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeLogo: () => void;
  removeBanner: () => void;
}

// Format number with commas
const formatNumber = (value: string): string => {
  const rawValue = value.replace(/[^0-9]/g, '');
  return rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Generate suggested symbol from token name
const generateSymbol = (name: string): string => {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return name.slice(0, 4).toUpperCase();
  }
  return words.map(w => w[0]).join('').toUpperCase().slice(0, 5);
};

export function Step2Tokenization({
  formData,
  errors,
  updateFormData,
  logoFile,
  bannerFile,
  uploadingLogo,
  uploadingBanner,
  logoInputRef,
  bannerInputRef,
  handleLogoUpload,
  handleBannerUpload,
  removeLogo,
  removeBanner,
}: Step2TokenizationProps) {
  
  // Calculate price per token automatically
  const estimatedValue = parseFloat(formData.estimatedValue?.replace(/,/g, '') || '0');
  const totalSupply = parseFloat(formData.totalSupply?.replace(/,/g, '') || '0');
  const pricePerToken = totalSupply > 0 ? estimatedValue / totalSupply : 0;
  const totalValuation = totalSupply * pricePerToken;

  // Update pricePerToken in formData when supply changes
  useEffect(() => {
    if (totalSupply > 0 && estimatedValue > 0) {
      const calculatedPrice = (estimatedValue / totalSupply).toFixed(4);
      updateFormData('pricePerToken', calculatedPrice);
    }
  }, [formData.totalSupply, formData.estimatedValue]);

  const handleTokenNameChange = (value: string) => {
    updateFormData('tokenName', value);
    // Auto-suggest symbol if empty
    if (!formData.tokenSymbol) {
      updateFormData('tokenSymbol', generateSymbol(value));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Tokenization Details</h2>
        <p className="text-gray-400 text-sm">
          Configure how your asset will be tokenized
        </p>
      </div>

      {/* Asset Value Reference */}
      <div className="p-4 bg-gray-700/50 border border-gray-600 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-5 h-5 text-blue-400" />
          <span className="text-gray-300 font-medium">Asset Valuation</span>
        </div>
        <p className="text-2xl font-bold text-white">
          ${formData.estimatedValue || '0'} <span className="text-gray-400 text-lg">{formData.currency}</span>
        </p>
        <p className="text-gray-500 text-sm mt-1">
          From Step 1 • This value will be distributed across your tokens
        </p>
      </div>

      {/* Token Branding */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Token Branding
        </label>
        <div className="grid grid-cols-4 gap-4">
          {/* Logo Upload - 1:1 */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Logo (1:1)</p>
            {logoFile ? (
              <div className="relative aspect-square bg-gray-700 rounded-xl overflow-hidden border-2 border-blue-500/50">
                <img src={logoFile.url} alt="Logo" className="w-full h-full object-cover" />
                <button
                  onClick={removeLogo}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="w-full aspect-square bg-gray-700/50 border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center hover:border-blue-500 hover:bg-gray-700 transition-all"
              >
                {uploadingLogo ? (
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                ) : (
                  <>
                    <Image className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-400">Upload</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>

          {/* Banner Upload - 3:1 */}
          <div className="col-span-3">
            <p className="text-xs text-gray-400 mb-2">Banner (3:1)</p>
            {bannerFile ? (
              <div className="relative aspect-[3/1] bg-gray-700 rounded-xl overflow-hidden border-2 border-purple-500/50">
                <img src={bannerFile.url} alt="Banner" className="w-full h-full object-cover" />
                <button
                  onClick={removeBanner}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner}
                className="w-full aspect-[3/1] bg-gray-700/50 border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center hover:border-purple-500 hover:bg-gray-700 transition-all"
              >
                {uploadingBanner ? (
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                ) : (
                  <>
                    <Image className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-400">Upload Banner</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Token Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Token Name <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={formData.tokenName}
            onChange={(e) => handleTokenNameChange(e.target.value)}
            placeholder="e.g., Downtown Office Token"
            className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.tokenName ? 'border-red-500' : 'border-gray-600'
            }`}
          />
        </div>
        {errors.tokenName && (
          <p className="mt-1 text-sm text-red-400">{errors.tokenName}</p>
        )}
      </div>

      {/* Token Symbol */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Token Symbol <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={formData.tokenSymbol}
            onChange={(e) => {
              const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
              updateFormData('tokenSymbol', value);
            }}
            placeholder="e.g., DOT"
            maxLength={10}
            className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${
              errors.tokenSymbol ? 'border-red-500' : 'border-gray-600'
            }`}
          />
        </div>
        {errors.tokenSymbol && (
          <p className="mt-1 text-sm text-red-400">{errors.tokenSymbol}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Maximum 10 characters, letters and numbers only
        </p>
      </div>

      {/* Total Supply */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Total Supply <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={formData.totalSupply}
            onChange={(e) => updateFormData('totalSupply', formatNumber(e.target.value))}
            placeholder="e.g., 1,000,000"
            className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.totalSupply ? 'border-red-500' : 'border-gray-600'
            }`}
          />
        </div>
        {errors.totalSupply && (
          <p className="mt-1 text-sm text-red-400">{errors.totalSupply}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Total number of tokens to be minted
        </p>
      </div>

      {/* Price Per Token (Calculated - Read Only) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Price Per Token <span className="text-blue-400 text-xs">(Auto-calculated)</span>
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={pricePerToken > 0 ? `$${pricePerToken.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '-'}
            readOnly
            className="w-full pl-10 pr-20 py-3 bg-gray-600/50 border border-gray-600 rounded-xl text-white cursor-not-allowed"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            {formData.currency || 'USD'}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          = Asset Value ÷ Total Supply
        </p>
      </div>

      {/* Use Case */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Primary Use Case <span className="text-gray-500">(Optional)</span>
        </label>
        <div className="relative">
          <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={formData.useCase}
            onChange={(e) => updateFormData('useCase', e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="">Select a use case</option>
            {USE_CASES.map((useCase) => (
              <option key={useCase.value} value={useCase.value}>
                {useCase.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Card */}
      {formData.tokenName && formData.totalSupply && totalSupply > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-blue-500/30">
          {/* Banner Preview - 3:1 */}
          {bannerFile ? (
            <div className="relative aspect-[3/1] bg-gray-700">
              <img src={bannerFile.url} alt="Banner" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
            </div>
          ) : (
            <div className="aspect-[3/1] bg-gradient-to-r from-blue-500/20 to-purple-500/20" />
          )}
          
          {/* Token Info */}
          <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 -mt-12 relative">
            <div className="flex items-end gap-4 mb-4">
              {logoFile ? (
                <img 
                  src={logoFile.url} 
                  alt="Logo" 
                  className="w-20 h-20 rounded-xl object-cover border-4 border-gray-800 shadow-lg" 
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gray-700 flex items-center justify-center border-4 border-gray-800 shadow-lg">
                  <Coins className="w-8 h-8 text-gray-500" />
                </div>
              )}
              <div className="pb-1">
                <p className="text-white font-semibold text-lg">{formData.tokenName}</p>
                <p className="text-blue-400 font-medium">${formData.tokenSymbol}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <span className="text-gray-400 text-xs block">Supply</span>
                <p className="text-white font-medium">{formData.totalSupply}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <span className="text-gray-400 text-xs block">Price</span>
                <p className="text-white font-medium">
                  ${pricePerToken.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <span className="text-gray-400 text-xs block">Valuation</span>
                <p className="text-green-400 font-medium">
                  ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {Math.abs(totalValuation - estimatedValue) < 1 && (
              <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-green-400 text-xs flex items-center gap-1">
                  ✓ Token valuation matches asset value
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
