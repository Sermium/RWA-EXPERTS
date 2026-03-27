// scripts/deploy-complete.ts
import { ethers, upgrades, network, run } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const ZERO = "0x0000000000000000000000000000000000000000";

// ============================================================================
// MULTI-CHAIN CONFIGURATION
// ============================================================================

interface ChainConfig {
  chainId: number;
  name: string;
  explorerUrl: string;
  explorerApiUrl: string;
  nativeCurrency: string;
  rpcUrl: string;
  tokens: {
    USDC: string;
    USDT: string;
  };
  verificationSupported: boolean;
}

interface PlatformWallets {
  feeReceiver: string;
  liquidityWallet: string;
  treasuryWallet: string;
}

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // ========== AVALANCHE ==========
  43113: {
    chainId: 43113,
    name: "Avalanche Fuji",
    explorerUrl: "https://testnet.snowtrace.io",
    explorerApiUrl: "https://api-testnet.snowtrace.io/api",
    nativeCurrency: "AVAX",
    rpcUrl: process.env.AVALANCHE_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
    tokens: {
      USDC: "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786",
      USDT: "0x224e403397F3aec9a0D2875445dC32dB00ea31C3",
    },
    verificationSupported: true,
  },
  43114: {
    chainId: 43114,
    name: "Avalanche",
    explorerUrl: "https://snowtrace.io",
    explorerApiUrl: "https://api.snowtrace.io/api",
    nativeCurrency: "AVAX",
    rpcUrl: process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
    tokens: {
      USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      USDT: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    },
    verificationSupported: true,
  },

  // ========== POLYGON ==========
  80002: {
    chainId: 80002,
    name: "Polygon Amoy",
    explorerUrl: "https://amoy.polygonscan.com",
    explorerApiUrl: "https://api-amoy.polygonscan.com/api",
    nativeCurrency: "POL",
    rpcUrl: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
    tokens: {
      USDC: "0xEd589B57e559874A5202a0FB82406c46A2116675",
      USDT: "0xfa86C7c30840694293a5c997f399d00A4eD3cDD8",
    },
    verificationSupported: true,
  },
  137: {
    chainId: 137,
    name: "Polygon",
    explorerUrl: "https://polygonscan.com",
    explorerApiUrl: "https://api.polygonscan.com/api",
    nativeCurrency: "POL",
    rpcUrl: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
    tokens: {
      USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    },
    verificationSupported: true,
  },

  // ========== ETHEREUM ==========
  1: {
    chainId: 1,
    name: "Ethereum",
    explorerUrl: "https://etherscan.io",
    explorerApiUrl: "https://api.etherscan.io/api",
    nativeCurrency: "ETH",
    rpcUrl: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
    tokens: {
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    },
    verificationSupported: true,
  },
  11155111: {
    chainId: 11155111,
    name: "Sepolia",
    explorerUrl: "https://sepolia.etherscan.io",
    explorerApiUrl: "https://api-sepolia.etherscan.io/api",
    nativeCurrency: "ETH",
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
    tokens: {
      USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      USDT: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06",
    },
    verificationSupported: true,
  },

  // ========== ARBITRUM ==========
  42161: {
    chainId: 42161,
    name: "Arbitrum One",
    explorerUrl: "https://arbiscan.io",
    explorerApiUrl: "https://api.arbiscan.io/api",
    nativeCurrency: "ETH",
    rpcUrl: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
    tokens: {
      USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    },
    verificationSupported: true,
  },
  421614: {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    explorerUrl: "https://sepolia.arbiscan.io",
    explorerApiUrl: "https://api-sepolia.arbiscan.io/api",
    nativeCurrency: "ETH",
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
    tokens: {
      USDC: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      USDT: "0x0000000000000000000000000000000000000000",
    },
    verificationSupported: true,
  },

  // ========== BASE ==========
  8453: {
    chainId: 8453,
    name: "Base",
    explorerUrl: "https://basescan.org",
    explorerApiUrl: "https://api.basescan.org/api",
    nativeCurrency: "ETH",
    rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    tokens: {
      USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      USDT: "0x0000000000000000000000000000000000000000",
    },
    verificationSupported: true,
  },
  84532: {
    chainId: 84532,
    name: "Base Sepolia",
    explorerUrl: "https://sepolia.basescan.org",
    explorerApiUrl: "https://api-sepolia.basescan.org/api",
    nativeCurrency: "ETH",
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    tokens: {
      USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      USDT: "0x0000000000000000000000000000000000000000",
    },
    verificationSupported: true,
  },

  // ========== OPTIMISM ==========
  10: {
    chainId: 10,
    name: "Optimism",
    explorerUrl: "https://optimistic.etherscan.io",
    explorerApiUrl: "https://api-optimistic.etherscan.io/api",
    nativeCurrency: "ETH",
    rpcUrl: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
    tokens: {
      USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    },
    verificationSupported: true,
  },

  // ========== BNB CHAIN ==========
  56: {
    chainId: 56,
    name: "BNB Chain",
    explorerUrl: "https://bscscan.com",
    explorerApiUrl: "https://api.bscscan.com/api",
    nativeCurrency: "BNB",
    rpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org",
    tokens: {
      USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      USDT: "0x55d398326f99059fF775485246999027B3197955",
    },
    verificationSupported: true,
  },
  97: {
    chainId: 97,
    name: "BNB Testnet",
    explorerUrl: "https://testnet.bscscan.com",
    explorerApiUrl: "https://api-testnet.bscscan.com/api",
    nativeCurrency: "tBNB",
    rpcUrl: process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545",
    tokens: {
      USDC: "0x64544969ed7EBf5f083679233325356EbE738930",
      USDT: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
    },
    verificationSupported: true,
  },

  // ========== CRONOS ==========
  25: {
    chainId: 25,
    name: "Cronos",
    explorerUrl: "https://cronoscan.com",
    explorerApiUrl: "https://api.cronoscan.com/api",
    nativeCurrency: "CRO",
    rpcUrl: process.env.CRONOS_RPC_URL || "https://evm.cronos.org",
    tokens: {
      USDC: "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59",
      USDT: "0x66e428c3f67a68878562e79A0234c1F83c208770",
    },
    verificationSupported: true,
  },
  338: {
    chainId: 338,
    name: "Cronos Testnet",
    explorerUrl: "https://testnet.cronoscan.com",
    explorerApiUrl: "https://api-testnet.cronoscan.com/api",
    nativeCurrency: "tCRO",
    rpcUrl: process.env.CRONOS_TESTNET_RPC_URL || "https://evm-t3.cronos.org",
    tokens: {
      USDC: "0x0000000000000000000000000000000000000000",
      USDT: "0x0000000000000000000000000000000000000000",
    },
    verificationSupported: true,
  },

  // ========== LOCAL ==========
  31337: {
    chainId: 31337,
    name: "Hardhat",
    explorerUrl: "",
    explorerApiUrl: "",
    nativeCurrency: "ETH",
    rpcUrl: "http://127.0.0.1:8545",
    tokens: {
      USDC: "0x0000000000000000000000000000000000000000",
      USDT: "0x0000000000000000000000000000000000000000",
    },
    verificationSupported: false,
  },
};

// Platform wallets per chain - UPDATE FOR PRODUCTION
const PLATFORM_WALLETS: Record<number, PlatformWallets> = {
  // Mainnet - MUST SET BEFORE MAINNET DEPLOYMENT
  43114: {
    feeReceiver: "",      // 34% USDT - operational fees
    liquidityWallet: "",  // 33% USDT + 50% tokens - Exchange MM
    treasuryWallet: "",   // 33% USDT + 50% tokens - holdings
  },
  137: {
    feeReceiver: "",
    liquidityWallet: "",
    treasuryWallet: "",
  },
  1: {
    feeReceiver: "",
    liquidityWallet: "",
    treasuryWallet: "",
  },
  42161: {
    feeReceiver: "",
    liquidityWallet: "",
    treasuryWallet: "",
  },
  8453: {
    feeReceiver: "",
    liquidityWallet: "",
    treasuryWallet: "",
  },
  10: {
    feeReceiver: "",
    liquidityWallet: "",
    treasuryWallet: "",
  },
  56: {
    feeReceiver: "",
    liquidityWallet: "",
    treasuryWallet: "",
  },
  25: {
    feeReceiver: "",
    liquidityWallet: "",
    treasuryWallet: "",
  },
  // Testnets - will use deployer if empty
  43113: { feeReceiver: "", liquidityWallet: "", treasuryWallet: "" },
  80002: { feeReceiver: "", liquidityWallet: "", treasuryWallet: "" },
  11155111: { feeReceiver: "", liquidityWallet: "", treasuryWallet: "" },
  421614: { feeReceiver: "", liquidityWallet: "", treasuryWallet: "" },
  84532: { feeReceiver: "", liquidityWallet: "", treasuryWallet: "" },
  97: { feeReceiver: "", liquidityWallet: "", treasuryWallet: "" },
  338: { feeReceiver: "", liquidityWallet: "", treasuryWallet: "" },
  31337: { feeReceiver: "", liquidityWallet: "", treasuryWallet: "" },
};

// ============================================================================
// DEPLOYMENT CONFIGURATION
// ============================================================================

interface DeploymentConfig {
  CREATION_FEE: bigint;
  PLATFORM_FEE_BPS: number;
  FEE_RECIPIENT: string;
  FRONTEND_CONFIG_PATH: string;
  VERIFY_CONTRACTS: boolean;
  VERIFICATION_DELAY_MS: number;
  ESCROW_TRANSACTION_FEE_BPS: number;
  KYC_SIGNER_ADDRESS: string;
  KYC_VALIDITY_DAYS: number;
  DEFAULT_MIN_KYC_LEVEL: number;
  DEFAULT_RESTRICTED_COUNTRIES: number[];
  // Crowdfunding specific
  CROWDFUNDING_PLATFORM_USDT_FEE_BPS: number;  // 1.5% = 150
  CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS: number; // 1% = 100
  CROWDFUNDING_CLAIM_FEE_BPS: number;          // Claim fee for investors
}

