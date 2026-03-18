// app/deal/[id].tsx
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';

const STAGE_COLORS: Record<string, string> = {
  draft: '#6b7280', awaiting_payment: '#f59e0b', funded: '#3b82f6',
  awaiting_shipment: '#8b5cf6', in_transit: '#06b6d4', inspection: '#f97316',
  pending_approval: '#ec4899', completed: '#10b981', cancelled: '#ef4444', disputed: '#dc2626',
};

const STAGE_NAMES: Record<string, string> = {
  draft: 'Draft', awaiting_payment: 'Awaiting Payment', funded: 'Funded',
  awaiting_shipment: 'Awaiting Shipment', in_transit: 'In Transit', inspection: 'Inspection',
  pending_approval: 'Pending Approval', completed: 'Completed', cancelled: 'Cancelled', disputed: 'Disputed',
};

export default function DealDetailScreen() {
  const { id, tab } = useLocalSearchParams();
  const { user } = useAuth();
  const [deal, setDeal] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState(tab === 'messages' ? 'messages' : 'details');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeal();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'messages') loadMessages();
  }, [activeTab]);

  const loadDeal = async () => {
    try {
      const { data } = await api.get(`/trade/deals/${id}`);
      setDeal(data.deal);
    } catch (error) {
      console.error('Failed to load deal:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const { data } = await api.get(`/trade/messages?dealId=${id}`);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await api.post('/trade/messages', { dealId: id, content: newMessage.trim() });
      setNewMessage('');
      loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (loading || !deal) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const role = user?.walletAddress?.toLowerCase() === deal.buyer_address?.toLowerCase() ? 'buyer' :
               user?.walletAddress?.toLowerCase() === deal.seller_address?.toLowerCase() ? 'seller' : null;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.reference}>{deal.reference}</Text>
        <View style={[styles.badge, { backgroundColor: STAGE_COLORS[deal.stage] || '#6b7280' }]}>
          <Text style={styles.badgeText}>{STAGE_NAMES[deal.stage] || deal.stage}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['details', 'milestones', 'messages'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.activeTab]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.activeTabText]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.title}>{deal.title}</Text>
            <Text style={styles.description}>{deal.description}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Deal Value</Text>
            <Text style={styles.amount}>${Number(deal.total_amount || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Parties</Text>
            <Text style={styles.party}>Buyer: {shortenAddress(deal.buyer_address)} {role === 'buyer' && '(You)'}</Text>
            <Text style={styles.party}>Seller: {shortenAddress(deal.seller_address)} {role === 'seller' && '(You)'}</Text>
          </View>
        </ScrollView>
      )}

      {/* Milestones Tab */}
      {activeTab === 'milestones' && (
        <ScrollView style={styles.content}>
          {deal.milestones?.map((m: any, i: number) => (
            <View key={m.id || i} style={styles.milestoneCard}>
              <View style={styles.milestoneHeader}>
                <Text style={styles.milestoneTitle}>{m.title}</Text>
                <Text style={styles.milestoneAmount}>${Number(m.amount || 0).toLocaleString()}</Text>
              </View>
              <View style={[styles.milestoneStatus, { backgroundColor: m.status === 'completed' ? '#10b981' : '#f59e0b' }]}>
                <Text style={styles.milestoneStatusText}>{m.status || 'pending'}</Text>
              </View>
            </View>
          )) || <Text style={styles.emptyText}>No milestones</Text>}
        </ScrollView>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <View style={styles.messagesContainer}>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isMe = item.sender?.toLowerCase() === user?.walletAddress?.toLowerCase();
              return (
                <View style={[styles.message, isMe ? styles.messageRight : styles.messageLeft]}>
                  <Text style={styles.messageText}>{item.content}</Text>
                  <Text style={styles.messageTime}>{new Date(item.created_at).toLocaleTimeString()}</Text>
                </View>
              );
            }}
            contentContainerStyle={styles.messagesList}
            inverted
          />
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#9ca3af"
              value={newMessage}
              onChangeText={setNewMessage}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  loadingText: { color: '#9ca3af', fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, gap: 12 },
  reference: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#fff' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  tab: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 8 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { color: '#9ca3af', fontSize: 14 },
  activeTabText: { color: '#6366f1', fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  description: { fontSize: 14, color: '#9ca3af', lineHeight: 20 },
  label: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  amount: { fontSize: 28, fontWeight: 'bold', color: '#10b981' },
  party: { fontSize: 14, color: '#fff', marginBottom: 4 },
  milestoneCard: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 12 },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  milestoneTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  milestoneAmount: { fontSize: 16, fontWeight: '600', color: '#10b981' },
  milestoneStatus: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  milestoneStatusText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  emptyText: { color: '#9ca3af', textAlign: 'center', marginTop: 20 },
  messagesContainer: { flex: 1 },
  messagesList: { padding: 16 },
  message: { maxWidth: '80%', padding: 12, borderRadius: 12, marginBottom: 8 },
  messageLeft: { alignSelf: 'flex-start', backgroundColor: '#1f2937' },
  messageRight: { alignSelf: 'flex-end', backgroundColor: '#6366f1' },
  messageText: { color: '#fff', fontSize: 14 },
  messageTime: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 4 },
  inputContainer: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#1f2937' },
  input: { flex: 1, backgroundColor: '#1f2937', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 14 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
});
