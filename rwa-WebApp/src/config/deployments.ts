// src/config/deployments.ts
import { SupportedChainId } from "./chains";

// =============================================================================
// RE-EXPORT FROM FEES SERVICE (this is the only fee-related code needed)
// =============================================================================

export {
  // Types
  type ChainFees,
  type PlatformFees,
  // Getters
  getChainFees,
  getPlatformFees,
  getFees,
  // Async getters
  getChainFeesAsync,
  getPlatformFeesAsync,
  // Initialization
  initializeFees,
  refreshFees,
  // Setters (for admin)
  setChainFees,
  setPlatformFees,
  // Status
  isChainFeesFromDB,
  getFeesStatus,
  // Subscription
  subscribe as subscribeToFees,
  // Defaults (for reference/fallback)
  DEFAULT_PLATFORM_FEES,
  DEFAULT_CHAIN_FEES,
} from '@/lib/feesService';

// Import for local use
import {
  getPlatformFees as _getPlatformFees,
  getChainFees as _getChainFees,
  getFees as _getFees,
  DEFAULT_PLATFORM_FEES as _DEFAULT_PLATFORM_FEES,
  type PlatformFees as PlatformFeesType,
  type ChainFees as ChainFeesType,
} from '@/lib/feesService';

// =============================================================================
// TYPES
// =============================================================================

export interface PlatformWallets {
  feeReceiver: string;
  liquidityWallet: string;
  treasuryWallet: string;
}

export interface DeploymentData {
  contracts: {
    RWAProjectNFT: string;
    RWALaunchpadFactory: string;
    KYCVerifier: string;
    RWATokenizationFactory: string;
    RWAEscrowVault?: string;
    PlatformFeeManager?: string;
    DisputeManager?: string;
    RWATradeEscrow?: string;
    IdentityRegistry?: string;
    IdentityRegistryStorage?: string;
    ClaimTopicsRegistry?: string;
    TrustedIssuersRegistry?: string;
    RWASecurityExchange: string;
    OffChainInvestmentManager: string;
    CountryRestrictModule: string;
    AccreditedInvestorModule: string;
    Implementations: {
      SecurityToken: string;
      EscrowVault: string;
      Compliance: string;
      ProjectNFT: string;
      KYCVerifier: string;
      OffChainManager: string;
      Exchange: string;
      DividendDistributor: string;
      MaxBalanceModule: string;
      LockupModule: string;
      RWATradeEscrow: string;
      TokenizationFactory: string;
      PlatformFeeManager?: string;
      DisputeManager?: string;
    };
  };
  tokens: {
    USDC: string;
    USDT: string;
  };
  platformWallets: PlatformWallets;
  deployedAt?: string;
  version: string;
}

// =============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// =============================================================================

/**
 * PLATFORM_FEES - Proxy that reads from feesService
 * Use getPlatformFees() instead for explicit calls
 */
export const PLATFORM_FEES = new Proxy({} as PlatformFeesType, {
  get(_, prop: string) {
    const fees = _getPlatformFees();
    return fees[prop as keyof PlatformFeesType];
  },
  set() {
    console.warn('[PLATFORM_FEES] Direct assignment not allowed. Use setPlatformFees()');
    return false;
  },
  ownKeys() {
    return Object.keys(_DEFAULT_PLATFORM_FEES);
  },
  getOwnPropertyDescriptor(_, prop) {
    const fees = _getPlatformFees();
    if (prop in fees) {
      return { configurable: true, enumerable: true, value: fees[prop as keyof PlatformFeesType] };
    }
    return undefined;
  },
});

/**
 * FEE_CONFIG - Legacy alias with different property names
 */