const DEPLOY_CONFIG: DeploymentConfig = {
  CREATION_FEE: ethers.parseEther(process.env.CREATION_FEE || "0.01"),
  PLATFORM_FEE_BPS: parseInt(process.env.PLATFORM_FEE_BPS || "250"),
  FEE_RECIPIENT: process.env.FEE_RECIPIENT || "",
  FRONTEND_CONFIG_PATH: process.env.FRONTEND_CONFIG_PATH || "../src/config/contracts.ts",
  VERIFY_CONTRACTS: process.env.VERIFY_CONTRACTS !== "false",
  VERIFICATION_DELAY_MS: parseInt(process.env.VERIFICATION_DELAY_MS || "30000"),
  ESCROW_TRANSACTION_FEE_BPS: parseInt(process.env.ESCROW_TRANSACTION_FEE_BPS || "100"),
  KYC_SIGNER_ADDRESS: process.env.NEXT_PUBLIC_ADMIN_ADDRESS || "",
  KYC_VALIDITY_DAYS: parseInt(process.env.KYC_VALIDITY_DAYS || "365"),
  DEFAULT_MIN_KYC_LEVEL: parseInt(process.env.DEFAULT_MIN_KYC_LEVEL || "1"),
  DEFAULT_RESTRICTED_COUNTRIES: [408, 364, 760, 192],
  // Crowdfunding fees
  CROWDFUNDING_PLATFORM_USDT_FEE_BPS: 150,  // 1.5%
  CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS: 100, // 1%
  CROWDFUNDING_CLAIM_FEE_BPS: 0,            // No claim fee by default
};

// ============================================================================
// DEPLOYMENT STATE
// ============================================================================

interface DeploymentState {
  network: string;
  chainId: number;
  deployer: string;
  timestamp: string;
  feeRecipient: string;
  // Platform wallets
  platformWallets?: {
    feeReceiver: string;
    liquidityWallet: string;
    treasuryWallet: string;
  };
  // KYC
  kycVerifier?: string;
  kycVerifierImpl?: string;
  // Implementations
  securityTokenImpl?: string;
  escrowVaultImpl?: string;
  complianceImpl?: string;
  projectNFTImpl?: string;
  offChainManagerImpl?: string;
  exchangeImpl?: string;
  dividendDistributorImpl?: string;
  maxBalanceModuleImpl?: string;
  lockupModuleImpl?: string;
  rwaTradeEscrowImpl?: string;
  platformFeeManagerImpl?: string;
  disputeManagerImpl?: string;
  // Proxies
  projectNFT?: string;
  projectNFTProxyImpl?: string;
  factory?: string;
  factoryImpl?: string;
  escrowVault?: string;
  escrowVaultProxyImpl?: string;
  platformFeeManager?: string;
  platformFeeManagerProxyImpl?: string;
  disputeManager?: string;
  disputeManagerProxyImpl?: string;
  offChainManager?: string;
  offChainManagerProxyImpl?: string;
  exchange?: string;
  exchangeProxyImpl?: string;
  tokenizationFactory?: string;
  tokenizationFactoryImpl?: string;
  countryRestrictModule?: string;
  countryRestrictModuleImpl?: string;
  accreditedInvestorModule?: string;
  accreditedInvestorModuleImpl?: string;
  // Config
  acceptedTokens?: {
    USDC: string;
    USDT: string;
  };
  rolesConfigured?: boolean;
  kycVerifierConfigured?: boolean;
  crowdfundingRolesConfigured?: boolean;
  verified?: boolean;
  verificationResults?: { contract: string; address: string; status: string }[];
}

// ============================================================================
// UTILITIES
// ============================================================================

