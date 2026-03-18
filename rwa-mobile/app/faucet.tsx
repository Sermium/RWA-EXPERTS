// app/faucet.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function FaucetScreen() {
  const router = useRouter();

  const faucets = [
    {
      name: 'Avalanche Fuji Faucet',
      url: 'https://faucet.avax.network/',
      description: 'Official Avalanche testnet faucet',
      icon: '🔺',
    },
    {
      name: 'Core Faucet',
      url: 'https://core.app/tools/testnet-faucet/',
      description: 'Core wallet faucet for Fuji',
      icon: '💧',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Get Test AVAX</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#6366f1" />
          <Text style={styles.infoText}>
            You need test AVAX to interact with the app on Avalanche Fuji testnet. Use one of the faucets below to get free test tokens.
          </Text>
        </View>

        {faucets.map((faucet, index) => (
          <TouchableOpacity
            key={index}
            style={styles.faucetCard}
            onPress={() => Linking.openURL(faucet.url)}
          >
            <Text style={styles.faucetIcon}>{faucet.icon}</Text>
            <View style={styles.faucetInfo}>
              <Text style={styles.faucetName}>{faucet.name}</Text>
              <Text style={styles.faucetDesc}>{faucet.description}</Text>
            </View>
            <Ionicons name="open-outline" size={20} color="#9ca3af" />
          </TouchableOpacity>
        ))}

        <View style={styles.stepsBox}>
          <Text style={styles.stepsTitle}>How to get test AVAX:</Text>
          <Text style={styles.step}>1. Click on a faucet above</Text>
          <Text style={styles.step}>2. Connect your wallet or paste your address</Text>
          <Text style={styles.step}>3. Complete any verification (if required)</Text>
          <Text style={styles.step}>4. Receive test AVAX in your wallet</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  content: { padding: 20 },
  infoBox: { flexDirection: 'row', backgroundColor: '#1e1b4b', borderRadius: 12, padding: 16, gap: 12, marginBottom: 24 },
  infoText: { flex: 1, color: '#a5b4fc', fontSize: 14, lineHeight: 20 },
  faucetCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 12 },
  faucetIcon: { fontSize: 32, marginRight: 12 },
  faucetInfo: { flex: 1 },
  faucetName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  faucetDesc: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  stepsBox: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginTop: 12 },
  stepsTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  step: { color: '#9ca3af', fontSize: 14, marginBottom: 8, paddingLeft: 8 },
});
