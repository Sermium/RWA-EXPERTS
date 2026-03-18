// contexts/AccountContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { ethers } from 'ethers';
import accountService from '../lib/account/AccountService';
import {
  UserAccount,
  WalletInfo,
  KYCData,
  KYCLevel,
  KYCStatus,
  CreateWalletOptions,
  ImportWalletOptions,
  ConnectExternalWalletOptions,
} from '../lib/account/types';
import { NETWORKS, NetworkConfig } from '../lib/wallet/SecureWallet';

interface AccountContextType {
  // Account State
  account: UserAccount | null;
  isLoggedIn: boolean;
  isLoading: boolean;

  // Wallet State
  wallets: WalletInfo[];
  activeWallet: WalletInfo | null;
  activeBalance: string;
  networkSymbol: string;
  networkName: string;
  isTestnet: boolean;

  // KYC State
  kycStatus: KYCStatus;
  kycLevel: KYCLevel;

  // Account Actions
  createAccount: (pin: string, options: { email?: string; phone?: string; displayName?: string }) => Promise<void>;
  login: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (updates: { displayName?: string; email?: string; phone?: string }) => Promise<void>;

  // Wallet Actions
  createWallet: (pin: string, options: CreateWalletOptions) => Promise<WalletInfo>;
  importWallet: (pin: string, options: ImportWalletOptions) => Promise<WalletInfo>;
  connectExternalWallet: (options: ConnectExternalWalletOptions) => Promise<WalletInfo>;
  removeWallet: (walletId: string) => Promise<void>;
  setActiveWallet: (walletId: string) => Promise<void>;
  renameWallet: (walletId: string, newName: string) => Promise<void>;
  refreshBalance: () => Promise<void>;
  exportMnemonic: (walletId: string, pin: string) => Promise<string>;

  // KYC Actions
  updateKYC: (data: Partial<KYCData>) => Promise<void>;
  startKYCVerification: () => Promise<void>;

  // Network Actions
  switchNetwork: (networkKey: string) => Promise<void>;