export const FEE_CONFIG = {
  get PLATFORM_USDT_FEE_BPS() { return _getPlatformFees().CROWDFUNDING_PLATFORM_USDT_FEE_BPS; },
  get PLATFORM_TOKEN_FEE_BPS() { return _getPlatformFees().CROWDFUNDING_PLATFORM_TOKEN_FEE_BPS; },
  get INVESTOR_TOKEN_BPS() { return _getPlatformFees().INVESTOR_ALLOCATION_BPS; },
  get FEE_RECEIVER_BPS() { return _getPlatformFees().FEE_RECEIVER_BPS; },
  get LIQUIDITY_WALLET_BPS() { return _getPlatformFees().LIQUIDITY_WALLET_BPS; },
  get TREASURY_WALLET_BPS() { return _getPlatformFees().TREASURY_WALLET_BPS; },
  get TOKEN_LIQUIDITY_BPS() { return _getPlatformFees().TOKEN_LIQUIDITY_BPS; },
  get TOKEN_TREASURY_BPS() { return _getPlatformFees().TOKEN_TREASURY_BPS; },
  get BPS_DENOMINATOR() { return _getPlatformFees().BPS_DENOMINATOR; },
} as const;

/**
 * getFeesForChain - Backward compatible alias for getFees
 */
export function getFeesForChain(chainId: SupportedChainId): PlatformFeesType & ChainFeesType {
  return _getFees(chainId);
}

// Quick access functions
export const getCrowdfundingSubmissionFee = () => _getPlatformFees().CROWDFUNDING_SUBMISSION_FEE;
export const getTokenizationSubmissionFee = () => _getPlatformFees().TOKENIZATION_SUBMISSION_FEE;

// =============================================================================
// CONSTANTS
// =============================================================================

const ZERO = "0x0000000000000000000000000000000000000000";

const DEFAULT_PLATFORM_WALLETS: PlatformWallets = {
  feeReceiver: "0xdD4104A780142EfB9566659f26d3317714a81510",
  liquidityWallet: "0xe7c533355a7Fa04baf083C726a442db7Dc0971b1",
  treasuryWallet: "0x2Db96c4F203fBc13c98bBa428ba9E09B48543b0A",
};

const EMPTY_DEPLOYMENT: DeploymentData = {
  contracts: {
    RWAProjectNFT: ZERO,
    RWALaunchpadFactory: ZERO,
    KYCVerifier: ZERO,
    RWATokenizationFactory: ZERO,
    RWAEscrowVault: ZERO,
    PlatformFeeManager: ZERO,
    DisputeManager: ZERO,
    RWATradeEscrow: ZERO,
    RWASecurityExchange: ZERO,
    OffChainInvestmentManager: ZERO,
    CountryRestrictModule: ZERO,
    AccreditedInvestorModule: ZERO,
    Implementations: {
      SecurityToken: ZERO,
      EscrowVault: ZERO,
      Compliance: ZERO,
      ProjectNFT: ZERO,
      KYCVerifier: ZERO,
      OffChainManager: ZERO,
      Exchange: ZERO,
      DividendDistributor: ZERO,
      MaxBalanceModule: ZERO,
      LockupModule: ZERO,
      RWATradeEscrow: ZERO,
      TokenizationFactory: ZERO,
      PlatformFeeManager: ZERO,
      DisputeManager: ZERO,
    },
  },
  tokens: {
    USDC: ZERO,
    USDT: ZERO,
  },
  platformWallets: DEFAULT_PLATFORM_WALLETS,
  version: "0.0.0",
};

// =============================================================================
// DEPLOYMENTS
// =============================================================================

