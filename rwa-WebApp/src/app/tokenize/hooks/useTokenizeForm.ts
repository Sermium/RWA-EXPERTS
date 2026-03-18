'use client';

import { useState, useCallback } from 'react';
import { FormData, FormErrors, DocumentFile, UploadedFile, INITIAL_FORM_DATA } from '../types';

export function useTokenizeForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [logoFile, setLogoFile] = useState<UploadedFile | null>(null);
  const [bannerFile, setBannerFile] = useState<UploadedFile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateFormData = useCallback((field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const validateStep = useCallback((step: number): boolean => {
    const newErrors: FormErrors = {};

    switch (step) {
      case 1:
        // Asset Info
        if (!formData.assetType) {
          newErrors.assetType = 'Please select an asset type';
        }
        if (!formData.assetName.trim()) {
          newErrors.assetName = 'Asset name is required';
        }
        if (!formData.assetDescription.trim()) {
          newErrors.assetDescription = 'Description is required';
        } else if (formData.assetDescription.length < 20) {
          newErrors.assetDescription = 'Please provide a more detailed description (min 20 characters)';
        }
        if (!formData.assetLocation.trim()) {
          newErrors.assetLocation = 'Location is required';
        }
        const estimatedValue = parseFloat(formData.estimatedValue.replace(/,/g, ''));
        if (!formData.estimatedValue || isNaN(estimatedValue) || estimatedValue <= 0) {
          newErrors.estimatedValue = 'Please enter a valid estimated value';
        }
        break;

      case 2:
        // Tokenization
        if (!formData.tokenName.trim()) {
          newErrors.tokenName = 'Token name is required';
        }
        if (!formData.tokenSymbol.trim()) {
          newErrors.tokenSymbol = 'Token symbol is required';
        } else if (formData.tokenSymbol.length > 10) {
          newErrors.tokenSymbol = 'Symbol must be 10 characters or less';
        } else if (!/^[A-Z0-9]+$/.test(formData.tokenSymbol)) {
          newErrors.tokenSymbol = 'Symbol must contain only uppercase letters and numbers';
        }
        const supply = parseFloat(formData.totalSupply.replace(/,/g, ''));
        if (!formData.totalSupply || isNaN(supply) || supply <= 0) {
          newErrors.totalSupply = 'Total supply is required';
        } else if (supply > 1000000000000) {
          newErrors.totalSupply = 'Total supply cannot exceed 1 trillion';
        }
        const price = parseFloat(formData.pricePerToken.replace(/,/g, ''));
        if (!formData.pricePerToken || isNaN(price) || price <= 0) {
          newErrors.pricePerToken = 'Price per token is required';
        }
        break;

      case 3:
        // Documents & Contact (merged)
        const hasOwnershipProof = documents.some(d => d.type === 'ownership_proof');
        const hasValuation = documents.some(d => d.type === 'valuation');
        if (!hasOwnershipProof) {
          newErrors.documents = 'Ownership proof document is required';
        }
        if (!hasValuation) {
          newErrors.valuation = 'Valuation report is required';
        }
        if (!formData.contactName.trim()) {
          newErrors.contactName = 'Contact name is required';
        }
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }
        break;

      case 4:
        // Review - no validation needed
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, documents]);

  const nextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  }, [currentStep, validateStep]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step <= currentStep) {
      setCurrentStep(step);
    }
  }, [currentStep]);

  const resetForm = useCallback(() => {
    setCurrentStep(1);
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setDocuments([]);
    setLogoFile(null);
    setBannerFile(null);
    setIsSubmitting(false);
    setSubmitSuccess(false);
    setSubmitError(null);
  }, []);

  return {
    currentStep,
    setCurrentStep,
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
  };
}
