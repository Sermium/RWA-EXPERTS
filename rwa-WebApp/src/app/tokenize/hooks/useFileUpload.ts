'use client';

import { useState, useRef, useCallback } from 'react';
import { DocumentFile, UploadedFile, DOCUMENT_TYPES } from '../types';

interface UseFileUploadProps {
  documents: DocumentFile[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentFile[]>>;
  setLogoFile: React.Dispatch<React.SetStateAction<UploadedFile | null>>;
  setBannerFile: React.Dispatch<React.SetStateAction<UploadedFile | null>>;
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

export function useFileUpload({
  documents,
  setDocuments,
  setLogoFile,
  setBannerFile,
  setErrors,
}: UseFileUploadProps) {
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const uploadToIPFS = useCallback(async (file: File): Promise<{ gatewayUrl: string; ipfsHash: string; ipfsUri: string } | null> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/ipfs/upload-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('IPFS upload error:', error);
      return null;
    }
  }, []);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, logo: 'Please upload an image file (JPG, PNG, WEBP)' }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, logo: 'Logo must be less than 5MB' }));
      return;
    }

    setUploadingLogo(true);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.logo;
      return newErrors;
    });

    try {
      const result = await uploadToIPFS(file);
      if (result) {
        setLogoFile({
          url: result.gatewayUrl,
          ipfsHash: result.ipfsHash,
          ipfsUri: result.ipfsUri,
        });
      } else {
        setErrors(prev => ({ ...prev, logo: 'Failed to upload logo' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, logo: 'Failed to upload logo' }));
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  }, [uploadToIPFS, setLogoFile, setErrors]);

  const handleBannerUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, banner: 'Please upload an image file (JPG, PNG, WEBP)' }));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, banner: 'Banner must be less than 10MB' }));
      return;
    }

    setUploadingBanner(true);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.banner;
      return newErrors;
    });

    try {
      const result = await uploadToIPFS(file);
      if (result) {
        setBannerFile({
          url: result.gatewayUrl,
          ipfsHash: result.ipfsHash,
          ipfsUri: result.ipfsUri,
        });
      } else {
        setErrors(prev => ({ ...prev, banner: 'Failed to upload banner' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, banner: 'Failed to upload banner' }));
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = '';
      }
    }
  }, [uploadToIPFS, setBannerFile, setErrors]);

  const handleDocumentUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDocType) return;

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, documents: 'Document must be less than 20MB' }));
      return;
    }

    setUploadingDocument(true);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.documents;
      return newErrors;
    });

    try {
      const result = await uploadToIPFS(file);
      if (result) {
        const docTypeLabel = DOCUMENT_TYPES.find(d => d.value === selectedDocType)?.label || selectedDocType;
        
        setDocuments(prev => [
          ...prev,
          {
            name: file.name,
            type: selectedDocType,
            url: result.gatewayUrl,
            mimeType: file.type,
            size: file.size,
            ipfsHash: result.ipfsHash,
          },
        ]);
        setSelectedDocType('');
      } else {
        setErrors(prev => ({ ...prev, documents: 'Failed to upload document' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, documents: 'Failed to upload document' }));
    } finally {
      setUploadingDocument(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [selectedDocType, uploadToIPFS, setDocuments, setErrors]);

  const removeDocument = useCallback((index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  }, [setDocuments]);

  const removeLogo = useCallback(() => {
    setLogoFile(null);
  }, [setLogoFile]);

  const removeBanner = useCallback(() => {
    setBannerFile(null);
  }, [setBannerFile]);

  return {
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
  };
}
