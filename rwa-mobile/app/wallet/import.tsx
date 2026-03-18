// app/wallet/import.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWallet } from '../../contexts/WalletContext';
import CustomAlert from '../../components/CustomAlert';

export default function ImportWalletScreen() {
  const router = useRouter();
  const { importWallet } = useWallet();
  
  const [mnemonic, setMnemonic] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'info' as const });

  const handleImport = async () => {
    if (!mnemonic.trim()) {
      setAlertConfig({ title: 'Error', message: 'Please enter your recovery phrase', type: 'error' });
      setAlertVisible(true);
      return;
    }
    if (pin.length < 6) {
      setAlertConfig({ title: 'Error', message: 'PIN must be at least 6 digits', type: 'error' });
      setAlertVisible(true);
      return;
    }

    setIsLoading(true);
    try {
      await importWallet(mnemonic.trim(), pin);
      router.replace('/(tabs)');
    } catch (error: any) {
      setAlertConfig({ title: 'Error', message: error.message || 'Failed to import wallet', type: 'error' });
      setAlertVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="download" size={32} color="#6366f1" />
          </View>
          <Text style={styles.title}>Import Wallet</Text>
          <Text style={styles.subtitle}>Enter your 12 or 24 word recovery phrase</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recovery Phrase</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={mnemonic}
            onChangeText={setMnemonic}
            placeholder="Enter your recovery phrase..."
            placeholderTextColor="#6b7280"
            multiline
            numberOfLines={4}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Create PIN</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="6-digit PIN"
            placeholderTextColor="#6b7280"
            keyboardType="numeric"
            secureTextEntry
            maxLength={6}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (!mnemonic.trim() || pin.length < 6) && styles.buttonDisabled]}
          onPress={handleImport}
          disabled={!mnemonic.trim() || pin.length < 6 || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="download" size={20} color="#fff" />
              <Text style={styles.buttonText}>Import Wallet</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={[{ text: 'OK' }]}
        onClose={() => setAlertVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { padding: 24 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#312e81', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { color: '#9ca3af', fontSize: 14, marginBottom: 8 },
  input: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#374151' },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366f1', borderRadius: 12, padding: 16, gap: 8, marginTop: 12 },
  buttonDisabled: { backgroundColor: '#374151' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