function getChainConfig(chainId: number): ChainConfig {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}. Add configuration to CHAIN_CONFIGS.`);
  }
  return config;
}

function getPlatformWallets(chainId: number, deployer: string): PlatformWallets {
  const wallets = PLATFORM_WALLETS[chainId] || { feeReceiver: "", liquidityWallet: "", treasuryWallet: "" };
  return {
    feeReceiver: wallets.feeReceiver || deployer,
    liquidityWallet: wallets.liquidityWallet || deployer,
    treasuryWallet: wallets.treasuryWallet || deployer,
  };
}

function log(message: string, indent: number = 0) {
  const prefix = "  ".repeat(indent);
  console.log(`${prefix}${message}`);
}

function logSection(title: string) {
  console.log("\n" + "=".repeat(70));
  console.log(`  ${title}`);
  console.log("=".repeat(70) + "\n");
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function logError(message: string) {
  console.log(`❌ ${message}`);
}

function logWarning(message: string) {
  console.log(`⚠️  ${message}`);
}

function logInfo(message: string) {
  console.log(`ℹ️  ${message}`);
}

function getCheckpointPath(chainId: number): string {
  return `deployments/.checkpoint-${chainId}.json`;
}

function saveCheckpoint(chainId: number, phase: number, step: number, state: Partial<DeploymentState>) {
  const checkpoint = {
    phase,
    step,
    state,
    timestamp: new Date().toISOString(),
  };

  if (!fs.existsSync("deployments")) {
    fs.mkdirSync("deployments", { recursive: true });
  }

  fs.writeFileSync(getCheckpointPath(chainId), JSON.stringify(checkpoint, null, 2));
  log(`💾 Checkpoint saved: Phase ${phase}, Step ${step}`);
}

function loadCheckpoint(chainId: number): { phase: number; step: number; state: Partial<DeploymentState> } | null {
  const checkpointPath = getCheckpointPath(chainId);
  if (fs.existsSync(checkpointPath)) {
    try {
      const data = fs.readFileSync(checkpointPath, "utf8");
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function clearCheckpoint(chainId: number) {
  const checkpointPath = getCheckpointPath(chainId);
  if (fs.existsSync(checkpointPath)) {
    fs.unlinkSync(checkpointPath);
    log("🗑️  Checkpoint cleared");
  }
}

async function verifyContract(
  address: string,
  constructorArguments: unknown[] = [],
  contractPath?: string
): Promise<boolean> {
  log(`\n🔍 Verifying contract at ${address}...`);

  try {
    const verifyArgs: { address: string; constructorArguments: unknown[]; contract?: string } = {
      address,
      constructorArguments,
    };

    if (contractPath) {
      verifyArgs.contract = contractPath;
    }

    await run("verify:verify", verifyArgs);
    logSuccess(`Contract verified successfully`);
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Already Verified") || errorMessage.includes("already verified")) {
      logSuccess(`Contract already verified`);
      return true;
    }
    logWarning(`Verification failed: ${errorMessage}`);
    return false;
  }
}

async function verifyProxyImplementation(proxyAddress: string, contractPath: string): Promise<boolean> {
  try {
    const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    log(`   Implementation address: ${implAddress}`);
    return await verifyContract(implAddress, [], contractPath);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logWarning(`Could not verify proxy implementation: ${errorMessage}`);
    return false;
  }
}

async function deployImplementation(name: string): Promise<string> {
  log(`📦 Deploying ${name} implementation...`);
  const Factory = await ethers.getContractFactory(name);

  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice ? (feeData.gasPrice * 150n) / 100n : undefined;

  const contract = await Factory.deploy({
    gasPrice: gasPrice,
    gasLimit: 10000000,
  });

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  logSuccess(`${name} impl: ${address}`);
  return address;
}

async function deployProxy(
  name: string,
  args: unknown[],
  opts: { initializer?: string; kind?: "uups" | "transparent" } = {}
): Promise<{ proxy: string; impl: string }> {
  log(`📦 Deploying ${name} proxy...`);
  const Factory = await ethers.getContractFactory(name);
  
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice ? (feeData.gasPrice * 150n) / 100n : undefined;
  
  const proxy = await upgrades.deployProxy(Factory, args, {
    initializer: opts.initializer || "initialize",
    kind: opts.kind || "uups",
    txOverrides: { gasPrice },
  });
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  logSuccess(`${name} proxy: ${proxyAddress}`);
  log(`   Implementation: ${implAddress}`, 1);
  return { proxy: proxyAddress, impl: implAddress };
}

// ============================================================================
// MAIN DEPLOYMENT FUNCTION
// ============================================================================

async function main() {
  logSection("RWA LAUNCHPAD - MULTI-CHAIN DEPLOYMENT (v3 - Crowdfunding + Disputes)");

  const [deployer] = await ethers.getSigners();
  const networkInfo = await ethers.provider.getNetwork();
  const chainId = Number(networkInfo.chainId);

  const chainConfig = getChainConfig(chainId);
  const platformWallets = getPlatformWallets(chainId, deployer.address);

  if (!DEPLOY_CONFIG.KYC_SIGNER_ADDRESS || DEPLOY_CONFIG.KYC_SIGNER_ADDRESS === "") {
    logError("NEXT_PUBLIC_ADMIN_ADDRESS (KYC signer) is required!");
    logInfo("Set it in your .env file");
    process.exit(1);
  }

  // Chain-specific banners
  if (chainId === 43113 || chainId === 43114) {
    console.log(`
    🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺
    🔺          DEPLOYING TO AVALANCHE ${chainId === 43113 ? "FUJI TESTNET" : "MAINNET    "}            🔺
    🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺
    `);
  } else if (chainId === 25 || chainId === 338) {
    console.log(`
    🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷
    🔷          DEPLOYING TO CRONOS ${chainId === 338 ? "TESTNET " : "MAINNET "}                  🔷
    🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷
    `);
  }

  log(`🌐 Network: ${chainConfig.name} (Chain ID: ${chainId})`);
  log(`👤 Deployer: ${deployer.address}`);
  log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ${chainConfig.nativeCurrency}`);
  log(`🔗 Explorer: ${chainConfig.explorerUrl}`);
  log(`🔐 KYC Signer: ${DEPLOY_CONFIG.KYC_SIGNER_ADDRESS}`);

  log("\n💰 Platform Wallets (Crowdfunding):");
  log(`   Fee Receiver:     ${platformWallets.feeReceiver} (34% USDT)`);
  log(`   Liquidity Wallet: ${platformWallets.liquidityWallet} (33% USDT + 50% tokens)`);
  log(`   Treasury Wallet:  ${platformWallets.treasuryWallet} (33% USDT + 50% tokens)`);

  const balance = await ethers.provider.getBalance(deployer.address);
  const minBalances: Record<number, bigint> = {
    43113: ethers.parseEther("2"),
    43114: ethers.parseEther("5"),
    338: ethers.parseEther("100"),
    25: ethers.parseEther("500"),
  };
  const minBalance = minBalances[chainId] || ethers.parseEther("1");

  if (balance < minBalance) {
    logWarning(`Low balance! Recommended minimum: ${ethers.formatEther(minBalance)} ${chainConfig.nativeCurrency}`);
    if (chainId === 43113) {
      logInfo(`Get test AVAX from: https://faucet.avax.network/`);
    } else if (chainId === 338) {
      logInfo(`Get test CRO from: https://cronos.org/faucet`);
    }
  }

  const feeRecipient = DEPLOY_CONFIG.FEE_RECIPIENT || deployer.address;
  log(`\n💸 Fee Recipient: ${feeRecipient}`);
  log(`💵 Creation Fee: ${ethers.formatEther(DEPLOY_CONFIG.CREATION_FEE)} ${chainConfig.nativeCurrency}`);
  log(`💵 Escrow Transaction Fee: ${DEPLOY_CONFIG.ESCROW_TRANSACTION_FEE_BPS / 100}%`);
  log(`💵 Crowdfunding Platform USDT Fee: ${DEPLOY_CONFIG.CROWDFUNDING_PLATFORM_USDT_FEE_BPS / 100}%`);
  log(`💵 Crowdfunding Platform Token Fee: ${DEPLOY_CONFIG.CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS / 100}%`);
  logInfo(`KYC is handled off-chain via Supabase + signature verification`);

  const checkpoint = loadCheckpoint(chainId);
  let state: Partial<DeploymentState>;
  let startPhase = 1;
  let startStep = 1;

  if (checkpoint) {
    logWarning(`Found checkpoint from previous deployment`);
    logWarning(`Resuming from Phase ${checkpoint.phase}, Step ${checkpoint.step}`);
    state = checkpoint.state;
    startPhase = checkpoint.phase;
    startStep = checkpoint.step;
  } else {
    state = {
      network: chainConfig.name,
      chainId: chainId,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      feeRecipient: feeRecipient,
      platformWallets: platformWallets,
      rolesConfigured: false,
      kycVerifierConfigured: false,
      crowdfundingRolesConfigured: false,
      verified: false,
    };
  }

  // ==========================================================================
  // PHASE 1: KYC VERIFIER
  // ==========================================================================

  if (startPhase <= 1) {
    logSection("PHASE 1: KYC VERIFIER");

    if (!state.kycVerifier) {
      log("1. Deploying KYCVerifier proxy...");

      const registrationFee = DEPLOY_CONFIG.CREATION_FEE;

      const { proxy, impl } = await deployProxy("KYCVerifier", [
        DEPLOY_CONFIG.KYC_SIGNER_ADDRESS,
        registrationFee,
        feeRecipient,
      ]);

      state.kycVerifier = proxy;
      state.kycVerifierImpl = impl;
      saveCheckpoint(chainId, 1, 1, state);

      log("2. Verifying KYCVerifier configuration...");
      const kycVerifier = await ethers.getContractAt("KYCVerifier", state.kycVerifier);

      const trustedSigner = await kycVerifier.trustedSigner();
      const fee = await kycVerifier.registrationFee();
      const recipient = await kycVerifier.feeRecipient();

      logSuccess(`Trusted Signer: ${trustedSigner}`);
      logSuccess(`Registration Fee: ${ethers.formatEther(fee)} ${chainConfig.nativeCurrency}`);
      logSuccess(`Fee Recipient: ${recipient}`);

      saveCheckpoint(chainId, 1, 2, state);
    }
  }

  // ==========================================================================
  // PHASE 2: IMPLEMENTATION CONTRACTS
  // ==========================================================================

  if (startPhase <= 2) {
    logSection("PHASE 2: IMPLEMENTATION CONTRACTS");

    const implementations = [
      { key: "securityTokenImpl", name: "RWASecurityToken", step: 3 },
      { key: "escrowVaultImpl", name: "RWAEscrowVault", step: 4 },
      { key: "complianceImpl", name: "ModularCompliance", step: 5 },
      { key: "projectNFTImpl", name: "RWAProjectNFT", step: 6 },
      { key: "offChainManagerImpl", name: "OffChainInvestmentManager", step: 7 },
      { key: "exchangeImpl", name: "RWASecurityExchange", step: 8 },
      { key: "dividendDistributorImpl", name: "DividendDistributor", step: 9 },
      { key: "maxBalanceModuleImpl", name: "MaxBalanceModule", step: 10 },
      { key: "lockupModuleImpl", name: "LockupModule", step: 11 },
      { key: "rwaTradeEscrowImpl", name: "RWATradeEscrow", step: 12 },
      { key: "platformFeeManagerImpl", name: "PlatformFeeManager", step: 13 },
      { key: "disputeManagerImpl", name: "DisputeManager", step: 14 },
    ];

    for (const impl of implementations) {
      if (!(state as Record<string, unknown>)[impl.key]) {
        log(`${impl.step}. Deploying ${impl.name} implementation...`);
        try {
          const address = await deployImplementation(impl.name);
          (state as Record<string, unknown>)[impl.key] = address;
          saveCheckpoint(chainId, 2, impl.step, state);
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          logWarning(`Could not deploy ${impl.name}: ${errorMessage}`);
        }
      } else {
        logSuccess(`${impl.name} impl already deployed: ${(state as Record<string, unknown>)[impl.key]}`);
      }
    }
  }

  // ==========================================================================
  // PHASE 3: PROJECT NFT PROXY
  // ==========================================================================

  if (startPhase <= 3) {
    logSection("PHASE 3: PROJECT NFT PROXY");

    if (!state.projectNFT) {
      log("15. Deploying RWAProjectNFT proxy...");
      const { proxy } = await deployProxy("RWAProjectNFT", [
        "RWA Project NFT",
        "RWANFT",
        deployer.address,
      ]);
      state.projectNFT = proxy;
      saveCheckpoint(chainId, 3, 15, state);
    } else {
      logSuccess(`RWAProjectNFT proxy already deployed: ${state.projectNFT}`);
    }
  }

  // ==========================================================================
  // PHASE 4: PLATFORM FEE MANAGER PROXY
  // ==========================================================================

  if (startPhase <= 4) {
    logSection("PHASE 4: PLATFORM FEE MANAGER PROXY");

    if (!state.platformFeeManager) {
      log("16. Deploying PlatformFeeManager proxy...");
      const { proxy, impl } = await deployProxy("PlatformFeeManager", [
        deployer.address,
        platformWallets.feeReceiver,
        platformWallets.liquidityWallet,
        platformWallets.treasuryWallet,
      ]);
      state.platformFeeManager = proxy;
      state.platformFeeManagerProxyImpl = impl;
      saveCheckpoint(chainId, 4, 16, state);
    } else {
      logSuccess(`PlatformFeeManager proxy already deployed: ${state.platformFeeManager}`);
    }
  }

  // ==========================================================================
  // PHASE 5: ESCROW VAULT PROXY
  // ==========================================================================

  if (startPhase <= 5) {
    logSection("PHASE 5: ESCROW VAULT PROXY");

    if (!state.escrowVault) {
      log("17. Deploying RWAEscrowVault proxy...");
      const { proxy, impl } = await deployProxy("RWAEscrowVault", [
        deployer.address,
        state.platformFeeManager,
        state.projectNFT,
      ]);
      state.escrowVault = proxy;
      state.escrowVaultProxyImpl = impl;
      saveCheckpoint(chainId, 5, 17, state);

      log("18. Configuring EscrowVault...");
      const escrowVault = await ethers.getContractAt("RWAEscrowVault", state.escrowVault);

      // Set KYC Verifier
      try {
        const tx1 = await escrowVault.setKYCVerifier(state.kycVerifier);
        await tx1.wait();
        logSuccess("KYCVerifier set on EscrowVault");
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logWarning(`Could not set KYCVerifier: ${errorMessage}`);
      }

      // Set Payment Tokens
      if (chainConfig.tokens.USDC !== ZERO) {
        try {
          const usdt = chainConfig.tokens.USDT !== ZERO ? chainConfig.tokens.USDT : chainConfig.tokens.USDC;
          const tx2 = await escrowVault.setPaymentTokens(chainConfig.tokens.USDC, usdt);
          await tx2.wait();
          logSuccess(`Payment tokens set: USDC=${chainConfig.tokens.USDC}, USDT=${usdt}`);
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          logWarning(`Could not set payment tokens: ${errorMessage}`);
        }
      }

      // Set claim fee if configured
      if (DEPLOY_CONFIG.CROWDFUNDING_CLAIM_FEE_BPS > 0) {
        try {
          const tx3 = await escrowVault.setClaimFee(DEPLOY_CONFIG.CROWDFUNDING_CLAIM_FEE_BPS);
          await tx3.wait();
          logSuccess(`Claim fee set: ${DEPLOY_CONFIG.CROWDFUNDING_CLAIM_FEE_BPS / 100}%`);
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          logWarning(`Could not set claim fee: ${errorMessage}`);
        }
      }

      saveCheckpoint(chainId, 5, 18, state);
    } else {
      logSuccess(`RWAEscrowVault proxy already deployed: ${state.escrowVault}`);
    }
  }

  // ==========================================================================
  // PHASE 6: DISPUTE MANAGER PROXY
  // ==========================================================================

  if (startPhase <= 6) {
    logSection("PHASE 6: DISPUTE MANAGER PROXY");

    if (!state.disputeManager) {
      log("19. Deploying DisputeManager proxy...");
      const { proxy, impl } = await deployProxy("DisputeManager", [
        deployer.address,
        state.escrowVault,
      ]);
      state.disputeManager = proxy;
      state.disputeManagerProxyImpl = impl;
      saveCheckpoint(chainId, 6, 19, state);
    } else {
      logSuccess(`DisputeManager proxy already deployed: ${state.disputeManager}`);
    }
  }

  // ==========================================================================
  // PHASE 7: FACTORY DEPLOYMENT
  // ==========================================================================

  if (startPhase <= 7) {
    logSection("PHASE 7: LAUNCHPAD FACTORY DEPLOYMENT");

    if (!state.factory) {
      log("20. Deploying RWALaunchpadFactory...");
      const { proxy, impl } = await deployProxy("RWALaunchpadFactory", [
        deployer.address,
        state.securityTokenImpl,
        state.escrowVaultImpl,
        state.complianceImpl,
        state.kycVerifier,
        state.projectNFT,
        feeRecipient,
      ]);
      state.factory = proxy;
      state.factoryImpl = impl;
      saveCheckpoint(chainId, 7, 20, state);
    } else {
      logSuccess(`RWALaunchpadFactory proxy already deployed: ${state.factory}`);
      if (!state.factoryImpl) {
        state.factoryImpl = await upgrades.erc1967.getImplementationAddress(state.factory);
      }
    }

    log("21. Setting additional implementations on factory...");
    const factory = await ethers.getContractAt("RWALaunchpadFactory", state.factory!);

    const implSetters = [
      { method: "setDividendDistributorImplementation", impl: state.dividendDistributorImpl, name: "DividendDistributor" },
      { method: "setMaxBalanceModuleImplementation", impl: state.maxBalanceModuleImpl, name: "MaxBalanceModule" },
      { method: "setLockupModuleImplementation", impl: state.lockupModuleImpl, name: "LockupModule" },
    ];

    for (const setter of implSetters) {
      if (setter.impl) {
        try {
          const tx = await (factory as unknown as Record<string, (addr: string) => Promise<{ wait: () => Promise<void> }>>)[setter.method](setter.impl);
          await tx.wait();
          logSuccess(`${setter.name} implementation set`);
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          if (errorMessage.includes("already set") || errorMessage.includes("same address")) {
            logSuccess(`${setter.name} implementation already set`);
          } else {
            logWarning(`Could not set ${setter.name} implementation: ${errorMessage}`);
          }
        }
      }
    }

    saveCheckpoint(chainId, 7, 21, state);
  }

  // ==========================================================================
  // PHASE 8: AUXILIARY CONTRACTS
  // ==========================================================================

  if (startPhase <= 8) {
    logSection("PHASE 8: AUXILIARY CONTRACTS");

    if (!state.offChainManager) {
      log("22. Deploying OffChainInvestmentManager proxy...");
      const { proxy } = await deployProxy("OffChainInvestmentManager", [
        deployer.address,
        state.projectNFT,
        state.kycVerifier,
      ]);
      state.offChainManager = proxy;
      saveCheckpoint(chainId, 8, 22, state);
    } else {
      logSuccess(`OffChainInvestmentManager proxy already deployed: ${state.offChainManager}`);
    }

    if (!state.exchange) {
      log("23. Deploying RWASecurityExchange proxy...");
      const { proxy } = await deployProxy("RWASecurityExchange", [
        deployer.address,
        state.kycVerifier,
        chainConfig.tokens.USDC,
        feeRecipient,
      ]);
      state.exchange = proxy;
      saveCheckpoint(chainId, 8, 23, state);

      if (chainConfig.tokens.USDT !== ethers.ZeroAddress && chainConfig.tokens.USDT !== ZERO) {
        log("24. Configuring exchange payment tokens...");
        const exchange = await ethers.getContractAt("RWASecurityExchange", state.exchange);
        await exchange.setAcceptedPaymentToken(chainConfig.tokens.USDT, true);
        logSuccess("USDT added as accepted payment token");
      }

      state.acceptedTokens = chainConfig.tokens;
      saveCheckpoint(chainId, 8, 24, state);
    } else {
      logSuccess(`RWASecurityExchange proxy already deployed: ${state.exchange}`);
    }
  }

  // ==========================================================================
  // PHASE 9: COMPLIANCE MODULES
  // ==========================================================================

  if (startPhase <= 9) {
    logSection("PHASE 9: COMPLIANCE MODULES");

    if (!state.countryRestrictModule) {
      log("25. Deploying CountryRestrictModule proxy...");
      const { proxy, impl } = await deployProxy("CountryRestrictModule", [state.kycVerifier]);
      state.countryRestrictModule = proxy;
      state.countryRestrictModuleImpl = impl;
      saveCheckpoint(chainId, 9, 25, state);
    } else {
      logSuccess(`CountryRestrictModule proxy already deployed: ${state.countryRestrictModule}`);
    }

    if (!state.accreditedInvestorModule) {
      log("26. Deploying AccreditedInvestorModule proxy...");
      const { proxy, impl } = await deployProxy("AccreditedInvestorModule", [state.kycVerifier]);
      state.accreditedInvestorModule = proxy;
      state.accreditedInvestorModuleImpl = impl;
      saveCheckpoint(chainId, 9, 26, state);
    } else {
      logSuccess(`AccreditedInvestorModule proxy already deployed: ${state.accreditedInvestorModule}`);
    }
  }

  // ==========================================================================
  // PHASE 10: TOKENIZATION FACTORY DEPLOYMENT
  // ==========================================================================

  if (startPhase <= 10) {
    logSection("PHASE 10: TOKENIZATION FACTORY DEPLOYMENT");
    logInfo("Note: Deployment fees are collected off-chain via the /pay page");

    if (!state.tokenizationFactory) {
      log("27. Deploying RWATokenizationFactory proxy...");

      const { proxy, impl } = await deployProxy("RWATokenizationFactory", [
        deployer.address,
        state.securityTokenImpl,
        state.projectNFTImpl,
        state.complianceImpl,
        state.kycVerifier,
        feeRecipient,
      ]);

      state.tokenizationFactory = proxy;
      state.tokenizationFactoryImpl = impl;
      saveCheckpoint(chainId, 10, 27, state);

      log("28. Setting Trade Escrow implementation on TokenizationFactory...");
      const tokenizationFactory = await ethers.getContractAt("RWATokenizationFactory", state.tokenizationFactory);

      if (state.rwaTradeEscrowImpl) {
        try {
          const tx1 = await tokenizationFactory.setImplementation(3, state.rwaTradeEscrowImpl);
          await tx1.wait();
          logSuccess("Trade Escrow implementation set");
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          logWarning(`Could not set Trade Escrow: ${errorMessage}`);
        }
      }
      saveCheckpoint(chainId, 10, 28, state);

      log("29. Setting Dividend Distributor implementation on TokenizationFactory...");
      if (state.dividendDistributorImpl) {
        try {
          const tx2 = await tokenizationFactory.setImplementation(4, state.dividendDistributorImpl);
          await tx2.wait();
          logSuccess("Dividend Distributor implementation set");
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          logWarning(`Could not set Dividend Distributor: ${errorMessage}`);
        }
      }
      saveCheckpoint(chainId, 10, 29, state);

      log("30. Setting escrow transaction fee on TokenizationFactory...");
      try {
        const tx3 = await tokenizationFactory.setEscrowTransactionFee(DEPLOY_CONFIG.ESCROW_TRANSACTION_FEE_BPS);
        await tx3.wait();
        logSuccess(`Escrow transaction fee set: ${DEPLOY_CONFIG.ESCROW_TRANSACTION_FEE_BPS / 100}%`);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logWarning(`Could not set escrow transaction fee: ${errorMessage}`);
      }
      saveCheckpoint(chainId, 10, 30, state);

      log("31. Approving deployer on TokenizationFactory...");
      try {
        const tx4 = await tokenizationFactory.setDeployerApproval(deployer.address, true);
        await tx4.wait();
        logSuccess(`Deployer approved: ${deployer.address}`);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logWarning(`Could not approve deployer: ${errorMessage}`);
      }
      saveCheckpoint(chainId, 10, 31, state);
    } else {
      logSuccess(`RWATokenizationFactory already deployed: ${state.tokenizationFactory}`);
      if (!state.tokenizationFactoryImpl) {
        state.tokenizationFactoryImpl = await upgrades.erc1967.getImplementationAddress(state.tokenizationFactory);
      }
    }
  }

  // ==========================================================================
  // PHASE 11: ROLE CONFIGURATION
  // ==========================================================================

  if (startPhase <= 11 && !state.rolesConfigured) {
    logSection("PHASE 11: ROLE CONFIGURATION");

    const projectNFT = await ethers.getContractAt("RWAProjectNFT", state.projectNFT!);
    const exchange = await ethers.getContractAt("RWASecurityExchange", state.exchange!);

    const MINTER_ROLE = await projectNFT.MINTER_ROLE();
    const MANAGER_ROLE = await projectNFT.MANAGER_ROLE();
    const FACTORY_ROLE = await exchange.FACTORY_ROLE();

    log("Configuring roles...");

    const roleAssignments = [
      { contract: projectNFT, role: MINTER_ROLE, account: state.factory!, name: "MINTER_ROLE to Launchpad Factory on ProjectNFT" },
      { contract: projectNFT, role: MANAGER_ROLE, account: state.factory!, name: "MANAGER_ROLE to Launchpad Factory on ProjectNFT" },
      { contract: projectNFT, role: MINTER_ROLE, account: state.tokenizationFactory!, name: "MINTER_ROLE to TokenizationFactory on ProjectNFT" },
      { contract: projectNFT, role: MANAGER_ROLE, account: state.tokenizationFactory!, name: "MANAGER_ROLE to TokenizationFactory on ProjectNFT" },
      { contract: exchange, role: FACTORY_ROLE, account: state.factory!, name: "FACTORY_ROLE to factory on Exchange" },
    ];

    // Add EscrowVault MANAGER_ROLE
    if (state.escrowVault) {
      roleAssignments.push({
        contract: projectNFT,
        role: MANAGER_ROLE,
        account: state.escrowVault,
        name: "MANAGER_ROLE to EscrowVault on ProjectNFT",
      });
    }

    let stepNum = 32;
    for (const assignment of roleAssignments) {
      log(`${stepNum}. Granting ${assignment.name}...`);
      try {
        const hasRole = await assignment.contract.hasRole(assignment.role, assignment.account);
        if (!hasRole) {
          const tx = await assignment.contract.grantRole(assignment.role, assignment.account);
          await tx.wait();
          logSuccess(`Granted`);
        } else {
          logSuccess(`Already granted`);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logWarning(`Could not grant role: ${errorMessage}`);
      }
      stepNum++;
    }

    state.rolesConfigured = true;
    saveCheckpoint(chainId, 11, stepNum, state);
  }

  // ==========================================================================
  // PHASE 12: CROWDFUNDING ROLE CONFIGURATION
  // ==========================================================================

  if (startPhase <= 12 && !state.crowdfundingRolesConfigured) {
    logSection("PHASE 12: CROWDFUNDING ROLE CONFIGURATION");

    log("Configuring crowdfunding contract roles...");

    // Grant ESCROW_ROLE to EscrowVault on PlatformFeeManager
    if (state.platformFeeManager && state.escrowVault) {
      log("40. Granting ESCROW_ROLE to EscrowVault on PlatformFeeManager...");
      try {
        const platformFeeManager = await ethers.getContractAt("PlatformFeeManager", state.platformFeeManager);
        const tx1 = await platformFeeManager.grantEscrowRole(state.escrowVault);
        await tx1.wait();
        logSuccess("ESCROW_ROLE granted to EscrowVault");
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        if (errorMessage.includes("already")) {
          logSuccess("ESCROW_ROLE already granted");
        } else {
          logWarning(`Could not grant ESCROW_ROLE: ${errorMessage}`);
        }
      }
    }

    // Grant DISPUTE_MANAGER_ROLE to DisputeManager on PlatformFeeManager
    if (state.platformFeeManager && state.disputeManager) {
      log("41. Granting DISPUTE_MANAGER_ROLE to DisputeManager on PlatformFeeManager...");
      try {
        const platformFeeManager = await ethers.getContractAt("PlatformFeeManager", state.platformFeeManager);
        const tx2 = await platformFeeManager.grantDisputeManagerRole(state.disputeManager);
        await tx2.wait();
        logSuccess("DISPUTE_MANAGER_ROLE granted to DisputeManager on PlatformFeeManager");
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        if (errorMessage.includes("already")) {
          logSuccess("DISPUTE_MANAGER_ROLE already granted");
        } else {
          logWarning(`Could not grant DISPUTE_MANAGER_ROLE: ${errorMessage}`);
        }
      }
    }

    // Grant DISPUTE_MANAGER_ROLE to DisputeManager on EscrowVault
    if (state.escrowVault && state.disputeManager) {
      log("42. Granting DISPUTE_MANAGER_ROLE to DisputeManager on EscrowVault...");
      try {
        const escrowVault = await ethers.getContractAt("RWAEscrowVault", state.escrowVault);
        const tx3 = await escrowVault.grantDisputeManagerRole(state.disputeManager);
        await tx3.wait();
        logSuccess("DISPUTE_MANAGER_ROLE granted to DisputeManager on EscrowVault");
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        if (errorMessage.includes("already")) {
          logSuccess("DISPUTE_MANAGER_ROLE already granted");
        } else {
          logWarning(`Could not grant DISPUTE_MANAGER_ROLE: ${errorMessage}`);
        }
      }
    }

    state.crowdfundingRolesConfigured = true;
    saveCheckpoint(chainId, 12, 42, state);
  }

  // ==========================================================================
  // PHASE 13: KYC VERIFIER ADMIN CONFIGURATION
  // ==========================================================================

  if (startPhase <= 13 && !state.kycVerifierConfigured) {
    logSection("PHASE 13: KYC VERIFIER ADMIN CONFIGURATION");

    const kycVerifier = await ethers.getContractAt("KYCVerifier", state.kycVerifier!);

    log("43. Verifying KYCVerifier ownership...");
    try {
      const owner = await kycVerifier.owner();
      logSuccess(`KYCVerifier owner: ${owner}`);

      if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        logWarning("Deployer is not the owner - some admin functions may fail");
      }

      const trustedSigner = await kycVerifier.trustedSigner();
      logSuccess(`Trusted Signer: ${trustedSigner}`);

      if (trustedSigner.toLowerCase() !== DEPLOY_CONFIG.KYC_SIGNER_ADDRESS.toLowerCase()) {
        logWarning("Trusted signer doesn't match expected NEXT_PUBLIC_ADMIN_ADDRESS");

        log("44. Updating trusted signer...");
        try {
          const tx = await kycVerifier.setTrustedSigner(DEPLOY_CONFIG.KYC_SIGNER_ADDRESS);
          await tx.wait();
          logSuccess(`Trusted signer updated to: ${DEPLOY_CONFIG.KYC_SIGNER_ADDRESS}`);
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          logError(`Could not update trusted signer: ${errorMessage}`);
        }
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      logWarning(`Could not verify KYCVerifier configuration: ${errorMessage}`);
    }

    log("\n📋 KYC System Configuration:");
    logInfo("KYC is handled off-chain via Supabase database");
    logInfo("User submits KYC → Admin approves → Backend signs proof");
    logInfo("When investing, user provides signed proof to KYCVerifier");
    logInfo("KYCVerifier validates signature and allows transaction");

    state.kycVerifierConfigured = true;
    saveCheckpoint(chainId, 13, 44, state);
  }

  // ==========================================================================
  // PHASE 14: CONFIGURE DEFAULT RESTRICTIONS
  // ==========================================================================

  if (startPhase <= 14) {
    logSection("PHASE 14: CONFIGURE DEFAULT COUNTRY RESTRICTIONS");

    const restrictedCountries = DEPLOY_CONFIG.DEFAULT_RESTRICTED_COUNTRIES;

    if (state.factory) {
      log("Configuring country restrictions on RWALaunchpadFactory...");
      try {
        const factory = await ethers.getContractAt("RWALaunchpadFactory", state.factory);

        for (const countryCode of restrictedCountries) {
          try {
            const isRestricted = await factory.isCountryRestricted(0, countryCode);
            if (!isRestricted) {
              const tx = await factory.addDefaultRestrictedCountry(countryCode);
              await tx.wait();
              logSuccess(`Added country ${countryCode} to default restrictions`);
            } else {
              logSuccess(`Country ${countryCode} already restricted`);
            }
          } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            logWarning(`Could not add country ${countryCode}: ${errorMessage}`);
          }
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logWarning(`Could not configure factory restrictions: ${errorMessage}`);
      }
    }

    if (state.exchange) {
      log("Configuring country restrictions on RWASecurityExchange...");
      try {
        const exchange = await ethers.getContractAt("RWASecurityExchange", state.exchange);

        for (const countryCode of restrictedCountries) {
          try {
            const isRestricted = await exchange.isCountryRestricted(countryCode, ethers.ZeroHash);
            if (!isRestricted) {
              const tx = await exchange.addDefaultRestrictedCountry(countryCode);
              await tx.wait();
              logSuccess(`Added country ${countryCode} to exchange restrictions`);
            } else {
              logSuccess(`Country ${countryCode} already restricted on exchange`);
            }
          } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            logWarning(`Could not add country ${countryCode} to exchange: ${errorMessage}`);
          }
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logWarning(`Could not configure exchange restrictions: ${errorMessage}`);
      }
    }

    saveCheckpoint(chainId, 14, 45, state);
  }

  // ==========================================================================
  // PHASE 15: DEPLOYMENT VERIFICATION
  // ==========================================================================

  logSection("PHASE 15: DEPLOYMENT VERIFICATION");

  log("Verifying deployment configuration...\n");

  const factory = await ethers.getContractAt("RWALaunchpadFactory", state.factory!);
  const projectNFT = await ethers.getContractAt("RWAProjectNFT", state.projectNFT!);
  const kycVerifier = await ethers.getContractAt("KYCVerifier", state.kycVerifier!);

  let allValid = true;

  log("KYCVerifier Configuration:");
  try {
    const trustedSigner = await kycVerifier.trustedSigner();
    const owner = await kycVerifier.owner();
    const domainSeparator = await kycVerifier.domainSeparator();

    log(`  Trusted Signer: ${trustedSigner}`, 1);
    log(`  Owner: ${owner}`, 1);
    log(`  Domain Separator: ${domainSeparator}`, 1);

    if (trustedSigner.toLowerCase() !== DEPLOY_CONFIG.KYC_SIGNER_ADDRESS.toLowerCase()) {
      logError("Trusted signer mismatch!");
      allValid = false;
    } else {
      logSuccess("  Trusted signer configured correctly");
    }
  } catch (e) {
    logWarning("Could not verify KYCVerifier configuration");
  }

  log("\nFactory Configuration:");
  try {
    const factoryFeeRecipient = await factory.platformFeeRecipient();
    const factoryProjectNFT = await factory.projectNFT();

    log(`  Fee Recipient: ${factoryFeeRecipient}`, 1);
    log(`  Project NFT: ${factoryProjectNFT}`, 1);

    if (factoryProjectNFT !== state.projectNFT) {
      logError("Project NFT mismatch!");
      allValid = false;
    }
  } catch (e) {
    logWarning("Could not verify factory configuration");
  }

  // Verify EscrowVault configuration
  if (state.escrowVault) {
    log("\nEscrowVault Configuration:");
    try {
      const escrowVault = await ethers.getContractAt("RWAEscrowVault", state.escrowVault);
      const escrowKycVerifier = await escrowVault.kycVerifier();
      const escrowUsdc = await escrowVault.usdc();
      const escrowUsdt = await escrowVault.usdt();
      const escrowPlatformFeeManager = await escrowVault.platformFeeManager();

      log(`  KYC Verifier: ${escrowKycVerifier}`, 1);
      log(`  USDC: ${escrowUsdc}`, 1);
      log(`  USDT: ${escrowUsdt}`, 1);
      log(`  PlatformFeeManager: ${escrowPlatformFeeManager}`, 1);

      if (escrowKycVerifier.toLowerCase() !== state.kycVerifier!.toLowerCase()) {
        logError("EscrowVault KYC Verifier mismatch!");
        allValid = false;
      } else {
        logSuccess("  EscrowVault KYC Verifier configured correctly");
      }

      if (escrowPlatformFeeManager.toLowerCase() !== state.platformFeeManager!.toLowerCase()) {
        logError("EscrowVault PlatformFeeManager mismatch!");
        allValid = false;
      } else {
        logSuccess("  EscrowVault PlatformFeeManager configured correctly");
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      logWarning(`Could not verify EscrowVault: ${errorMessage}`);
    }
  }

  // Verify PlatformFeeManager configuration
  if (state.platformFeeManager) {
    log("\nPlatformFeeManager Configuration:");
    try {
      const platformFeeManager = await ethers.getContractAt("PlatformFeeManager", state.platformFeeManager);
      const feeReceiverAddr = await platformFeeManager.feeReceiver();
      const liquidityWalletAddr = await platformFeeManager.liquidityWallet();
      const treasuryWalletAddr = await platformFeeManager.treasuryWallet();

      log(`  Fee Receiver: ${feeReceiverAddr}`, 1);
      log(`  Liquidity Wallet: ${liquidityWalletAddr}`, 1);
      log(`  Treasury Wallet: ${treasuryWalletAddr}`, 1);

      logSuccess("  PlatformFeeManager wallets configured");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      logWarning(`Could not verify PlatformFeeManager: ${errorMessage}`);
    }
  }

  // Verify DisputeManager configuration
  if (state.disputeManager) {
    log("\nDisputeManager Configuration:");
    try {
      const disputeManager = await ethers.getContractAt("DisputeManager", state.disputeManager);
      const dmEscrowVault = await disputeManager.escrowVault();
      const maxUnjustified = await disputeManager.maxUnjustifiedDisputes();

      log(`  EscrowVault: ${dmEscrowVault}`, 1);
      log(`  Max Unjustified Disputes: ${maxUnjustified}`, 1);

      if (dmEscrowVault.toLowerCase() !== state.escrowVault!.toLowerCase()) {
        logError("DisputeManager EscrowVault mismatch!");
        allValid = false;
      } else {
        logSuccess("  DisputeManager configured correctly");
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      logWarning(`Could not verify DisputeManager: ${errorMessage}`);
    }
  }

  if (state.tokenizationFactory) {
    log("\nTokenizationFactory Configuration:");
    try {
      const tokenizationFactory = await ethers.getContractAt("RWATokenizationFactory", state.tokenizationFactory);
      const tfFeeRecipient = await tokenizationFactory.platformFeeRecipient();
      const escrowTxFee = await tokenizationFactory.escrowTransactionFeeBps();

      log(`  Fee Recipient: ${tfFeeRecipient}`, 1);
      log(`  Escrow Transaction Fee: ${Number(escrowTxFee) / 100}%`, 1);
      log(`  Deployment Fees: Collected off-chain via /pay page`, 1);

      const isDeployerApproved = await tokenizationFactory.isDeployerApproved(deployer.address);
      log(`  Deployer Approved: ${isDeployerApproved ? "✅ Yes" : "❌ No"}`, 1);
      if (!isDeployerApproved) allValid = false;
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      logWarning(`Could not verify TokenizationFactory: ${errorMessage}`);
    }
  }

  log("\nRole Verification:");
  const MINTER_ROLE = await projectNFT.MINTER_ROLE();
  const MANAGER_ROLE = await projectNFT.MANAGER_ROLE();

  const roleChecks = [
    { check: await projectNFT.hasRole(MINTER_ROLE, state.factory), name: "Launchpad Factory has MINTER_ROLE on ProjectNFT" },
    { check: await projectNFT.hasRole(MANAGER_ROLE, state.factory), name: "Launchpad Factory has MANAGER_ROLE on ProjectNFT" },
    { check: await projectNFT.hasRole(MINTER_ROLE, state.tokenizationFactory), name: "TokenizationFactory has MINTER_ROLE on ProjectNFT" },
    { check: await projectNFT.hasRole(MANAGER_ROLE, state.tokenizationFactory), name: "TokenizationFactory has MANAGER_ROLE on ProjectNFT" },
  ];

  // Add crowdfunding role checks
  if (state.escrowVault) {
    roleChecks.push({
      check: await projectNFT.hasRole(MANAGER_ROLE, state.escrowVault),
      name: "EscrowVault has MANAGER_ROLE on ProjectNFT",
    });
  }

  for (const roleCheck of roleChecks) {
    log(`  ${roleCheck.check ? "✅" : "❌"} ${roleCheck.name}`, 1);
    if (!roleCheck.check) allValid = false;
  }

  // Verify crowdfunding roles
  log("\nCrowdfunding Role Verification:");
  if (state.platformFeeManager && state.escrowVault) {
    try {
      const platformFeeManager = await ethers.getContractAt("PlatformFeeManager", state.platformFeeManager);
      const ESCROW_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ESCROW_ROLE"));
      const hasEscrowRole = await platformFeeManager.hasRole(ESCROW_ROLE, state.escrowVault);
      log(`  ${hasEscrowRole ? "✅" : "❌"} EscrowVault has ESCROW_ROLE on PlatformFeeManager`, 1);
      if (!hasEscrowRole) allValid = false;
    } catch (e) {
      logWarning("Could not verify ESCROW_ROLE");
    }
  }

  if (state.platformFeeManager && state.disputeManager) {
    try {
      const platformFeeManager = await ethers.getContractAt("PlatformFeeManager", state.platformFeeManager);
      const DISPUTE_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISPUTE_MANAGER_ROLE"));
      const hasDisputeRole = await platformFeeManager.hasRole(DISPUTE_MANAGER_ROLE, state.disputeManager);
      log(`  ${hasDisputeRole ? "✅" : "❌"} DisputeManager has DISPUTE_MANAGER_ROLE on PlatformFeeManager`, 1);
      if (!hasDisputeRole) allValid = false;
    } catch (e) {
      logWarning("Could not verify DISPUTE_MANAGER_ROLE on PlatformFeeManager");
    }
  }

  if (state.escrowVault && state.disputeManager) {
    try {
      const escrowVault = await ethers.getContractAt("RWAEscrowVault", state.escrowVault);
      const DISPUTE_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISPUTE_MANAGER_ROLE"));
      const hasDisputeRole = await escrowVault.hasRole(DISPUTE_MANAGER_ROLE, state.disputeManager);
      log(`  ${hasDisputeRole ? "✅" : "❌"} DisputeManager has DISPUTE_MANAGER_ROLE on EscrowVault`, 1);
      if (!hasDisputeRole) allValid = false;
    } catch (e) {
      logWarning("Could not verify DISPUTE_MANAGER_ROLE on EscrowVault");
    }
  }

  if (allValid) {
    logSuccess("\nAll verifications passed!");
    state.verified = true;
  } else {
    logError("\nSome verifications failed - check configuration!");
  }

  // ==========================================================================
  // PHASE 16: CONTRACT VERIFICATION ON EXPLORER
  // ==========================================================================

  if (DEPLOY_CONFIG.VERIFY_CONTRACTS && chainConfig.verificationSupported) {
    logSection("PHASE 16: CONTRACT VERIFICATION ON BLOCK EXPLORER");

    log(`⏳ Waiting ${DEPLOY_CONFIG.VERIFICATION_DELAY_MS / 1000}s for block explorer to index contracts...`);
    await new Promise((resolve) => setTimeout(resolve, DEPLOY_CONFIG.VERIFICATION_DELAY_MS));

    const verificationResults: { contract: string; address: string; status: string }[] = [];

    async function verifyContractLocal(address: string, constructorArgs: any[] = [], contractPath?: string): Promise<boolean> {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const verifyArgs: any = {
            address: address,
            constructorArguments: constructorArgs,
          };
          if (contractPath) {
            verifyArgs.contract = contractPath;
          }
          
          await run("verify:verify", verifyArgs);
          return true;
        } catch (error: any) {
          const msg = error.message || "";
          if (msg.includes("Already Verified") || msg.includes("already verified")) {
            return true;
          }
          if (attempt < 3 && (msg.includes("does not have bytecode") || msg.includes("not found"))) {
            log(`   ⏳ Contract not indexed yet, waiting 10s... (attempt ${attempt}/3)`);
            await new Promise((r) => setTimeout(r, 10000));
            continue;
          }
          if (attempt === 3) {
            logError(`   Verification error: ${msg.substring(0, 100)}`);
            return false;
          }
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
      return false;
    }

    async function verifyUUPSProxy(
      proxyAddress: string,
      contractName: string,
      contractPath: string,
      initializerArgs: any[]
    ): Promise<boolean> {
      try {
        log(`   Verifying ${contractName} proxy at ${proxyAddress}...`);

        const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
        const implAddressRaw = await ethers.provider.getStorage(proxyAddress, implSlot);
        const implementationAddress = ethers.getAddress("0x" + implAddressRaw.slice(-40));
        log(`   Implementation address: ${implementationAddress}`);

        log(`   Verifying implementation...`);
        const implVerified = await verifyContractLocal(implementationAddress, [], contractPath);
        
        if (implVerified) {
          logSuccess(`   ${contractName} implementation verified!`);
          
          try {
            await run("verify:verify", {
              address: proxyAddress,
            });
            logSuccess(`   ${contractName} proxy linked!`);
            return true;
          } catch (linkError: any) {
            const msg = linkError.message || "";
            if (msg.includes("Already Verified") || msg.includes("already verified") || msg.includes("Successfully linked")) {
              logSuccess(`   ${contractName} proxy already linked!`);
              return true;
            }
            logWarning(`   Proxy linking skipped (implementation verified)`);
            return true;
          }
        }
        
        return false;
      } catch (error: any) {
        logError(`   Error verifying ${contractName}: ${error.message?.substring(0, 100)}`);
        return false;
      }
    }

    const implementationsToVerify = [
      { name: "RWASecurityToken", address: state.securityTokenImpl, path: "contracts/core/RWASecurityToken.sol:RWASecurityToken" },
      { name: "RWAEscrowVault", address: state.escrowVaultImpl, path: "contracts/core/RWAEscrowVault.sol:RWAEscrowVault" },
      { name: "ModularCompliance", address: state.complianceImpl, path: "contracts/compliance/ModularCompliance.sol:ModularCompliance" },
      { name: "RWAProjectNFT (impl)", address: state.projectNFTImpl, path: "contracts/core/RWAProjectNFT.sol:RWAProjectNFT" },
      { name: "OffChainInvestmentManager (impl)", address: state.offChainManagerImpl, path: "contracts/OffChainInvestmentManager.sol:OffChainInvestmentManager" },
      { name: "RWASecurityExchange (impl)", address: state.exchangeImpl, path: "contracts/RWASecurityExchange.sol:RWASecurityExchange" },
      { name: "DividendDistributor", address: state.dividendDistributorImpl, path: "contracts/core/DividendDistributor.sol:DividendDistributor" },
      { name: "MaxBalanceModule", address: state.maxBalanceModuleImpl, path: "contracts/compliance/modules/MaxBalanceModule.sol:MaxBalanceModule" },
      { name: "LockupModule", address: state.lockupModuleImpl, path: "contracts/compliance/modules/LockupModule.sol:LockupModule" },
      { name: "RWATradeEscrow (impl)", address: state.rwaTradeEscrowImpl, path: "contracts/tokenize/RWATradeEscrow.sol:RWATradeEscrow" },
      { name: "KYCVerifier (impl)", address: state.kycVerifierImpl, path: "contracts/KYCVerifier.sol:KYCVerifier" },
      { name: "RWALaunchpadFactory (impl)", address: state.factoryImpl, path: "contracts/core/RWALaunchpadFactory.sol:RWALaunchpadFactory" },
      { name: "CountryRestrictModule (impl)", address: state.countryRestrictModuleImpl, path: "contracts/compliance/modules/CountryRestrictModule.sol:CountryRestrictModule" },
      { name: "AccreditedInvestorModule (impl)", address: state.accreditedInvestorModuleImpl, path: "contracts/compliance/modules/AccreditedInvestorModule.sol:AccreditedInvestorModule" },
      { name: "RWATokenizationFactory (impl)", address: state.tokenizationFactoryImpl, path: "contracts/tokenize/RWATokenizationFactory.sol:RWATokenizationFactory" },
      { name: "PlatformFeeManager (impl)", address: state.platformFeeManagerImpl, path: "contracts/crowdfunding/PlatformFeeManager.sol:PlatformFeeManager" },
      { name: "DisputeManager (impl)", address: state.disputeManagerImpl, path: "contracts/crowdfunding/DisputeManager.sol:DisputeManager" },
    ];

    log("\n📦 Verifying Implementation Contracts...\n");
    for (const impl of implementationsToVerify) {
      if (impl.address) {
        log(`   Verifying ${impl.name}...`);
        const success = await verifyContractLocal(impl.address, [], impl.path);
        verificationResults.push({
          contract: impl.name,
          address: impl.address,
          status: success ? "✅ Verified" : "❌ Failed",
        });
      }
    }

    const proxiesToVerify = [
      {
        name: "KYCVerifier",
        address: state.kycVerifier,
        path: "contracts/KYCVerifier.sol:KYCVerifier",
        initArgs: [
          DEPLOY_CONFIG.KYC_SIGNER_ADDRESS,
          DEPLOY_CONFIG.CREATION_FEE,
          feeRecipient,
        ],
      },
      {
        name: "RWAProjectNFT",
        address: state.projectNFT,
        path: "contracts/core/RWAProjectNFT.sol:RWAProjectNFT",
        initArgs: [
          "RWA Project NFT",
          "RWANFT",
          deployer.address,
        ],
      },
      {
        name: "PlatformFeeManager",
        address: state.platformFeeManager,
        path: "contracts/crowdfunding/PlatformFeeManager.sol:PlatformFeeManager",
        initArgs: [
          deployer.address,
          platformWallets.feeReceiver,
          platformWallets.liquidityWallet,
          platformWallets.treasuryWallet,
        ],
      },
      {
        name: "RWAEscrowVault",
        address: state.escrowVault,
        path: "contracts/core/RWAEscrowVault.sol:RWAEscrowVault",
        initArgs: [
          deployer.address,
          state.platformFeeManager,
          state.projectNFT,
        ],
      },
      {
        name: "DisputeManager",
        address: state.disputeManager,
        path: "contracts/crowdfunding/DisputeManager.sol:DisputeManager",
        initArgs: [
          deployer.address,
          state.escrowVault,
        ],
      },
      {
        name: "RWALaunchpadFactory",
        address: state.factory,
        path: "contracts/core/RWALaunchpadFactory.sol:RWALaunchpadFactory",
        initArgs: [
          deployer.address,
          state.securityTokenImpl,
          state.escrowVaultImpl,
          state.complianceImpl,
          state.kycVerifier,
          state.projectNFT,
          feeRecipient,
        ],
      },
      {
        name: "OffChainInvestmentManager",
        address: state.offChainManager,
        path: "contracts/OffChainInvestmentManager.sol:OffChainInvestmentManager",
        initArgs: [
          deployer.address,
          state.projectNFT,
          state.kycVerifier,
        ],
      },
      {
        name: "RWASecurityExchange",
        address: state.exchange,
        path: "contracts/RWASecurityExchange.sol:RWASecurityExchange",
        initArgs: [
          deployer.address,
          state.kycVerifier,
          chainConfig.tokens.USDC,
          feeRecipient,
        ],
      },
      {
        name: "CountryRestrictModule",
        address: state.countryRestrictModule,
        path: "contracts/compliance/modules/CountryRestrictModule.sol:CountryRestrictModule",
        initArgs: [state.kycVerifier],
      },
      {
        name: "AccreditedInvestorModule",
        address: state.accreditedInvestorModule,
        path: "contracts/compliance/modules/AccreditedInvestorModule.sol:AccreditedInvestorModule",
        initArgs: [state.kycVerifier],
      },
      {
        name: "RWATokenizationFactory",
        address: state.tokenizationFactory,
        path: "contracts/tokenize/RWATokenizationFactory.sol:RWATokenizationFactory",
        initArgs: [
          deployer.address,
          state.securityTokenImpl,
          state.projectNFTImpl,
          state.complianceImpl,
          state.kycVerifier,
          feeRecipient,
        ],
      },
    ];

    log("\n📦 Verifying Proxy Contracts...\n");
    for (const proxy of proxiesToVerify) {
      if (proxy.address) {
        const success = await verifyUUPSProxy(
          proxy.address,
          proxy.name,
          proxy.path,
          proxy.initArgs
        );
        verificationResults.push({
          contract: proxy.name,
          address: proxy.address,
          status: success ? "✅ Verified" : "❌ Failed",
        });
      }
    }

    log("\n" + "-".repeat(50));
    log("📋 Verification Summary:");
    log("-".repeat(50));

    for (const result of verificationResults) {
      log(`   ${result.status} ${result.contract}`);
    }

    const successCount = verificationResults.filter((r) => r.status.includes("✅")).length;
    const totalCount = verificationResults.length;
    log(`\n   Total: ${successCount}/${totalCount} contracts verified`);

    state.verificationResults = verificationResults;
  } else {
    logInfo("Contract verification skipped (disabled or unsupported network)");
  }

  // ==========================================================================
  // PHASE 17: SAVE DEPLOYMENT
  // ==========================================================================

  logSection("PHASE 17: SAVE DEPLOYMENT");

  if (!fs.existsSync("deployments")) {
    fs.mkdirSync("deployments", { recursive: true });
  }

  const deploymentRecord = {
    ...state,
    config: {
      creationFee: DEPLOY_CONFIG.CREATION_FEE.toString(),
      platformFeeBps: DEPLOY_CONFIG.PLATFORM_FEE_BPS,
      escrowTransactionFeeBps: DEPLOY_CONFIG.ESCROW_TRANSACTION_FEE_BPS,
      kycSignerAddress: DEPLOY_CONFIG.KYC_SIGNER_ADDRESS,
      crowdfundingPlatformUsdtFeeBps: DEPLOY_CONFIG.CROWDFUNDING_PLATFORM_USDT_FEE_BPS,
      crowdfundingPlatformTokenFeeBps: DEPLOY_CONFIG.CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS,
      crowdfundingClaimFeeBps: DEPLOY_CONFIG.CROWDFUNDING_CLAIM_FEE_BPS,
    },
    tokens: chainConfig.tokens,
  };

  const filename = `deployments/deployment-${chainConfig.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentRecord, null, 2));
  logSuccess(`Deployment saved to ${filename}`);

  const latestFilename = `deployments/latest-${chainId}.json`;
  fs.writeFileSync(latestFilename, JSON.stringify(deploymentRecord, null, 2));
  logSuccess(`Latest deployment saved to ${latestFilename}`);

  const testnetChainIds = [43113, 80002, 11155111, 421614, 84532, 97, 338];
  const isTestnet = testnetChainIds.includes(chainId);

  const frontendConfig = `// Auto-generated by deploy-complete.ts
// Generated at: ${new Date().toISOString()}
// Network: ${chainConfig.name} (Chain ID: ${chainId})
// KYC System: Off-chain (Supabase) + On-chain signature verification
// Crowdfunding: PlatformFeeManager + DisputeManager

export const CHAIN_ID = ${chainId};
export const EXPLORER_URL = '${chainConfig.explorerUrl}';
export const NATIVE_CURRENCY = '${chainConfig.nativeCurrency}';
export const RPC_URL = '${chainConfig.rpcUrl}';
export const IS_TESTNET = ${isTestnet};
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const CONTRACTS = {
  // KYC Verifier (off-chain KYC signature verification)
  KYCVerifier: '${state.kycVerifier}',
  
  // Core contracts
  RWAProjectNFT: '${state.projectNFT}',
  RWALaunchpadFactory: '${state.factory}',
  
  // Crowdfunding contracts
  RWAEscrowVault: '${state.escrowVault || ""}',
  PlatformFeeManager: '${state.platformFeeManager || ""}',
  DisputeManager: '${state.disputeManager || ""}',
  
  // Tokenization Factory (fees collected off-chain)
  RWATokenizationFactory: '${state.tokenizationFactory || ""}',
  
  // Auxiliary contracts
  RWASecurityExchange: '${state.exchange}',
  OffChainInvestmentManager: '${state.offChainManager}',
  
  // Compliance modules
  CountryRestrictModule: '${state.countryRestrictModule}',
  AccreditedInvestorModule: '${state.accreditedInvestorModule}',
  
  // Implementation contracts (for reference)
  Implementations: {
    SecurityToken: '${state.securityTokenImpl}',
    EscrowVault: '${state.escrowVaultImpl}',
    Compliance: '${state.complianceImpl}',
    ProjectNFT: '${state.projectNFTImpl}',
    OffChainManager: '${state.offChainManagerImpl}',
    Exchange: '${state.exchangeImpl}',
    DividendDistributor: '${state.dividendDistributorImpl}',
    MaxBalanceModule: '${state.maxBalanceModuleImpl}',
    LockupModule: '${state.lockupModuleImpl}',
    RWATradeEscrow: '${state.rwaTradeEscrowImpl || ""}',
    TokenizationFactory: '${state.tokenizationFactoryImpl || ""}',
    KYCVerifier: '${state.kycVerifierImpl || ""}',
    PlatformFeeManager: '${state.platformFeeManagerImpl || ""}',
    DisputeManager: '${state.disputeManagerImpl || ""}',
  },
} as const;

export const TOKENS = {
  USDC: '${chainConfig.tokens.USDC}',
  USDT: '${chainConfig.tokens.USDT}',
} as const;

export const PLATFORM_WALLETS = {
  feeReceiver: '${platformWallets.feeReceiver}',
  liquidityWallet: '${platformWallets.liquidityWallet}',
  treasuryWallet: '${platformWallets.treasuryWallet}',
} as const;

export const FEES = {
  // Launchpad fees (in native currency)
  CREATION_FEE: '${DEPLOY_CONFIG.CREATION_FEE.toString()}',
  CREATION_FEE_FORMATTED: '${ethers.formatEther(DEPLOY_CONFIG.CREATION_FEE)}',
  // Escrow transaction fee (for P2P trades)
  ESCROW_TRANSACTION_FEE_BPS: ${DEPLOY_CONFIG.ESCROW_TRANSACTION_FEE_BPS},
  ESCROW_TRANSACTION_FEE_PERCENT: '${DEPLOY_CONFIG.ESCROW_TRANSACTION_FEE_BPS / 100}',
  // Crowdfunding fees
  CROWDFUNDING_PLATFORM_USDT_FEE_BPS: ${DEPLOY_CONFIG.CROWDFUNDING_PLATFORM_USDT_FEE_BPS},
  CROWDFUNDING_PLATFORM_USDT_FEE_PERCENT: '${DEPLOY_CONFIG.CROWDFUNDING_PLATFORM_USDT_FEE_BPS / 100}',
  CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS: ${DEPLOY_CONFIG.CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS},
  CROWDFUNDING_PLATFORM_TOKEN_FEE_PERCENT: '${DEPLOY_CONFIG.CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS / 100}',
  CROWDFUNDING_CLAIM_FEE_BPS: ${DEPLOY_CONFIG.CROWDFUNDING_CLAIM_FEE_BPS},
  // Fee distribution (USDT)
  USDT_FEE_RECEIVER_BPS: 3400,  // 34%
  USDT_LIQUIDITY_BPS: 3300,     // 33%
  USDT_TREASURY_BPS: 3300,      // 33%
  // Fee distribution (Tokens)
  TOKEN_LIQUIDITY_BPS: 5000,    // 50%
  TOKEN_TREASURY_BPS: 5000,     // 50%
} as const;

export const KYC_CONFIG = {
  TRUSTED_SIGNER: '${DEPLOY_CONFIG.KYC_SIGNER_ADDRESS}',
  LEVELS: {
    NONE: 0,
    BASIC: 1,
    STANDARD: 2,
    ACCREDITED: 3,
    INSTITUTIONAL: 4,
  },
  LIMITS: {
    NONE: 0,
    BASIC: 20000,
    STANDARD: 200000,
    ACCREDITED: 2000000,
    INSTITUTIONAL: null,
  },
  TIER_NAMES: {
    0: 'None',
    1: 'Bronze',
    2: 'Silver',
    3: 'Gold',
    4: 'Diamond',
  },
} as const;

export const DISPUTE_CONFIG = {
  MAX_UNJUSTIFIED_DISPUTES: 3,
  STATUSES: {
    NONE: 0,
    OPEN: 1,
    EVIDENCE: 2,
    BLOCKED: 3,
    RESOLVED_REFUND: 4,
    DISMISSED: 5,
  },
} as const;

// Type exports
export type ContractAddresses = typeof CONTRACTS;
export type TokenAddresses = typeof TOKENS;
export type PlatformWalletAddresses = typeof PLATFORM_WALLETS;
`;

  fs.writeFileSync("deployments/contracts.ts", frontendConfig);
  logSuccess("Frontend config saved to deployments/contracts.ts");

  const frontendPath = path.resolve(__dirname, DEPLOY_CONFIG.FRONTEND_CONFIG_PATH);
  try {
    const frontendDir = path.dirname(frontendPath);
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }
    fs.writeFileSync(frontendPath, frontendConfig);
    logSuccess(`Frontend config updated at ${frontendPath}`);
  } catch (err) {
    logWarning(`Could not write to ${frontendPath} - copy manually from deployments/contracts.ts`);
  }

  clearCheckpoint(chainId);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================

  logSection("DEPLOYMENT COMPLETE");

  console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│  🚀 ${chainConfig.name.toUpperCase()} DEPLOYMENT COMPLETE (v3 - Crowdfunding + Disputes)
├─────────────────────────────────────────────────────────────────────────────┤
│  Network: ${chainConfig.name}
│  Chain ID: ${chainId}
│  Explorer: ${chainConfig.explorerUrl}
├─────────────────────────────────────────────────────────────────────────────┤
│
│  KYC SYSTEM (Off-chain + Signature Verification)
│  └── KYCVerifier:              ${state.kycVerifier}
│      Trusted Signer:           ${DEPLOY_CONFIG.KYC_SIGNER_ADDRESS}
│
│  CORE CONTRACTS
│  ├── RWALaunchpadFactory:      ${state.factory}
│  ├── RWAProjectNFT:            ${state.projectNFT}
│  └── RWATokenizationFactory:   ${state.tokenizationFactory || "Not deployed"}
│
│  CROWDFUNDING CONTRACTS
│  ├── RWAEscrowVault:           ${state.escrowVault || "Not deployed"}
│  ├── PlatformFeeManager:       ${state.platformFeeManager || "Not deployed"}
│  └── DisputeManager:           ${state.disputeManager || "Not deployed"}
│
│  PLATFORM WALLETS
│  ├── Fee Receiver:             ${platformWallets.feeReceiver} (34% USDT)
│  ├── Liquidity Wallet:         ${platformWallets.liquidityWallet} (33% USDT + 50% tokens)
│  └── Treasury Wallet:          ${platformWallets.treasuryWallet} (33% USDT + 50% tokens)
│
│  KYC TIERS & INVESTMENT LIMITS
│  ├── Bronze (Level 1):         $20,000
│  ├── Silver (Level 2):         $200,000
│  ├── Gold (Level 3):           $2,000,000
│  └── Diamond (Level 4):        Unlimited
│
│  CROWDFUNDING FEES
│  ├── Platform USDT Fee:        ${DEPLOY_CONFIG.CROWDFUNDING_PLATFORM_USDT_FEE_BPS / 100}% of raised
│  ├── Platform Token Fee:       ${DEPLOY_CONFIG.CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS / 100}% of supply
│  └── Claim Fee:                ${DEPLOY_CONFIG.CROWDFUNDING_CLAIM_FEE_BPS / 100}%
│
│  ROLES CONFIGURED
│  ├── Factory has MINTER_ROLE on ProjectNFT
│  ├── Factory has MANAGER_ROLE on ProjectNFT
│  ├── TokenizationFactory has MINTER_ROLE on ProjectNFT
│  ├── TokenizationFactory has MANAGER_ROLE on ProjectNFT
│  ├── EscrowVault has MANAGER_ROLE on ProjectNFT
│  ├── EscrowVault has ESCROW_ROLE on PlatformFeeManager
│  ├── DisputeManager has DISPUTE_MANAGER_ROLE on EscrowVault
│  └── DisputeManager has DISPUTE_MANAGER_ROLE on PlatformFeeManager
│
├─────────────────────────────────────────────────────────────────────────────┤
│  Status: ${state.verified ? "✅ ALL VERIFICATIONS PASSED" : "⚠️  NEEDS ATTENTION"}
└─────────────────────────────────────────────────────────────────────────────┘

📝 Next Steps:
1. Frontend config auto-updated at src/config/contracts.ts
2. Copy deployment entry to src/config/deployments.ts
3. Set environment variables in .env
4. Test crowdfunding flow on ${chainConfig.explorerUrl}

🔗 Contract Links:
   KYCVerifier:          ${chainConfig.explorerUrl}/address/${state.kycVerifier}
   Factory:              ${chainConfig.explorerUrl}/address/${state.factory}
   EscrowVault:          ${chainConfig.explorerUrl}/address/${state.escrowVault}
   PlatformFeeManager:   ${chainConfig.explorerUrl}/address/${state.platformFeeManager}
   DisputeManager:       ${chainConfig.explorerUrl}/address/${state.disputeManager}
   TokenizationFactory:  ${chainConfig.explorerUrl}/address/${state.tokenizationFactory}
`);

  // ==========================================================================
  // GENERATE DEPLOYMENTS.TS ENTRY
  // ==========================================================================

  const deploymentsEntry = `
  // ==========================================================================
  // ${chainConfig.name.toUpperCase()} - Deployed ${new Date().toISOString().split("T")[0]}
  // KYC System: Off-chain (Supabase) + On-chain signature verification
  // Crowdfunding: PlatformFeeManager + DisputeManager
  // ==========================================================================
  ${chainId}: {
    contracts: {
      KYCVerifier: "${state.kycVerifier}",
      RWAProjectNFT: "${state.projectNFT}",
      RWALaunchpadFactory: "${state.factory}",
      RWAEscrowVault: "${state.escrowVault || ZERO}",
      PlatformFeeManager: "${state.platformFeeManager || ZERO}",
      DisputeManager: "${state.disputeManager || ZERO}",
      RWATokenizationFactory: "${state.tokenizationFactory || ZERO}",
      RWASecurityExchange: "${state.exchange}",
      OffChainInvestmentManager: "${state.offChainManager}",
      CountryRestrictModule: "${state.countryRestrictModule}",
      AccreditedInvestorModule: "${state.accreditedInvestorModule}",
      Implementations: {
        SecurityToken: "${state.securityTokenImpl}",
        EscrowVault: "${state.escrowVaultImpl}",
        Compliance: "${state.complianceImpl}",
        ProjectNFT: "${state.projectNFTImpl}",
        OffChainManager: "${state.offChainManagerImpl}",
        Exchange: "${state.exchangeImpl}",
        DividendDistributor: "${state.dividendDistributorImpl}",
        MaxBalanceModule: "${state.maxBalanceModuleImpl}",
        LockupModule: "${state.lockupModuleImpl}",
        RWATradeEscrow: "${state.rwaTradeEscrowImpl || ZERO}",
        TokenizationFactory: "${state.tokenizationFactoryImpl || ZERO}",
        KYCVerifier: "${state.kycVerifierImpl || ZERO}",
        PlatformFeeManager: "${state.platformFeeManagerImpl || ZERO}",
        DisputeManager: "${state.disputeManagerImpl || ZERO}",
      },
    },
    tokens: {
      USDC: "${chainConfig.tokens.USDC}",
      USDT: "${chainConfig.tokens.USDT}",
    },
    platformWallets: {
      feeReceiver: "${platformWallets.feeReceiver}",
      liquidityWallet: "${platformWallets.liquidityWallet}",
      treasuryWallet: "${platformWallets.treasuryWallet}",
    },
    fees: {
      CREATION_FEE: "${DEPLOY_CONFIG.CREATION_FEE.toString()}",
      CREATION_FEE_FORMATTED: "${ethers.formatEther(DEPLOY_CONFIG.CREATION_FEE)}",
      ESCROW_TRANSACTION_FEE_BPS: ${DEPLOY_CONFIG.ESCROW_TRANSACTION_FEE_BPS},
      CROWDFUNDING_PLATFORM_USDT_FEE_BPS: ${DEPLOY_CONFIG.CROWDFUNDING_PLATFORM_USDT_FEE_BPS},
      CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS: ${DEPLOY_CONFIG.CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS},
      CROWDFUNDING_CLAIM_FEE_BPS: ${DEPLOY_CONFIG.CROWDFUNDING_CLAIM_FEE_BPS},
    },
    kyc: {
      trustedSigner: "${DEPLOY_CONFIG.KYC_SIGNER_ADDRESS}",
      system: "off-chain",
    },
    deployedAt: "${new Date().toISOString().split("T")[0]}",
    version: "3.0.0",
  },`;

  fs.writeFileSync(`deployments/deployments-entry-${chainId}.ts`, deploymentsEntry);
  logSuccess(`Deployments entry saved to deployments/deployments-entry-${chainId}.ts`);

  console.log("\n📋 Copy this to src/config/deployments.ts:\n");
  console.log(deploymentsEntry);

  console.log(`
📝 Required Environment Variables (.env):

# Supabase (for off-chain KYC storage)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# KYC Encryption (generate each with: openssl rand -hex 32)
KYC_ENCRYPTION_KEY=<32-byte-hex>
KYC_WALLET_HASH_SECRET=<32-byte-hex>
KYC_AUDIT_HASH_SECRET=<32-byte-hex>

# KYC Signing (same as your admin wallet)
VERIFIER_PRIVATE_KEY=0x... (same as deployer)
NEXT_PUBLIC_ADMIN_ADDRESS=${DEPLOY_CONFIG.KYC_SIGNER_ADDRESS}

# Platform Wallets (for mainnet - update PLATFORM_WALLETS in script)
PLATFORM_FEE_RECEIVER=<address>
PLATFORM_LIQUIDITY_WALLET=<address>
PLATFORM_TREASURY_WALLET=<address>

# Deployment
FEE_RECIPIENT=${state.feeRecipient}
CREATION_FEE=${ethers.formatEther(DEPLOY_CONFIG.CREATION_FEE)}
PLATFORM_FEE_BPS=${DEPLOY_CONFIG.PLATFORM_FEE_BPS}
ESCROW_TRANSACTION_FEE_BPS=${DEPLOY_CONFIG.ESCROW_TRANSACTION_FEE_BPS}
`);

  return state;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
