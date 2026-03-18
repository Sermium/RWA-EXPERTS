// app/wallet/_layout.tsx
import { Stack } from 'expo-router';

export default function WalletLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#111827' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="create" />
      <Stack.Screen name="import" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
