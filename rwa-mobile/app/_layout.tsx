// app/_layout.tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { WalletProvider, useWallet } from '../contexts/WalletContext';
import AppLockScreen from '../components/AppLockScreen';
import { getConfigProblems, ConfigError } from '../lib/config';

// Checked once at startup: refuse to run against placeholder endpoints or empty contract addresses.
const configProblems = getConfigProblems();
if (configProblems.length > 0) {
  console.error(new ConfigError(configProblems).message);
}

function ConfigErrorScreen({ problems }: { problems: string[] }) {
  return (
    <View style={styles.configErrorContainer}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.configErrorContent}>
        <Text style={styles.configErrorTitle}>Configuration error</Text>
        <Text style={styles.configErrorText}>
          This build is missing required configuration and cannot start:
        </Text>
        {problems.map((p) => (
          <Text key={p} style={styles.configErrorItem}>
            {'\u2022 '}
            {p}
          </Text>
        ))}
        <Text style={styles.configErrorText}>
          Set the values in rwa-mobile/.env (see .env.example) or in app config "extra", then rebuild.
        </Text>
      </ScrollView>
    </View>
  );
}

function RootLayoutNav() {
  const { isLoading, hasWallet, isAppUnlocked } = useWallet();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  // Show lock screen if wallet exists but app not unlocked
  if (hasWallet && !isAppUnlocked) {
    return <AppLockScreen />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="wallet/create"
          options={{ presentation: 'modal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="wallet/import"
          options={{ presentation: 'modal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="wallet/settings"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="notifications"
          options={{ presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  if (configProblems.length > 0) {
    return <ConfigErrorScreen problems={configProblems} />;
  }

  return (
    <WalletProvider>
      <RootLayoutNav />
    </WalletProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  configErrorContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  configErrorContent: {
    padding: 24,
    paddingTop: 80,
  },
  configErrorTitle: {
    color: '#f87171',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  configErrorText: {
    color: '#d1d5db',
    fontSize: 15,
    marginVertical: 8,
  },
  configErrorItem: {
    color: '#f9fafb',
    fontSize: 14,
    marginVertical: 4,
  },
});
