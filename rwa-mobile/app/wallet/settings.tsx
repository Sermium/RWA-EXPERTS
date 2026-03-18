// app/wallet/settings.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWallet } from '../../contexts/WalletContext';
import CustomAlert from '../../components/CustomAlert';

export default function WalletSettingsScreen() {
  const router = useRouter();
  const { 
    biometricEnabled, 
    biometricSupported, 
    setBiometricEnabled, 
    deleteWallet,
    exportMnemonic 
  } = useWallet();

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'info' as const, buttons: [{ text: 'OK' }] as any[] });

  const handleToggleBiometric = async (value: boolean) => {
    try {
      await setBiometricEnabled(value);
    } catch (error: any) {
      setAlertConfig({
        title: 'Error',
        message: error.message || 'Failed to update biometric settings',
        type: 'error',
        buttons: [{ text: 'OK' }],
      });
      setAlertVisible(true);
    }
  };

  const handleDeleteWallet = () => {
    setAlertConfig({
      title: 'Delete Wallet?',
      message: 'This will permanently delete your wallet. Make sure you have backed up your recovery phrase!',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWallet();
              router.replace('/');
            } catch (error: any) {
              setAlertConfig({
                title: 'Error',
                message: error.message || 'Failed to delete wallet',
                type: 'error',
                buttons: [{ text: 'OK' }],
              });
              setAlertVisible(true);
            }
          },
        },
      ],
    });
    setAlertVisible(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>Wallet Settings</Text>

        {/* Security Section */}
        <Text style={styles.sectionTitle}>Security</Text>
        
        {biometricSupported && (
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="finger-print" size={24} color="#6366f1" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Biometric Unlock</Text>
                <Text style={styles.settingDesc}>Use fingerprint or face to unlock</Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: '#374151', true: '#6366f1' }}
              thumbColor="#fff"
            />
          </View>
        )}

        <TouchableOpacity style={styles.settingButton}>
          <Ionicons name="key" size={24} color="#6366f1" />
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Change PIN</Text>
            <Text style={styles.settingDesc}>Update your wallet PIN</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </TouchableOpacity>

        {/* Backup Section */}
        <Text style={styles.sectionTitle}>Backup</Text>

        <TouchableOpacity style={styles.settingButton}>
          <Ionicons name="document-text" size={24} color="#f59e0b" />
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>View Recovery Phrase</Text>
            <Text style={styles.settingDesc}>Show your 12-word backup phrase</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </TouchableOpacity>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Danger Zone</Text>

        <TouchableOpacity style={[styles.settingButton, styles.dangerButton]} onPress={handleDeleteWallet}>
          <Ionicons name="trash" size={24} color="#ef4444" />
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: '#ef4444' }]}>Delete Wallet</Text>
            <Text style={styles.settingDesc}>Remove wallet from this device</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </TouchableOpacity>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { padding: 24 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 24 },
  sectionTitle: { color: '#9ca3af', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginTop: 24, marginBottom: 12 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 8 },
  settingButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 8 },
  settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingText: { flex: 1, marginLeft: 12 },
  settingTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  settingDesc: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  dangerButton: { borderWidth: 1, borderColor: '#ef444433' },
});
