'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Loader2, ChevronLeft, ChevronRight, Send } from 'lucide-react';

// Hooks
import { useTokenizeForm } from './hooks/useTokenizeForm';
import { useFileUpload } from './hooks/useFileUpload';

// Components
import { ProgressSteps } from './components/ProgressSteps';
import { SuccessModal } from './components/SuccessModal';
import { Step1AssetInfo } from './components/steps/Step1AssetInfo';
import { Step2Tokenization } from './components/steps/Step2Tokenization';
import { Step3DocsContact } from './components/steps/Step3DocsContact';
import { Step4Review } from './components/steps/Step4Review';

interface PaymentInfo {
  txHash: string;
  escrow: boolean;
  dividend: boolean;
  totalAmount: number;
  currency: 'USDC' | 'USDT';
}

export default function TokenizePage() {
  const { address, isConnected } = useAccount();
  
  // Payment state
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);

  const {
    currentStep,
    formData,
    updateFormData,
    errors,
    setErrors,
    documents,
    setDocuments,
    logoFile,
    setLogoFile,
    bannerFile,
    setBannerFile,
    isSubmitting,
    setIsSubmitting,
    submitSuccess,
    setSubmitSuccess,
    submitError,
    setSubmitError,
    validateStep,
    nextStep,
    prevStep,
    goToStep,
    resetForm,
  } = useTokenizeForm();

  const {
    uploadingDocument,
    uploadingLogo,
    uploadingBanner,
    selectedDocType,
    setSelectedDocType,
    fileInputRef,
    logoInputRef,
    bannerInputRef,
    handleLogoUpload,
    handleBannerUpload,
    handleDocumentUpload,
    removeDocument,
    removeLogo,
    removeBanner,
  } = useFileUpload({
    documents,
    setDocuments,
    setLogoFile,
    setBannerFile,
    setErrors,
  });

  // Handle payment completion
  const handlePaymentComplete = (txHash: string, options: { escrow: boolean; dividend: boolean; totalAmount: number; currency: 'USDC' | 'USDT' }) => {
    setPaymentInfo({
      txHash,
      ...options,
    });
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    if (!address) {
      setSubmitError('Please connect your wallet');
      return;
    }
    if (!paymentInfo) {
      setSubmitError('Please complete payment first');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      ...formData,
      walletAddress: address,
      // Payment info
      feeTxHash: paymentInfo.txHash,
      feeAmount: paymentInfo.totalAmount.toString(),
      feeCurrency: paymentInfo.currency,
      // Options
      includeEscrow: paymentInfo.escrow,
      includeDividend: paymentInfo.dividend,
      // Files
      logo: logoFile ? { url: logoFile.url, ipfsHash: logoFile.ipfsHash } : null,
      banner: bannerFile ? { url: bannerFile.url, ipfsHash: bannerFile.ipfsHash } : null,
      documents: documents.map(doc => ({
        name: doc.name,
        type: doc.type,
        url: doc.url,
        mimeType: doc.mimeType,
        size: doc.size,
        ipfsHash: doc.ipfsHash,
      })),
    };

    console.log('Submitting payload:', payload);

    try {
      const response = await fetch('/api/tokenization/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('API response:', response.status, data);

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to submit application');
      }

      setSubmitSuccess(true);
    } catch (error: any) {
      console.error('Submit error:', error);
      setSubmitError(error.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    resetForm();
    setPaymentInfo(null);
    setSubmitSuccess(false);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to submit a tokenization application.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Tokenize Your Asset</h1>
          <p className="text-gray-400">
            Complete the form below to submit your asset for tokenization
          </p>
        </div>

        <ProgressSteps currentStep={currentStep} onStepClick={goToStep} />

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 md:p-8">
          {/* Step 1: Asset Info */}
          {currentStep === 1 && (
            <Step1AssetInfo
              formData={formData}
              errors={errors}
              updateFormData={updateFormData}
            />
          )}

          {/* Step 2: Tokenization */}
          {currentStep === 2 && (
            <Step2Tokenization
              formData={formData}
              errors={errors}
              updateFormData={updateFormData}
              logoFile={logoFile}
              bannerFile={bannerFile}
              uploadingLogo={uploadingLogo}
              uploadingBanner={uploadingBanner}
              logoInputRef={logoInputRef}
              bannerInputRef={bannerInputRef}
              handleLogoUpload={handleLogoUpload}
              handleBannerUpload={handleBannerUpload}
              removeLogo={removeLogo}
              removeBanner={removeBanner}
            />
          )}

          {/* Step 3: Documents & Contact */}
          {currentStep === 3 && (
            <Step3DocsContact
              formData={formData}
              errors={errors}
              updateFormData={updateFormData}
              documents={documents}
              uploadingDocument={uploadingDocument}
              selectedDocType={selectedDocType}
              setSelectedDocType={setSelectedDocType}
              fileInputRef={fileInputRef}
              handleDocumentUpload={handleDocumentUpload}
              removeDocument={removeDocument}
            />
          )}

          {/* Step 4: Review & Payment */}
          {currentStep === 4 && (
            <Step4Review
              formData={formData}
              documents={documents}
              logoFile={logoFile}
              bannerFile={bannerFile}
              onEdit={goToStep}
              onPaymentComplete={handlePaymentComplete}
            />
          )}

          {submitError && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400">{submitError}</p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors
                ${currentStep === 1
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
                }
              `}
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !paymentInfo}
                className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-colors ${
                  paymentInfo
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {paymentInfo ? 'Submit Application' : 'Complete Payment First'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {submitSuccess && <SuccessModal onClose={handleSuccessClose} />}
    </div>
  );
}
