// lib/crypto-polyfill.ts
// Must be imported FIRST before any ethers import
import 'react-native-get-random-values';

// Verify it's working
if (typeof global?.crypto?.getRandomValues === 'function') {
  console.log('✅ Crypto polyfill loaded successfully');
} else {
  console.warn('⚠️ Crypto polyfill may not be working');
}

export {};
