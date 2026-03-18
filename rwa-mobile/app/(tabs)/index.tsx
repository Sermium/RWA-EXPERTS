// app/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useWallet } from '../../contexts/WalletContext';
import AppHeader from '../../components/AppHeader';
import CustomAlert from '../../components/CustomAlert';

// Mock assets data - replace with real data later
const MOCK_ASSETS = [
  {
    id: '1',
    name: 'Alpine Resort Properties',
    type: 'Real Estate',
    icon: '🏔️',
    invested: 5000,
    currentValue: 5750,
    roi: 15.0,
    change24h: 2.3,
  },
  {
    id: '2',
    name: 'Avalanche Validator Node',
    type: 'Infrastructure',
    icon: '🔺',
    invested: 2500,
    currentValue: 2890,
    roi: 15.6,
    change24h: 1.8,
  },
  {
    id: '3',
    name: 'DeFi Yield Aggregator',
    type: 'DeFi',
    icon: '💎',
    invested: 1000,
    currentValue: 1320,
    roi: 32.0,
    change24h: -0.5,
  },
  {
    id: '4',
    name: 'Renewable Energy Credits',
    type: 'Green Assets',
    icon: '🌲',
    invested: 3000,
    currentValue: 3240,
    roi: 8.0,
    change24h: 0.4,
  },
  {
    id: '5',
    name: 'Tokenized Gold Reserve',
    type: 'Commodities',
    icon: '🥇',
    invested: 2000,
    currentValue: 2150,
    roi: 7.5,
    change24h: 0.2,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const {
    address,
    balance,
    hasWallet,
    networkSymbol,
    networkName,
    isTestnet,
    refreshBalance,
    shortenAddress,
  } = useWallet();

  const [refreshing, setRefreshing] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
  });

  // Calculate totals from assets
  const totalInvested = MOCK_ASSETS.reduce((sum, asset) => sum + asset.invested, 0);
  const totalValue = MOCK_ASSETS.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalROI = ((totalValue - totalInvested) / totalInvested) * 100;

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  };

  const copyAddress = async () => {
    if (address) {
      await Clipboard.setStringAsync(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  return (
    <View style={styles.container}>
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertVisible(false)}
      />

      <AppHeader showLogo={false} showNotifications={true} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
        showsVerticalScrollIndicator={false}
      >
        {hasWallet ? (
          <>
            {/* Wallet Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Wallet Balance</Text>
                {isTestnet && (
                  <View style={styles.testnetBadge}>
                    <Text style={styles.testnetText}>Testnet</Text>
                  </View>
                )}
              </View>
              <Text style={styles.balanceAmount}>
                {parseFloat(balance).toFixed(4)}
                <Text style={styles.balanceSymbol}> {networkSymbol}</Text>
              </Text>
              <TouchableOpacity style={styles.addressRow} onPress={copyAddress}>
                <Text style={styles.addressText}>{address ? shortenAddress(address) : ''}</Text>
                <Ionicons
                  name={copiedAddress ? 'checkmark-circle' : 'copy-outline'}
                  size={16}
                  color={copiedAddress ? '#10B981' : '#6B7280'}
                />
                {copiedAddress && <Text style={styles.copiedText}>Copied!</Text>}
              </TouchableOpacity>

              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity style={styles.quickActionButton}>
                  <View style={[styles.quickActionIcon, { backgroundColor: '#6366f120' }]}>
                    <Ionicons name="arrow-down" size={20} color="#6366f1" />
                  </View>
                  <Text style={styles.quickActionText}>Receive</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionButton}>
                  <View style={[styles.quickActionIcon, { backgroundColor: '#10B98120' }]}>
                    <Ionicons name="arrow-up" size={20} color="#10B981" />
                  </View>
                  <Text style={styles.quickActionText}>Send</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickAction, { backgroundColor: '#E8414220' }]}>
                  <View style={[styles.quickActionIcon, { backgroundColor: '#E84142' }]}>
                    <Ionicons name="swap-horizontal" size={20} color="#fff" />
                  </View>
                  <Text style={styles.quickActionText}>Swap</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionButton}>
                  <View style={[styles.quickActionIcon, { backgroundColor: '#EC489920' }]}>
                    <Ionicons name="card" size={20} color="#EC4899" />
                  </View>
                  <Text style={styles.quickActionText}>Buy</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Portfolio Summary Card */}
            <View style={styles.portfolioCard}>
              <View style={styles.portfolioHeader}>
                <Text style={styles.portfolioTitle}>Portfolio Value</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.portfolioValue}>${totalValue.toLocaleString()}</Text>
              <View style={styles.portfolioStats}>
                <View style={styles.portfolioStat}>
                  <Text style={styles.statLabel}>Invested</Text>
                  <Text style={styles.statValue}>${totalInvested.toLocaleString()}</Text>
                </View>
                <View style={styles.portfolioStatDivider} />
                <View style={styles.portfolioStat}>
                  <Text style={styles.statLabel}>Total ROI</Text>
                  <Text style={[styles.statValue, { color: totalROI >= 0 ? '#10B981' : '#EF4444' }]}>
                    {totalROI >= 0 ? '+' : ''}{totalROI.toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.portfolioStatDivider} />
                <View style={styles.portfolioStat}>
                  <Text style={styles.statLabel}>Profit</Text>
                  <Text style={[styles.statValue, { color: totalValue - totalInvested >= 0 ? '#10B981' : '#EF4444' }]}>
                    ${(totalValue - totalInvested).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Assets List */}
            <View style={styles.assetsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Assets</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/deals')}>
                  <Text style={styles.viewAllText}>Browse Deals</Text>
                </TouchableOpacity>
              </View>

              {MOCK_ASSETS.map((asset) => (
                <TouchableOpacity
                  key={asset.id}
                  style={styles.assetItem}
                  onPress={() => router.push(`/deal/${asset.id}`)}
                >
                  <View style={styles.assetIcon}>
                    <Text style={styles.assetIconText}>{asset.icon}</Text>
                  </View>
                  <View style={styles.assetInfo}>
                    <Text style={styles.assetName}>{asset.name}</Text>
                    <Text style={styles.assetType}>{asset.type}</Text>
                  </View>
                  <View style={styles.assetValues}>
                    <Text style={styles.assetValue}>${asset.currentValue.toLocaleString()}</Text>
                    <View style={styles.assetChangeRow}>
                      <Text style={[
                        styles.assetROI,
                        { color: asset.roi >= 0 ? '#10B981' : '#EF4444' }
                      ]}>
                        {asset.roi >= 0 ? '+' : ''}{asset.roi.toFixed(1)}% ROI
                      </Text>
                      <Text style={[
                        styles.assetChange,
                        { color: asset.change24h >= 0 ? '#10B981' : '#EF4444' }
                      ]}>
                        {asset.change24h >= 0 ? '↑' : '↓'} {Math.abs(asset.change24h)}%
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          /* No Wallet State */
          <View style={styles.noWalletContainer}>
            <View style={styles.noWalletIcon}>
              <Ionicons name="wallet-outline" size={64} color="#6366f1" />
            </View>
            <Text style={styles.noWalletTitle}>Welcome to RWA Experts</Text>
            <Text style={styles.noWalletSubtitle}>
              Create or import a wallet to start investing in tokenized real-world assets
            </Text>
            <TouchableOpacity
              style={styles.createWalletButton}
              onPress={() => router.push('/wallet/create')}
            >
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.createWalletButtonText}>Create Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.importWalletButton}
              onPress={() => router.push('/wallet/import')}
            >
              <Ionicons name="download-outline" size={20} color="#6366f1" />
              <Text style={styles.importWalletButtonText}>Import Existing Wallet</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  // Balance Card
  balanceCard: {
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  testnetBadge: {
    backgroundColor: '#F5940020',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  testnetText: {
    color: '#F59400',
    fontSize: 10,
    fontWeight: '600',
  },
  balanceAmount: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '700',
  },
  balanceSymbol: {
    color: '#6366f1',
    fontSize: 20,
    fontWeight: '600',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  addressText: {
    color: '#6B7280',
    fontSize: 14,
  },
  copiedText: {
    color: '#10B981',
    fontSize: 12,
    marginLeft: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  quickActionButton: {
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  // Portfolio Card
  portfolioCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  portfolioTitle: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  viewAllText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  portfolioValue: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  portfolioStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portfolioStat: {
    flex: 1,
    alignItems: 'center',
  },
  portfolioStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#374151',
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Assets Section
  assetsSection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  assetIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  assetIconText: {
    fontSize: 24,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  assetType: {
    color: '#6B7280',
    fontSize: 12,
  },
  assetValues: {
    alignItems: 'flex-end',
  },
  assetValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  assetChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assetROI: {
    fontSize: 11,
    fontWeight: '500',
  },
  assetChange: {
    fontSize: 11,
    fontWeight: '500',
  },
  // No Wallet State
  noWalletContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noWalletIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  noWalletTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  noWalletSubtitle: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  createWalletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    marginBottom: 12,
  },
  createWalletButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  importWalletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  importWalletButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
});
