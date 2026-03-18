// lib/wallet/SecureWallet.ts
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import { ethers } from 'ethers';

// Storage keys
const WALLET_GROUPS_KEY = 'wallet_groups';
const ACTIVE_GROUP_KEY = 'active_group_id';
const ACTIVE_WALLET_KEY = 'active_wallet_index';
const PIN_HASH_KEY = 'wallet_pin_hash';
const SALT_KEY = 'wallet_salt';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const NETWORK_KEY = 'selected_network';
const ENCRYPTION_KEY_CACHE = 'encryption_key_cache'; // For PIN-less switching

// Network configurations
export const NETWORKS: Record<string, NetworkConfig> = {
  // Testnets first
  avalancheFuji: {
    name: 'Avalanche Fuji',
    chainId: 43113,
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    symbol: 'AVAX',
    decimals: 18,
    blockExplorer: 'https://testnet.snowtrace.io',
    isTestnet: true,
  },
  polygonAmoy: {
    name: 'Polygon Amoy',
    chainId: 80002,
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    symbol: 'POL',
    decimals: 18,
    blockExplorer: 'https://amoy.polygonscan.com',
    isTestnet: true,
  },
  sepolia: {
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://rpc.sepolia.org',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://sepolia.etherscan.io',
    isTestnet: true,
  },
  // Mainnets
  avalanche: {
    name: 'Avalanche',
    chainId: 43114,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    symbol: 'AVAX',
    decimals: 18,
    blockExplorer: 'https://snowtrace.io',
    isTestnet: false,
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    symbol: 'POL',
    decimals: 18,
    blockExplorer: 'https://polygonscan.com',
    isTestnet: false,
  },
  ethereum: {
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://etherscan.io',
    isTestnet: false,
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://basescan.org',
    isTestnet: false,
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://arbiscan.io',
    isTestnet: false,
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://optimistic.etherscan.io',
    isTestnet: false,
  },
  bsc: {
    name: 'BNB Chain',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    symbol: 'BNB',
    decimals: 18,
    blockExplorer: 'https://bscscan.com',
    isTestnet: false,
  },
};

// Set Avalanche Fuji as default
const DEFAULT_NETWORK = 'avalancheFuji';

const DEFAULT_NETWORK = 'polygonAmoy';

// Types
export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  symbol: string;
  decimals: number;
  blockExplorer: string;
  isTestnet: boolean;
}

export interface WalletAddress {
  index: number;
  name: string;
  address: string;
  createdAt: number;
}

export interface WalletGroup {
  id: string;
  name: string;
  type: 'mnemonic' | 'privateKey';
  encryptedSecret: string;
  addresses: WalletAddress[];
  createdAt: number;
}

// Flat wallet item for UI (includes group info)
export interface FlatWallet {
  groupId: string;
  groupName: string;
  groupType: 'mnemonic' | 'privateKey';
  walletIndex: number;
  name: string;
  address: string;
  canDerive: boolean; // true for mnemonic groups
}

interface StoredWalletGroups {
  groups: WalletGroup[];
}

class SecureWalletService {
  private provider: ethers.providers.JsonRpcProvider | null = null;
  private currentWallet: ethers.Wallet | null = null;
  private currentNetwork: string = DEFAULT_NETWORK;
  private walletGroups: WalletGroup[] = [];
  private activeGroupId: string | null = null;
  private activeWalletIndex: number = 0;
  private cachedEncryptionKey: string | null = null; // Cache key after unlock

  constructor() {
    this.initializeNetwork();
  }

  // ==================== INITIALIZATION ====================

  private async initializeNetwork(): Promise<void> {
    try {
      const savedNetwork = await SecureStore.getItemAsync(NETWORK_KEY);
      this.currentNetwork = savedNetwork || DEFAULT_NETWORK;
      const config = NETWORKS[this.currentNetwork];
      this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    } catch (error) {
      this.currentNetwork = DEFAULT_NETWORK;
      const config = NETWORKS[DEFAULT_NETWORK];
      this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    }
  }

