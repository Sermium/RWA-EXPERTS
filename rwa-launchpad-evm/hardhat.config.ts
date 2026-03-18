import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: { chainId: 31337 },
    avalancheFuji: { url: "https://api.avax-test.network/ext/bc/C/rpc", accounts: [PRIVATE_KEY], chainId: 43113 },
    avalanche: { url: "https://api.avax.network/ext/bc/C/rpc", accounts: [PRIVATE_KEY], chainId: 43114 },
    amoy: { url: "https://rpc-amoy.polygon.technology", accounts: [PRIVATE_KEY], chainId: 80002 },
    polygon: { url: "https://polygon-rpc.com", accounts: [PRIVATE_KEY], chainId: 137 },
    mainnet: { url: "https://eth.llamarpc.com", accounts: [PRIVATE_KEY], chainId: 1 },
    sepolia: { url: "https://rpc.sepolia.org", accounts: [PRIVATE_KEY], chainId: 11155111 },
    arbitrum: { url: "https://arb1.arbitrum.io/rpc", accounts: [PRIVATE_KEY], chainId: 42161 },
    base: { url: "https://mainnet.base.org", accounts: [PRIVATE_KEY], chainId: 8453 },
    optimism: { url: "https://mainnet.optimism.io", accounts: [PRIVATE_KEY], chainId: 10 },
    bsc: { url: "https://bsc-dataseed.binance.org", accounts: [PRIVATE_KEY], chainId: 56 },
    bscTestnet: { url: "https://data-seed-prebsc-1-s1.binance.org:8545", accounts: [PRIVATE_KEY], chainId: 97 },
    cronos: { url: "https://evm.cronos.org", accounts: [PRIVATE_KEY], chainId: 25 },
    cronosTestnet: { url: "https://evm-t3.cronos.org", accounts: [PRIVATE_KEY], chainId: 338 },
  },
  etherscan: {
    apiKey: {
      // Etherscan V2 API - single key works for all these chains
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.ETHERSCAN_API_KEY || "",
      amoy: process.env.ETHERSCAN_API_KEY || "",
      avalanche: process.env.ETHERSCAN_API_KEY || "",
      avalancheFuji: process.env.ETHERSCAN_API_KEY || "",
      arbitrum: process.env.ETHERSCAN_API_KEY || "",
      base: process.env.ETHERSCAN_API_KEY || "",
      optimism: process.env.ETHERSCAN_API_KEY || "",
      bsc: process.env.ETHERSCAN_API_KEY || "",
      bscTestnet: process.env.ETHERSCAN_API_KEY || "",
      // Cronos uses separate Cronoscan API
      cronos: process.env.CRONOSCAN_API_KEY || "",
      cronosTestnet: process.env.CRONOSCAN_API_KEY || "",
    },
    customChains: [
      // Polygon
      {
        network: "amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=80002",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
      {
        network: "polygon",
        chainId: 137,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=137",
          browserURL: "https://polygonscan.com",
        },
      },
      // Avalanche
      {
        network: "avalancheFuji",
        chainId: 43113,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=43113",
          browserURL: "https://testnet.snowtrace.io",
        },
      },
      {
        network: "avalanche",
        chainId: 43114,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=43114",
          browserURL: "https://snowtrace.io",
        },
      },
      // Arbitrum
      {
        network: "arbitrum",
        chainId: 42161,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=42161",
          browserURL: "https://arbiscan.io",
        },
      },
      // Base
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=8453",
          browserURL: "https://basescan.org",
        },
      },
      // Optimism
      {
        network: "optimism",
        chainId: 10,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=10",
          browserURL: "https://optimistic.etherscan.io",
        },
      },
      // BSC
      {
        network: "bsc",
        chainId: 56,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=56",
          browserURL: "https://bscscan.com",
        },
      },
      {
        network: "bscTestnet",
        chainId: 97,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=97",
          browserURL: "https://testnet.bscscan.com",
        },
      },
      // Cronos - NOT part of Etherscan v2
      {
        network: "cronos",
        chainId: 25,
        urls: {
          apiURL: "https://api.cronoscan.com/api",
          browserURL: "https://cronoscan.com",
        },
      },
      {
        network: "cronosTestnet",
        chainId: 338,
        urls: {
          apiURL: "https://cronos.org/explorer/testnet3/api",
          browserURL: "https://cronos.org/explorer/testnet3",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
  mocha: { timeout: 100000 },
  paths: { sources: "./contracts", tests: "./test", cache: "./cache", artifacts: "./artifacts" },
};

export default config;