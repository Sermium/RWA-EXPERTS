// lib/storage.ts
import * as SecureStore from 'expo-secure-store';

// Simple in-memory cache for non-sensitive data
const memoryCache: Record<string, string> = {};

// Secure storage for sensitive data (wallet address, tokens)
export const secureStorage = {
  async set(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStore set error:', error);
    }
  },

  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('SecureStore get error:', error);
      return null;
    }
  },

  async remove(key: string) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore remove error:', error);
    }
  },
};

// Regular storage for non-sensitive data (uses memory + AsyncStorage fallback)
export const appStorage = {
  set(key: string, value: any) {
    try {
      memoryCache[key] = JSON.stringify(value);
    } catch (error) {
      console.error('appStorage set error:', error);
    }
  },

  get<T>(key: string): T | null {
    try {
      const value = memoryCache[key];
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('appStorage get error:', error);
      return null;
    }
  },

  remove(key: string) {
    delete memoryCache[key];
  },
};

// Alias for backward compatibility
export const storage = {
  set: (key: string, value: string) => {
    memoryCache[key] = value;
  },
  getString: (key: string): string | undefined => {
    return memoryCache[key];
  },
  delete: (key: string) => {
    delete memoryCache[key];
  },
};
