// lib/wallet/SecureWallet.ts
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import { ethers } from 'ethers';
import {
  VaultKey,
  WrongPinError,
  constantTimeEqual,
  createPinVerifier,
  createVaultKey,
  decryptV2,
  deriveKeyForBlob,
  deriveLegacyKey,
  encryptV2,
  generateDeviceSecret,
  legacyHashPin,
  legacyXorDecrypt,
  openPinVerifier,
  parseDeviceSecret,
  parseStoredSecret,
  wipe,
} from './vaultCrypto';

// Storage keys
const WALLET_GROUPS_KEY = 'wallet_groups';
const ACTIVE_GROUP_KEY = 'active_group_id';
const ACTIVE_WALLET_KEY = 'active_wallet_index';
const PIN_HASH_KEY = 'wallet_pin_hash'; // legacy (v1): fast SHA-256 PIN hash, removed after migration
const SALT_KEY = 'wallet_salt'; // legacy (v1): salt for the PIN hash / XOR key, removed after migration
const PIN_VERIFIER_KEY = 'wallet_pin_verifier_v2'; // v2: AEAD blob that proves the PIN
const DEVICE_SECRET_KEY = 'wallet_device_secret_v2'; // v2: random secret mixed into the KDF
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const NETWORK_KEY = 'selected_network';

