// lib/wallet/config.ts
export const WALLET_CONNECT_PROJECT_ID = 'YOUR_PROJECT_ID'; // Get from https://cloud.walletconnect.com

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