  // Utilities
  shortenAddress: (address: string) => string;
  getWalletBalance: (address: string) => Promise<string>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const DEFAULT_NETWORK = 'polygonAmoy';

export function AccountProvider({ children }: { children: ReactNode }) {
  // Account state
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Wallet state
  const [activeBalance, setActiveBalance] = useState('0');

  // Network state
  const [currentNetwork, setCurrentNetwork] = useState<NetworkConfig>(NETWORKS[DEFAULT_NETWORK]);
  const [provider, setProvider] = useState<ethers.providers.JsonRpcProvider | null>(null);

  // Initialize
  useEffect(() => {
    initializeAccount();
  }, []);

  useEffect(() => {
    setProvider(new ethers.providers.JsonRpcProvider(currentNetwork.rpcUrl));
  }, [currentNetwork]);

  const initializeAccount = async () => {
    try {
      const hasAccount = await accountService.hasAccount();
      if (hasAccount) {
        const acc = await accountService.getAccount();
        setAccount(acc);
      }
    } catch (error) {
      console.error('Error initializing account:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Derived state
  const wallets = account?.wallets || [];
  const activeWallet = wallets.find(w => w.id === account?.activeWalletId) || wallets[0] || null;
  const kycStatus = account?.kyc.status || 'none';
  const kycLevel = account?.kyc.level || 0;

  // ==================== ACCOUNT ACTIONS ====================

  const createAccount = useCallback(async (
    pin: string,
    options: { email?: string; phone?: string; displayName?: string }
  ) => {
    setIsLoading(true);
    try {
      const newAccount = await accountService.createAccount(pin, options);
      setAccount(newAccount);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (pin: string) => {
    setIsLoading(true);
    try {
      const acc = await accountService.login(pin);
      setAccount(acc);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await accountService.logout();
    setAccount(null);
    setActiveBalance('0');
  }, []);

  const deleteAccount = useCallback(async () => {
    await accountService.deleteAccount();
    setAccount(null);
    setActiveBalance('0');
  }, []);

  const updateProfile = useCallback(async (updates: { displayName?: string; email?: string; phone?: string }) => {
    const updated = await accountService.updateAccount(updates);
    setAccount(updated);
  }, []);

  // ==================== WALLET ACTIONS ====================

  const createWallet = useCallback(async (pin: string, options: CreateWalletOptions) => {
    const wallet = await accountService.createWallet(pin, options);
    const acc = await accountService.getAccount();
    setAccount(acc);
    return wallet;
  }, []);

  const importWallet = useCallback(async (pin: string, options: ImportWalletOptions) => {
    const wallet = await accountService.importWallet(pin, options);
    const acc = await accountService.getAccount();
    setAccount(acc);
    return wallet;
  }, []);

  const connectExternalWallet = useCallback(async (options: ConnectExternalWalletOptions) => {
    const wallet = await accountService.connectExternalWallet(options);
    const acc = await accountService.getAccount();
    setAccount(acc);
    return wallet;
  }, []);

  const removeWallet = useCallback(async (walletId: string) => {
    await accountService.removeWallet(walletId);
    const acc = await accountService.getAccount();
    setAccount(acc);
  }, []);

  const setActiveWallet = useCallback(async (walletId: string) => {
    await accountService.setDefaultWallet(walletId);
    const acc = await accountService.getAccount();
    setAccount(acc);
  }, []);

  const renameWallet = useCallback(async (walletId: string, newName: string) => {
    await accountService.renameWallet(walletId, newName);
    const acc = await accountService.getAccount();
    setAccount(acc);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (activeWallet && provider) {
      try {
        const balance = await provider.getBalance(activeWallet.address);
        setActiveBalance(ethers.utils.formatEther(balance));
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    }
  }, [activeWallet, provider]);

  useEffect(() => {
    if (activeWallet) {
      refreshBalance();
    }
  }, [activeWallet, refreshBalance]);

  const exportMnemonic = useCallback(async (walletId: string, pin: string) => {
    return accountService.getWalletMnemonic(walletId, pin);
  }, []);

  const getWalletBalance = useCallback(async (address: string) => {
    if (!provider) return '0';
    try {
      const balance = await provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch {
      return '0';
    }
  }, [provider]);

  // ==================== KYC ACTIONS ====================

  const updateKYC = useCallback(async (data: Partial<KYCData>) => {
    await accountService.updateKYC(data);
    const acc = await accountService.getAccount();
    setAccount(acc);
  }, []);

  const startKYCVerification = useCallback(async () => {
    // This would integrate with a KYC provider like Persona, Jumio, etc.
    // For now, we'll simulate starting the process
    await updateKYC({ status: 'pending' });
  }, [updateKYC]);

  // ==================== NETWORK ACTIONS ====================

  const switchNetwork = useCallback(async (networkKey: string) => {
    if (NETWORKS[networkKey]) {
      setCurrentNetwork(NETWORKS[networkKey]);
    }
  }, []);

  // ==================== UTILITIES ====================

  const shortenAddress = useCallback((address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  return (
    <AccountContext.Provider
      value={{
        // Account State
        account,
        isLoggedIn: !!account,
        isLoading,

        // Wallet State
        wallets,
        activeWallet,
        activeBalance,
        networkSymbol: currentNetwork.symbol,
        networkName: currentNetwork.name,
        isTestnet: currentNetwork.isTestnet,

        // KYC State
        kycStatus,
        kycLevel,

        // Account Actions
        createAccount,
        login,
        logout,
        deleteAccount,
        updateProfile,

        // Wallet Actions
        createWallet,
        importWallet,
        connectExternalWallet,
        removeWallet,
        setActiveWallet,
        renameWallet,
        refreshBalance,
        exportMnemonic,

        // KYC Actions
        updateKYC,
        startKYCVerification,

        // Network Actions
        switchNetwork,

        // Utilities
        shortenAddress,
        getWalletBalance,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}
