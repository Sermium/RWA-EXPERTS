// components/WalletSwitcher.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useWallet } from '../contexts/WalletContext';
import CustomAlert from './CustomAlert';

const NETWORK_CONFIG: Record<string, { icon: string; color: string }> = {
  avalancheFuji: { icon: '🔺', color: '#E84142' },
  avalanche: { icon: '🔺', color: '#E84142' },
  polygonAmoy: { icon: '🟣', color: '#8247E5' },
  polygon: { icon: '🟣', color: '#8247E5' },
  ethereum: { icon: '🔷', color: '#627EEA' },
  sepolia: { icon: '🔷', color: '#627EEA' },
  base: { icon: '🔵', color: '#0052FF' },
  arbitrum: { icon: '🔹', color: '#28A0F0' },
  optimism: { icon: '🔴', color: '#FF0420' },
  bsc: { icon: '🟡', color: '#F0B90B' },
};

type ViewMode = 'main' | 'add-wallet' | 'create-wallet' | 'import-seed' | 'import-key' | 'show-mnemonic' | 'select-network' | 'derive-account';

export default function WalletSwitcher() {
  const router = useRouter();
  const {
    address,
    hasWallet,
    networkName,
    isTestnet,
    currentNetwork,
    seedGroups,
    importedWallets,
    activeAddress,
    switchToWallet,
    createNewWallet,
    importWalletFromSeed,
    importWalletFromPrivateKey,
    deriveNewAccount,
    switchNetwork,
    getAvailableNetworks,
    shortenAddress,
    refreshWallets,
  } = useWallet();

  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [slideAnim] = useState(new Animated.Value(-300));
  const [fadeAnim] = useState(new Animated.Value(0));

  // Form states
  const [walletName, setWalletName] = useState('');
  const [importMnemonic, setImportMnemonic] = useState('');
  const [importPrivateKey, setImportPrivateKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // New wallet mnemonic
  const [newWalletMnemonic, setNewWalletMnemonic] = useState('');
  const [showMnemonicRevealed, setShowMnemonicRevealed] = useState(false);

  // Copy state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

  useEffect(() => {
    if (isOpen) {
      refreshWallets();
    }
  }, [isOpen, refreshWallets]);

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  const resetForm = () => {
    setWalletName('');
    setImportMnemonic('');
    setImportPrivateKey('');
    setNewWalletMnemonic('');
    setShowMnemonicRevealed(false);
    setSelectedGroupId(null);
  };

  const openDropdown = () => {
    setIsOpen(true);
    setViewMode('main');
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const closeDropdown = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -300, duration: 250, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setIsOpen(false);
      setViewMode('main');
      resetForm();
    });
  };

  // Switch wallet - NO PIN required
  const handleSelectWallet = async (walletAddress: string) => {
    try {
      await switchToWallet(walletAddress);
      closeDropdown();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to switch wallet', 'error');
    }
  };

  const handleSelectNetwork = async (networkKey: string) => {
    try {
      await switchNetwork(networkKey);
      setViewMode('main');
    } catch (error) {
      showAlert('Error', 'Failed to switch network', 'error');
    }
  };

  // Create new wallet
  const handleCreateNewWallet = async () => {
    if (!walletName.trim()) {
      showAlert('Error', 'Please enter a wallet name', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await createNewWallet(walletName.trim());
      setNewWalletMnemonic(result.mnemonic);
      setViewMode('show-mnemonic');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to create wallet', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // After showing mnemonic
  const handleMnemonicSaved = () => {
    resetForm();
    setViewMode('main');
    showAlert('Success', 'Wallet created! Make sure you saved your recovery phrase.', 'success');
  };

  // Import from seed
  const handleImportFromSeed = async () => {
    if (!walletName.trim()) {
      showAlert('Error', 'Please enter a wallet name', 'error');
      return;
    }
    if (!importMnemonic.trim()) {
      showAlert('Error', 'Please enter your recovery phrase', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await importWalletFromSeed(importMnemonic.trim(), walletName.trim());
      resetForm();
      setViewMode('main');
      showAlert('Success', 'Wallet imported!', 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to import wallet', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Import from private key
  const handleImportFromPrivateKey = async () => {
    if (!walletName.trim()) {
      showAlert('Error', 'Please enter a wallet name', 'error');
      return;
    }
    if (!importPrivateKey.trim()) {
      showAlert('Error', 'Please enter your private key', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await importWalletFromPrivateKey(importPrivateKey.trim(), walletName.trim());
      resetForm();
      setViewMode('main');
      showAlert('Success', 'Wallet imported!', 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to import wallet', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Derive new account in a seed group
  const handleDeriveAccount = async () => {
    if (!walletName.trim()) {
      showAlert('Error', 'Please enter an account name', 'error');
      return;
    }
    if (!selectedGroupId) {
      showAlert('Error', 'No wallet group selected', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await deriveNewAccount(selectedGroupId, walletName.trim());
      resetForm();
      setViewMode('main');
      showAlert('Success', 'Account created!', 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to create account', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSettings = () => {
    closeDropdown();
    router.push('/wallet/settings');
  };

  const openDeriveAccount = (groupId: string) => {
    setSelectedGroupId(groupId);
    setWalletName('');
    setViewMode('derive-account');
  };

  const networkConfig = currentNetwork ? NETWORK_CONFIG[currentNetwork.key] || NETWORK_CONFIG.ethereum : NETWORK_CONFIG.ethereum;
  const networks = getAvailableNetworks() || [];
  const mainnets = networks.filter((n) => !n.isTestnet);
  const testnets = networks.filter((n) => n.isTestnet);

  if (!hasWallet) {
    return (
      <TouchableOpacity style={styles.triggerNoWallet} onPress={() => router.push('/wallet/create')}>
        <Ionicons name="wallet-outline" size={20} color="#9CA3AF" />
        <Text style={styles.triggerTextNoWallet}>Create Wallet</Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={[{ text: 'OK' }]}
        onClose={() => setAlertVisible(false)}
      />

      {/* Trigger Button */}
      <View style={styles.triggerContainer}>
        <TouchableOpacity style={styles.trigger} onPress={openDropdown}>
          <View style={styles.triggerLeft}>
            <Text style={styles.networkIcon}>{networkConfig.icon}</Text>
            <View>
              <Text style={styles.triggerWalletName}>
                {seedGroups.find((g) => g.wallets.some((w) => w.address === activeAddress))?.wallets.find((w) => w.address === activeAddress)?.name ||
                  importedWallets.find((w) => w.address === activeAddress)?.name ||
                  'Wallet'}
              </Text>
              <Text style={styles.triggerAddress}>{address ? shortenAddress(address) : ''}</Text>
            </View>
          </View>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        {address && (
          <TouchableOpacity style={styles.copyButton} onPress={() => copyToClipboard(address)}>
            <Ionicons
              name={copiedText === address ? 'checkmark' : 'copy-outline'}
              size={18}
              color={copiedText === address ? '#10B981' : '#9CA3AF'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Modal */}
      <Modal visible={isOpen} transparent animationType="none">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeDropdown}>
          <Animated.View style={[styles.dropdown, { transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
            <TouchableOpacity activeOpacity={1}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <Ionicons name="wallet" size={24} color="#6366f1" />
                </View>
                <Text style={styles.headerTitle}>Wallets</Text>
                <TouchableOpacity onPress={closeDropdown} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* Main View */}
              {viewMode === 'main' && (
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                  {/* Network Selector */}
                  <TouchableOpacity style={styles.networkSelector} onPress={() => setViewMode('select-network')}>
                    <View style={styles.networkSelectorLeft}>
                      <Text style={styles.networkIconLarge}>{networkConfig.icon}</Text>
                      <View>
                        <Text style={styles.networkNameText}>{networkName}</Text>
                        {isTestnet && <Text style={styles.testnetBadge}>Testnet</Text>}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>

                  {/* Seed Groups */}
                  {seedGroups.map(({ group, wallets }) => (
                    <View key={group.id} style={styles.walletGroup}>
                      <View style={styles.groupHeader}>
                        <Ionicons name="key-outline" size={16} color="#6366f1" />
                        <Text style={styles.groupName}>{group.name}</Text>
                      </View>

                      {wallets.map((wallet) => (
                        <TouchableOpacity
                          key={wallet.address}
                          style={[styles.walletItem, wallet.address === activeAddress && styles.walletItemActive]}
                          onPress={() => handleSelectWallet(wallet.address)}
                        >
                          <View style={styles.walletIcon}>
                            <Text style={styles.walletIconText}>{wallet.name.charAt(0).toUpperCase()}</Text>
                          </View>
                          <View style={styles.walletInfo}>
                            <Text style={styles.walletName}>{wallet.name}</Text>
                            <TouchableOpacity style={styles.addressRow} onPress={() => copyToClipboard(wallet.address)}>
                              <Text style={styles.walletAddress}>{shortenAddress(wallet.address)}</Text>
                              <Ionicons
                                name={copiedText === wallet.address ? 'checkmark' : 'copy-outline'}
                                size={14}
                                color={copiedText === wallet.address ? '#10B981' : '#6B7280'}
                              />
                            </TouchableOpacity>
                          </View>
                          {wallet.address === activeAddress && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                        </TouchableOpacity>
                      ))}

                      {/* Add Account Button */}
                      <TouchableOpacity style={styles.addAccountButton} onPress={() => openDeriveAccount(group.id)}>
                        <Ionicons name="add" size={18} color="#6366f1" />
                        <Text style={styles.addAccountText}>Add Account</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Imported Wallets */}
                  {importedWallets.length > 0 && (
                    <View style={styles.walletGroup}>
                      <View style={styles.groupHeader}>
                        <Ionicons name="download-outline" size={16} color="#9CA3AF" />
                        <Text style={styles.groupName}>Imported</Text>
                      </View>

                      {importedWallets.map((wallet) => (
                        <TouchableOpacity
                          key={wallet.address}
                          style={[styles.walletItem, wallet.address === activeAddress && styles.walletItemActive]}
                          onPress={() => handleSelectWallet(wallet.address)}
                        >
                          <View style={[styles.walletIcon, { backgroundColor: '#9CA3AF' }]}>
                            <Text style={styles.walletIconText}>{wallet.name.charAt(0).toUpperCase()}</Text>
                          </View>
                          <View style={styles.walletInfo}>
                            <Text style={styles.walletName}>{wallet.name}</Text>
                            <TouchableOpacity style={styles.addressRow} onPress={() => copyToClipboard(wallet.address)}>
                              <Text style={styles.walletAddress}>{shortenAddress(wallet.address)}</Text>
                              <Ionicons
                                name={copiedText === wallet.address ? 'checkmark' : 'copy-outline'}
                                size={14}
                                color={copiedText === wallet.address ? '#10B981' : '#6B7280'}
                              />
                            </TouchableOpacity>
                          </View>
                          {wallet.address === activeAddress && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleSettings}>
                      <Ionicons name="settings-outline" size={20} color="#9CA3AF" />
                      <Text style={styles.actionText}>Settings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setViewMode('add-wallet')}>
                      <Ionicons name="add-circle-outline" size={20} color="#6366f1" />
                      <Text style={[styles.actionText, { color: '#6366f1' }]}>Add Wallet</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}

              {/* Add Wallet Options */}
              {viewMode === 'add-wallet' && (
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                  <TouchableOpacity style={styles.backButton} onPress={() => setViewMode('main')}>
                    <Ionicons name="arrow-back" size={20} color="#9CA3AF" />
                    <Text style={styles.backText}>Back</Text>
                  </TouchableOpacity>

                  <Text style={styles.sectionTitle}>Add Wallet</Text>

                  <TouchableOpacity style={styles.addOption} onPress={() => setViewMode('create-wallet')}>
                    <View style={[styles.addOptionIcon, { backgroundColor: '#10B98120' }]}>
                      <Ionicons name="add-circle-outline" size={24} color="#10B981" />
                    </View>
                    <View style={styles.addOptionInfo}>
                      <Text style={styles.addOptionTitle}>Create New Wallet</Text>
                      <Text style={styles.addOptionDesc}>Generate with new seed phrase</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.addOption} onPress={() => setViewMode('import-seed')}>
                    <View style={[styles.addOptionIcon, { backgroundColor: '#F5940020' }]}>
                      <Ionicons name="document-text-outline" size={24} color="#F59400" />
                    </View>
                    <View style={styles.addOptionInfo}>
                      <Text style={styles.addOptionTitle}>Import Seed Phrase</Text>
                      <Text style={styles.addOptionDesc}>Restore with 12/24 words</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.addOption} onPress={() => setViewMode('import-key')}>
                    <View style={[styles.addOptionIcon, { backgroundColor: '#EC489920' }]}>
                      <Ionicons name="key-outline" size={24} color="#EC4899" />
                    </View>
                    <View style={styles.addOptionInfo}>
                      <Text style={styles.addOptionTitle}>Import Private Key</Text>
                      <Text style={styles.addOptionDesc}>Import with private key</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </ScrollView>
              )}

              {/* Create New Wallet */}
              {viewMode === 'create-wallet' && (
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                  <TouchableOpacity style={styles.backButton} onPress={() => { setViewMode('add-wallet'); resetForm(); }}>
                    <Ionicons name="arrow-back" size={20} color="#9CA3AF" />
                    <Text style={styles.backText}>Back</Text>
                  </TouchableOpacity>

                  <Text style={styles.sectionTitle}>Create New Wallet</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Wallet Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={walletName}
                      onChangeText={setWalletName}
                      placeholder="e.g., Main, Trading, Savings"
                      placeholderTextColor="#6B7280"
                      autoCapitalize="words"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, (!walletName.trim() || isProcessing) && styles.submitButtonDisabled]}
                    onPress={handleCreateNewWallet}
                    disabled={!walletName.trim() || isProcessing}
                  >
                    {isProcessing ? <ActivityIndicator color="#FFF" /> : (
                      <>
                        <Ionicons name="add-circle" size={20} color="#FFF" />
                        <Text style={styles.submitButtonText}>Create Wallet</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              )}

              {/* Show Mnemonic */}
              {viewMode === 'show-mnemonic' && (
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                  <View style={styles.mnemonicHeader}>
                    <View style={styles.iconCircle}>
                      <Ionicons name="key" size={32} color="#f59e0b" />
                    </View>
                    <Text style={styles.mnemonicTitle}>Save Recovery Phrase</Text>
                    <Text style={styles.mnemonicSubtitle}>Write down these 12 words. This is the ONLY way to recover this wallet.</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.mnemonicBox}
                    onPress={() => setShowMnemonicRevealed(!showMnemonicRevealed)}
                    activeOpacity={0.8}
                  >
                    {showMnemonicRevealed ? (
                      <View style={styles.mnemonicGrid}>
                        {newWalletMnemonic.split(' ').map((word, index) => (
                          <View key={index} style={styles.wordItem}>
                            <Text style={styles.wordNumber}>{index + 1}.</Text>
                            <Text style={styles.wordText}>{word}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.hiddenMnemonic}>
                        <Ionicons name="eye-off" size={32} color="#6b7280" />
                        <Text style={styles.hiddenText}>Tap to reveal</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {showMnemonicRevealed && (
                    <TouchableOpacity style={styles.copyMnemonicButton} onPress={() => copyToClipboard(newWalletMnemonic)}>
                      <Ionicons name={copiedText === newWalletMnemonic ? 'checkmark' : 'copy-outline'} size={18} color="#6366f1" />
                      <Text style={styles.copyMnemonicText}>{copiedText === newWalletMnemonic ? 'Copied!' : 'Copy'}</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.warningBox}>
                    <Ionicons name="warning" size={20} color="#F59400" />
                    <Text style={styles.warningText}>Never share your recovery phrase with anyone.</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, !showMnemonicRevealed && styles.submitButtonDisabled]}
                    onPress={handleMnemonicSaved}
                    disabled={!showMnemonicRevealed}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.submitButtonText}>I've Saved It</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}

              {/* Derive Account */}
              {viewMode === 'derive-account' && (
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                  <TouchableOpacity style={styles.backButton} onPress={() => { setViewMode('main'); resetForm(); }}>
                    <Ionicons name="arrow-back" size={20} color="#9CA3AF" />
                    <Text style={styles.backText}>Back</Text>
                  </TouchableOpacity>

                  <Text style={styles.sectionTitle}>Add Account</Text>
                  <Text style={styles.sectionSubtitle}>Create a new account from this wallet's seed phrase</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Account Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={walletName}
                      onChangeText={setWalletName}
                      placeholder="e.g., Trading, Savings"
                      placeholderTextColor="#6B7280"
                      autoCapitalize="words"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, (!walletName.trim() || isProcessing) && styles.submitButtonDisabled]}
                    onPress={handleDeriveAccount}
                    disabled={!walletName.trim() || isProcessing}
                  >
                    {isProcessing ? <ActivityIndicator color="#FFF" /> : (
                      <>
                        <Ionicons name="add-circle" size={20} color="#FFF" />
                        <Text style={styles.submitButtonText}>Add Account</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              )}

              {/* Import Seed */}
              {viewMode === 'import-seed' && (
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                  <TouchableOpacity style={styles.backButton} onPress={() => { setViewMode('add-wallet'); resetForm(); }}>
                    <Ionicons name="arrow-back" size={20} color="#9CA3AF" />
                    <Text style={styles.backText}>Back</Text>
                  </TouchableOpacity>

                  <Text style={styles.sectionTitle}>Import Seed Phrase</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Wallet Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={walletName}
                      onChangeText={setWalletName}
                      placeholder="e.g., Imported Wallet"
                      placeholderTextColor="#6B7280"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Recovery Phrase</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={importMnemonic}
                      onChangeText={setImportMnemonic}
                      placeholder="Enter 12 or 24 words"
                      placeholderTextColor="#6B7280"
                      multiline
                      numberOfLines={4}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, (!walletName.trim() || !importMnemonic.trim() || isProcessing) && styles.submitButtonDisabled]}
                    onPress={handleImportFromSeed}
                    disabled={!walletName.trim() || !importMnemonic.trim() || isProcessing}
                  >
                    {isProcessing ? <ActivityIndicator color="#FFF" /> : (
                      <>
                        <Ionicons name="download" size={20} color="#FFF" />
                        <Text style={styles.submitButtonText}>Import</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              )}

              {/* Import Private Key */}
              {viewMode === 'import-key' && (
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                  <TouchableOpacity style={styles.backButton} onPress={() => { setViewMode('add-wallet'); resetForm(); }}>
                    <Ionicons name="arrow-back" size={20} color="#9CA3AF" />
                    <Text style={styles.backText}>Back</Text>
                  </TouchableOpacity>

                  <Text style={styles.sectionTitle}>Import Private Key</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Wallet Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={walletName}
                      onChangeText={setWalletName}
                      placeholder="e.g., External Wallet"
                      placeholderTextColor="#6B7280"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Private Key</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={importPrivateKey}
                      onChangeText={setImportPrivateKey}
                      placeholder="Enter private key"
                      placeholderTextColor="#6B7280"
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, (!walletName.trim() || !importPrivateKey.trim() || isProcessing) && styles.submitButtonDisabled]}
                    onPress={handleImportFromPrivateKey}
                    disabled={!walletName.trim() || !importPrivateKey.trim() || isProcessing}
                  >
                    {isProcessing ? <ActivityIndicator color="#FFF" /> : (
                      <>
                        <Ionicons name="download" size={20} color="#FFF" />
                        <Text style={styles.submitButtonText}>Import</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              )}

              {/* Network Selection */}
              {viewMode === 'select-network' && (
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                  <TouchableOpacity style={styles.backButton} onPress={() => setViewMode('main')}>
                    <Ionicons name="arrow-back" size={20} color="#9CA3AF" />
                    <Text style={styles.backText}>Back</Text>
                  </TouchableOpacity>

                  <Text style={styles.sectionTitle}>Mainnets</Text>
                  {mainnets.map((network) => {
                    const config = NETWORK_CONFIG[network.key] || NETWORK_CONFIG.ethereum;
                    const isSelected = currentNetwork?.key === network.key;
                    return (
                      <TouchableOpacity
                        key={network.key}
                        style={[styles.networkItem, isSelected && styles.networkItemSelected]}
                        onPress={() => handleSelectNetwork(network.key)}
                      >
                        <Text style={styles.networkItemIcon}>{config.icon}</Text>
                        <View style={styles.networkItemInfo}>
                          <Text style={styles.networkItemName}>{network.name}</Text>
                          <Text style={styles.networkItemSymbol}>{network.symbol}</Text>
                        </View>
                        {isSelected && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                      </TouchableOpacity>
                    );
                  })}

                  {testnets.length > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Testnets</Text>
                      {testnets.map((network) => {
                        const config = NETWORK_CONFIG[network.key] || NETWORK_CONFIG.ethereum;
                        const isSelected = currentNetwork?.key === network.key;
                        return (
                          <TouchableOpacity
                            key={network.key}
                            style={[styles.networkItem, isSelected && styles.networkItemSelected]}
                            onPress={() => handleSelectNetwork(network.key)}
                          >
                            <Text style={styles.networkItemIcon}>{config.icon}</Text>
                            <View style={styles.networkItemInfo}>
                              <Text style={styles.networkItemName}>{network.name}</Text>
                              <Text style={styles.networkItemSymbol}>{network.symbol}</Text>
                            </View>
                            {isSelected && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  )}
                </ScrollView>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1F2937', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flex: 1 },
  triggerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  triggerNoWallet: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F2937', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flex: 1, gap: 8 },
  triggerTextNoWallet: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
  copyButton: { padding: 12, backgroundColor: '#1F2937', borderRadius: 12 },
  networkIcon: { fontSize: 20 },
  networkIconLarge: { fontSize: 24 },
  triggerWalletName: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  triggerAddress: { color: '#9CA3AF', fontSize: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)' },
  dropdown: { backgroundColor: '#111827', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, maxHeight: '85%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  logoContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', flex: 1, marginLeft: 12 },
  closeButton: { padding: 4 },
  scrollView: { maxHeight: 500 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  networkSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1F2937', borderRadius: 12, padding: 12, marginBottom: 16 },
  networkSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  networkNameText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  testnetBadge: { color: '#F59400', fontSize: 10, fontWeight: '600', marginTop: 2 },
  
  // Wallet Groups
  walletGroup: { backgroundColor: '#1F2937', borderRadius: 16, padding: 12, marginBottom: 12 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 4 },
  groupName: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  
  walletItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 8 },
  walletItemActive: { borderWidth: 1, borderColor: '#6366f1' },
  walletIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  walletIconText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  walletInfo: { flex: 1 },
  walletName: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  walletAddress: { color: '#9CA3AF', fontSize: 12 },
  
  addAccountButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#374151', borderStyle: 'dashed' },
  addAccountText: { color: '#6366f1', fontSize: 13, fontWeight: '500' },

  // Actions
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 12 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: '#1F2937', borderRadius: 12 },
  actionText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },

  // Back button
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backText: { color: '#9CA3AF', fontSize: 14 },

  // Section
  sectionTitle: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12 },
  sectionSubtitle: { color: '#6B7280', fontSize: 14, marginBottom: 16, marginTop: -8 },

  // Add Options
  addOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 12 },
  addOptionIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  addOptionInfo: { flex: 1 },
  addOptionTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  addOptionDesc: { color: '#9CA3AF', fontSize: 12 },

  // Form
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  textInput: { backgroundColor: '#1F2937', borderRadius: 12, padding: 16, color: '#FFF', fontSize: 16, borderWidth: 1, borderColor: '#374151' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366f1', borderRadius: 12, padding: 16, gap: 8, marginTop: 8 },
  submitButtonDisabled: { backgroundColor: '#4B5563' },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Warning
  warningBox: { flexDirection: 'row', backgroundColor: '#78350f', padding: 12, borderRadius: 10, gap: 10, alignItems: 'center', marginBottom: 16 },
  warningText: { flex: 1, color: '#fcd34d', fontSize: 13, lineHeight: 18 },

  // Mnemonic
  mnemonicHeader: { alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#78350f', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  mnemonicTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  mnemonicSubtitle: { color: '#9ca3af', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  mnemonicBox: { backgroundColor: '#1f2937', borderRadius: 16, padding: 20, marginBottom: 16, minHeight: 160 },
  mnemonicGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  wordItem: { width: '48%', flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#111827', borderRadius: 8, marginBottom: 8 },
  wordNumber: { color: '#6b7280', fontSize: 12, marginRight: 8, width: 24 },
  wordText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  hiddenMnemonic: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  hiddenText: { color: '#9ca3af', fontSize: 16, marginTop: 12 },
  copyMnemonicButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, marginBottom: 16 },
  copyMnemonicText: { color: '#6366f1', fontSize: 14, fontWeight: '500' },

  // Network Items
  networkItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F2937', borderRadius: 12, padding: 12, marginBottom: 8 },
  networkItemSelected: { borderWidth: 1, borderColor: '#10B981' },
  networkItemIcon: { fontSize: 24, marginRight: 12 },
  networkItemInfo: { flex: 1 },
  networkItemName: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  networkItemSymbol: { color: '#9CA3AF', fontSize: 12 },
});