  private async loadWalletGroups(): Promise<void> {
    try {
      const data = await SecureStore.getItemAsync(WALLET_GROUPS_KEY);
      if (data) {
        const parsed: StoredWalletGroups = JSON.parse(data);
        this.walletGroups = parsed.groups || [];
      } else {
        this.walletGroups = [];
      }

      const activeGroup = await SecureStore.getItemAsync(ACTIVE_GROUP_KEY);
      this.activeGroupId = activeGroup || (this.walletGroups[0]?.id || null);

      const activeWallet = await SecureStore.getItemAsync(ACTIVE_WALLET_KEY);
      this.activeWalletIndex = activeWallet ? parseInt(activeWallet, 10) : 0;
    } catch (error) {
      this.walletGroups = [];
      this.activeGroupId = null;
      this.activeWalletIndex = 0;
    }
  }

  private async saveWalletGroups(): Promise<void> {
    const data: StoredWalletGroups = { groups: this.walletGroups };
    await SecureStore.setItemAsync(WALLET_GROUPS_KEY, JSON.stringify(data));
    if (this.activeGroupId) {
      await SecureStore.setItemAsync(ACTIVE_GROUP_KEY, this.activeGroupId);
    }
    await SecureStore.setItemAsync(ACTIVE_WALLET_KEY, this.activeWalletIndex.toString());
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ==================== NETWORK MANAGEMENT ====================

  async switchNetwork(networkKey: string): Promise<void> {
    if (!NETWORKS[networkKey]) {
      throw new Error(`Unknown network: ${networkKey}`);
    }
    this.currentNetwork = networkKey;
    const config = NETWORKS[networkKey];
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    await SecureStore.setItemAsync(NETWORK_KEY, networkKey);

    if (this.currentWallet) {
      this.currentWallet = this.currentWallet.connect(this.provider);
    }
  }

  getCurrentNetwork(): NetworkConfig & { key: string } {
    return { ...NETWORKS[this.currentNetwork], key: this.currentNetwork };
  }

  getAvailableNetworks(): Array<NetworkConfig & { key: string }> {
    return Object.entries(NETWORKS).map(([key, config]) => ({ ...config, key }));
  }

  getBlockExplorerUrl(txHash?: string, address?: string): string {
    const explorer = NETWORKS[this.currentNetwork].blockExplorer;
    if (txHash) return `${explorer}/tx/${txHash}`;
    if (address) return `${explorer}/address/${address}`;
    return explorer;
  }

  // ==================== BIOMETRIC SUPPORT ====================

  async checkBiometricSupport(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  }

  async isBiometricEnabled(): Promise<boolean> {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  }

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
  }

