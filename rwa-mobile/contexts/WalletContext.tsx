// contexts/WalletContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { secureWallet, WalletAddress, WalletGroup, NetworkConfig, FlatWallet } from '../lib/wallet/SecureWallet';

interface WalletContextType {
  // State
  address: string | null;
  balance: string;
  isLoading: boolean;
  hasWallet: boolean;
  isAppUnlocked: boolean;
  biometricSupported: boolean;
  biometricEnabled: boolean;

  // Wallet data (grouped for UI)
  walletGroups: WalletGroup[];
  activeGroup: WalletGroup | null;
  flatWallets: FlatWallet[];
  activeWalletIndex: number;
  activeAddress: string | null;

  // For grouped display
  seedGroups: Array<{ group: WalletGroup; wallets: FlatWallet[] }>;
  importedWallets: FlatWallet[];

  // Network state
  networkSymbol: string;
  networkName: string;
  isTestnet: boolean;
  currentNetwork: (NetworkConfig & { key: string }) | null;

  // Simple wallet actions (NO PIN for switching)
  createNewWallet: (name: string) => Promise<{ address: string; mnemonic: string }>;
  importWalletFromSeed: (mnemonic: string, name: string) => Promise<{ address: string }>;
  importWalletFromPrivateKey: (privateKey: string, name: string) => Promise<{ address: string }>;
  deriveNewAccount: (groupId: string, name: string) => Promise<{ address: string }>;
  switchToWallet: (address: string) => Promise<void>;
  deleteWalletGroup: (groupId: string) => Promise<void>;
  renameWallet: (groupId: string, walletIndex: number, newName: string) => Promise<void>;
  renameWalletGroup: (groupId: string, newName: string) => Promise<void>;

  // Legacy actions (for compatibility)
  createWallet: (pin: string, name?: string) => Promise<{ address: string; mnemonic: string }>;
  importWallet: (mnemonic: string, pin: string, name?: string) => Promise<string>;
  unlockWallet: (pin: string) => Promise<string>;
  lockWallet: () => void;
  deleteWallet: () => Promise<void>;
  setActiveWallet: (index: number) => Promise<void>;

  // App lock actions
  unlockApp: (pin: string) => Promise<boolean>;
  unlockAppWithBiometrics: () => Promise<boolean>;
  lockApp: () => void;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;

  // Network actions
  switchNetwork: (networkKey: string) => Promise<void>;
  getAvailableNetworks: () => Array<NetworkConfig & { key: string }>;
  getBlockExplorerUrl: (txHash?: string, address?: string) => string;

