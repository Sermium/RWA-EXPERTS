// app/(tabs)/deals.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CATEGORIES = ['All', 'Real Estate', 'Commodities', 'Equity', 'Bonds', 'Art'];

const DEALS = [
  {
    id: '1',
    name: 'Dubai Marina Tower',
    type: 'Real Estate',
    icon: '🏢',
    minInvestment: 1000,
    targetReturn: '12-15%',
    duration: '24 months',
    raised: 2500000,
    target: 5000000,
    status: 'Active',
  },
  {
    id: '2',
    name: 'Silver Mining Rights',
    type: 'Commodities',
    icon: '🥈',
    minInvestment: 500,
    targetReturn: '8-12%',
    duration: '18 months',
    raised: 800000,
    target: 1000000,
    status: 'Active',
  },
  {
    id: '3',
    name: 'AI Startup Series A',
    type: 'Equity',
    icon: '🤖',
    minInvestment: 2500,
    targetReturn: '25-40%',
    duration: '36 months',
    raised: 3200000,
    target: 4000000,
    status: 'Active',
  },
  {
    id: '4',
    name: 'Green Energy Bonds',
    type: 'Bonds',
    icon: '🌱',
    minInvestment: 100,
    targetReturn: '5-7%',
    duration: '12 months',
    raised: 950000,
    target: 1000000,
    status: 'Closing Soon',
  },
  {
    id: '5',
    name: 'Contemporary Art Fund',
    type: 'Art',
    icon: '🎨',
    minInvestment: 5000,
    targetReturn: '15-25%',
    duration: '48 months',
    raised: 1200000,
    target: 3000000,
    status: 'Active',
  },
  {
    id: '6',
    name: 'London Commercial Property',
    type: 'Real Estate',
    icon: '🏛️',
    minInvestment: 2000,
    targetReturn: '10-14%',
    duration: '30 months',
    raised: 4500000,
    target: 8000000,
    status: 'Active',
  },
];

export default function DealsScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDeals = DEALS.filter((deal) => {
    const matchesCategory = selectedCategory === 'All' || deal.type === selectedCategory;
    const matchesSearch = deal.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Investment Deals</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search deals..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Deals List */}
      <ScrollView
        style={styles.dealsContainer}
        contentContainerStyle={styles.dealsContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredDeals.map((deal) => (
          <TouchableOpacity
            key={deal.id}
            style={styles.dealCard}
            onPress={() => router.push(`/deal/${deal.id}`)}
          >
            <View style={styles.dealHeader}>
              <View style={styles.dealIconContainer}>
                <Text style={styles.dealIcon}>{deal.icon}</Text>
              </View>
              <View style={styles.dealInfo}>
                <Text style={styles.dealName}>{deal.name}</Text>
                <Text style={styles.dealType}>{deal.type}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                deal.status === 'Closing Soon' && styles.statusBadgeUrgent
              ]}>
                <Text style={[
                  styles.statusText,
                  deal.status === 'Closing Soon' && styles.statusTextUrgent
                ]}>
                  {deal.status}
                </Text>
              </View>
            </View>

            <View style={styles.dealStats}>
              <View style={styles.dealStat}>
                <Text style={styles.dealStatLabel}>Min. Investment</Text>
                <Text style={styles.dealStatValue}>${deal.minInvestment.toLocaleString()}</Text>
              </View>
              <View style={styles.dealStat}>
                <Text style={styles.dealStatLabel}>Target Return</Text>
                <Text style={[styles.dealStatValue, { color: '#10B981' }]}>{deal.targetReturn}</Text>
              </View>
              <View style={styles.dealStat}>
                <Text style={styles.dealStatLabel}>Duration</Text>
                <Text style={styles.dealStatValue}>{deal.duration}</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(deal.raised / deal.target) * 100}%` },
                  ]}
                />
              </View>
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                  ${(deal.raised / 1000000).toFixed(1)}M raised
                </Text>
                <Text style={styles.progressText}>
                  {((deal.raised / deal.target) * 100).toFixed(0)}% of ${(deal.target / 1000000).toFixed(0)}M
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '700',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
  },
  categoriesContainer: {
    marginTop: 16,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1F2937',
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#6366f1',
  },
  categoryChipText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  dealsContainer: {
    flex: 1,
    marginTop: 16,
  },
  dealsContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  dealCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  dealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dealIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dealIcon: {
    fontSize: 24,
  },
  dealInfo: {
    flex: 1,
  },
  dealName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  dealType: {
    color: '#6B7280',
    fontSize: 13,
  },
  statusBadge: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeUrgent: {
    backgroundColor: '#F5940020',
  },
  statusText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextUrgent: {
    color: '#F59400',
  },
  dealStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dealStat: {
    alignItems: 'center',
  },
  dealStatLabel: {
    color: '#6B7280',
    fontSize: 11,
    marginBottom: 4,
  },
  dealStatValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 3,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    color: '#6B7280',
    fontSize: 12,
  },
});
