// lib/account/AccountService.ts
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { ethers } from 'ethers';
import {
  UserAccount,
  WalletInfo,
  KYCData,
  KYCLevel,
  KYCStatus,
  CreateWalletOptions,
  ImportWalletOptions,
  ConnectExternalWalletOptions,
  KYC_LEVEL_LIMITS,
} from './types';

const ACCOUNT_KEY = 'rwa_user_account';
const WALLETS_KEY = 'rwa_wallets_data';
const PIN_HASH_KEY = 'rwa_account_pin';
const SALT_KEY = 'rwa_account_salt';

interface StoredWalletData {
  [walletId: string]: {
    encryptedPrivateKey?: string;
    encryptedMnemonic?: string;
  };
}

class AccountService {
  private cachedAccount: UserAccount | null = null;
  private cachedWalletKeys: Map<string, ethers.Wallet> = new Map();
  private encryptionKey: string | null = null;

  // ==================== ACCOUNT MANAGEMENT ====================

  async hasAccount(): Promise<boolean> {
    try {
      const account = await SecureStore.getItemAsync(ACCOUNT_KEY);
      return !!account;
    } catch {
      return false;
    }
  }

  async createAccount(
    pin: string,
    options: { email?: string; phone?: string; displayName?: string }
  ): Promise<UserAccount> {
    // Generate salt
    const saltBytes = Crypto.getRandomBytes(32);
    const salt = this.bytesToHex(saltBytes);
    await SecureStore.setItemAsync(SALT_KEY, salt);

    // Hash PIN
    const pinHash = await this.hashPin(pin, salt);
    await SecureStore.setItemAsync(PIN_HASH_KEY, pinHash);

    // Derive encryption key
    this.encryptionKey = await this.deriveKey(pin, salt);

    // Create account
    const account: UserAccount = {
      id: this.generateId(),
      email: options.email,
      phone: options.phone,
      displayName: options.displayName || 'User',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      kyc: {
        status: 'none',
        level: 0,
        limits: KYC_LEVEL_LIMITS[0],
      },
      wallets: [],
      activeWalletId: null,
      settings: {
        currency: 'USD',
        language: 'en',
        notifications: true,
        biometricEnabled: false,
        autoLockMinutes: 5,
      },
    };

    await SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(account));
    await SecureStore.setItemAsync(WALLETS_KEY, JSON.stringify({}));

