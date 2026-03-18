// app/(tabs)/exchange.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const TOKENS = [
  { symbol: 'AVAX', name: 'Avalanche', icon: 'https://cryptologos.cc/logos/avalanche-avax-logo.png', balance: '0.0', price: 35 },
  { symbol: 'USDT', name: 'Tether', icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png', balance: '0.0', price: 1 },
  { symbol: 'USDC', name: 'USD Coin', icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', balance: '0.0', price: 1 },
  { symbol: 'WETH', name: 'Wrapped ETH', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', balance: '0.0', price: 2650 },
  { symbol: 'WBTC', name: 'Wrapped BTC', icon: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png', balance: '0.0', price: 52000 },
  { symbol: 'JOE', name: 'Trader Joe', icon: 'https://cryptologos.cc/logos/trader-joe-joe-logo.png', balance: '0.0', price: 0.45 },
];

export default function ExchangeScreen() {
  const [fromToken, setFromToken] = useState(TOKENS[0]);
  const [toToken, setToToken] = useState(TOKENS[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [showFromSelector, setShowFromSelector] = useState(false);
  const [showToSelector, setShowToSelector] = useState(false);

  const toAmount = fromAmount
    ? ((parseFloat(fromAmount) * fromToken.price) / toToken.price).toFixed(6)
    : '';

  const exchangeRate = (fromToken.price / toToken.price).toFixed(6);

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount('');
  };

  const TokenSelector = ({
    visible,
    onSelect,
    onClose,
  }: {
    visible: boolean;
    onSelect: (token: typeof TOKENS[0]) => void;
    onClose: () => void;
  }) => {
    if (!visible) return null;
    return (
      <View style={styles.selectorOverlay}>
        <View style={styles.selectorContainer}>
          <View style={styles.selectorHeader}>
            <Text style={styles.selectorTitle}>Select Token</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.tokenList}>
            {TOKENS.map((token) => (
              <TouchableOpacity
                key={token.symbol}
                style={styles.tokenItem}
                onPress={() => {
                  onSelect(token);
                  onClose();
                }}
              >
                <Image source={{ uri: token.icon }} style={styles.tokenIcon} />
                <View style={styles.tokenInfo}>
                  <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                  <Text style={styles.tokenName}>{token.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Exchange</Text>
          <Text style={styles.subtitle}>Swap tokens on Avalanche</Text>
        </View>

        <View style={styles.swapCard}>
          <View style={styles.tokenBox}>
            <Text style={styles.tokenBoxLabel}>From</Text>
            <View style={styles.tokenBoxContent}>
              <TouchableOpacity style={styles.tokenSelector} onPress={() => setShowFromSelector(true)}>
                <Image source={{ uri: fromToken.icon }} style={styles.selectedTokenIcon} />
                <Text style={styles.selectedTokenSymbol}>{fromToken.symbol}</Text>
                <Ionicons name="chevron-down" size={16} color="#9ca3af" />
              </TouchableOpacity>
              <TextInput
                style={styles.amountInput}
                value={fromAmount}
                onChangeText={setFromAmount}
                placeholder="0.0"
                placeholderTextColor="#6b7280"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.swapButton} onPress={handleSwapTokens}>
            <View style={styles.swapButtonInner}>
              <Ionicons name="swap-vertical" size={20} color="#E84142" />
            </View>
          </TouchableOpacity>

          <View style={styles.tokenBox}>
            <Text style={styles.tokenBoxLabel}>To</Text>
            <View style={styles.tokenBoxContent}>
              <TouchableOpacity style={styles.tokenSelector} onPress={() => setShowToSelector(true)}>
                <Image source={{ uri: toToken.icon }} style={styles.selectedTokenIcon} />
                <Text style={styles.selectedTokenSymbol}>{toToken.symbol}</Text>
                <Ionicons name="chevron-down" size={16} color="#9ca3af" />
              </TouchableOpacity>
              <Text style={styles.amountOutput}>{toAmount || '0.0'}</Text>
            </View>
          </View>

          {fromAmount && (
            <View style={styles.rateBox}>
              <Text style={styles.rateText}>
                1 {fromToken.symbol} = {exchangeRate} {toToken.symbol}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network</Text>
            <Text style={styles.detailValue}>Avalanche Fuji (Testnet)</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Slippage</Text>
            <Text style={styles.detailValue}>0.5%</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Est. Gas</Text>
            <Text style={styles.detailValue}>~0.01 AVAX</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.actionButton, !fromAmount && styles.actionButtonDisabled]}
          disabled={!fromAmount}
        >
          <Ionicons name="swap-horizontal" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>{fromAmount ? 'Swap Tokens' : 'Enter Amount'}</Text>
        </TouchableOpacity>

        <Text style={styles.poweredBy}>Powered by Trader Joe DEX</Text>
      </ScrollView>

      <TokenSelector visible={showFromSelector} onSelect={setFromToken} onClose={() => setShowFromSelector(false)} />
      <TokenSelector visible={showToSelector} onSelect={setToToken} onClose={() => setShowToSelector(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#9ca3af' },
  swapCard: { backgroundColor: '#1f2937', borderRadius: 20, padding: 16, marginBottom: 16 },
  tokenBox: { backgroundColor: '#111827', borderRadius: 16, padding: 16 },
  tokenBoxLabel: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  tokenBoxContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tokenSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, gap: 8 },
  selectedTokenIcon: { width: 24, height: 24, borderRadius: 12 },
  selectedTokenSymbol: { fontSize: 16, fontWeight: '600', color: '#fff' },
  amountInput: { flex: 1, fontSize: 24, fontWeight: '600', color: '#fff', textAlign: 'right' },
  amountOutput: { flex: 1, fontSize: 24, fontWeight: '600', color: '#9ca3af', textAlign: 'right' },
  swapButton: { alignItems: 'center', marginVertical: -12, zIndex: 1 },
  swapButtonInner: { backgroundColor: '#1f2937', borderWidth: 4, borderColor: '#111827', borderRadius: 12, padding: 8 },
  rateBox: { alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#374151' },
  rateText: { fontSize: 13, color: '#9ca3af' },
  detailsCard: { backgroundColor: '#1f2937', borderRadius: 16, padding: 16, marginBottom: 20, gap: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, color: '#fff', fontWeight: '500' },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E84142', borderRadius: 16, padding: 18, gap: 8 },
  actionButtonDisabled: { backgroundColor: '#374151' },
  actionButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  poweredBy: { textAlign: 'center', fontSize: 12, color: '#4b5563', marginTop: 16 },
  selectorOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  selectorContainer: { backgroundColor: '#1f2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%' },
  selectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#374151' },
  selectorTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  tokenList: { padding: 12 },
  tokenItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12 },
  tokenIcon: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  tokenInfo: { flex: 1 },
  tokenSymbol: { fontSize: 16, fontWeight: '600', color: '#fff' },
  tokenName: { fontSize: 13, color: '#9ca3af' },
});
