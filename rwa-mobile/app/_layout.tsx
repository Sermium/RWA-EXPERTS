// app/_layout.tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { WalletProvider, useWallet } from '../contexts/WalletContext';
import AppLockScreen from '../components/AppLockScreen';

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
});