    this.cachedAccount = account;
    return account;
  }

  async login(pin: string): Promise<UserAccount> {
    const salt = await SecureStore.getItemAsync(SALT_KEY);
    if (!salt) throw new Error('No account found');

    const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
    const pinHash = await this.hashPin(pin, salt);

    if (pinHash !== storedHash) {
      throw new Error('Invalid PIN');
    }

    this.encryptionKey = await this.deriveKey(pin, salt);

    const accountStr = await SecureStore.getItemAsync(ACCOUNT_KEY);
    if (!accountStr) throw new Error('Account data not found');

    const account: UserAccount = JSON.parse(accountStr);
    account.lastLoginAt = new Date().toISOString();
    await SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(account));

    this.cachedAccount = account;
    return account;
  }

  async getAccount(): Promise<UserAccount | null> {
    if (this.cachedAccount) return this.cachedAccount;

    try {
      const accountStr = await SecureStore.getItemAsync(ACCOUNT_KEY);
      if (!accountStr) return null;
      return JSON.parse(accountStr);
    } catch {
      return null;
    }
  }

  async updateAccount(updates: Partial<UserAccount>): Promise<UserAccount> {
    const account = await this.getAccount();
    if (!account) throw new Error('No account found');

    const updated = { ...account, ...updates };
    await SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(updated));
    this.cachedAccount = updated;
    return updated;
  }

  async logout(): Promise<void> {
    this.cachedAccount = null;
    this.cachedWalletKeys.clear();
    this.encryptionKey = null;
  }

  async deleteAccount(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCOUNT_KEY);
    await SecureStore.deleteItemAsync(WALLETS_KEY);
    await SecureStore.deleteItemAsync(PIN_HASH_KEY);
    await SecureStore.deleteItemAsync(SALT_KEY);
    this.cachedAccount = null;
    this.cachedWalletKeys.clear();
    this.encryptionKey = null;
  }

  // ==================== WALLET MANAGEMENT ====================

  async createWallet(pin: string, options: CreateWalletOptions): Promise<WalletInfo> {
    await this.ensureUnlocked(pin);
    const account = await this.getAccount();
    if (!account) throw new Error('No account found');

    // Generate wallet
    const entropy = Crypto.getRandomBytes(16);
    const entropyHex = '0x' + this.bytesToHex(entropy);
    const mnemonic = ethers.utils.entropyToMnemonic(entropyHex);
    const wallet = ethers.Wallet.fromMnemonic(mnemonic);

    // Create wallet info
    const walletInfo: WalletInfo = {
      id: this.generateId(),
      name: options.name,
      address: wallet.address,
      type: 'created',
      isDefault: options.setAsDefault || account.wallets.length === 0,
      createdAt: new Date().toISOString(),
      hasStoredKeys: true,
    };

    // Encrypt and store keys
    await this.storeWalletKeys(walletInfo.id, wallet.privateKey, mnemonic);

    // Update account
    if (walletInfo.isDefault) {
      account.wallets.forEach(w => (w.isDefault = false));
    }
    account.wallets.push(walletInfo);
    if (walletInfo.isDefault) {
      account.activeWalletId = walletInfo.id;
    }

    await this.updateAccount(account);
    this.cachedWalletKeys.set(walletInfo.id, wallet);

    return walletInfo;
  }

  async importWallet(pin: string, options: ImportWalletOptions): Promise<WalletInfo> {
    await this.ensureUnlocked(pin);
    const account = await this.getAccount();
    if (!account) throw new Error('No account found');

    // Validate and create wallet
    const normalizedMnemonic = options.mnemonic.trim().toLowerCase();
    if (!ethers.utils.isValidMnemonic(normalizedMnemonic)) {
      throw new Error('Invalid recovery phrase');
    }

    const wallet = ethers.Wallet.fromMnemonic(normalizedMnemonic);

    // Check if wallet already exists
    if (account.wallets.some(w => w.address.toLowerCase() === wallet.address.toLowerCase())) {
      throw new Error('Wallet already exists in this account');
    }

    // Create wallet info
    const walletInfo: WalletInfo = {
      id: this.generateId(),
      name: options.name,
      address: wallet.address,
      type: 'imported',
      isDefault: options.setAsDefault || account.wallets.length === 0,
      createdAt: new Date().toISOString(),
      hasStoredKeys: true,
    };

    // Encrypt and store keys
    await this.storeWalletKeys(walletInfo.id, wallet.privateKey, normalizedMnemonic);

    // Update account
    if (walletInfo.isDefault) {
      account.wallets.forEach(w => (w.isDefault = false));
    }
    account.wallets.push(walletInfo);
    if (walletInfo.isDefault) {
      account.activeWalletId = walletInfo.id;
    }

    await this.updateAccount(account);
    this.cachedWalletKeys.set(walletInfo.id, wallet);

    return walletInfo;
  }

  async connectExternalWallet(options: ConnectExternalWalletOptions): Promise<WalletInfo> {
    const account = await this.getAccount();
    if (!account) throw new Error('No account found');

    // Validate address
    if (!ethers.utils.isAddress(options.address)) {
      throw new Error('Invalid wallet address');
    }

    // Check if wallet already exists
    if (account.wallets.some(w => w.address.toLowerCase() === options.address.toLowerCase())) {
      throw new Error('Wallet already connected to this account');
    }

    // Create wallet info (external wallets don't store keys)
    const walletInfo: WalletInfo = {
      id: this.generateId(),
      name: options.name,
      address: ethers.utils.getAddress(options.address), // Checksum address
      type: 'external',
      isDefault: options.setAsDefault || account.wallets.length === 0,
      createdAt: new Date().toISOString(),
      hasStoredKeys: false,
    };

    // Update account
    if (walletInfo.isDefault) {
      account.wallets.forEach(w => (w.isDefault = false));
    }
    account.wallets.push(walletInfo);
    if (walletInfo.isDefault) {
      account.activeWalletId = walletInfo.id;
    }

    await this.updateAccount(account);
    return walletInfo;
  }

  async removeWallet(walletId: string): Promise<void> {
    const account = await this.getAccount();
    if (!account) throw new Error('No account found');

    const walletIndex = account.wallets.findIndex(w => w.id === walletId);
    if (walletIndex === -1) throw new Error('Wallet not found');

    const wallet = account.wallets[walletIndex];

    // Remove stored keys if any
    if (wallet.hasStoredKeys) {
      const walletsData = await this.getWalletsData();
      delete walletsData[walletId];
      await SecureStore.setItemAsync(WALLETS_KEY, JSON.stringify(walletsData));
    }

    // Remove from account
    account.wallets.splice(walletIndex, 1);

    // If it was the active wallet, set a new one
    if (account.activeWalletId === walletId) {
      const defaultWallet = account.wallets.find(w => w.isDefault) || account.wallets[0];
      account.activeWalletId = defaultWallet?.id || null;
    }

    await this.updateAccount(account);
    this.cachedWalletKeys.delete(walletId);
  }

  async setDefaultWallet(walletId: string): Promise<void> {
    const account = await this.getAccount();
    if (!account) throw new Error('No account found');

    account.wallets.forEach(w => {
      w.isDefault = w.id === walletId;
    });
    account.activeWalletId = walletId;

    await this.updateAccount(account);
  }

  async renameWallet(walletId: string, newName: string): Promise<void> {
    const account = await this.getAccount();
    if (!account) throw new Error('No account found');

    const wallet = account.wallets.find(w => w.id === walletId);
    if (!wallet) throw new Error('Wallet not found');

    wallet.name = newName;
    await this.updateAccount(account);
  }

  async getWalletPrivateKey(walletId: string, pin: string): Promise<string> {
    await this.ensureUnlocked(pin);

    // Check cache first
    const cached = this.cachedWalletKeys.get(walletId);
    if (cached) return cached.privateKey;

    const walletsData = await this.getWalletsData();
    const walletData = walletsData[walletId];
    if (!walletData?.encryptedPrivateKey) {
      throw new Error('No private key stored for this wallet');
    }

    const privateKey = this.decrypt(walletData.encryptedPrivateKey);
    const wallet = new ethers.Wallet(privateKey);
    this.cachedWalletKeys.set(walletId, wallet);

    return privateKey;
  }

  async getWalletMnemonic(walletId: string, pin: string): Promise<string> {
    await this.ensureUnlocked(pin);

    const walletsData = await this.getWalletsData();
    const walletData = walletsData[walletId];
    if (!walletData?.encryptedMnemonic) {
      throw new Error('No mnemonic stored for this wallet');
    }

    return this.decrypt(walletData.encryptedMnemonic);
  }

  async getSignerForWallet(walletId: string, pin: string): Promise<ethers.Wallet> {
    const privateKey = await this.getWalletPrivateKey(walletId, pin);
    return new ethers.Wallet(privateKey);
  }

  // ==================== KYC MANAGEMENT ====================

  async updateKYC(kycData: Partial<KYCData>): Promise<KYCData> {
    const account = await this.getAccount();
    if (!account) throw new Error('No account found');

    account.kyc = {
      ...account.kyc,
      ...kycData,
      limits: KYC_LEVEL_LIMITS[kycData.level ?? account.kyc.level],
    };

    await this.updateAccount(account);
    return account.kyc;
  }

  async setKYCLevel(level: KYCLevel, status: KYCStatus = 'verified'): Promise<KYCData> {
    return this.updateKYC({
      level,
      status,
      verifiedAt: status === 'verified' ? new Date().toISOString() : undefined,
    });
  }

  getKYCLimits(level: KYCLevel): KYCData['limits'] {
    return KYC_LEVEL_LIMITS[level];
  }

  // ==================== HELPERS ====================

  private async ensureUnlocked(pin: string): Promise<void> {
    if (!this.encryptionKey) {
      const salt = await SecureStore.getItemAsync(SALT_KEY);
      if (!salt) throw new Error('Account not set up');

      const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
      const pinHash = await this.hashPin(pin, salt);

      if (pinHash !== storedHash) {
        throw new Error('Invalid PIN');
      }

      this.encryptionKey = await this.deriveKey(pin, salt);
    }
  }

  private async storeWalletKeys(
    walletId: string,
    privateKey: string,
    mnemonic: string
  ): Promise<void> {
    if (!this.encryptionKey) throw new Error('Account locked');

    const walletsData = await this.getWalletsData();
    walletsData[walletId] = {
      encryptedPrivateKey: this.encrypt(privateKey),
      encryptedMnemonic: this.encrypt(mnemonic),
    };

    await SecureStore.setItemAsync(WALLETS_KEY, JSON.stringify(walletsData));
  }

  private async getWalletsData(): Promise<StoredWalletData> {
    try {
      const data = await SecureStore.getItemAsync(WALLETS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private async hashPin(pin: string, salt: string): Promise<string> {
    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin + salt + 'rwa_pin_hash_v1'
    );
  }

  private async deriveKey(pin: string, salt: string): Promise<string> {
    let key = pin + salt;
    for (let i = 0; i < 1000; i++) {
      key = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, key);
    }
    return key;
  }

  private encrypt(data: string): string {
    if (!this.encryptionKey) throw new Error('No encryption key');
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
      result += charCode.toString(16).padStart(4, '0');
    }
    return result;
  }

  private decrypt(encrypted: string): string {
    if (!this.encryptionKey) throw new Error('No encryption key');
    let data = '';
    for (let i = 0; i < encrypted.length; i += 4) {
      const charCode = parseInt(encrypted.substr(i, 4), 16);
      data += String.fromCharCode(charCode ^ this.encryptionKey.charCodeAt((i / 4) % this.encryptionKey.length));
    }
    return data;
  }

  private generateId(): string {
    const bytes = Crypto.getRandomBytes(16);
    return this.bytesToHex(bytes);
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

export const accountService = new AccountService();
export default accountService;
