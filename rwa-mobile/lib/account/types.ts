// lib/account/types.ts

export type KYCStatus = 'none' | 'pending' | 'verified' | 'rejected';

export type KYCLevel = 0 | 1 | 2 | 3;
// 0 = None
// 1 = Basic (Email verified)
// 2 = Standard (ID verified)
// 3 = Enhanced (Full verification)

export interface KYCData {
  status: KYCStatus;
  level: KYCLevel;
  verifiedAt?: string;
  expiresAt?: string;
  documents?: {
    idType?: 'passport' | 'national_id';
    idVerified?: boolean;
    addressVerified?: boolean;
    selfieVerified?: boolean;
  };
  limits: {
    dailyTransaction: number;
    monthlyTransaction: number;
    maxInvestment: number;
  };
}

export interface WalletInfo {
  id: string;
  name: string;
  address: string;
  type: 'created' | 'imported' | 'external' | 'hardware';
  isDefault: boolean;
  createdAt: string;
  lastUsedAt?: string;
  // For created/imported wallets, we store encrypted data
  hasStoredKeys: boolean;
}

export interface UserAccount {
  id: string;
  email?: string;
  phone?: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt: string;
  kyc: KYCData;
  wallets: WalletInfo[];
  activeWalletId: string | null;
  settings: {
    currency: string;
    language: string;
    notifications: boolean;
    biometricEnabled: boolean;
    autoLockMinutes: number;
  };
}

export interface CreateWalletOptions {
  name: string;
  setAsDefault?: boolean;
}

export interface ImportWalletOptions {
  name: string;
  mnemonic: string;
  setAsDefault?: boolean;
}

export interface ConnectExternalWalletOptions {
  name: string;
  address: string;
  setAsDefault?: boolean;
}

export const KYC_LEVEL_NAMES: Record<KYCLevel, string> = {
  0: 'Unverified',
  1: 'Basic',
  2: 'Standard',
  3: 'Enhanced',
};

export const KYC_LEVEL_LIMITS: Record<KYCLevel, KYCData['limits']> = {
  0: { dailyTransaction: 0, monthlyTransaction: 0, maxInvestment: 0 },
  1: { dailyTransaction: 1000, monthlyTransaction: 5000, maxInvestment: 1000 },
  2: { dailyTransaction: 10000, monthlyTransaction: 50000, maxInvestment: 25000 },
  3: { dailyTransaction: 100000, monthlyTransaction: 500000, maxInvestment: 1000000 },
};
