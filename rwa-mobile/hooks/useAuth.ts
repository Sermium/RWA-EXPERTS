// hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { secureStorage } from '../lib/storage';
import { userApi } from '../lib/api';

interface User {
  walletAddress: string;
  name?: string;
  email?: string;
  kycLevel?: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const walletAddress = await secureStorage.get('walletAddress');
      if (walletAddress) {
        setIsConnected(true);
        setUser({ walletAddress });
        
        // Try to fetch profile from backend
        try {
          const { data } = await userApi.getProfile();
          setUser(prev => ({ ...prev, ...data }));
        } catch (error) {
          console.log('Profile fetch skipped');
        }
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const connect = useCallback(async (walletAddress: string) => {
    const normalized = walletAddress.toLowerCase();
    await secureStorage.set('walletAddress', normalized);
    setIsConnected(true);
    setUser({ walletAddress: normalized });
    
    try {
      const { data } = await userApi.getProfile();
      setUser(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.log('Profile fetch skipped');
    }
  }, []);

  const disconnect = useCallback(async () => {
    await secureStorage.remove('walletAddress');
    setUser(null);
    setIsConnected(false);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user?.walletAddress) return;
    try {
      const { data } = await userApi.getProfile();
      setUser(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.log('Refresh failed');
    }
  }, [user?.walletAddress]);

  return {
    user,
    isLoading,
    isConnected,
    connect,
    disconnect,
    refreshUser,
  };
}
