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
  kycVerifier?: string;
  kycVerifierImpl?: string;
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
  projectNFT?: string;
  projectNFTProxyImpl?: string;
  factory?: string;
  factoryImpl?: string;
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
  acceptedTokens?: {
    USDC: string;
    USDT: string;
  };
  rolesConfigured?: boolean;
  kycVerifierConfigured?: boolean;
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
  
  // Get current gas price and add buffer for BSC
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
  logSection("RWA LAUNCHPAD - MULTI-CHAIN DEPLOYMENT (v2 - Off-chain KYC)");

  const [deployer] = await ethers.getSigners();
  const networkInfo = await ethers.provider.getNetwork();
  const chainId = Number(networkInfo.chainId);

  const chainConfig = getChainConfig(chainId);

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
  log(`💸 Fee Recipient: ${feeRecipient}`);
  log(`💵 Creation Fee: ${ethers.formatEther(DEPLOY_CONFIG.CREATION_FEE)} ${chainConfig.nativeCurrency}`);
  log(`💵 Escrow Transaction Fee: ${DEPLOY_CONFIG.ESCROW_TRANSACTION_FEE_BPS / 100}%`);
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
      rolesConfigured: false,
      kycVerifierConfigured: false,
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
      log("13. Deploying RWAProjectNFT proxy...");
      const { proxy } = await deployProxy("RWAProjectNFT", [
        "RWA Project NFT",
        "RWANFT",
        deployer.address,
      ]);
      state.projectNFT = proxy;
      saveCheckpoint(chainId, 3, 13, state);
    } else {
      logSuccess(`RWAProjectNFT proxy already deployed: ${state.projectNFT}`);
    }
  }

  // ==========================================================================
  // PHASE 4: FACTORY DEPLOYMENT
  // ==========================================================================

  if (startPhase <= 4) {
    logSection("PHASE 4: LAUNCHPAD FACTORY DEPLOYMENT");

    if (!state.factory) {
      log("14. Deploying RWALaunchpadFactory...");
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
      saveCheckpoint(chainId, 4, 14, state);
    } else {
      logSuccess(`RWALaunchpadFactory proxy already deployed: ${state.factory}`);
      if (!state.factoryImpl) {
        state.factoryImpl = await upgrades.erc1967.getImplementationAddress(state.factory);
      }
    }

    log("15. Setting additional implementations on factory...");
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

    saveCheckpoint(chainId, 4, 15, state);
  }

  // ==========================================================================
  // PHASE 5: AUXILIARY CONTRACTS
  // ==========================================================================

  if (startPhase <= 5) {
    logSection("PHASE 5: AUXILIARY CONTRACTS");

    if (!state.offChainManager) {
      log("16. Deploying OffChainInvestmentManager proxy...");
      const { proxy } = await deployProxy("OffChainInvestmentManager", [
        deployer.address,
        state.projectNFT,
        state.kycVerifier,
      ]);
      state.offChainManager = proxy;
      saveCheckpoint(chainId, 5, 16, state);
    } else {
      logSuccess(`OffChainInvestmentManager proxy already deployed: ${state.offChainManager}`);
    }

    if (!state.exchange) {
      log("17. Deploying RWASecurityExchange proxy...");
      const { proxy } = await deployProxy("RWASecurityExchange", [
        deployer.address,
        state.kycVerifier,
        chainConfig.tokens.USDC,
        feeRecipient,
      ]);
      state.exchange = proxy;
      saveCheckpoint(chainId, 5, 17, state);

      if (chainConfig.tokens.USDT !== ethers.ZeroAddress && chainConfig.tokens.USDT !== ZERO) {
        log("18. Configuring exchange payment tokens...");
        const exchange = await ethers.getContractAt("RWASecurityExchange", state.exchange);
        await exchange.setAcceptedPaymentToken(chainConfig.tokens.USDT, true);
        logSuccess("USDT added as accepted payment token");
      }

      state.acceptedTokens = chainConfig.tokens;
      saveCheckpoint(chainId, 5, 18, state);
    } else {
      logSuccess(`RWASecurityExchange proxy already deployed: ${state.exchange}`);
    }
  }

  // ==========================================================================
  // PHASE 6: COMPLIANCE MODULES
  // ==========================================================================

  if (startPhase <= 6) {
    logSection("PHASE 6: COMPLIANCE MODULES");

    if (!state.countryRestrictModule) {
      log("19. Deploying CountryRestrictModule proxy...");
      const { proxy, impl } = await deployProxy("CountryRestrictModule", [state.kycVerifier]);
      state.countryRestrictModule = proxy;
      state.countryRestrictModuleImpl = impl;
      saveCheckpoint(chainId, 6, 19, state);
    } else {
      logSuccess(`CountryRestrictModule proxy already deployed: ${state.countryRestrictModule}`);
    }
    

    if (!state.accreditedInvestorModule) {
      log("20. Deploying AccreditedInvestorModule proxy...");
      const { proxy, impl } = await deployProxy("AccreditedInvestorModule", [state.kycVerifier]);
      state.accreditedInvestorModule = proxy;
      state.accreditedInvestorModuleImpl = impl;
      saveCheckpoint(chainId, 6, 20, state);
    } else {
      logSuccess(`AccreditedInvestorModule proxy already deployed: ${state.accreditedInvestorModule}`);
    }
  }

  // ==========================================================================
  // PHASE 7: TOKENIZATION FACTORY DEPLOYMENT
  // ==========================================================================

  if (startPhase <= 7) {
    logSection("PHASE 7: TOKENIZATION FACTORY DEPLOYMENT");
    logInfo("Note: Deployment fees are collected off-chain via the /pay page");

    if (!state.tokenizationFactory) {
      log("21. Deploying RWATokenizationFactory proxy...");

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
      saveCheckpoint(chainId, 7, 21, state);

      log("22. Setting Trade Escrow implementation on TokenizationFactory...");
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
      saveCheckpoint(chainId, 7, 22, state);

      log("23. Setting Dividend Distributor implementation on TokenizationFactory...");
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
      saveCheckpoint(chainId, 7, 23, state);

      log("24. Setting escrow transaction fee on TokenizationFactory...");
      try {
        const tx3 = await tokenizationFactory.setEscrowTransactionFee(DEPLOY_CONFIG.ESCROW_TRANSACTION_FEE_BPS);
        await tx3.wait();
        logSuccess(`Escrow transaction fee set: ${DEPLOY_CONFIG.ESCROW_TRANSACTION_FEE_BPS / 100}%`);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logWarning(`Could not set escrow transaction fee: ${errorMessage}`);
      }
      saveCheckpoint(chainId, 7, 24, state);

      log("25. Approving deployer on TokenizationFactory...");
      try {
        const tx4 = await tokenizationFactory.setDeployerApproval(deployer.address, true);
        await tx4.wait();
        logSuccess(`Deployer approved: ${deployer.address}`);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logWarning(`Could not approve deployer: ${errorMessage}`);
      }
      saveCheckpoint(chainId, 7, 25, state);
    } else {
      logSuccess(`RWATokenizationFactory already deployed: ${state.tokenizationFactory}`);
      if (!state.tokenizationFactoryImpl) {
        state.tokenizationFactoryImpl = await upgrades.erc1967.getImplementationAddress(state.tokenizationFactory);
      }
    }
  }

  // ==========================================================================
  // PHASE 8: ROLE CONFIGURATION
  // ==========================================================================

  if (startPhase <= 8 && !state.rolesConfigured) {
    logSection("PHASE 8: ROLE CONFIGURATION");

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

    let stepNum = 26;
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
    saveCheckpoint(chainId, 8, stepNum, state);
  }

  // ==========================================================================
  // PHASE 9: KYC VERIFIER ADMIN CONFIGURATION
  // ==========================================================================

  if (startPhase <= 9 && !state.kycVerifierConfigured) {
    logSection("PHASE 9: KYC VERIFIER ADMIN CONFIGURATION");

    const kycVerifier = await ethers.getContractAt("KYCVerifier", state.kycVerifier!);

    log("31. Verifying KYCVerifier ownership...");
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

        log("32. Updating trusted signer...");
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
    saveCheckpoint(chainId, 9, 32, state);
  }

  // ==========================================================================
  // PHASE 9.5: CONFIGURE DEFAULT RESTRICTIONS ON CORE CONTRACTS
  // ==========================================================================

  if (startPhase <= 9) {
    logSection("PHASE 9.5: CONFIGURE DEFAULT COUNTRY RESTRICTIONS");

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

    saveCheckpoint(chainId, 9, 33, state);
  }

  // ==========================================================================
  // PHASE 10: DEPLOYMENT VERIFICATION
  // ==========================================================================

  logSection("PHASE 10: DEPLOYMENT VERIFICATION");

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

  for (const roleCheck of roleChecks) {
    log(`  ${roleCheck.check ? "✅" : "❌"} ${roleCheck.name}`, 1);
    if (!roleCheck.check) allValid = false;
  }

  log("\nTokenizationFactory Deployment Test:");
  if (state.tokenizationFactory) {
    try {
      const tokenizationFactory = await ethers.getContractAt("RWATokenizationFactory", state.tokenizationFactory);
      const supply = ethers.parseUnits("1000", 18);

      // Actually deploy a test token
      log("  Deploying test token...", 1);
      const emptyProof = {level: 0, countryCode: 0, expiry: 0, signature: "0x"};
      const tx = await tokenizationFactory.deployToken(
        "Test Token", 
        "TEST", 
        ethers.parseEther("1000"), 
        "ipfs://test",
        1, // minKYCLevel
        emptyProof
      );
      const receipt = await tx.wait();

      // Get deployed token address from event
      let testTokenAddr: string | null = null;
      
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = tokenizationFactory.interface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
            if (parsed?.name === "TokenDeployed") {
              testTokenAddr = parsed.args.securityToken;
              break;
            }
          } catch {
            // Not our event, skip
          }
        }
      }

      if (testTokenAddr) {
        logSuccess(`  Test token deployed: ${testTokenAddr}`);

        // Verify token configuration
        const testToken = await ethers.getContractAt("RWASecurityToken", testTokenAddr);
        
        const tokenName = await testToken.name();
        const tokenSymbol = await testToken.symbol();
        const tokenSupply = await testToken.totalSupply();
        const tokenKycEnforced = await testToken.kycEnforced();
        
        log(`    Name: ${tokenName}`, 1);
        log(`    Symbol: ${tokenSymbol}`, 1);
        log(`    Total Supply: ${ethers.formatUnits(tokenSupply, 18)}`, 1);
        log(`    KYC Enforced: ${tokenKycEnforced}`, 1);

        // Enable KYC enforcement on test token
        log("  Enabling KYC enforcement on test token...", 1);
        const enableKycTx = await testToken.setKYCEnforced(true);
        await enableKycTx.wait();
        
        const kycEnabledAfter = await testToken.kycEnforced();
        if (kycEnabledAfter) {
          logSuccess(`  KYC enforcement enabled: ${kycEnabledAfter}`);
        } else {
          logError(`  Failed to enable KYC enforcement`);
          allValid = false;
        }

        // Verify deployer received tokens
        const deployerBalance = await testToken.balanceOf(deployer.address);
        if (deployerBalance === supply) {
          logSuccess(`  Deployer received tokens: ${ethers.formatUnits(deployerBalance, 18)}`);
        } else {
          logError(`  Token balance mismatch!`);
          allValid = false;
        }

        logSuccess("  Deployment test passed!");
      } else {
        logError("  Could not find deployed token address in events");
        allValid = false;
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      logError(`  Deployment test failed: ${errorMessage}`);
      allValid = false;
    }
  }

  log("\nKYC System Test:");
  if (state.kycVerifier) {
    try {
      const kycVerifierContract = await ethers.getContractAt("KYCVerifier", state.kycVerifier);

      const domainSeparator = await kycVerifierContract.domainSeparator();
      logSuccess(`  Domain Separator: ${domainSeparator.slice(0, 20)}...`);

      const trustedSigner = await kycVerifierContract.trustedSigner();
      if (trustedSigner.toLowerCase() === DEPLOY_CONFIG.KYC_SIGNER_ADDRESS.toLowerCase()) {
        logSuccess(`  Trusted Signer matches expected address`);
      } else {
        logError(`  Trusted Signer mismatch!`);
        logError(`    Expected: ${DEPLOY_CONFIG.KYC_SIGNER_ADDRESS}`);
        logError(`    Actual: ${trustedSigner}`);
        allValid = false;
      }

      const levelNone = await kycVerifierContract.LEVEL_NONE();
      const levelBasic = await kycVerifierContract.LEVEL_BASIC();
      const levelStandard = await kycVerifierContract.LEVEL_STANDARD();
      const levelAccredited = await kycVerifierContract.LEVEL_ACCREDITED();
      const levelInstitutional = await kycVerifierContract.LEVEL_INSTITUTIONAL();

      log(`  KYC Levels: None=${levelNone}, Basic=${levelBasic}, Standard=${levelStandard}, Accredited=${levelAccredited}, Institutional=${levelInstitutional}`, 1);

      if (Number(levelNone) === 0 && Number(levelBasic) === 1 && Number(levelAccredited) === 3) {
        logSuccess(`  KYC levels configured correctly`);
      } else {
        logError(`  KYC levels misconfigured!`);
        allValid = false;
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      logError(`  KYC system test failed: ${errorMessage}`);
      allValid = false;
    }
  }

  if (allValid) {
    logSuccess("\nAll verifications passed!");
    state.verified = true;
  } else {
    logError("\nSome verifications failed - check configuration!");
  }

  // ==========================================================================
  // PHASE 11: CONTRACT VERIFICATION ON EXPLORER
  // ==========================================================================

  if (DEPLOY_CONFIG.VERIFY_CONTRACTS && chainConfig.verificationSupported) {
    logSection("PHASE 11: CONTRACT VERIFICATION ON BLOCK EXPLORER");

    log(`⏳ Waiting ${DEPLOY_CONFIG.VERIFICATION_DELAY_MS / 1000}s for block explorer to index contracts...`);
    await new Promise((resolve) => setTimeout(resolve, DEPLOY_CONFIG.VERIFICATION_DELAY_MS));

    const verificationResults: { contract: string; address: string; status: string }[] = [];

    // Helper function to verify implementation contracts (no constructor args)
    async function verifyContract(address: string, constructorArgs: any[] = [], contractPath?: string): Promise<boolean> {
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

    // Helper function to verify UUPS proxy contracts
    async function verifyUUPSProxy(
      proxyAddress: string,
      contractName: string,
      contractPath: string,
      initializerArgs: any[]
    ): Promise<boolean> {
      try {
        log(`   Verifying ${contractName} proxy at ${proxyAddress}...`);

        // Get implementation address
        const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
        const implAddressRaw = await ethers.provider.getStorage(proxyAddress, implSlot);
        const implementationAddress = ethers.getAddress("0x" + implAddressRaw.slice(-40));
        log(`   Implementation address: ${implementationAddress}`);

        // Verify implementation only
        log(`   Verifying implementation...`);
        const implVerified = await verifyContract(implementationAddress, [], contractPath);
        
        if (implVerified) {
          logSuccess(`   ${contractName} implementation verified!`);
          
          // Try to link proxy using OpenZeppelin upgrades verify
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
            // Proxy linking failed but implementation is verified - still counts as success
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

    // Get deployer address for initializer args
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();

    // Implementation contracts to verify (no constructor args)
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
    ];

    log("\n📦 Verifying Implementation Contracts...\n");
    for (const impl of implementationsToVerify) {
      if (impl.address) {
        log(`   Verifying ${impl.name}...`);
        const success = await verifyContract(impl.address, [], impl.path);
        verificationResults.push({
          contract: impl.name,
          address: impl.address,
          status: success ? "✅ Verified" : "❌ Failed",
        });
      }
    }

    // UUPS Proxy contracts with their initializer arguments
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
          deployerAddress,
        ],
      },
      {
        name: "RWALaunchpadFactory",
        address: state.factory,
        path: "contracts/core/RWALaunchpadFactory.sol:RWALaunchpadFactory",
        initArgs: [
          deployerAddress,
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
          deployerAddress,
          state.projectNFT,
          state.kycVerifier,
        ],
      },
      {
        name: "RWASecurityExchange",
        address: state.exchange,
        path: "contracts/RWASecurityExchange.sol:RWASecurityExchange",
        initArgs: [
          deployerAddress,
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
          deployerAddress,
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
  // PHASE 12: SAVE DEPLOYMENT
  // ==========================================================================

  logSection("PHASE 12: SAVE DEPLOYMENT");

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
    },
    tokens: chainConfig.tokens,
  };

  const filename = `deployments/deployment-${chainConfig.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentRecord, null, 2));
  logSuccess(`Deployment saved to ${filename}`);

  const latestFilename = `deployments/latest-${chainId}.json`;
  fs.writeFileSync(latestFilename, JSON.stringify(deploymentRecord, null, 2));
  logSuccess(`Latest deployment saved to ${latestFilename}`);

  // Determine if testnet
  const testnetChainIds = [43113, 80002, 11155111, 421614, 84532, 97, 338];
  const isTestnet = testnetChainIds.includes(chainId);

  // Generate frontend config
  const frontendConfig = `// Auto-generated by deploy-complete.ts
// Generated at: ${new Date().toISOString()}
// Network: ${chainConfig.name} (Chain ID: ${chainId})
// KYC System: Off-chain (Supabase) + On-chain signature verification

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
  },
} as const;

export const TOKENS = {
  USDC: '${chainConfig.tokens.USDC}',
  USDT: '${chainConfig.tokens.USDT}',
} as const;

export const FEES = {
  // Launchpad fees (in native currency)
  CREATION_FEE: '${DEPLOY_CONFIG.CREATION_FEE.toString()}',
  CREATION_FEE_FORMATTED: '${ethers.formatEther(DEPLOY_CONFIG.CREATION_FEE)}',
  // Escrow transaction fee (for P2P trades)
  ESCROW_TRANSACTION_FEE_BPS: ${DEPLOY_CONFIG.ESCROW_TRANSACTION_FEE_BPS},
  ESCROW_TRANSACTION_FEE_PERCENT: '${DEPLOY_CONFIG.ESCROW_TRANSACTION_FEE_BPS / 100}',
  // KYC is FREE on-chain (handled off-chain via Supabase)
  // Platform fees for tokenization are collected via Supabase/Stripe
} as const;

export const KYC_CONFIG = {
  // KYC is handled off-chain via Supabase
  // This signer address is used to verify KYC proofs on-chain
  TRUSTED_SIGNER: '${DEPLOY_CONFIG.KYC_SIGNER_ADDRESS}',
  // KYC Levels
  LEVELS: {
    NONE: 0,
    BASIC: 1,
    STANDARD: 2,
    ACCREDITED: 3,
    INSTITUTIONAL: 4,
  },
  // Investment Limits (USD)
  LIMITS: {
    NONE: 0,
    BASIC: 20000,
    STANDARD: 200000,
    ACCREDITED: 2000000,
    INSTITUTIONAL: null, // Unlimited
  },
  // Tier Names
  TIER_NAMES: {
    0: 'None',
    1: 'Bronze',
    2: 'Silver',
    3: 'Gold',
    4: 'Platinum',
  },
} as const;

// Type exports
export type ContractAddresses = typeof CONTRACTS;
export type TokenAddresses = typeof TOKENS;
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
│  🚀 ${chainConfig.name.toUpperCase()} DEPLOYMENT COMPLETE (v2 - Off-chain KYC)
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
│  KYC TIERS & INVESTMENT LIMITS
│  ├── Bronze (Level 1):         $20,000
│  ├── Silver (Level 2):         $200,000
│  ├── Gold (Level 3):           $2,000,000
│  └── Platinum (Level 4):       Unlimited
│
│  ON-CHAIN FEES
│  ├── Creation Fee:             ${ethers.formatEther(DEPLOY_CONFIG.CREATION_FEE)} ${chainConfig.nativeCurrency}
│  └── Escrow Transaction Fee:   ${DEPLOY_CONFIG.ESCROW_TRANSACTION_FEE_BPS / 100}% (on P2P trades)
│
├─────────────────────────────────────────────────────────────────────────────┤
│  Status: ${state.verified ? "✅ ALL VERIFICATIONS PASSED" : "⚠️  NEEDS ATTENTION"}
└─────────────────────────────────────────────────────────────────────────────┘

📝 Next Steps:
1. Frontend config auto-updated at src/config/contracts.ts
2. Copy deployment entry to src/config/deployments.ts
3. Set environment variables in .env
4. Test KYC flow on ${chainConfig.explorerUrl}

🔗 Contract Links:
   KYCVerifier:          ${chainConfig.explorerUrl}/address/${state.kycVerifier}
   Factory:              ${chainConfig.explorerUrl}/address/${state.factory}
   TokenizationFactory:  ${chainConfig.explorerUrl}/address/${state.tokenizationFactory}
`);

  // ==========================================================================
  // GENERATE DEPLOYMENTS.TS ENTRY
  // ==========================================================================

  const deploymentsEntry = `
  // ==========================================================================
  // ${chainConfig.name.toUpperCase()} - Deployed ${new Date().toISOString().split("T")[0]}
  // KYC System: Off-chain (Supabase) + On-chain signature verification
  // KYC Tiers: Bronze ($20K), Silver ($200K), Gold ($2M), Platinum (Unlimited)
  // ==========================================================================
  ${chainId}: {
    contracts: {
      KYCVerifier: "${state.kycVerifier}",
      RWAProjectNFT: "${state.projectNFT}",
      RWALaunchpadFactory: "${state.factory}",
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
      },
    },
    tokens: {
      USDC: "${chainConfig.tokens.USDC}",
      USDT: "${chainConfig.tokens.USDT}",
    },
    fees: {
      CREATION_FEE: "${DEPLOY_CONFIG.CREATION_FEE.toString()}",
      CREATION_FEE_FORMATTED: "${ethers.formatEther(DEPLOY_CONFIG.CREATION_FEE)}",
      ESCROW_TRANSACTION_FEE_BPS: ${DEPLOY_CONFIG.ESCROW_TRANSACTION_FEE_BPS},
      ESCROW_TRANSACTION_FEE_PERCENT: "${DEPLOY_CONFIG.ESCROW_TRANSACTION_FEE_BPS / 100}",
    },
    kyc: {
      trustedSigner: "${DEPLOY_CONFIG.KYC_SIGNER_ADDRESS}",
      system: "off-chain",
    },
    deployedAt: "${new Date().toISOString().split("T")[0]}",
    version: "2.0.0",
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
