// app/wallet/create.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWallet } from '../../contexts/WalletContext';
import CustomAlert from '../../components/CustomAlert';

type Step = 'pin' | 'confirm' | 'backup' | 'verify';

export default function CreateWalletScreen() {
  const router = useRouter();
  const { createWallet, setBiometricEnabled, biometricSupported } = useWallet();

  const [step, setStep] = useState<Step>('pin');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [verificationWords, setVerificationWords] = useState<Record<number, string>>({});
  
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message?: string;
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    buttons: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }>;
  }>({
    title: '',
    type: 'info',
    buttons: [{ text: 'OK' }],
  });

  const showAlert = useCallback((config: typeof alertConfig) => {
    setAlertConfig(config);
    setAlertVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setAlertVisible(false);
  }, []);

  const wordsToVerify = useMemo(() => {
    if (!mnemonic) return [];
    const indices: number[] = [];
    while (indices.length < 3) {
      const r = Math.floor(Math.random() * 12);
      if (!indices.includes(r)) indices.push(r);
    }
    return indices.sort((a, b) => a - b);
  }, [mnemonic]);

  const mnemonicWords = mnemonic ? mnemonic.split(' ') : [];

  const handleSetPin = useCallback(() => {
    if (pin.length < 6) {
      showAlert({
        title: 'Invalid PIN',
        message: 'PIN must be at least 6 digits',
        type: 'error',
        buttons: [{ text: 'OK', onPress: hideAlert }],
      });
      return;
    }
    if (!/^\d+$/.test(pin)) {
      showAlert({
        title: 'Invalid PIN',
        message: 'PIN must contain only numbers',
        type: 'error',
        buttons: [{ text: 'OK', onPress: hideAlert }],
      });
      return;
    }
    setStep('confirm');
  }, [pin, showAlert, hideAlert]);

  const handleConfirmPin = useCallback(async () => {
    if (pin !== confirmPin) {
      showAlert({
        title: 'PIN Mismatch',
        message: 'PINs do not match. Please try again.',
        type: 'error',
        buttons: [{ text: 'OK', onPress: () => { hideAlert(); setConfirmPin(''); } }],
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await createWallet(pin);
      setMnemonic(result.mnemonic);
      setStep('backup');
    } catch (error: any) {
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to create wallet',
        type: 'error',
        buttons: [{ text: 'OK', onPress: hideAlert }],
      });
    } finally {
      setIsLoading(false);
    }
  }, [pin, confirmPin, createWallet, showAlert, hideAlert]);

  const handleContinueToVerify = useCallback(() => {
    if (!showMnemonic) {
      showAlert({
        title: 'Reveal Required',
        message: 'Please reveal your recovery phrase first',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: hideAlert }],
      });
      return;
    }
    setStep('verify');
  }, [showMnemonic, showAlert, hideAlert]);

  const handleVerifyWords = useCallback(() => {
    const isCorrect = wordsToVerify.every((index) => {
      const entered = verificationWords[index]?.trim().toLowerCase();
      const expected = mnemonicWords[index]?.toLowerCase();
      return entered === expected;
    });

    if (!isCorrect) {
      showAlert({
        title: 'Incorrect Words',
        message: 'One or more words are incorrect. Please check and try again.',
        type: 'error',
        buttons: [{ text: 'Try Again', onPress: () => { hideAlert(); setVerificationWords({}); } }],
      });
      return;
    }

    completeSetup();
  }, [wordsToVerify, verificationWords, mnemonicWords, showAlert, hideAlert]);

  const completeSetup = useCallback(() => {
    if (biometricSupported) {
      showAlert({
        title: 'Enable Biometrics?',
        message: 'Would you like to use fingerprint or face recognition to unlock your wallet?',
        type: 'confirm',
        buttons: [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => { hideAlert(); router.replace('/(tabs)'); },
          },
          {
            text: 'Enable',
            onPress: async () => {
              hideAlert();
              try { await setBiometricEnabled(true); } catch (e) {}
              router.replace('/(tabs)');
            },
          },
        ],
      });
    } else {
      router.replace('/(tabs)');
    }
  }, [biometricSupported, setBiometricEnabled, router, showAlert, hideAlert]);

  const handleGoBackFromBackup = useCallback(() => {
    showAlert({
      title: 'Warning',
      message: 'Going back will delete this wallet. Make sure you have saved your recovery phrase.',
      type: 'warning',
      buttons: [
        { text: 'Stay', style: 'cancel', onPress: hideAlert },
        {
          text: 'Go Back',
          style: 'destructive',
          onPress: () => {
            hideAlert();
            setMnemonic('');
            setStep('pin');
            setPin('');
            setConfirmPin('');
            setShowMnemonic(false);
          },
        },
      ],
    });
  }, [showAlert, hideAlert]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Creating your wallet...</Text>
      </View>
    );
  }

  if (step === 'verify') {
    const allFilled = wordsToVerify.every((i) => verificationWords[i]?.trim().length > 0);
    
    return (
      <View style={styles.container}>
        <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.backButton} onPress={() => setStep('backup')}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.header}>
              <View style={[styles.iconCircle, { backgroundColor: '#064e3b' }]}>
                <Ionicons name="checkmark-circle" size={32} color="#10b981" />
              </View>
              <Text style={styles.title}>Verify Backup</Text>
              <Text style={styles.subtitle}>Enter the following words from your recovery phrase.</Text>
            </View>

            <View style={styles.verificationContainer}>
              {wordsToVerify.map((index) => (
                <View key={index} style={styles.verificationRow}>
                  <View style={styles.wordNumberBadge}>
                    <Text style={styles.wordNumberText}>Word #{index + 1}</Text>
                  </View>
                  <TextInput
                    style={styles.verificationInput}
                    value={verificationWords[index] || ''}
                    onChangeText={(text) => setVerificationWords((prev) => ({ ...prev, [index]: text }))}
                    placeholder={`Enter word #${index + 1}`}
                    placeholderTextColor="#6b7280"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={[styles.button, !allFilled && styles.buttonDisabled]}
              onPress={handleVerifyWords}
              disabled={!allFilled}
              activeOpacity={0.7}
            >
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
              <Text style={styles.buttonText}>Verify & Complete</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <CustomAlert visible={alertVisible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} buttons={alertConfig.buttons} onClose={hideAlert} />
      </View>
    );
  }

  if (step === 'backup') {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={handleGoBackFromBackup}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: '#78350f' }]}>
              <Ionicons name="key" size={32} color="#f59e0b" />
            </View>
            <Text style={styles.title}>Recovery Phrase</Text>
            <Text style={styles.subtitle}>Write down these 12 words in order. This is the ONLY way to recover your wallet.</Text>
          </View>

          <TouchableOpacity style={styles.mnemonicBox} onPress={() => setShowMnemonic(!showMnemonic)} activeOpacity={0.8}>
            {showMnemonic ? (
              <View style={styles.mnemonicGrid}>
                {mnemonicWords.map((word, index) => (
                  <View key={index} style={styles.wordItem}>
                    <Text style={styles.wordNumber}>{index + 1}.</Text>
                    <Text style={styles.wordText}>{word}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.hiddenMnemonic}>
                <Ionicons name="eye-off" size={32} color="#6b7280" />
                <Text style={styles.hiddenText}>Tap to reveal recovery phrase</Text>
                <Text style={styles.hiddenSubtext}>Make sure no one is watching</Text>
              </View>
            )}
          </TouchableOpacity>

          {showMnemonic && (
            <View style={styles.warningBoxSmall}>
              <Ionicons name="warning" size={18} color="#f59e0b" />
              <Text style={styles.warningTextSmall}>Write these words down and store them safely.</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.button, !showMnemonic && styles.buttonDisabled]}
            onPress={handleContinueToVerify}
            disabled={!showMnemonic}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>I've Written It Down</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <CustomAlert visible={alertVisible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} buttons={alertConfig.buttons} onClose={hideAlert} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {step === 'confirm' && (
          <TouchableOpacity style={styles.backButton} onPress={() => { setStep('pin'); setConfirmPin(''); }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: '#312e81' }]}>
            <Ionicons name="lock-closed" size={32} color="#6366f1" />
          </View>
          <Text style={styles.title}>{step === 'pin' ? 'Create PIN' : 'Confirm PIN'}</Text>
          <Text style={styles.subtitle}>
            {step === 'pin' ? 'Create a 6-digit PIN to secure your wallet' : 'Re-enter your PIN to confirm'}
          </Text>
        </View>

        <View style={styles.pinContainer}>
          <TextInput
            style={styles.pinInput}
            value={step === 'pin' ? pin : confirmPin}
            onChangeText={step === 'pin' ? setPin : setConfirmPin}
            placeholder="Enter 6-digit PIN"
            placeholderTextColor="#6b7280"
            keyboardType="numeric"
            secureTextEntry
            maxLength={6}
          />
          <View style={styles.pinDots}>
            {[...Array(6)].map((_, i) => (
              <View key={i} style={[styles.pinDot, (step === 'pin' ? pin : confirmPin).length > i && styles.pinDotFilled]} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.button, (step === 'pin' ? pin : confirmPin).length < 6 && styles.buttonDisabled]}
          onPress={step === 'pin' ? handleSetPin : handleConfirmPin}
          disabled={(step === 'pin' ? pin : confirmPin).length < 6}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>{step === 'pin' ? 'Continue' : 'Create Wallet'}</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <CustomAlert visible={alertVisible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} buttons={alertConfig.buttons} onClose={hideAlert} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  flex1: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 120 },
  loadingContainer: { flex: 1, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', fontSize: 16, marginTop: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#9ca3af', fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  pinContainer: { alignItems: 'center', marginTop: 24 },
  pinInput: { width: '100%', backgroundColor: '#1f2937', borderRadius: 12, padding: 16, color: '#fff', fontSize: 18, textAlign: 'center', letterSpacing: 8 },
  pinDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, gap: 12 },
  pinDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#374151' },
  pinDotFilled: { backgroundColor: '#6366f1' },
  mnemonicBox: { backgroundColor: '#1f2937', borderRadius: 16, padding: 20, marginBottom: 16, minHeight: 200 },
  mnemonicGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  wordItem: { width: '48%', flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#111827', borderRadius: 8, marginBottom: 8 },
  wordNumber: { color: '#6b7280', fontSize: 12, marginRight: 8, width: 24 },
  wordText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  hiddenMnemonic: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  hiddenText: { color: '#9ca3af', fontSize: 16, marginTop: 12 },
  hiddenSubtext: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  warningBoxSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#78350f', borderRadius: 12, padding: 12, gap: 10 },
  warningTextSmall: { flex: 1, color: '#fbbf24', fontSize: 13, lineHeight: 18 },
  verificationContainer: { gap: 16 },
  verificationRow: { gap: 8 },
  wordNumberBadge: { backgroundColor: '#374151', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  wordNumberText: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  verificationInput: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16 },
  bottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 32, backgroundColor: '#111827', borderTopWidth: 1, borderTopColor: '#1f2937' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366f1', borderRadius: 12, padding: 16, gap: 8 },
  buttonDisabled: { backgroundColor: '#374151', opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