export const DEPLOYMENTS: Record<SupportedChainId, DeploymentData> = {
  // ========================================
  // Avalanche Fuji Testnet - FULLY DEPLOYED
  // ========================================
  43113: {
    contracts: {
      KYCVerifier: "0x3CA5b7e66cF25E8C761aA07f318e06B83d0bde7B",
      RWAProjectNFT: "0x129287D01f98e32213519345F3bBCCcBA3fe3941",
      RWALaunchpadFactory: "0x90FF863603b9450F185E3641c6EF3df469886Bd3",
      RWATokenizationFactory: "0x4a8FBb0F4927094ab5caD161D90E7d68eB1eFF66",
      RWAEscrowVault: "0xf6bE123965f80b8eA08627F3AA8545a7A92ECC0A",
      PlatformFeeManager: "0xeC644de34d1A641f2E1A67726445C1688ABd44fd",
      DisputeManager: "0x1C7496477eAeaBBf4fFAE127772422C57d11f025",
      RWASecurityExchange: "0x35F9aeFb01C0098532c2eD5D8DB27FcBDc35C673",
      OffChainInvestmentManager: "0x28010D59A35c7fCFb51526e6C249Da6f75C94855",
      CountryRestrictModule: "0xa76D5a58738D3A0603B97622f557505993794d61",
      AccreditedInvestorModule: "0xED001C6E3a0A3Aa702F71729a9c24962f4a39721",
      Implementations: {
        SecurityToken: "0x7fb4dcb62826E45B02bfa9062a00c852C246a0d1",
        EscrowVault: "0xbd9e16decc922cbb6bca01735212b09421945268",
        Compliance: "0x531E193d3528e56924F3Eb420A45cEC83038BCef",
        ProjectNFT: "0x2B85fa7721ff904E05ffa386250Cac4a2c43b519",
        KYCVerifier: "0x9965b27d4fEf0dE4B2e3e42A3d9853FfEEbd2e05",
        OffChainManager: "0x2993fBcC23f6D856a55Ea1cD91a41FCD924AA722",
        Exchange: "0xF40e7C3da0bd9F8250Eb551D504fc7CA48e9A1d3",
        DividendDistributor: "0x8A4A7906b7704CD66e8Dff1946723297d9f4C89F",
        MaxBalanceModule: "0xE8B9956A767D1FF98f8d786939DA818634aEc820",
        LockupModule: "0x1D89E68fF52cc5612509d7e6ebd5B08018f22cA7",
        RWATradeEscrow: "0xEC96adb406d2660716fb1C0f042d35b506F5A4CB",
        TokenizationFactory: "0x675E32C37007b496b13a5332e1e79a83AD855AfC",
        PlatformFeeManager: "0x1a02f318a83E7bDd5886d2fF95B8A8049c702Abf",
        DisputeManager: "0xf4b24e32110f8D2C79A76e3bD9BD62d06DA8e9a3",
      },
    },
    tokens: {
      USDC: "0x224e403397F3aec9a0D2875445dC32dB00ea31C3",
      USDT: "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786",
      
    },
    platformWallets: DEFAULT_PLATFORM_WALLETS,
    deployedAt: "2026-03-24",
    version: "3.0.0",
  },

  // ========================================
  // Avalanche Mainnet (placeholder)
  // ========================================
  43114: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      USDT: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    },
    platformWallets: DEFAULT_PLATFORM_WALLETS,
  },

  // ========================================
  // Polygon Amoy Testnet - DEPLOYED
  // ========================================
  80002: {
    contracts: {
      KYCVerifier: "0xee84Effbdb909Daef5e8D6184C64953d7cE04D6f",
      RWAProjectNFT: "0xB2d689140A288f00e32aA52A7B81b55F6Ad9fe5f",
      RWALaunchpadFactory: "0xA17550d09BB649cF889Ce03A1cA21a9A1ffaFBB1",
      RWATokenizationFactory: "0xdd9DE39D830DBA48935ac8640e796E362C696587",
      RWAEscrowVault: ZERO,
      PlatformFeeManager: ZERO,
      DisputeManager: ZERO,
      RWASecurityExchange: "0x30ff1F658622EF61c694eB9D376B4137530aD918",
      OffChainInvestmentManager: "0xDbDcEb87d8d59f3e28Eb37f2634A893AD47e738E",
      CountryRestrictModule: "0x427B5584cd54D501A2B00bCC2302b11D48CB49f6",
      AccreditedInvestorModule: "0xf855f5e497894228eF10ffB40883e2CA08ede7F6",
      Implementations: {
        SecurityToken: "0xB8cD796856Ed299FC1805833C7f12cf9C1Ac804d",
        EscrowVault: "0xD058573B768321D5f238d77e0a570bD45DcE79b5",
        Compliance: "0xE5138366Cb615FaC2d4799313F5b64E50e6e1dc6",
        ProjectNFT: "0xC501F51A919baA3f6a859D1C41d3F811320E55a8",
        KYCVerifier: "0x87Bb76d81470a764FEeF682cA4a69c6f9F24F7Ee",
        OffChainManager: "0xbff96869F7E2382C91e530fa9f7004330938F54C",
        Exchange: "0x7F7F0528075ff9364e81e5ecd85b80482F41884b",
        DividendDistributor: "0xf966b3Fa7486E005E40C60ba20b89740f8Faa827",
        MaxBalanceModule: "0x18D171717D4Db371cC841c0490F1981A654eE9c4",
        LockupModule: "0x07947a188c4177761D52FB730E31b850c549117E",
        RWATradeEscrow: "0x2914B4E82500255E7E5543Fe2672d75FeB101B6e",
        TokenizationFactory: "0x3f2A198D6fDb258F7c2776559EC6dB188B2CbF86",
        PlatformFeeManager: ZERO,
        DisputeManager: ZERO,
      },
    },
    tokens: {
      USDC: "0xEd589B57e559874A5202a0FB82406c46A2116675",
      USDT: "0xfa86C7c30840694293a5c997f399d00A4eD3cDD8",
    },
    platformWallets: DEFAULT_PLATFORM_WALLETS,
    deployedAt: "2026-02-21",
    version: "2.0.0",
  },

  // ========================================
  // Polygon Mainnet (placeholder)
  // ========================================
  137: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    },
    platformWallets: DEFAULT_PLATFORM_WALLETS,
  },

  // ========================================
  // Ethereum Mainnet (placeholder)
  // ========================================
  1: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    },
    platformWallets: DEFAULT_PLATFORM_WALLETS,
  },

  // ========================================
  // Sepolia Testnet (placeholder)
  // ========================================
  11155111: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      USDT: ZERO,
    },
    platformWallets: DEFAULT_PLATFORM_WALLETS,
  },

  // ========================================
  // Arbitrum One (placeholder)
  // ========================================
  42161: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    },
    platformWallets: DEFAULT_PLATFORM_WALLETS,
  },

  // ========================================
  // Base (placeholder)
  // ========================================
  8453: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      USDT: ZERO,
    },
    platformWallets: DEFAULT_PLATFORM_WALLETS,
  },

  // ========================================
  // Optimism (placeholder)
  // ========================================
  10: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    },
    platformWallets: DEFAULT_PLATFORM_WALLETS,
  },

  // ========================================
  // BNB Chain Mainnet (placeholder)
  // ========================================
  56: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      USDT: "0x55d398326f99059fF775485246999027B3197955",
    },
    platformWallets: DEFAULT_PLATFORM_WALLETS,
  },

  // ========================================
  // BNB Chain Testnet - DEPLOYED
  // ========================================
  97: {
    contracts: {
      KYCVerifier: "0x697430F860eC4eC6506317B0225861860B76c7d8",
      RWAProjectNFT: "0xe7F8a504C53E3B5e4E954a442D3f2627dD19b8c4",
      RWALaunchpadFactory: "0x0F0b2B1763C49758423f952dEf41d638C8dE7bDF",
      RWATokenizationFactory: "0x9Aad3BbaDc5ACa3Edf15285E0Fc8C8229d202438",
      RWAEscrowVault: ZERO,
      PlatformFeeManager: ZERO,
      DisputeManager: ZERO,
      RWASecurityExchange: "0xe233382adAb62B569D2b392FdeE5000457135D9c",
      OffChainInvestmentManager: "0x755dAd763799c33EA1C9441932be6997EafbE902",
      CountryRestrictModule: "0xf4f252ef2383CaCb54Fc75A48b7FD2D5dc66E577",
      AccreditedInvestorModule: "0x2dd0b32EeF71d963f84da652c15742A416393fe8",
      Implementations: {
        SecurityToken: "0x4cfBE62F4f86b373880C475F5e0e90806D6A0aE8",
        EscrowVault: "0x8A962582446686b62D1F9d86dfe6D8c107f11357",
        Compliance: "0x73B699A1e7AF652027194d35A7DB3eD0AD6DF399",
        ProjectNFT: "0xc1E2682b9bDBB6341e346Bc4Dff9ccBB8fE0Bb09",
        KYCVerifier: "0x9Bf2A9595805Fc23090a34411781CA039ca6fCDd",
        OffChainManager: "0x30B0C77426dd7c3BCBC845099BEE931aE00904a6",
        Exchange: "0x99E6deBB20E6807904F8827D3b20aAe90353C9bC",
        DividendDistributor: "0xf49f7F8af071c50fE732b2488d569737628dE75E",
        MaxBalanceModule: "0x01B4286FdcBf99dFA42a06f90FB1058A397F7c2c",
        LockupModule: "0x540Cf149653495998a9e9474244c3612FB5f7e8a",
        RWATradeEscrow: "0x2b5C3b768D44457330646B205B6fC35666Da5d34",
        TokenizationFactory: "0xDbCb34c31DB54D93b4A1D214f9bc0363b035c6f7",
        PlatformFeeManager: ZERO,
        DisputeManager: ZERO,
      },
    },
    tokens: {
      USDC: "0x502e3c88828db1b478c38CD251Bfe861429b9482",
      USDT: "0xe57d2BA10a92eb04eD1B56Cb2dE9D67799782835",
    },
    platformWallets: DEFAULT_PLATFORM_WALLETS,
    deployedAt: "2026-04-11",  // UPDATED
    version: "2.1.0",  // UPDATED
  },

  // ========================================
  // Cronos Mainnet (placeholder)
  // ========================================
  25: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59",
      USDT: "0x66e428c3f67a68878562e79A0234c1F83c208770",
    },
    platformWallets: DEFAULT_PLATFORM_WALLETS,
  },

  // ========================================
  // Cronos Testnet - DEPLOYED
  // ========================================
  338: {
    contracts: {
      KYCVerifier: "0x502e3c88828db1b478c38CD251Bfe861429b9482",
      RWAProjectNFT: "0xC8e4E9B4e2814c7E5295DE8809E7Dc321539fe9e",
      RWALaunchpadFactory: "0x02D074440967709a56E91cDACfdB37f8Ca2843D9",
      RWATokenizationFactory: "0xA79bdd0f2B60F1af34Bf35a9cf05b1e31714961b",
      RWATradeEscrow: "0x2ac12b2Dbf343146A11cCA2DC1467148DAEb4447",
      RWAEscrowVault: ZERO,
      PlatformFeeManager: ZERO,
      DisputeManager: ZERO,
      RWASecurityExchange: "0xd24e102B207f55a7B13F2d269de5ebC2B526A2dF",
      OffChainInvestmentManager: "0x887E74dDf58FF6a0F6DE51e0fe310e5943E13247",
      CountryRestrictModule: "0xAd8B3A07018a4Ca56a85aD9c5731f306Ad9A647D",
      AccreditedInvestorModule: "0x8C3677Dd122f787C4cc7C9a649c7503489505D87",
      Implementations: {
        SecurityToken: "0x39506Cae78E2cD85b6c0762EdA86A43abe3D0182",
        EscrowVault: "0xE9DA0F79BC40e1c111de49498b3Fb17dCE59b7f2",
        Compliance: "0x2F57462EA95C7b7D381f6Df86204732C93149187",
        ProjectNFT: "0x22005206f3FeC3A12Eb507591De8f201e0807b5d",
        KYCVerifier: "0x6551E5a4415739Af52d037af4F5fdB3e44A58B23",
        OffChainManager: "0x4eF437b70cA3035e8aE825348BD90102990d9329",
        Exchange: "0x01395d6ac65868A48eE2Df3DB41e2Fd4d4387B5D",
        DividendDistributor: "0x265BAB421f61EF6F0A0ab28229BAeDa86381f1b0",
        MaxBalanceModule: "0x90Ae280C9b591F136883A243661ce63df517108a",
        LockupModule: "0x847082755E336b629eD5B7d300a032587eD96058",
        RWATradeEscrow: "0x2ac12b2Dbf343146A11cCA2DC1467148DAEb4447",
        TokenizationFactory: "0x3D58fFF590d1E925fd0f510e96C20bc12691840F",
        PlatformFeeManager: ZERO,
        DisputeManager: ZERO,
      },
    },
    tokens: {
      USDC: "0x224e403397F3aec9a0D2875445dC32dB00ea31C3",
      USDT: "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786",
    },
    platformWallets: DEFAULT_PLATFORM_WALLETS,
    deployedAt: "2026-02-21",
    version: "2.0.0",
  },
};

