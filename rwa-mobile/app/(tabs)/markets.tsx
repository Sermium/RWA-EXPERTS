// app/(tabs)/markets.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppHeader from '../../components/AppHeader';

export default function MarketsScreen() {
  return (
    <View style={styles.container}>
      <AppHeader showWalletSwitcher={true} showNotifications={true} />
      <View style={styles.content}>
        <Text style={styles.title}>Markets</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
});
