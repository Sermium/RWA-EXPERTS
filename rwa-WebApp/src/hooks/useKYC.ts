// src/hooks/useKYC.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, usePublicClient, useWalletClient, useBalance, useChainId } from 'wagmi';
import { formatEther, parseEther, type Address, type Hash } from 'viem';
import { useChainConfig } from './useChainConfig';
import {
  TierName,
  tierNumberToName,
  getLimitForTier,
  getRemainingLimit,
  formatLimit,
  canInvest as checkCanInvest,
} from '@/lib/kycLimits';

// ============================================================================
// INTERFACES
// ============================================================================

export interface KYCProof {
  wallet: Address;
  level: number;
  countryCode: number;
  expiry: number;
  signature: `0x${string}`;
}

export interface KYCStatus {
  // Application status
  hasApplication: boolean;
  applicationStatus: 'none' | 'pending' | 'approved' | 'rejected' | 'expired';
  
  // KYC level/tier
  kycLevel: number;
  tier: TierName;
  
  // Validity
  isVerified: boolean;
  isExpired: boolean;
  expiryDate: string | null;
  
  // Limits
  limit: number;
  used: number;
  remaining: number;
  
  // Metadata
  rejectionReason?: string;
  submittedAt?: string;
  approvedAt?: string;
  canResubmit: boolean;
  
  // Linked wallets
  linkedWallets: string[];
}

export interface KYCSubmission {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  country: string;
  countryCode: number;
  address: string;
  city: string;
  postalCode: string;
  documentType: 'passport' | 'national_id' | 'drivers_license';
  documentNumber: string;
  requestedLevel?: number;
  documents?: {
    idFront?: string;
    idBack?: string;
    selfie?: string;
    addressProof?: string;
  };
}

export interface LinkedWallet {
  address: string;
  linkedAt: string;
  isPrimary: boolean;
  label?: string;
}

export interface WalletLinkCode {
  code: string;
  expiresAt: number;
}

export interface DocumentUploadResult {
  documentId: string;
  url: string;
}

export interface UseKYCReturn {
  // State
  status: KYCStatus | null;
  proof: KYCProof | null;
  linkedWallets: LinkedWallet[];
  isLoading: boolean;
  isSubmitting: boolean;
  isRegistering: boolean;
  error: string | null;

  // Computed
  isKYCValid: boolean;
  isVerified: boolean;
  canInvest: boolean;
  canInvestAccredited: boolean;
  kycLevel: number;
  tier: TierName;
  registrationFee: string;
  hasEnoughBalance: boolean;
  
  // Formatted values
  formattedLimit: string;
  formattedRemaining: string;