// =============================================================================
// CHAIN HELPERS
// =============================================================================

let _currentChainId: SupportedChainId = 43113;

export function setCurrentChainId(chainId: SupportedChainId): void {
  _currentChainId = chainId;
}

export function getCurrentChainId(): SupportedChainId {
  return _currentChainId;
}

export function getCurrentDeployment(): DeploymentData | undefined {
  return DEPLOYMENTS[_currentChainId];
}

export function getDeployment(chainId: SupportedChainId): DeploymentData | undefined {
  return DEPLOYMENTS[chainId];
}

export function isChainDeployed(chainId: SupportedChainId): boolean {
  return DEPLOYMENTS[chainId]?.version !== "0.0.0";
}

export function isCrowdfundingDeployed(chainId: SupportedChainId): boolean {
  const deployment = DEPLOYMENTS[chainId];
  return (
    deployment?.contracts?.RWAEscrowVault !== ZERO &&
    deployment?.contracts?.PlatformFeeManager !== ZERO &&
    deployment?.contracts?.DisputeManager !== ZERO
  );
}

export function getDeployedChainIds(): SupportedChainId[] {
  return (Object.keys(DEPLOYMENTS) as unknown as SupportedChainId[]).filter(
    (id) => isChainDeployed(Number(id) as SupportedChainId)
  );
}