  // Utilities
  shortenAddress: (address: string) => string;
  getWalletBalance: (address: string) => Promise<string>;
  refreshBalance: () => Promise<void>;
  refreshWallets: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  exportMnemonic: (pin: string, groupId?: string) => Promise<string>;
  exportPrivateKey: (pin: string, groupId?: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  // Wallet data
  const [walletGroups, setWalletGroups] = useState<WalletGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<WalletGroup | null>(null);
  const [flatWallets, setFlatWallets] = useState<FlatWallet[]>([]);
  const [activeWalletIndex, setActiveWalletIndex] = useState(0);
  const [seedGroups, setSeedGroups] = useState<Array<{ group: WalletGroup; wallets: FlatWallet[] }>>([]);
  const [importedWallets, setImportedWallets] = useState<FlatWallet[]>([]);

  // Network state
  const [networkSymbol, setNetworkSymbol] = useState('POL');
  const [networkName, setNetworkName] = useState('Polygon Amoy');
  const [isTestnet, setIsTestnet] = useState(true);
  const [currentNetwork, setCurrentNetwork] = useState<(NetworkConfig & { key: string }) | null>(null);

  // Initialize
  useEffect(() => {
    const initialize = async () => {
      try {
        const walletExists = await secureWallet.hasWallet();
        setHasWallet(walletExists);

        if (walletExists) {
          const storedAddress = await secureWallet.getStoredAddress();
          setAddress(storedAddress);

          const groups = await secureWallet.getAllWalletGroups();
          setWalletGroups(groups);

          const group = await secureWallet.getActiveGroup();
          setActiveGroup(group);
        }

        const bioSupported = await secureWallet.checkBiometricSupport();
        setBiometricSupported(bioSupported);

        if (bioSupported) {
          const bioEnabled = await secureWallet.isBiometricEnabled();
          setBiometricEnabledState(bioEnabled);
        }

        const network = secureWallet.getCurrentNetwork();
        setCurrentNetwork(network);
        setNetworkSymbol(network.symbol);
        setNetworkName(network.name);
        setIsTestnet(network.isTestnet);
      } catch (error) {
        console.error('Wallet initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Refresh all wallet data
  const refreshWallets = useCallback(async () => {
    try {
      const groups = await secureWallet.getAllWalletGroups();
      setWalletGroups(groups);

      const group = await secureWallet.getActiveGroup();
      setActiveGroup(group);

      const flat = await secureWallet.getFlatWalletList();
      setFlatWallets(flat);

      const grouped = await secureWallet.getGroupedWallets();
      setSeedGroups(grouped.seedGroups);
      setImportedWallets(grouped.importedWallets);

      // Find active wallet index in flat list
      if (address) {
        const idx = flat.findIndex((w) => w.address.toLowerCase() === address.toLowerCase());
        setActiveWalletIndex(idx >= 0 ? idx : 0);
      }

      const walletExists = await secureWallet.hasWallet();
      setHasWallet(walletExists);
    } catch (error) {
      console.error('Error refreshing wallets:', error);
    }
  }, [address]);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!address) return;
    try {
      const bal = await secureWallet.getBalance(address);
      setBalance(bal);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }, [address]);

  // ==================== SIMPLE WALLET ACTIONS (NO PIN) ====================

  const createNewWallet = useCallback(
    async (name: string) => {
      const result = await secureWallet.createNewWallet(name);
      setAddress(result.address);
      setHasWallet(true);
      await refreshWallets();
      await refreshBalance();
      return { address: result.address, mnemonic: result.mnemonic };
    },
    [refreshWallets, refreshBalance]
  );

  const importWalletFromSeed = useCallback(
    async (mnemonic: string, name: string) => {
      const result = await secureWallet.importWalletFromSeed(mnemonic, name);
      setAddress(result.address);
      setHasWallet(true);
      await refreshWallets();
      await refreshBalance();
      return { address: result.address };
    },
    [refreshWallets, refreshBalance]
  );

  const importWalletFromPrivateKey = useCallback(
    async (privateKey: string, name: string) => {
      const result = await secureWallet.importWalletFromKey(privateKey, name);
      setAddress(result.address);
      setHasWallet(true);
      await refreshWallets();
      await refreshBalance();
      return { address: result.address };
    },
    [refreshWallets, refreshBalance]
  );

  const deriveNewAccount = useCallback(
    async (groupId: string, name: string) => {
      const result = await secureWallet.deriveNewAccount(groupId, name);
      await refreshWallets();
      return { address: result.address };
    },
    [refreshWallets]
  );

  // Switch wallet by address (NO PIN)
  const switchToWallet = useCallback(
    async (walletAddress: string) => {
      await secureWallet.setActiveWalletByAddress(walletAddress);
      setAddress(walletAddress);
      await refreshWallets();
      await refreshBalance();
    },
    [refreshWallets, refreshBalance]
  );

  const deleteWalletGroup = useCallback(
    async (groupId: string) => {
      await secureWallet.deleteWalletGroup(groupId);
      await refreshWallets();

      const storedAddress = await secureWallet.getStoredAddress();
      setAddress(storedAddress);

      const walletExists = await secureWallet.hasWallet();
      setHasWallet(walletExists);

      if (!walletExists) {
        setIsAppUnlocked(false);
        setBalance('0');
      }
    },
    [refreshWallets]
  );

  const renameWallet = useCallback(
    async (groupId: string, walletIndex: number, newName: string) => {
      await secureWallet.renameWallet(groupId, walletIndex, newName);
      await refreshWallets();
    },
    [refreshWallets]
  );

  const renameWalletGroup = useCallback(
    async (groupId: string, newName: string) => {
      await secureWallet.renameWalletGroup(groupId, newName);
      await refreshWallets();
    },
    [refreshWallets]
  );

  // ==================== LEGACY ACTIONS (for compatibility) ====================

  const createWallet = useCallback(
    async (pin: string, name: string = 'Main Wallet') => {
      const result = await secureWallet.createWalletGroup(pin, name, 'Account 1');
      setAddress(result.address);
      setHasWallet(true);
      setIsAppUnlocked(true);
      await refreshWallets();
      await refreshBalance();
      return { address: result.address, mnemonic: result.mnemonic };
    },
    [refreshWallets, refreshBalance]
  );

  const importWallet = useCallback(
    async (mnemonic: string, pin: string, name: string = 'Imported Wallet') => {
      const result = await secureWallet.importWalletGroupFromMnemonic(pin, mnemonic, name, 'Account 1');
      setAddress(result.address);
      setHasWallet(true);
      setIsAppUnlocked(true);
      await refreshWallets();
      await refreshBalance();
      return result.address;
    },
    [refreshWallets, refreshBalance]
  );

  const unlockWallet = useCallback(
    async (pin: string) => {
      const addr = await secureWallet.unlockWallet(pin);
      setAddress(addr);
      setIsAppUnlocked(true);
      await refreshWallets();
      await refreshBalance();
      return addr;
    },
    [refreshWallets, refreshBalance]
  );

  const lockWallet = useCallback(() => {
    secureWallet.lockWallet();
    setIsAppUnlocked(false);
  }, []);

  const deleteWallet = useCallback(async () => {
    await secureWallet.deleteAllWallets();
    setAddress(null);
    setBalance('0');
    setHasWallet(false);
    setIsAppUnlocked(false);
    setWalletGroups([]);
    setActiveGroup(null);
    setFlatWallets([]);
    setSeedGroups([]);
    setImportedWallets([]);
    setActiveWalletIndex(0);
  }, []);

  const setActiveWallet = useCallback(
    async (index: number) => {
      if (flatWallets[index]) {
        await switchToWallet(flatWallets[index].address);
      }
    },
    [flatWallets, switchToWallet]
  );

  // ==================== APP LOCK ACTIONS ====================

  const unlockApp = useCallback(
    async (pin: string) => {
      try {
        const addr = await secureWallet.unlockWallet(pin);
        setAddress(addr);
        setIsAppUnlocked(true);
        await refreshWallets();
        await refreshBalance();
        return true;
      } catch {
        return false;
      }
    },
    [refreshWallets, refreshBalance]
  );

  const unlockAppWithBiometrics = useCallback(async () => {
    const success = await secureWallet.authenticateWithBiometrics();
    if (success) {
      setIsAppUnlocked(true);
      await refreshWallets();
    }
    return success;
  }, [refreshWallets]);

  const lockApp = useCallback(() => {
    secureWallet.lockWallet();
    setIsAppUnlocked(false);
  }, []);

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    await secureWallet.setBiometricEnabled(enabled);
    setBiometricEnabledState(enabled);
  }, []);

  // ==================== NETWORK ACTIONS ====================

  const switchNetwork = useCallback(
    async (networkKey: string) => {
      await secureWallet.switchNetwork(networkKey);
      const network = secureWallet.getCurrentNetwork();
      setCurrentNetwork(network);
      setNetworkSymbol(network.symbol);
      setNetworkName(network.name);
      setIsTestnet(network.isTestnet);
      await refreshBalance();
    },
    [refreshBalance]
  );

  const getAvailableNetworks = useCallback(() => {
    return secureWallet.getAvailableNetworks();
  }, []);

  const getBlockExplorerUrl = useCallback((txHash?: string, addr?: string) => {
    return secureWallet.getBlockExplorerUrl(txHash, addr);
  }, []);

  // ==================== UTILITIES ====================

  const getWalletBalance = useCallback(async (addr: string) => {
    return secureWallet.getBalance(addr);
  }, []);

  const shortenAddress = useCallback((addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }, []);

  const signMessage = useCallback(async (message: string) => {
    return secureWallet.signMessage(message);
  }, []);

  const exportMnemonic = useCallback(async (pin: string, groupId?: string) => {
    return secureWallet.exportMnemonic(pin, groupId);
  }, []);

  const exportPrivateKey = useCallback(async (pin: string, groupId?: string) => {
    return secureWallet.exportPrivateKey(pin, groupId);
  }, []);

  const value: WalletContextType = {
    // State
    address,
    balance,
    isLoading,
    hasWallet,
    isAppUnlocked,
    biometricSupported,
    biometricEnabled,

    // Wallet data
    walletGroups,
    activeGroup,
    flatWallets,
    activeWalletIndex,
    activeAddress: address,
    seedGroups,
    importedWallets,

    // Network state
    networkSymbol,
    networkName,
    isTestnet,
    currentNetwork,

    // Simple wallet actions
    createNewWallet,
    importWalletFromSeed,
    importWalletFromPrivateKey,
    deriveNewAccount,
    switchToWallet,
    deleteWalletGroup,
    renameWallet,
    renameWalletGroup,

    // Legacy actions
    createWallet,
    importWallet,
    unlockWallet,
    lockWallet,
    deleteWallet,
    setActiveWallet,

    // App lock actions
    unlockApp,
    unlockAppWithBiometrics,
    lockApp,
    setBiometricEnabled,

    // Network actions
    switchNetwork,
    getAvailableNetworks,
    getBlockExplorerUrl,

    // Utilities
    shortenAddress,
    getWalletBalance,
    refreshBalance,
    refreshWallets,
    signMessage,
    exportMnemonic,
    exportPrivateKey,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