  // Actions
  refreshStatus: () => Promise<void>;
  submitKYC: (submission: KYCSubmission) => Promise<boolean>;
  getProof: () => Promise<KYCProof | null>;
  registerOnChain: () => Promise<Hash | null>;
  uploadDocument: (file: File, documentType: string) => Promise<DocumentUploadResult | null>;
  generateLinkCode: () => Promise<WalletLinkCode | null>;
  useLinkCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  getLinkedWallets: () => Promise<LinkedWallet[]>;
  canInvestAmount: (amount: number) => boolean;
  exportData: () => Promise<Blob | null>;
  requestDeletion: () => Promise<boolean>;
  clearError: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const KYC_LEVELS = {
  NONE: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  DIAMOND: 4,
} as const;

export const LEVEL_NAMES: Record<number, TierName> = {
  0: 'None',
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Diamond',
};

export const REGISTRATION_FEE = '0.05'; // Default fee in native token

export const KYC_VERIFIER_ABI = [
  {
    name: 'registrationFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'registerWithProof',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'level', type: 'uint8' },
      { name: 'countryCode', type: 'uint16' },
      { name: 'expiry', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'isRegistered',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getVerificationLevel',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

const DEFAULT_STATUS: KYCStatus = {
  hasApplication: false,
  applicationStatus: 'none',
  kycLevel: 0,
  tier: 'None',
  isVerified: false,
  isExpired: false,
  expiryDate: null,
  limit: 0,
  used: 0,
  remaining: 0,
  canResubmit: true,
  linkedWallets: [],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function createSignedMessage(
  walletClient: any,
  address: Address,
  action: string
): Promise<{ message: string; signature: `0x${string}`; timestamp: number }> {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${action}\nWallet: ${address}\nTimestamp: ${timestamp}`;
  
  const signature = await walletClient.signMessage({
    account: address,
    message,
  });
  
  return { message, signature, timestamp };
}

async function safeFetch(
  url: string,
  options: RequestInit = {}
): Promise<{ response: Response | null; error: string | null }> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return { response, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Network request failed';
    console.error('[useKYC] Fetch error:', errorMessage);
    return { response: null, error: errorMessage };
  }
}

async function parseApiResponse<T>(
  response: Response | null,
  errorPrefix: string
): Promise<{ data: T | null; error: string | null }> {
  if (!response) {
    return { data: null, error: `${errorPrefix}: No response from server` };
  }

  try {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `${errorPrefix}: ${response.status}`;
      return { data: null, error: errorMessage };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to parse response';
    return { data: null, error: `${errorPrefix}: ${errorMessage}` };
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useKYC(): UseKYCReturn {
  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const chainConfig = useChainConfig();
  const { data: balanceData } = useBalance({
    address,
    query: { enabled: !!address },
  });

  // ============================================================================
  // STATE
  // ============================================================================

  const [status, setStatus] = useState<KYCStatus | null>(null);
  const [proof, setProof] = useState<KYCProof | null>(null);
  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationFeeValue, setRegistrationFeeValue] = useState<string>(REGISTRATION_FEE);

  // ============================================================================
  // FETCH REGISTRATION FEE
  // ============================================================================

  const fetchFee = useCallback(() => {
    const configFee = chainConfig?.fees?.KYC_FEE;
    
    if (configFee) {
      setRegistrationFeeValue(formatEther(BigInt(configFee)));
    } else {
      setRegistrationFeeValue(REGISTRATION_FEE);
    }
  }, [chainConfig?.fees?.KYC_FEE]);

  // ============================================================================
  // REFRESH STATUS - Now DB-driven
  // ============================================================================

  const refreshStatus = useCallback(async () => {
    if (!address || !isConnected) {
      setStatus(null);
      setProof(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { response, error: fetchError } = await safeFetch(
        `/api/kyc/status/${address}`
      );
      
      if (fetchError) throw new Error(fetchError);

      const { data, error: parseError } = await parseApiResponse<{
        tier: TierName;
        tierNumber: number;
        status: string;
        isVerified: boolean;
        limit: number;
        used: number;
        remaining: number;
        submittedAt?: string;
        approvedAt?: string;
        expiresAt?: string;
        rejectionReason?: string;
        linkedWallets?: string[];
      }>(response, 'Failed to fetch KYC status');

      if (parseError) throw new Error(parseError);

      if (data) {
        const isExpired = data.expiresAt ? new Date(data.expiresAt) < new Date() : false;
        const applicationStatus = isExpired ? 'expired' : data.status as KYCStatus['applicationStatus'];
        
        setStatus({
          hasApplication: data.status !== 'none',
          applicationStatus,
          kycLevel: data.tierNumber || 0,
          tier: data.tier || 'None',
          isVerified: data.isVerified && !isExpired,
          isExpired,
          expiryDate: data.expiresAt || null,
          limit: data.limit || 0,
          used: data.used || 0,
          remaining: data.remaining || 0,
          rejectionReason: data.rejectionReason,
          submittedAt: data.submittedAt,
          approvedAt: data.approvedAt,
          canResubmit: data.status === 'rejected' || data.status === 'none' || data.status === 'expired',
          linkedWallets: data.linkedWallets || [],
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh KYC status';
      console.error('[useKYC] Refresh error:', errorMessage);
      setError(errorMessage);
      setStatus(DEFAULT_STATUS);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  // ============================================================================
  // SUBMIT KYC - DB submission with signature verification
  // ============================================================================

  const submitKYC = useCallback(async (submission: KYCSubmission): Promise<boolean> => {
    if (!address || !walletClient) {
      setError('Wallet not connected');
      return false;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const requestedLevel = submission.requestedLevel || 1;
      
      const message = `Submit KYC Application\nWallet: ${address}\nLevel: ${requestedLevel}\nTimestamp: ${timestamp}`;
      
      const signature = await walletClient.signMessage({
        account: address,
        message,
      });

      const { response, error: fetchError } = await safeFetch('/api/kyc/submit', {
        method: 'POST',
        headers: {
          'x-wallet-address': address,
          'x-chain-id': chainId?.toString() || '',
        },
        body: JSON.stringify({
          ...submission,
          walletAddress: address,
          signature,
          timestamp,
          requestedLevel,
        }),
      });

      if (fetchError) throw new Error(fetchError);

      const { data, error: parseError } = await parseApiResponse<{
        success: boolean;
        submissionId?: string;
        message?: string;
      }>(response, 'Failed to submit KYC');

      if (parseError) throw new Error(parseError);

      if (data?.success) {
        await refreshStatus();
        return true;
      }

      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit KYC';
      setError(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [address, walletClient, chainId, refreshStatus]);

  // ============================================================================
  // GET PROOF - For on-chain registration
  // ============================================================================

  const getProof = useCallback(async (): Promise<KYCProof | null> => {
    if (!address || !walletClient) {
      setError('Wallet not connected');
      return null;
    }

    try {
      const { signature, timestamp } = await createSignedMessage(
        walletClient,
        address,
        'Get KYC Proof'
      );

      const { response, error: fetchError } = await safeFetch(
        `/api/kyc/proof?wallet=${address}&timestamp=${timestamp}&signature=${signature}`
      );

      if (fetchError) throw new Error(fetchError);

      const { data, error: parseError } = await parseApiResponse<{
        proof: KYCProof;
      }>(response, 'Failed to get proof');

      if (parseError) throw new Error(parseError);

      if (data?.proof) {
        setProof(data.proof);
        return data.proof;
      }
      
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get proof';
      setError(errorMessage);
      return null;
    }
  }, [address, walletClient]);

  // ============================================================================
  // REGISTER ON CHAIN - Using KYCVerifier contract
  // ============================================================================

  const registerOnChain = useCallback(async (): Promise<Hash | null> => {
    if (!address || !walletClient || !publicClient) {
      setError('Wallet not connected');
      return null;
    }

    const kycVerifierAddress = chainConfig?.contracts?.KYCVerifier;
    if (!kycVerifierAddress) {
      setError('KYC Verifier contract not configured for this chain');
      return null;
    }

    let currentProof = proof;
    if (!currentProof) {
      currentProof = await getProof();
      if (!currentProof) {
        setError('No valid KYC proof available. Please complete KYC first.');
        return null;
      }
    }

    setIsRegistering(true);
    setError(null);

    try {
      const feeInWei = parseEther(registrationFeeValue);

      const hash = await walletClient.writeContract({
        address: kycVerifierAddress as Address,
        abi: KYC_VERIFIER_ABI,
        functionName: 'registerWithProof',
        args: [
          currentProof.level,
          currentProof.countryCode,
          BigInt(currentProof.expiry),
          currentProof.signature,
        ],
        value: feeInWei,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      await refreshStatus();
      return hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register on chain';
      setError(errorMessage);
      return null;
    } finally {
      setIsRegistering(false);
    }
  }, [address, walletClient, publicClient, chainConfig?.contracts?.KYCVerifier, proof, getProof, registrationFeeValue, refreshStatus]);

  // ============================================================================
  // UPLOAD DOCUMENT
  // ============================================================================

  const uploadDocument = useCallback(async (
    file: File,
    documentType: string
  ): Promise<DocumentUploadResult | null> => {
    if (!address || !walletClient) {
      setError('Wallet not connected');
      return null;
    }

    try {
      const { signature, timestamp } = await createSignedMessage(
        walletClient,
        address,
        'Upload Document'
      );

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      formData.append('wallet', address);
      formData.append('signature', signature);
      formData.append('timestamp', timestamp.toString());

      const response = await fetch('/api/kyc/upload', {
        method: 'POST',
        body: formData,
      });

      const { data, error: parseError } = await parseApiResponse<DocumentUploadResult>(
        response,
        'Failed to upload document'
      );

      if (parseError) throw new Error(parseError);

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMessage);
      return null;
    }
  }, [address, walletClient]);

  // ============================================================================
  // WALLET LINKING
  // ============================================================================

  const getLinkedWallets = useCallback(async (): Promise<LinkedWallet[]> => {
    if (!address) return [];

    try {
      const { response, error: fetchError } = await safeFetch(
        `/api/kyc/link/list?wallet=${address}`
      );

      if (fetchError) {
        console.error('[useKYC] Get linked wallets error:', fetchError);
        return [];
      }

      const { data } = await parseApiResponse<{ wallets: LinkedWallet[] }>(
        response,
        'Failed to get linked wallets'
      );

      const wallets = data?.wallets || [];
      setLinkedWallets(wallets);
      return wallets;
    } catch (err) {
      console.error('[useKYC] Get linked wallets error:', err);
      return [];
    }
  }, [address]);

  const generateLinkCode = useCallback(async (): Promise<WalletLinkCode | null> => {
    if (!address || !walletClient) {
      setError('Wallet not connected');
      return null;
    }

    try {
      const { signature, timestamp } = await createSignedMessage(
        walletClient,
        address,
        'Generate Wallet Link Code'
      );

      const { response, error: fetchError } = await safeFetch('/api/kyc/link/generate', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: address,
          signature,
          timestamp: timestamp.toString(),
        }),
      });

      if (fetchError) throw new Error(fetchError);

      const { data, error: parseError } = await parseApiResponse<{
        success: boolean;
        code: string;
        expiresAt: number;
      }>(response, 'Failed to generate link code');

      if (parseError) throw new Error(parseError);

      if (data?.success && data.code) {
        return { code: data.code, expiresAt: data.expiresAt };
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate link code';
      setError(errorMessage);
      return null;
    }
  }, [address, walletClient]);

  const useLinkCode = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!address || !walletClient) {
      setError('Wallet not connected');
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `Use Wallet Link Code\nWallet: ${address}\nCode: ${code.toUpperCase()}\nTimestamp: ${timestamp}`;
      
      const signature = await walletClient.signMessage({
        account: address,
        message,
      });

      const { response, error: fetchError } = await safeFetch('/api/kyc/link/use', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: address,
          code: code.toUpperCase(),
          signature,
          timestamp: timestamp.toString(),
        }),
      });

      if (fetchError) throw new Error(fetchError);

      const { data, error: parseError } = await parseApiResponse<{
        success: boolean;
        error?: string;
      }>(response, 'Failed to use link code');

      if (parseError) throw new Error(parseError);

      if (data?.success) {
        await refreshStatus();
        await getLinkedWallets();
        return { success: true };
      }

      return { success: false, error: data?.error || 'Failed to link wallet' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to use link code';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [address, walletClient, refreshStatus, getLinkedWallets]);

  // ============================================================================
  // GDPR FUNCTIONS
  // ============================================================================

  const exportData = useCallback(async (): Promise<Blob | null> => {
    if (!address || !walletClient) {
      setError('Wallet not connected');
      return null;
    }

    try {
      const { signature, timestamp } = await createSignedMessage(
        walletClient,
        address,
        'Export KYC Data'
      );

      const { response, error: fetchError } = await safeFetch(
        `/api/kyc/gdpr/export?wallet=${address}&timestamp=${timestamp}&signature=${signature}`
      );

      if (fetchError) throw new Error(fetchError);

      if (!response || !response.ok) {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        throw new Error(errorData.error || 'Failed to export data');
      }

      return await response.blob();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export data';
      setError(errorMessage);
      return null;
    }
  }, [address, walletClient]);

  const requestDeletion = useCallback(async (): Promise<boolean> => {
    if (!address || !walletClient) {
      setError('Wallet not connected');
      return false;
    }

    try {
      const { signature, timestamp } = await createSignedMessage(
        walletClient,
        address,
        'Delete KYC Data'
      );

      const { response, error: fetchError } = await safeFetch('/api/kyc/gdpr/delete', {
        method: 'POST',
        body: JSON.stringify({
          wallet: address,
          signature,
          timestamp,
        }),
      });

      if (fetchError) throw new Error(fetchError);

      const { data, error: parseError } = await parseApiResponse<{ success: boolean }>(
        response,
        'Failed to delete data'
      );

      if (parseError) throw new Error(parseError);

      if (data?.success) {
        setStatus(null);
        setProof(null);
        setLinkedWallets([]);
        return true;
      }

      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete data';
      setError(errorMessage);
      return false;
    }
  }, [address, walletClient]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const clearError = useCallback(() => setError(null), []);

  const canInvestAmount = useCallback((amount: number): boolean => {
    if (!status?.isVerified) return false;
    return checkCanInvest(status.tier, amount, status.used);
  }, [status]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const isKYCValid = useMemo(() => {
    return status?.isVerified === true && !status?.isExpired;
  }, [status]);

  const isVerified = useMemo(() => {
    return status?.isVerified === true;
  }, [status]);

  const canInvest = useMemo(() => {
    return isKYCValid && (status?.kycLevel ?? 0) >= KYC_LEVELS.BRONZE;
  }, [isKYCValid, status?.kycLevel]);

  const canInvestAccredited = useMemo(() => {
    return isKYCValid && (status?.kycLevel ?? 0) >= KYC_LEVELS.GOLD;
  }, [isKYCValid, status?.kycLevel]);

  const kycLevel = useMemo(() => status?.kycLevel ?? 0, [status?.kycLevel]);
  
  const tier = useMemo(() => status?.tier ?? 'None', [status?.tier]);

  const hasEnoughBalance = useMemo(() => {
    if (!balanceData?.value) return false;
    try {
      const feeInWei = parseEther(registrationFeeValue);
      return balanceData.value >= feeInWei;
    } catch {
      return false;
    }
  }, [balanceData?.value, registrationFeeValue]);

  const formattedLimit = useMemo(() => formatLimit(status?.limit ?? 0), [status?.limit]);
  const formattedRemaining = useMemo(() => formatLimit(status?.remaining ?? 0), [status?.remaining]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (chainId) fetchFee();
  }, [fetchFee, chainId]);

  useEffect(() => {
    if (address && isConnected) {
      refreshStatus();
    } else {
      setStatus(null);
      setProof(null);
      setLinkedWallets([]);
    }
  }, [address, isConnected, refreshStatus]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    status,
    proof,
    linkedWallets,
    isLoading,
    isSubmitting,
    isRegistering,
    error,

    // Computed
    isKYCValid,
    isVerified,
    canInvest,
    canInvestAccredited,
    kycLevel,
    tier,
    registrationFee: registrationFeeValue,
    hasEnoughBalance,
    formattedLimit,
    formattedRemaining,

    // Actions
    refreshStatus,
    submitKYC,
    getProof,
    registerOnChain,
    uploadDocument,
    generateLinkCode,
    useLinkCode,
    getLinkedWallets,
    canInvestAmount,
    exportData,
    requestDeletion,
    clearError,
  };
}

export default useKYC;
