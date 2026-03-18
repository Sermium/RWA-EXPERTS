// components/AppHeader.tsx
import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import WalletSwitcher from './WalletSwitcher';

interface AppHeaderProps {
  showWalletSwitcher?: boolean;
  showNotifications?: boolean;
}

export default function AppHeader({
  showWalletSwitcher = true,
  showNotifications = true,
}: AppHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      {/* Wallet Switcher - Full Width */}
      {showWalletSwitcher && (
        <View style={styles.walletSwitcherContainer}>
          <WalletSwitcher />
        </View>
      )}

      {/* Notifications */}
      {showNotifications && (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color="#fff" />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24) + 8,
    paddingBottom: 8,
    backgroundColor: '#111827',
    gap: 10,
  },
  walletSwitcherContainer: {
    flex: 1,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#374151',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#1f2937',
  },
});
