// components/ConnectWallet.tsx
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

export function ConnectWallet() {
  const { isConnecting, connect, address, isConnected } = useWallet();
  const { connect: authConnect } = useAuth();

  // Sync wallet connection with auth
  useEffect(() => {
    if (isConnected && address) {
      authConnect(address);
    }
  }, [isConnected, address]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Ionicons name="shield-checkmark" size={80} color="#6366f1" />
        </View>

        <Text style={styles.title}>RWA Platform</Text>
        <Text style={styles.subtitle}>Secure Real-World Asset Trading</Text>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="lock-closed" size={24} color="#10b981" />
            <Text style={styles.featureText}>Escrow Protection</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="shield" size={24} color="#10b981" />
            <Text style={styles.featureText}>KYC Verified Users</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text style={styles.featureText}>Dispute Resolution</Text>
          </View>
        </View>

        {/* Connect Button */}
        <TouchableOpacity
          style={[styles.connectButton, isConnecting && styles.connectingButton]}
          onPress={connect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="wallet" size={24} color="#ffffff" />
              <Text style={styles.connectText}>Connect Wallet</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.supportedText}>
          Supports MetaMask & WalletConnect
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  features: {
    marginTop: 40,
    marginBottom: 40,
    width: '100%',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 12,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    gap: 12,
  },
  connectingButton: {
    opacity: 0.7,
  },
  connectText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  supportedText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 16,
  },
});
