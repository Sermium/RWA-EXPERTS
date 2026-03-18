// rwa-mobile/components/DealCard.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DealCardProps {
  deal: {
    id: string;
    reference: string;
    title: string;
    stage: string;
    totalAmount: number;
    role?: 'buyer' | 'seller';
    nextAction?: string;
    counterparty?: string;
  };
  onPress: () => void;
}

const STAGE_COLORS: Record<string, string> = {
  draft: '#6b7280',
  awaiting_payment: '#f59e0b',
  funded: '#3b82f6',
  awaiting_shipment: '#8b5cf6',
  in_transit: '#06b6d4',
  inspection: '#f97316',
  pending_approval: '#ec4899',
  completed: '#10b981',
  cancelled: '#ef4444',
  disputed: '#dc2626',
};

const STAGE_NAMES: Record<string, string> = {
  draft: 'Draft',
  awaiting_payment: 'Awaiting Payment',
  funded: 'Funded',
  awaiting_shipment: 'Awaiting Shipment',
  in_transit: 'In Transit',
  inspection: 'Inspection',
  pending_approval: 'Pending Approval',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
};

export function DealCard({ deal, onPress }: DealCardProps) {
  const stageColor = STAGE_COLORS[deal.stage] || '#6b7280';
  const stageName = STAGE_NAMES[deal.stage] || deal.stage;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.reference}>{deal.reference}</Text>
        <View style={[styles.stageBadge, { backgroundColor: stageColor }]}>
          <Text style={styles.stageText}>{stageName}</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>{deal.title}</Text>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color="#9ca3af" />
          <Text style={styles.detailText}>
            ${Number(deal.totalAmount).toLocaleString()}
          </Text>
        </View>
        {deal.role && (
          <View style={styles.detailRow}>
            <Ionicons 
              name={deal.role === 'buyer' ? 'cart-outline' : 'storefront-outline'} 
              size={16} 
              color="#9ca3af" 
            />
            <Text style={styles.detailText}>
              {deal.role.charAt(0).toUpperCase() + deal.role.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {deal.nextAction && (
        <View style={styles.actionBanner}>
          <Ionicons name="alert-circle" size={16} color="#f59e0b" />
          <Text style={styles.actionText}>{deal.nextAction}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.viewDetails}>View Details</Text>
        <Ionicons name="chevron-forward" size={20} color="#6366f1" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reference: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  stageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stageText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  details: {
    flexDirection: 'row',
    gap: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  actionText: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  viewDetails: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
});
