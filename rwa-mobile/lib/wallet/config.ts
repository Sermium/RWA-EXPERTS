// lib/wallet/config.ts
import { getConfig } from '../config';

/** WalletConnect / Reown project ID from EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID. Throws if unset. */
export function getWalletConnectProjectId(): string {
  return getConfig().walletConnectProjectId;
}

export const WALLET_METADATA = {
  name: 'RWA Platform',
  description: 'Real-World Asset Trading Platform',
  url: 'https://rwa-platform.com',
  icons: ['https://rwa-platform.com/icon.png'],
};

export const SUPPORTED_CHAINS = [
  'eip155:1',      // Ethereum Mainnet
  'eip155:137',    // Polygon
  'eip155:56',     // BSC
  'eip155:11155111', // Sepolia Testnet
];
