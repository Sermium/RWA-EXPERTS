// app/(tabs)/profile.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWallet } from '../../contexts/WalletContext';

export default function ProfileScreen() {
  const router = useRouter();
  const {
    address,
    isConnected,
    balance,
    shortenAddress,
    refreshBalance,
  } = useWallet();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const kycLevel = 0;

  const kycLevelNames: Record<number, string> = {
    0: 'Not Verified',
    1: 'Bronze',
    2: 'Silver',
    3: 'Gold',
    4: 'Diamond',
  };

  const kycLevelColors: Record<number, string> = {
    0: '#6b7280',
    1: '#cd7f32',
    2: '#c0c0c0',
    3: '#ffd700',
    4: '#b9f2ff',
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  };

  // Not connected - show wallet setup options
  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.notConnectedContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="wallet-outline" size={48} color="#6366f1" />
          </View>
          <Text style={styles.notConnectedTitle}>No Wallet Found</Text>
          <Text style={styles.notConnectedText}>
            Create a new wallet or import an existing one to get started.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/wallet/create')}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Create New Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/wallet/import')}
          >
            <Ionicons name="download" size={20} color="#6366f1" />
            <Text style={styles.secondaryButtonText}>Import Existing Wallet</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#6366f1" />
          </View>
          <View style={styles.onlineIndicator} />
        </View>
        <Text style={styles.addressText}>{address ? shortenAddress(address) : ''}</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceValue}>{parseFloat(balance).toFixed(4)} ETH</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#3b82f620' }]}>
            <Ionicons name="send" size={20} color="#3b82f6" />
          </View>
          <Text style={styles.quickActionText}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#10b98120' }]}>
            <Ionicons name="download" size={20} color="#10b981" />
          </View>
          <Text style={styles.quickActionText}>Receive</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#f59e0b20' }]}>
            <Ionicons name="swap-horizontal" size={20} color="#f59e0b" />
          </View>
          <Text style={styles.quickActionText}>Swap</Text>
        </TouchableOpacity>
      </View>

      {/* KYC Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>KYC Status</Text>
        <View style={styles.kycCard}>
          <View style={styles.kycHeader}>
            <View
              style={[styles.kycBadge, { backgroundColor: kycLevelColors[kycLevel] + '20' }]}
            >
              <Ionicons name="shield-checkmark" size={16} color={kycLevelColors[kycLevel]} />
              <Text style={[styles.kycBadgeText, { color: kycLevelColors[kycLevel] }]}>
                {kycLevelNames[kycLevel]}
              </Text>
            </View>
          </View>
          <Text style={styles.kycDescription}>
            {kycLevel === 0
              ? 'Complete KYC verification to access all features and higher limits.'
              : `You have ${kycLevelNames[kycLevel]} tier verification.`}
          </Text>
          <TouchableOpacity style={styles.kycButton}>
            <Text style={styles.kycButtonText}>
              {kycLevel === 0 ? 'Start Verification' : 'Upgrade Tier'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <View style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/wallet/settings')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="wallet" size={24} color="#9ca3af" />
              <Text style={styles.settingText}>Wallet Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={24} color="#9ca3af" />
              <Text style={styles.settingText}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#374151', true: '#6366f1' }}
              thumbColor="#ffffff"
            />
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="globe-outline" size={24} color="#9ca3af" />
              <Text style={styles.settingText}>Network</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>Ethereum</Text>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>

        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={24} color="#9ca3af" />
              <Text style={styles.settingText}>Help Center</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={24} color="#9ca3af" />
              <Text style={styles.settingText}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="shield-outline" size={24} color="#9ca3af" />
              <Text style={styles.settingText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Version */}
      <Text style={styles.versionText}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  notConnectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  notConnectedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  notConnectedText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  secondaryButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    borderWidth: 3,
    borderColor: '#111827',
  },
  addressText: {
    fontSize: 18,
    color: '#ffffff',
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  balanceContainer: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  quickAction: {
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kycCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  kycHeader: {
    marginBottom: 12,
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  kycBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  kycDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
    lineHeight: 20,
  },
  kycButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  kycButtonText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  settingsCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#ffffff',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    color: '#6b7280',
  },
  versionText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginVertical: 24,
  },
});