export function getCrowdfundingDeployedChainIds(): SupportedChainId[] {
  return (Object.keys(DEPLOYMENTS) as unknown as SupportedChainId[]).filter(
    (id) => isCrowdfundingDeployed(Number(id) as SupportedChainId)
  );
}

export function getPlatformWallets(chainId: SupportedChainId): PlatformWallets {
  return DEPLOYMENTS[chainId]?.platformWallets || DEFAULT_PLATFORM_WALLETS;
}

// =============================================================================
// PROJECT LIMITS
// =============================================================================

export const PROJECT_LIMITS = {
  MIN_FUNDING_GOAL: 10000,
  MAX_FUNDING_GOAL: 10000000000,
  MIN_INVESTMENT: 100,
  MIN_FUNDRAISE_DAYS: 7,
  MAX_FUNDRAISE_DAYS: 365,
  MAX_MILESTONES: 10,
} as const;

// =============================================================================
// DISPUTE CONFIGURATION
// =============================================================================

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
  STATUS_LABELS: {
    0: "None",
    1: "Open",
    2: "Evidence Gathering",
    3: "Blocked",
    4: "Resolved (Refund)",
    5: "Dismissed",
  },
} as const;

// =============================================================================
// PROJECT STATE CONFIGURATION
// =============================================================================

export const PROJECT_STATE = {
  INACTIVE: 0,
  ACTIVE: 1,
  FUNDED: 2,
  COMPLETED: 3,
  CANCELLED: 4,
  DISPUTED: 5,
  LABELS: {
    0: "Inactive",
    1: "Active",
    2: "Funded",
    3: "Completed",
    4: "Cancelled",
    5: "Disputed",
  },
} as const;
