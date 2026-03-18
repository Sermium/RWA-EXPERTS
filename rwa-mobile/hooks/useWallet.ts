// hooks/useWallet.ts
import { useState, useCallback, useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { secureStorage } from '../lib/storage';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
  });

  // Load saved wallet on mount
  useEffect(() => {
    loadSavedWallet();
  }, []);

  const loadSavedWallet = async () => {
    try {
      const savedAddress = await secureStorage.get('walletAddress');
      if (savedAddress) {
        setState({
          address: savedAddress,
          isConnected: true,
          isConnecting: false,
          chainId: 1,
        });
      }
    } catch (error) {
      console.error('Failed to load saved wallet:', error);
    }
  };

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true }));

    try {
      // For demo/testing: Generate a mock address or use deep link to MetaMask
      // In production, use WalletConnect modal
      
      Alert.alert(
        'Connect Wallet',
        'Choose how to connect:',
        [
          {
            text: 'MetaMask',
            onPress: () => openMetaMask(),
          },
          {
            text: 'Demo Mode',
            onPress: () => connectDemo(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setState(prev => ({ ...prev, isConnecting: false })),
          },
        ]
      );
    } catch (error) {
      console.error('Connection failed:', error);
      setState(prev => ({ ...prev, isConnecting: false }));
      Alert.alert('Error', 'Failed to connect wallet');
    }
  }, []);

  const openMetaMask = async () => {
    const metamaskUrl = 'metamask://';
    const canOpen = await Linking.canOpenURL(metamaskUrl);
    
    if (canOpen) {
      // Deep link to MetaMask
      await Linking.openURL(metamaskUrl);
      // User will need to manually copy address for now
      // Full WalletConnect integration would handle this automatically
      
      Alert.alert(
        'Connect from MetaMask',
        'Please copy your wallet address from MetaMask and paste it here.',
        [
          {
            text: 'I\'ve copied it',
            onPress: () => promptForAddress(),
          },
        ]
      );
    } else {
      Alert.alert(
        'MetaMask Not Found',
        'Please install MetaMask app or use Demo Mode',
        [
          {
            text: 'Install MetaMask',
            onPress: () => Linking.openURL('https://metamask.io/download/'),
          },
          {
            text: 'Use Demo Mode',
            onPress: () => connectDemo(),
          },
        ]
      );
    }
    setState(prev => ({ ...prev, isConnecting: false }));
  };

  const promptForAddress = () => {
    // In a real app, you'd use a TextInput modal
    // For now, use demo mode or implement full WalletConnect
    Alert.prompt(
      'Enter Wallet Address',
      'Paste your Ethereum wallet address:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Connect',
          onPress: async (address) => {
            if (address && address.startsWith('0x') && address.length === 42) {
              await saveAndConnect(address);
            } else {
              Alert.alert('Invalid Address', 'Please enter a valid Ethereum address');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const connectDemo = async () => {
    // Generate a demo wallet address for testing
    const demoAddress = '0x' + Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    
    await saveAndConnect(demoAddress);
  };

  const saveAndConnect = async (address: string) => {
    const normalizedAddress = address.toLowerCase();
    await secureStorage.set('walletAddress', normalizedAddress);
    
    setState({
      address: normalizedAddress,
      isConnected: true,
      isConnecting: false,
      chainId: 1,
    });

    // Register with backend
    try {
      const api = (await import('../lib/api')).default;
      await api.post('/user/register', { walletAddress: normalizedAddress });
    } catch (error) {
      console.log('Backend registration skipped:', error);
    }
  };

  const disconnect = useCallback(async () => {
    await secureStorage.remove('walletAddress');
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      chainId: null,
    });
  }, []);

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return {
    ...state,
    connect,
    disconnect,
    shortenAddress,
  };
}