  async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your wallet',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: true,
      });
      return result.success;
    } catch {
      return false;
    }
  }

  // ==================== PIN MANAGEMENT ====================

  private async hashPin(pin: string, salt: string): Promise<string> {
    const combined = pin + salt;
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, combined);
    return hash;
  }

  private async generateSalt(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(new Uint8Array(randomBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async deriveKey(pin: string, salt: string): Promise<string> {
    let key = pin + salt;
    for (let i = 0; i < 1000; i++) {
      key = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, key);
    }
    return key;
  }

  async verifyPin(pin: string): Promise<boolean> {
    const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
    const salt = await SecureStore.getItemAsync(SALT_KEY);
    if (!storedHash || !salt) return false;
    const inputHash = await this.hashPin(pin, salt);
    return inputHash === storedHash;
  }

  async hasPinSet(): Promise<boolean> {
    const pinHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
    return pinHash !== null;
  }

  async setPin(pin: string): Promise<void> {
    const salt = await this.generateSalt();
    const pinHash = await this.hashPin(pin, salt);
    await SecureStore.setItemAsync(PIN_HASH_KEY, pinHash);
    await SecureStore.setItemAsync(SALT_KEY, salt);
  }

  // Cache encryption key after successful unlock (for PIN-less wallet switching)
  private async cacheEncryptionKey(pin: string): Promise<void> {
    const salt = await SecureStore.getItemAsync(SALT_KEY);
    if (salt) {
      this.cachedEncryptionKey = await this.deriveKey(pin, salt);
    }
  }

  private async getCachedEncryptionKey(): Promise<string | null> {
    return this.cachedEncryptionKey;
  }

  // ==================== ENCRYPTION ====================

  private encrypt(data: string, key: string): string {
    const keyBytes = new TextEncoder().encode(key);
    const dataBytes = new TextEncoder().encode(data);
    const encrypted = new Uint8Array(dataBytes.length);
    for (let i = 0; i < dataBytes.length; i++) {
      encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return Array.from(encrypted)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private decrypt(encryptedHex: string, key: string): string {
    const keyBytes = new TextEncoder().encode(key);
    const encrypted = new Uint8Array(
      encryptedHex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
    );
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }
    return new TextDecoder().decode(decrypted);
  }

  // ==================== HD WALLET DERIVATION ====================

  private getDerivationPath(index: number): string {
    return `m/44'/60'/0'/0/${index}`;
  }

  private deriveWalletFromMnemonic(mnemonic: string, index: number): { address: string; privateKey: string } {
    const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
    const path = this.getDerivationPath(index);
    const derived = hdNode.derivePath(path);
    return { address: derived.address, privateKey: derived.privateKey };
  }

  // ==================== WALLET CREATION (SIMPLIFIED) ====================

  async createNewWallet(name: string): Promise<{ address: string; mnemonic: string; groupId: string }> {
    // Generate mnemonic
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    const mnemonic = ethers.utils.entropyToMnemonic(randomBytes);

    // Derive first address
    const { address, privateKey } = this.deriveWalletFromMnemonic(mnemonic, 0);

    // Get or create encryption key
    let encryptionKey = await this.getCachedEncryptionKey();
    if (!encryptionKey) {
      throw new Error('Please unlock the app first');
    }

    // Encrypt mnemonic
    const encryptedMnemonic = this.encrypt(mnemonic, encryptionKey);

    // Create wallet group
    const groupId = this.generateId();
    const newGroup: WalletGroup = {
      id: groupId,
      name: name,
      type: 'mnemonic',
      encryptedSecret: encryptedMnemonic,
      addresses: [{ index: 0, name: 'Account 1', address, createdAt: Date.now() }],
      createdAt: Date.now(),
    };

    await this.loadWalletGroups();
    this.walletGroups.push(newGroup);
    this.activeGroupId = groupId;
    this.activeWalletIndex = 0;
    await this.saveWalletGroups();

    // Set up current wallet
    if (!this.provider) await this.initializeNetwork();
    this.currentWallet = new ethers.Wallet(privateKey, this.provider!);

    return { address, mnemonic, groupId };
  }

  async importWalletFromSeed(mnemonic: string, name: string): Promise<{ address: string; groupId: string }> {
    // Validate mnemonic
    if (!ethers.utils.isValidMnemonic(mnemonic.trim())) {
      throw new Error('Invalid recovery phrase');
    }

    const cleanMnemonic = mnemonic.trim().toLowerCase();

    // Get encryption key
    let encryptionKey = await this.getCachedEncryptionKey();
    if (!encryptionKey) {
      throw new Error('Please unlock the app first');
    }

    // Derive first address
    const { address, privateKey } = this.deriveWalletFromMnemonic(cleanMnemonic, 0);

    // Check if this mnemonic already exists
    await this.loadWalletGroups();
    for (const group of this.walletGroups) {
      if (group.type === 'mnemonic') {
        try {
          const decrypted = this.decrypt(group.encryptedSecret, encryptionKey);
          if (decrypted.toLowerCase().trim() === cleanMnemonic) {
            throw new Error('This recovery phrase is already imported');
          }
        } catch (e: any) {
          if (e.message === 'This recovery phrase is already imported') throw e;
        }
      }
    }

    // Encrypt mnemonic
    const encryptedMnemonic = this.encrypt(cleanMnemonic, encryptionKey);

    // Create wallet group
    const groupId = this.generateId();
    const newGroup: WalletGroup = {
      id: groupId,
      name: name,
      type: 'mnemonic',
      encryptedSecret: encryptedMnemonic,
      addresses: [{ index: 0, name: 'Account 1', address, createdAt: Date.now() }],
      createdAt: Date.now(),
    };

    this.walletGroups.push(newGroup);
    this.activeGroupId = groupId;
    this.activeWalletIndex = 0;
    await this.saveWalletGroups();

    // Set up current wallet
    if (!this.provider) await this.initializeNetwork();
    this.currentWallet = new ethers.Wallet(privateKey, this.provider!);

    return { address, groupId };
  }

  async importWalletFromKey(privateKey: string, name: string): Promise<{ address: string; groupId: string }> {
    // Validate private key
    let wallet: ethers.Wallet;
    try {
      const cleanKey = privateKey.trim().startsWith('0x') ? privateKey.trim() : `0x${privateKey.trim()}`;
      wallet = new ethers.Wallet(cleanKey);
    } catch {
      throw new Error('Invalid private key');
    }

    // Get encryption key
    let encryptionKey = await this.getCachedEncryptionKey();
    if (!encryptionKey) {
      throw new Error('Please unlock the app first');
    }

    const address = wallet.address;

    // Check if already exists
    await this.loadWalletGroups();
    for (const group of this.walletGroups) {
      for (const addr of group.addresses) {
        if (addr.address.toLowerCase() === address.toLowerCase()) {
          throw new Error('This wallet is already imported');
        }
      }
    }

    // Encrypt private key
    const encryptedKey = this.encrypt(privateKey.trim(), encryptionKey);

    // Create wallet group
    const groupId = this.generateId();
    const newGroup: WalletGroup = {
      id: groupId,
      name: name,
      type: 'privateKey',
      encryptedSecret: encryptedKey,
      addresses: [{ index: 0, name: name, address, createdAt: Date.now() }],
      createdAt: Date.now(),
    };

    this.walletGroups.push(newGroup);
    this.activeGroupId = groupId;
    this.activeWalletIndex = 0;
    await this.saveWalletGroups();

    // Set up current wallet
    if (!this.provider) await this.initializeNetwork();
    this.currentWallet = wallet.connect(this.provider!);

    return { address, groupId };
  }

  // ==================== DERIVE ACCOUNT (within a seed group) ====================

  async deriveNewAccount(groupId: string, accountName: string): Promise<{ address: string; index: number }> {
    const encryptionKey = await this.getCachedEncryptionKey();
    if (!encryptionKey) {
      throw new Error('Please unlock the app first');
    }

    await this.loadWalletGroups();

    const group = this.walletGroups.find((g) => g.id === groupId);
    if (!group) throw new Error('Wallet group not found');

    if (group.type !== 'mnemonic') {
      throw new Error('Cannot derive accounts from a private key import');
    }

    // Decrypt mnemonic
    const mnemonic = this.decrypt(group.encryptedSecret, encryptionKey);

    // Find next index
    const usedIndices = group.addresses.map((a) => a.index);
    let nextIndex = 0;
    while (usedIndices.includes(nextIndex)) {
      nextIndex++;
    }

    // Derive new address
    const { address } = this.deriveWalletFromMnemonic(mnemonic, nextIndex);

    // Add to group
    group.addresses.push({
      index: nextIndex,
      name: accountName,
      address,
      createdAt: Date.now(),
    });
    await this.saveWalletGroups();

    return { address, index: nextIndex };
  }

  // ==================== WALLET SWITCHING (NO PIN) ====================

  async setActiveWalletByAddress(address: string): Promise<void> {
    const encryptionKey = await this.getCachedEncryptionKey();
    if (!encryptionKey) {
      throw new Error('Please unlock the app first');
    }

    await this.loadWalletGroups();

    // Find the wallet
    for (const group of this.walletGroups) {
      const walletIdx = group.addresses.findIndex(
        (a) => a.address.toLowerCase() === address.toLowerCase()
      );
      if (walletIdx !== -1) {
        this.activeGroupId = group.id;
        this.activeWalletIndex = walletIdx;
        await this.saveWalletGroups();

        // Unlock the wallet
        const secret = this.decrypt(group.encryptedSecret, encryptionKey);
        let privateKey: string;

        if (group.type === 'mnemonic') {
          const derived = this.deriveWalletFromMnemonic(secret, group.addresses[walletIdx].index);
          privateKey = derived.privateKey;
        } else {
          privateKey = secret;
        }

        if (!this.provider) await this.initializeNetwork();
        this.currentWallet = new ethers.Wallet(privateKey, this.provider!);

        return;
      }
    }

    throw new Error('Wallet not found');
  }

  async setActiveWallet(listIndex: number): Promise<void> {
    // Get flat wallet list and find by index
    const flatWallets = await this.getFlatWalletList();
    if (listIndex < 0 || listIndex >= flatWallets.length) {
      throw new Error('Invalid wallet index');
    }

    const wallet = flatWallets[listIndex];
    await this.setActiveWalletByAddress(wallet.address);
  }

  // ==================== GET FLAT WALLET LIST (for UI) ====================

  async getFlatWalletList(): Promise<FlatWallet[]> {
    await this.loadWalletGroups();
    
    const flatList: FlatWallet[] = [];

    for (const group of this.walletGroups) {
      for (const wallet of group.addresses) {
        flatList.push({
          groupId: group.id,
          groupName: group.name,
          groupType: group.type,
          walletIndex: wallet.index,
          name: wallet.name,
          address: wallet.address,
          canDerive: group.type === 'mnemonic',
        });
      }
    }

    return flatList;
  }

  // Get wallets grouped by seed (for visual grouping in UI)
  async getGroupedWallets(): Promise<{
    seedGroups: Array<{ group: WalletGroup; wallets: FlatWallet[] }>;
    importedWallets: FlatWallet[];
  }> {
    await this.loadWalletGroups();

    const seedGroups: Array<{ group: WalletGroup; wallets: FlatWallet[] }> = [];
    const importedWallets: FlatWallet[] = [];

    for (const group of this.walletGroups) {
      const wallets: FlatWallet[] = group.addresses.map((wallet) => ({
        groupId: group.id,
        groupName: group.name,
        groupType: group.type,
        walletIndex: wallet.index,
        name: wallet.name,
        address: wallet.address,
        canDerive: group.type === 'mnemonic',
      }));

      if (group.type === 'mnemonic') {
        seedGroups.push({ group, wallets });
      } else {
        importedWallets.push(...wallets);
      }
    }

    return { seedGroups, importedWallets };
  }

  // ==================== LEGACY METHODS (for compatibility) ====================

  async createWalletGroup(
    pin: string,
    groupName: string,
    walletName: string = 'Account 1'
  ): Promise<{ groupId: string; address: string; mnemonic: string }> {
    const hasPin = await this.hasPinSet();
    if (hasPin) {
      const isValid = await this.verifyPin(pin);
      if (!isValid) throw new Error('Invalid PIN');
    } else {
      await this.setPin(pin);
    }

    // Cache encryption key
    await this.cacheEncryptionKey(pin);

    const result = await this.createNewWallet(groupName);
    
    // Rename first account if needed
    if (walletName !== 'Account 1') {
      const group = this.walletGroups.find((g) => g.id === result.groupId);
      if (group && group.addresses[0]) {
        group.addresses[0].name = walletName;
        await this.saveWalletGroups();
      }
    }

    return { groupId: result.groupId, address: result.address, mnemonic: result.mnemonic };
  }

  async importWalletGroupFromMnemonic(
    pin: string,
    mnemonic: string,
    groupName: string,
    walletName: string = 'Account 1'
  ): Promise<{ groupId: string; address: string }> {
    const hasPin = await this.hasPinSet();
    if (hasPin) {
      const isValid = await this.verifyPin(pin);
      if (!isValid) throw new Error('Invalid PIN');
    } else {
      await this.setPin(pin);
    }

    await this.cacheEncryptionKey(pin);

    const result = await this.importWalletFromSeed(mnemonic, groupName);

    if (walletName !== 'Account 1') {
      const group = this.walletGroups.find((g) => g.id === result.groupId);
      if (group && group.addresses[0]) {
        group.addresses[0].name = walletName;
        await this.saveWalletGroups();
      }
    }

    return result;
  }

  async importWalletFromPrivateKey(
    pin: string,
    privateKey: string,
    walletName: string
  ): Promise<{ groupId: string; address: string }> {
    const hasPin = await this.hasPinSet();
    if (hasPin) {
      const isValid = await this.verifyPin(pin);
      if (!isValid) throw new Error('Invalid PIN');
    } else {
      await this.setPin(pin);
    }

    await this.cacheEncryptionKey(pin);

    return this.importWalletFromKey(privateKey, walletName);
  }

  async createDerivedWallet(pin: string, name: string): Promise<{ address: string; index: number }> {
    const isValid = await this.verifyPin(pin);
    if (!isValid) throw new Error('Invalid PIN');

    await this.cacheEncryptionKey(pin);

    if (!this.activeGroupId) {
      throw new Error('No active wallet group');
    }

    return this.deriveNewAccount(this.activeGroupId, name);
  }

  async switchWalletGroup(pin: string, groupId: string): Promise<string> {
    const isValid = await this.verifyPin(pin);
    if (!isValid) throw new Error('Invalid PIN');

    await this.cacheEncryptionKey(pin);
    await this.loadWalletGroups();

    const group = this.walletGroups.find((g) => g.id === groupId);
    if (!group || !group.addresses[0]) throw new Error('Wallet group not found');

    await this.setActiveWalletByAddress(group.addresses[0].address);

    return group.addresses[0].address;
  }

  async switchWallet(pin: string, walletIndex: number): Promise<string> {
    const isValid = await this.verifyPin(pin);
    if (!isValid) throw new Error('Invalid PIN');

    await this.cacheEncryptionKey(pin);
    await this.loadWalletGroups();

    const group = this.walletGroups.find((g) => g.id === this.activeGroupId);
    if (!group) throw new Error('No active wallet group');

    const walletAddr = group.addresses.find((a) => a.index === walletIndex);
    if (!walletAddr) throw new Error('Wallet not found');

    await this.setActiveWalletByAddress(walletAddr.address);

    return walletAddr.address;
  }

  // ==================== WALLET UNLOCK ====================

  async unlockWallet(pin: string): Promise<string> {
    const isValid = await this.verifyPin(pin);
    if (!isValid) throw new Error('Invalid PIN');

    // Cache encryption key for PIN-less switching
    await this.cacheEncryptionKey(pin);

    await this.loadWalletGroups();

    if (this.walletGroups.length === 0) throw new Error('No wallet found');

    const group = this.walletGroups.find((g) => g.id === this.activeGroupId) || this.walletGroups[0];
    this.activeGroupId = group.id;

    const walletAddr = group.addresses[this.activeWalletIndex] || group.addresses[0];
    this.activeWalletIndex = group.addresses.indexOf(walletAddr);

    const encryptionKey = this.cachedEncryptionKey!;
    const secret = this.decrypt(group.encryptedSecret, encryptionKey);

    let privateKey: string;
    if (group.type === 'mnemonic') {
      const derived = this.deriveWalletFromMnemonic(secret, walletAddr.index);
      privateKey = derived.privateKey;
    } else {
      privateKey = secret;
    }

    if (!this.provider) await this.initializeNetwork();
    this.currentWallet = new ethers.Wallet(privateKey, this.provider!);

    await this.saveWalletGroups();

    return walletAddr.address;
  }

  // ==================== WALLET INFO ====================

  async hasWallet(): Promise<boolean> {
    await this.loadWalletGroups();
    return this.walletGroups.length > 0;
  }

  async getStoredAddress(): Promise<string | null> {
    await this.loadWalletGroups();
    const group = this.walletGroups.find((g) => g.id === this.activeGroupId);
    if (!group) return null;
    const wallet = group.addresses[this.activeWalletIndex];
    return wallet?.address || null;
  }

  async getAllWalletGroups(): Promise<WalletGroup[]> {
    await this.loadWalletGroups();
    return [...this.walletGroups];
  }

  async getActiveGroup(): Promise<WalletGroup | null> {
    await this.loadWalletGroups();
    return this.walletGroups.find((g) => g.id === this.activeGroupId) || null;
  }

  async getAllWallets(): Promise<WalletAddress[]> {
    await this.loadWalletGroups();
    const group = this.walletGroups.find((g) => g.id === this.activeGroupId);
    return group?.addresses || [];
  }

  async getActiveWalletIndex(): Promise<number> {
    return this.activeWalletIndex;
  }

  async getActiveGroupId(): Promise<string | null> {
    await this.loadWalletGroups();
    return this.activeGroupId;
  }

  // ==================== WALLET OPERATIONS ====================

  async getBalance(address?: string): Promise<string> {
    if (!this.provider) await this.initializeNetwork();
    const targetAddress = address || this.currentWallet?.address;
    if (!targetAddress) throw new Error('No wallet address');
    const balance = await this.provider!.getBalance(targetAddress);
    return ethers.utils.formatEther(balance);
  }

  async signMessage(message: string): Promise<string> {
    if (!this.currentWallet) throw new Error('Wallet not unlocked');
    return this.currentWallet.signMessage(message);
  }

  async sendTransaction(to: string, amount: string): Promise<string> {
    if (!this.currentWallet) throw new Error('Wallet not unlocked');
    const tx = await this.currentWallet.sendTransaction({
      to,
      value: ethers.utils.parseEther(amount),
    });
    return tx.hash;
  }

  async exportMnemonic(pin: string, groupId?: string): Promise<string> {
    const isValid = await this.verifyPin(pin);
    if (!isValid) throw new Error('Invalid PIN');

    await this.loadWalletGroups();

    const targetGroupId = groupId || this.activeGroupId;
    const group = this.walletGroups.find((g) => g.id === targetGroupId);
    if (!group) throw new Error('Wallet group not found');

    if (group.type !== 'mnemonic') {
      throw new Error('This wallet was imported with a private key');
    }

    const salt = await SecureStore.getItemAsync(SALT_KEY);
    const encryptionKey = await this.deriveKey(pin, salt!);

    return this.decrypt(group.encryptedSecret, encryptionKey);
  }

  async exportPrivateKey(pin: string, groupId?: string): Promise<string> {
    const isValid = await this.verifyPin(pin);
    if (!isValid) throw new Error('Invalid PIN');

    await this.loadWalletGroups();

    const targetGroupId = groupId || this.activeGroupId;
    const group = this.walletGroups.find((g) => g.id === targetGroupId);
    if (!group) throw new Error('Wallet group not found');

    const salt = await SecureStore.getItemAsync(SALT_KEY);
    const encryptionKey = await this.deriveKey(pin, salt!);
    const secret = this.decrypt(group.encryptedSecret, encryptionKey);

    if (group.type === 'privateKey') {
      return secret;
    } else {
      const walletAddr = group.addresses[this.activeWalletIndex] || group.addresses[0];
      const { privateKey } = this.deriveWalletFromMnemonic(secret, walletAddr.index);
      return privateKey;
    }
  }

  // ==================== WALLET MANAGEMENT ====================

  async renameWalletGroup(groupId: string, newName: string): Promise<void> {
    await this.loadWalletGroups();
    const group = this.walletGroups.find((g) => g.id === groupId);
    if (!group) throw new Error('Wallet group not found');
    group.name = newName;
    await this.saveWalletGroups();
  }

  async renameWallet(groupId: string, walletIndex: number, newName: string): Promise<void> {
    await this.loadWalletGroups();
    const group = this.walletGroups.find((g) => g.id === groupId);
    if (!group) throw new Error('Wallet group not found');
    const wallet = group.addresses.find((a) => a.index === walletIndex);
    if (!wallet) throw new Error('Wallet not found');
    wallet.name = newName;
    await this.saveWalletGroups();
  }

  async removeWallet(groupId: string, walletIndex: number): Promise<void> {
    await this.loadWalletGroups();
    const group = this.walletGroups.find((g) => g.id === groupId);
    if (!group) throw new Error('Wallet group not found');

    if (group.addresses.length <= 1) {
      throw new Error('Cannot remove the last wallet. Delete the group instead.');
    }

    const walletIdx = group.addresses.findIndex((a) => a.index === walletIndex);
    if (walletIdx === -1) throw new Error('Wallet not found');

    group.addresses.splice(walletIdx, 1);

    if (this.activeWalletIndex >= group.addresses.length) {
      this.activeWalletIndex = group.addresses.length - 1;
    }

    await this.saveWalletGroups();
  }

  async deleteWalletGroup(groupId: string): Promise<void> {
    await this.loadWalletGroups();

    const groupIdx = this.walletGroups.findIndex((g) => g.id === groupId);
    if (groupIdx === -1) throw new Error('Wallet group not found');

    this.walletGroups.splice(groupIdx, 1);

    if (this.activeGroupId === groupId) {
      this.activeGroupId = this.walletGroups[0]?.id || null;
      this.activeWalletIndex = 0;
    }

    await this.saveWalletGroups();
    this.currentWallet = null;
  }

  async deleteAllWallets(): Promise<void> {
    await SecureStore.deleteItemAsync(WALLET_GROUPS_KEY);
    await SecureStore.deleteItemAsync(ACTIVE_GROUP_KEY);
    await SecureStore.deleteItemAsync(ACTIVE_WALLET_KEY);
    await SecureStore.deleteItemAsync(PIN_HASH_KEY);
    await SecureStore.deleteItemAsync(SALT_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);

    this.walletGroups = [];
    this.activeGroupId = null;
    this.activeWalletIndex = 0;
    this.currentWallet = null;
    this.cachedEncryptionKey = null;
  }

  lockWallet(): void {
    this.currentWallet = null;
    this.cachedEncryptionKey = null;
  }

  isUnlocked(): boolean {
    return this.currentWallet !== null && this.cachedEncryptionKey !== null;
  }
}

export const secureWallet = new SecureWalletService();
