// lib/contracts/config.ts
export const AVALANCHE_FUJI_CONFIG = {
  chainId: 43113,
  name: 'Avalanche Fuji Testnet',
  rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
  blockExplorer: 'https://testnet.snowtrace.io',
  nativeCurrency: {
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
  },
  // Your deployed contract addresses (update after deployment)
  contracts: {
    rwaToken: '', // RWA Token contract
    marketplace: '', // Marketplace contract
    staking: '', // Staking contract
    governance: '', // Governance contract
  },
  // Testnet tokens
  tokens: {
    USDC: '0x5425890298aed601595a70AB815c96711a31Bc65', // USDC on Fuji
    USDT: '', // Add after deployment
    WAVAX: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', // Wrapped AVAX on Fuji
  },
  // DEX
  dex: {
    traderJoeRouter: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4', // Trader Joe Router
  },
};

export const AVALANCHE_MAINNET_CONFIG = {
  chainId: 43114,
  name: 'Avalanche C-Chain',
  rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
  blockExplorer: 'https://snowtrace.io',
  nativeCurrency: {
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
  },
  contracts: {
    rwaToken: '',
    marketplace: '',
    staking: '',
    governance: '',
  },
  tokens: {
    USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    WAVAX: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
  },
  dex: {
    traderJoeRouter: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
  },
};

// Current active config
export const ACTIVE_CONFIG = AVALANCHE_FUJI_CONFIG;
