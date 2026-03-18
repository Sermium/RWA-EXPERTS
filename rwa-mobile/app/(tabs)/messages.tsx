// app/(tabs)/messages.tsx
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

const MOCK_CONVERSATIONS = [
  {
    id: '1',
    dealReference: 'RWA-2026-001',
    counterparty: '0x1234...5678',
    lastMessage: 'The documents have been uploaded for review.',
    time: '2h ago',
    unread: 2,
  },
  {
    id: '2',
    dealReference: 'RWA-2026-002',
    counterparty: '0xabcd...efgh',
    lastMessage: 'Payment confirmed. Proceeding with shipment.',
    time: '1d ago',
    unread: 0,
  },
  {
    id: '3',
    dealReference: 'RWA-2026-003',
    counterparty: '0x9876...5432',
    lastMessage: 'Deal completed successfully. Thank you!',
    time: '3d ago',
    unread: 0,
  },
];

export default function MessagesScreen() {
  const [conversations] = useState(MOCK_CONVERSATIONS);

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color="#9ca3af" />
            </View>
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.reference}>{item.dealReference}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <Text style={styles.counterparty}>{item.counterparty}</Text>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            </View>
            {item.unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={64} color="#374151" />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              Messages from your deals will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reference: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  time: {
    fontSize: 12,
    color: '#9ca3af',
  },
  counterparty: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    marginTop: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  badge: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
});
