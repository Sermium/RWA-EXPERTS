// app/wallet/manage.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAccount } from '../../contexts/AccountContext';
import { WalletInfo } from '../../lib/account/types';

type ModalType = 'none' | 'create' | 'import' | 'connect' | 'rename' | 'details';

export default function WalletManageScreen() {
  const router = useRouter();
  const {
    wallets,
    activeWallet,
    createWallet,
    importWallet,
    connectExternalWallet,
    removeWallet,
    setActiveWallet,
    renameWallet,
    shortenAddress,
    getWalletBalance,
    exportMnemonic,
  } = useAccount();

  const [modalType, setModalType] = useState<ModalType>('none');
  const [selectedWallet, setSelectedWallet] = useState<WalletInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [walletName, setWalletName] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [externalAddress, setExternalAddress] = useState('');
  const [pin, setPin] = useState('');
  const [walletBalances, setWalletBalances] = useState<{ [key: string]: string }>({});

  // Load balances
  React.useEffect(() => {
    loadAllBalances();
  }, [wallets]);

  const loadAllBalances = async () => {
    const balances: { [key: string]: string } = {};
    for (const wallet of wallets) {
      balances[wallet.id] = await getWalletBalance(wallet.address);
    }
    setWalletBalances(balances);
  };

  const handleCreateWallet = async () => {
    if (!walletName.trim()) {
      Alert.alert('Error', 'Please enter a wallet name');
      return;
    }
    if (pin.length < 6) {
      Alert.alert('Error', 'Please enter your 6-digit PIN');
      return;
    }

    setIsLoading(true);
    try {
      await createWallet(pin, { name: walletName.trim() });
      setModalType('none');
      resetForm();
      Alert.alert('Success', 'Wallet created successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportWallet = async () => {
    if (!walletName.trim()) {
      Alert.alert('Error', 'Please enter a wallet name');
      return;
    }
    if (!mnemonic.trim()) {
      Alert.alert('Error', 'Please enter your recovery phrase');
      return;
    }
    if (pin.length < 6) {
      Alert.alert('Error', 'Please enter your 6-digit PIN');
      return;
    }

    setIsLoading(true);
    try {
      await importWallet(pin, { name: walletName.trim(), mnemonic: mnemonic.trim() });
      setModalType('none');
      resetForm();
      Alert.alert('Success', 'Wallet imported successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectExternal = async () => {
    if (!walletName.trim()) {
      Alert.alert('Error', 'Please enter a wallet name');
      return;
    }
    if (!externalAddress.trim()) {
      Alert.alert('Error', 'Please enter the wallet address');
      return;
    }

    setIsLoading(true);
    try {
      await connectExternalWallet({ name: walletName.trim(), address: externalAddress.trim() });
      setModalType('none');
      resetForm();
      Alert.alert('Success', 'Wallet connected successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameWallet = async () => {
    if (!selectedWallet || !walletName.trim()) return;

    setIsLoading(true);
    try {
      await renameWallet(selectedWallet.id, walletName.trim());
      setModalType('none');
      resetForm();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveWallet = (wallet: WalletInfo) => {
    Alert.alert(
      'Remove Wallet',
      `Are you sure you want to remove "${wallet.name}"? ${wallet.hasStoredKeys ? 'Make sure you have backed up your recovery phrase!' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeWallet(wallet.id);
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleSetActive = async (wallet: WalletInfo) => {
    try {
      await setActiveWallet(wallet.id);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleExportMnemonic = async () => {
    if (!selectedWallet || pin.length < 6) {
      Alert.alert('Error', 'Please enter your PIN');
      return;
    }

    setIsLoading(true);
    try {
      const phrase = await exportMnemonic(selectedWallet.id, pin);
      Alert.alert(
        'Recovery Phrase',
        phrase,
        [{ text: 'OK' }]
      );
      setModalType('none');
      resetForm();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setWalletName('');
    setMnemonic('');
    setExternalAddress('');
    setPin('');
    setSelectedWallet(null);
  };

  const openRenameModal = (wallet: WalletInfo) => {
    setSelectedWallet(wallet);
    setWalletName(wallet.name);
    setModalType('rename');
  };

  const openDetailsModal = (wallet: WalletInfo) => {
    setSelectedWallet(wallet);
    setPin('');
    setModalType('details');
  };

  const getWalletIcon = (type: WalletInfo['type']) => {
    switch (type) {
      case 'created':
        return 'add-circle';
      case 'imported':
        return 'download';
      case 'external':
        return 'link';
      case 'hardware':
        return 'hardware-chip';
      default:
        return 'wallet';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Wallets</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Wallet List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Wallets ({wallets.length})</Text>

          {wallets.map((wallet) => (
            <TouchableOpacity
              key={wallet.id}
              style={[
                styles.walletCard,
                wallet.id === activeWallet?.id && styles.walletCardActive,
              ]}
              onPress={() => handleSetActive(wallet)}
              onLongPress={() => openDetailsModal(wallet)}
            >
              <View style={styles.walletCardLeft}>
                <View style={[styles.walletIcon, wallet.id === activeWallet?.id && styles.walletIconActive]}>
                  <Ionicons
                    name={getWalletIcon(wallet.type)}
                    size={20}
                    color={wallet.id === activeWallet?.id ? '#6366f1' : '#9ca3af'}
                  />
                </View>
                <View style={styles.walletInfo}>
                  <View style={styles.walletNameRow}>
                    <Text style={styles.walletName}>{wallet.name}</Text>
                    {wallet.id === activeWallet?.id && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.walletAddress}>{shortenAddress(wallet.address)}</Text>
                  <Text style={styles.walletBalance}>
                    {parseFloat(walletBalances[wallet.id] || '0').toFixed(4)} POL
                  </Text>
                </View>
              </View>

              <View style={styles.walletActions}>
                <TouchableOpacity
                  style={styles.walletActionBtn}
                  onPress={() => openRenameModal(wallet)}
                >
                  <Ionicons name="pencil" size={16} color="#9ca3af" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.walletActionBtn}
                  onPress={() => handleRemoveWallet(wallet)}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}

          {wallets.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color="#374151" />
              <Text style={styles.emptyText}>No wallets yet</Text>
              <Text style={styles.emptySubtext}>Create or import a wallet to get started</Text>
            </View>
          )}
        </View>

        {/* Add Wallet Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Wallet</Text>

          <TouchableOpacity
            style={styles.addOption}
            onPress={() => setModalType('create')}
          >
            <View style={[styles.addOptionIcon, { backgroundColor: '#6366f120' }]}>
              <Ionicons name="add-circle" size={24} color="#6366f1" />
            </View>
            <View style={styles.addOptionText}>
              <Text style={styles.addOptionTitle}>Create New Wallet</Text>
              <Text style={styles.addOptionSubtitle}>Generate a new wallet with recovery phrase</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addOption}
            onPress={() => setModalType('import')}
          >
            <View style={[styles.addOptionIcon, { backgroundColor: '#10b98120' }]}>
              <Ionicons name="download" size={24} color="#10b981" />
            </View>
            <View style={styles.addOptionText}>
              <Text style={styles.addOptionTitle}>Import Wallet</Text>
              <Text style={styles.addOptionSubtitle}>Restore using 12 or 24 word phrase</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addOption}
            onPress={() => setModalType('connect')}
          >
            <View style={[styles.addOptionIcon, { backgroundColor: '#f59e0b20' }]}>
              <Ionicons name="link" size={24} color="#f59e0b" />
            </View>
            <View style={styles.addOptionText}>
              <Text style={styles.addOptionTitle}>Connect External Wallet</Text>
              <Text style={styles.addOptionSubtitle}>Watch-only wallet for tracking</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Wallet Modal */}
      <Modal visible={modalType === 'create'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Wallet</Text>
              <TouchableOpacity onPress={() => { setModalType('none'); resetForm(); }}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Wallet Name (e.g., Main Wallet)"
              placeholderTextColor="#6b7280"
              value={walletName}
              onChangeText={setWalletName}
            />

            <TextInput
              style={styles.input}
              placeholder="Enter your 6-digit PIN"
              placeholderTextColor="#6b7280"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />

            <TouchableOpacity
              style={[styles.modalButton, isLoading && styles.modalButtonDisabled]}
              onPress={handleCreateWallet}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Create Wallet</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Import Wallet Modal */}
      <Modal visible={modalType === 'import'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Import Wallet</Text>
              <TouchableOpacity onPress={() => { setModalType('none'); resetForm(); }}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Wallet Name"
              placeholderTextColor="#6b7280"
              value={walletName}
              onChangeText={setWalletName}
            />

            <TextInput
              style={[styles.input, styles.mnemonicInput]}
              placeholder="Enter your 12 or 24 word recovery phrase"
              placeholderTextColor="#6b7280"
              value={mnemonic}
              onChangeText={setMnemonic}
              multiline
              numberOfLines={3}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Enter your 6-digit PIN"
              placeholderTextColor="#6b7280"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />

            <TouchableOpacity
              style={[styles.modalButton, isLoading && styles.modalButtonDisabled]}
              onPress={handleImportWallet}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Import Wallet</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Connect External Wallet Modal */}
      <Modal visible={modalType === 'connect'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connect External Wallet</Text>
              <TouchableOpacity onPress={() => { setModalType('none'); resetForm(); }}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Add a watch-only wallet to track its balance. You won't be able to sign transactions.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Wallet Name"
              placeholderTextColor="#6b7280"
              value={walletName}
              onChangeText={setWalletName}
            />

            <TextInput
              style={styles.input}
              placeholder="Wallet Address (0x...)"
              placeholderTextColor="#6b7280"
              value={externalAddress}
              onChangeText={setExternalAddress}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.modalButton, isLoading && styles.modalButtonDisabled]}
              onPress={handleConnectExternal}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Connect Wallet</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rename Wallet Modal */}
      <Modal visible={modalType === 'rename'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rename Wallet</Text>
              <TouchableOpacity onPress={() => { setModalType('none'); resetForm(); }}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="New Wallet Name"
              placeholderTextColor="#6b7280"
              value={walletName}
              onChangeText={setWalletName}
            />

            <TouchableOpacity
              style={[styles.modalButton, isLoading && styles.modalButtonDisabled]}
              onPress={handleRenameWallet}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Wallet Details Modal */}
      <Modal visible={modalType === 'details'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedWallet?.name}</Text>
              <TouchableOpacity onPress={() => { setModalType('none'); resetForm(); }}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{selectedWallet?.address}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{selectedWallet?.type}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>
                {selectedWallet?.createdAt ? new Date(selectedWallet.createdAt).toLocaleDateString() : '-'}
              </Text>
            </View>

            {selectedWallet?.hasStoredKeys && (
              <>
                <View style={styles.divider} />
                <Text style={styles.modalSubtitle}>Export Recovery Phrase</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your 6-digit PIN"
                  placeholderTextColor="#6b7280"
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                />
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonWarning, isLoading && styles.modalButtonDisabled]}
                  onPress={handleExportMnemonic}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonText}>Show Recovery Phrase</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  walletCardActive: {
    borderColor: '#6366f1',
    backgroundColor: '#1e1b4b',
  },
  walletCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletIconActive: {
    backgroundColor: '#6366f130',
  },
  walletInfo: {
    flex: 1,
  },
  walletNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  activeBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  walletAddress: {
    fontSize: 13,
    color: '#9ca3af',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  walletBalance: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginTop: 4,
  },
  walletActions: {
    flexDirection: 'row',
    gap: 8,
  },
  walletActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 4,
  },
  addOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  addOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addOptionText: {
    flex: 1,
  },
  addOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  addOptionSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  mnemonicInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonDisabled: {
    backgroundColor: '#4b5563',
  },
  modalButtonWarning: {
    backgroundColor: '#f59e0b',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  detailRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  detailLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 16,
  },
});
