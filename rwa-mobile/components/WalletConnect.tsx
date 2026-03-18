// rwa-mobile/components/WalletConnect.tsx
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';

export function WalletConnect() {
  const { connect } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // In production, use WalletConnect
      // For demo, we'll simulate connection
      // const address = await connectWallet();
      // await connect(address);
      
      // Demo mode - replace with actual WalletConnect integration
      alert('WalletConnect integration - Replace with actual implementation');
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Ionicons name="shield-checkmark" size={80} color="#6366f1" />
        </View>
        
        <Text style={styles.title}>RWA Platform</Text>
        <Text style={styles.subtitle}>
          Secure Real-World Asset Trading
        </Text>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text style={styles.featureText}>Escrow Protection</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text style={styles.featureText}>KYC Verified Users</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text style={styles.featureText}>Dispute Resolution</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.connectButton}
          onPress={handleConnect}
          disabled={isConnecting}
        >
          <Ionicons name="wallet" size={24} color="#ffffff" />
          <Text style={styles.connectText}>
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.supportedWallets}>
          Supports MetaMask, WalletConnect, and more
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
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
  },
  features: {
    width: '100%',
    marginBottom: 32,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#ffffff',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  connectText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  supportedWallets: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 16,
  },
});