// The device secret never leaves this device (not synced via iCloud Keychain or restored from backups).
const DEVICE_SECRET_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const randomBytes = (length: number): Uint8Array => Crypto.getRandomBytes(length);

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
  // Vault keys derived after a successful PIN entry, kept in memory only (for PIN-less switching).
  // sessionKey encrypts new secrets; vaultKeys holds every key seen, indexed by salt (hex).
  private sessionKey: VaultKey | null = null;
  private vaultKeys: Map<string, VaultKey> = new Map();

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
  //
  // v2: the PIN is checked by decrypting a small AEAD verifier blob with a key derived from
  // scrypt(HMAC(deviceSecret, pin), salt). There is no fast hash of the PIN in storage any more.
  // Legacy installs (SHA-256 PIN hash + XOR-encrypted secrets) are migrated on the first correct
  // PIN entry: see authenticate() and migrateLegacySecrets().

  private async getDeviceSecret(createIfMissing: boolean): Promise<Uint8Array | null> {
    const existing = await SecureStore.getItemAsync(DEVICE_SECRET_KEY, DEVICE_SECRET_STORE_OPTIONS);
    if (existing) return parseDeviceSecret(existing);
    if (!createIfMissing) return null;
    const created = generateDeviceSecret(randomBytes);
    await SecureStore.setItemAsync(DEVICE_SECRET_KEY, created, DEVICE_SECRET_STORE_OPTIONS);
    return parseDeviceSecret(created);
  }

  private setSessionKey(vaultKey: VaultKey): void {
    this.clearKeys();
    this.sessionKey = vaultKey;
    this.vaultKeys.set(vaultKey.saltHex, vaultKey);
  }

  private clearKeys(): void {
    for (const vk of this.vaultKeys.values()) wipe(vk.key);
    if (this.sessionKey) wipe(this.sessionKey.key);
    this.vaultKeys.clear();
    this.sessionKey = null;
  }

  /**
   * Check the PIN. On success, caches the vault key in memory (for PIN-less wallet switching) and
   * transparently upgrades any legacy (v1) data to v2. Returns false for a wrong PIN.
   */
  private async authenticate(pin: string): Promise<boolean> {
    const verifier = await SecureStore.getItemAsync(PIN_VERIFIER_KEY);

    if (verifier) {
      const deviceSecret = await this.getDeviceSecret(false);
      if (!deviceSecret) {
        throw new Error(
          'The wallet key for this device is missing (for example after restoring a backup on a new device). ' +
            'Restore your wallets from the recovery phrase.'
        );
      }
      let vaultKey: VaultKey;
      try {
        vaultKey = await openPinVerifier(pin, deviceSecret, verifier);
      } catch (e) {
        if (e instanceof WrongPinError) return false;
        throw e;
      }
      this.setSessionKey(vaultKey);
      await this.migrateLegacySecrets(pin, deviceSecret);
      return true;
    }

    // Legacy (v1) install: verify against the old SHA-256 hash, then set up v2.
    const legacyHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
    const legacySalt = await SecureStore.getItemAsync(SALT_KEY);
    if (!legacyHash || !legacySalt) return false;
    if (!constantTimeEqual(legacyHashPin(pin, legacySalt), legacyHash.toLowerCase())) return false;

    const deviceSecret = await this.getDeviceSecret(true);
    const vaultKey = await createVaultKey(pin, deviceSecret!, randomBytes);
    // Write the verifier before touching the secrets: if the app dies mid-migration, the next unlock
    // takes the v2 path above and finishes migrating (the legacy salt is only deleted at the end).
    await SecureStore.setItemAsync(PIN_VERIFIER_KEY, createPinVerifier(vaultKey, randomBytes));
    this.setSessionKey(vaultKey);
    await this.migrateLegacySecrets(pin, deviceSecret!);
    return true;
  }

  /**
   * Re-encrypt every v1 (XOR) secret as v2 under the session key, and derive keys for any v2 blob
   * that uses a different salt. Only called right after the PIN has been verified.
   */
  private async migrateLegacySecrets(pin: string, deviceSecret: Uint8Array): Promise<void> {
    await this.loadWalletGroups();
    const legacySalt = await SecureStore.getItemAsync(SALT_KEY);
    let legacyKey: string | null = null;
    let changed = false;
    let remainingV1 = 0;

    for (const group of this.walletGroups) {
      let parsed;
      try {
        parsed = parseStoredSecret(group.encryptedSecret);
      } catch (e) {
        console.warn(`Wallet group ${group.id}: unreadable secret`, e);
        continue;
      }

      if (parsed.version === 2) {
        if (!this.vaultKeys.has(parsed.blob.salt.toLowerCase())) {
          try {
            const vk = await deriveKeyForBlob(pin, deviceSecret, parsed.blob);
            decryptV2(parsed.blob, vk); // make sure the key really opens it
            this.vaultKeys.set(vk.saltHex, vk);
          } catch (e) {
            console.warn(`Wallet group ${group.id}: could not derive key for stored secret`, e);
          }
        }
        continue;
      }

      // v1
      if (!legacySalt) {
        remainingV1++;
        console.warn(`Wallet group ${group.id}: legacy secret but no legacy salt, cannot migrate`);
        continue;
      }
      try {
        legacyKey = legacyKey ?? deriveLegacyKey(pin, legacySalt);
        const plaintext = legacyXorDecrypt(parsed.hex, legacyKey);
        // XOR has no integrity check, so validate the result before trusting it.
        if (!this.isPlausibleSecret(group.type, plaintext)) {
          throw new Error('legacy secret did not decrypt to a valid wallet secret');
        }
        group.encryptedSecret = encryptV2(plaintext, this.sessionKey!, randomBytes);
        changed = true;
      } catch (e) {
        remainingV1++;
        console.warn(`Wallet group ${group.id}: legacy migration failed`, e);
      }
    }

    if (changed) await this.saveWalletGroups();
    if (remainingV1 === 0) {
      await SecureStore.deleteItemAsync(PIN_HASH_KEY);
      await SecureStore.deleteItemAsync(SALT_KEY);
    }
  }

  private isPlausibleSecret(type: WalletGroup['type'], secret: string): boolean {
    if (type === 'mnemonic') return ethers.utils.isValidMnemonic(secret.trim());
    return /^(0x)?[0-9a-fA-F]{64}$/.test(secret.trim());
  }

  async verifyPin(pin: string): Promise<boolean> {
    return this.authenticate(pin);
  }

  async hasPinSet(): Promise<boolean> {
    const verifier = await SecureStore.getItemAsync(PIN_VERIFIER_KEY);
    if (verifier !== null) return true;
    const legacyHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
    return legacyHash !== null;
  }

  async setPin(pin: string): Promise<void> {
    const deviceSecret = await this.getDeviceSecret(true);
    const vaultKey = await createVaultKey(pin, deviceSecret!, randomBytes);
    await SecureStore.setItemAsync(PIN_VERIFIER_KEY, createPinVerifier(vaultKey, randomBytes));
    await SecureStore.deleteItemAsync(PIN_HASH_KEY);
    this.setSessionKey(vaultKey);
  }

  /** Verify the PIN if one exists, otherwise set it. Throws 'Invalid PIN' on a wrong PIN. */
  private async authenticateOrSetPin(pin: string): Promise<void> {
    if (await this.hasPinSet()) {
      if (!(await this.authenticate(pin))) throw new Error('Invalid PIN');
    } else {
      await this.setPin(pin);
    }
  }

  private requireSessionKey(): VaultKey {
    if (!this.sessionKey) throw new Error('Please unlock the app first');
    return this.sessionKey;
  }

  // ==================== ENCRYPTION ====================

  private encryptSecret(plaintext: string): string {
    return encryptV2(plaintext, this.requireSessionKey(), randomBytes);
  }

  /** Decrypt a stored secret with the cached vault keys. Requires a prior successful PIN entry. */
  private decryptSecret(stored: string): string {
    this.requireSessionKey();
    const parsed = parseStoredSecret(stored);
    if (parsed.version === 1) {
      throw new Error('This wallet still uses the old storage format. Lock the app and unlock it with your PIN.');
    }
    const vaultKey = this.vaultKeys.get(parsed.blob.salt.toLowerCase());
    if (!vaultKey) throw new Error('Please unlock the app first');
    try {
      return decryptV2(parsed.blob, vaultKey);
    } catch (e) {
      // The PIN was already verified, so an authentication failure here means the data changed.
      if (e instanceof WrongPinError) {
        throw new Error('Stored wallet data failed its integrity check (corrupted or modified)');
      }
      throw e;
    }
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

    // Encrypt mnemonic (requires the app to be unlocked)
    const encryptedMnemonic = this.encryptSecret(mnemonic);

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

    // Requires the app to be unlocked
    this.requireSessionKey();

    // Derive first address
    const { address, privateKey } = this.deriveWalletFromMnemonic(cleanMnemonic, 0);

    // Check if this mnemonic already exists
    await this.loadWalletGroups();
    for (const group of this.walletGroups) {
      if (group.type === 'mnemonic') {
        try {
          const decrypted = this.decryptSecret(group.encryptedSecret);
          if (decrypted.toLowerCase().trim() === cleanMnemonic) {
            throw new Error('This recovery phrase is already imported');
          }
        } catch (e: any) {
          if (e.message === 'This recovery phrase is already imported') throw e;
        }
      }
    }

    // Encrypt mnemonic
    const encryptedMnemonic = this.encryptSecret(cleanMnemonic);

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

    // Requires the app to be unlocked
    this.requireSessionKey();

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
    const encryptedKey = this.encryptSecret(privateKey.trim());

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
    this.requireSessionKey();

    await this.loadWalletGroups();

    const group = this.walletGroups.find((g) => g.id === groupId);
    if (!group) throw new Error('Wallet group not found');

    if (group.type !== 'mnemonic') {
      throw new Error('Cannot derive accounts from a private key import');
    }

    // Decrypt mnemonic
    const mnemonic = this.decryptSecret(group.encryptedSecret);

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
    this.requireSessionKey();

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
        const secret = this.decryptSecret(group.encryptedSecret);
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
    await this.authenticateOrSetPin(pin);

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
    await this.authenticateOrSetPin(pin);

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
    await this.authenticateOrSetPin(pin);

    return this.importWalletFromKey(privateKey, walletName);
  }

  async createDerivedWallet(pin: string, name: string): Promise<{ address: string; index: number }> {
    if (!(await this.authenticate(pin))) throw new Error('Invalid PIN');

    if (!this.activeGroupId) {
      throw new Error('No active wallet group');
    }

    return this.deriveNewAccount(this.activeGroupId, name);
  }

  async switchWalletGroup(pin: string, groupId: string): Promise<string> {
    if (!(await this.authenticate(pin))) throw new Error('Invalid PIN');
    await this.loadWalletGroups();

    const group = this.walletGroups.find((g) => g.id === groupId);
    if (!group || !group.addresses[0]) throw new Error('Wallet group not found');

    await this.setActiveWalletByAddress(group.addresses[0].address);

    return group.addresses[0].address;
  }

  async switchWallet(pin: string, walletIndex: number): Promise<string> {
    if (!(await this.authenticate(pin))) throw new Error('Invalid PIN');
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
    // Verifies the PIN and caches the vault key for PIN-less switching
    if (!(await this.authenticate(pin))) throw new Error('Invalid PIN');

    await this.loadWalletGroups();

    if (this.walletGroups.length === 0) throw new Error('No wallet found');

    const group = this.walletGroups.find((g) => g.id === this.activeGroupId) || this.walletGroups[0];
    this.activeGroupId = group.id;

    const walletAddr = group.addresses[this.activeWalletIndex] || group.addresses[0];
    this.activeWalletIndex = group.addresses.indexOf(walletAddr);

    const secret = this.decryptSecret(group.encryptedSecret);

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
    if (!(await this.authenticate(pin))) throw new Error('Invalid PIN');

    await this.loadWalletGroups();

    const targetGroupId = groupId || this.activeGroupId;
    const group = this.walletGroups.find((g) => g.id === targetGroupId);
    if (!group) throw new Error('Wallet group not found');

    if (group.type !== 'mnemonic') {
      throw new Error('This wallet was imported with a private key');
    }

    return this.decryptSecret(group.encryptedSecret);
  }

  async exportPrivateKey(pin: string, groupId?: string): Promise<string> {
    if (!(await this.authenticate(pin))) throw new Error('Invalid PIN');

    await this.loadWalletGroups();

    const targetGroupId = groupId || this.activeGroupId;
    const group = this.walletGroups.find((g) => g.id === targetGroupId);
    if (!group) throw new Error('Wallet group not found');

    const secret = this.decryptSecret(group.encryptedSecret);

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
    await SecureStore.deleteItemAsync(PIN_VERIFIER_KEY);
    await SecureStore.deleteItemAsync(DEVICE_SECRET_KEY, DEVICE_SECRET_STORE_OPTIONS);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);

    this.walletGroups = [];
    this.activeGroupId = null;
    this.activeWalletIndex = 0;
    this.currentWallet = null;
    this.clearKeys();
  }

  lockWallet(): void {
    this.currentWallet = null;
    this.clearKeys();
  }

  isUnlocked(): boolean {
    return this.currentWallet !== null && this.sessionKey !== null;
  }
}

export const secureWallet = new SecureWalletService();
