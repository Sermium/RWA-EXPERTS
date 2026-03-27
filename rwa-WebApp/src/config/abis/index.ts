// src/config/abis/index.ts
// Central ABI repository for the platform
// Last updated: 2026-03-24

// ============================================================================
// FACTORY ABI
// ============================================================================
export const RWALaunchpadFactoryABI = [
  // Read functions
  { name: 'projectCounter', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getDeployment', type: 'function', stateMutability: 'view', inputs: [{ name: '_id', type: 'uint256' }], outputs: [{ type: 'tuple', components: [{ name: 'securityToken', type: 'address' }, { name: 'escrowVault', type: 'address' }, { name: 'compliance', type: 'address' }, { name: 'deployer', type: 'address' }, { name: 'deployedAt', type: 'uint256' }, { name: 'active', type: 'bool' }] }] },
  { name: 'getDeployerProjects', type: 'function', stateMutability: 'view', inputs: [{ name: '_d', type: 'address' }], outputs: [{ type: 'uint256[]' }] },
  { name: 'getImplementations', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'tuple', components: [{ name: 'securityToken', type: 'address' }, { name: 'escrowVault', type: 'address' }, { name: 'compliance', type: 'address' }, { name: 'kycVerifier', type: 'address' }, { name: 'dividendDistributor', type: 'address' }, { name: 'maxBalanceModule', type: 'address' }, { name: 'lockupModule', type: 'address' }] }] },
  { name: 'getDefaultRestrictedCountries', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint16[]' }] },
  { name: 'isCountryRestricted', type: 'function', stateMutability: 'view', inputs: [{ name: '_country', type: 'uint16' }], outputs: [{ type: 'bool' }] },
  { name: 'owner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'projectNFT', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'defaultPriceFeed', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'defaultUSDC', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'defaultUSDT', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'platformFeeRecipient', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'platformFeeBps', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'creationFee', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'requireApproval', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'approvedDeployers', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'impl', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'securityToken', type: 'address' }, { name: 'escrowVault', type: 'address' }, { name: 'compliance', type: 'address' }, { name: 'kycVerifier', type: 'address' }, { name: 'dividendDistributor', type: 'address' }, { name: 'maxBalanceModule', type: 'address' }, { name: 'lockupModule', type: 'address' }] },
  { name: 'deployments', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: 'securityToken', type: 'address' }, { name: 'escrowVault', type: 'address' }, { name: 'compliance', type: 'address' }, { name: 'deployer', type: 'address' }, { name: 'deployedAt', type: 'uint256' }, { name: 'active', type: 'bool' }] },
  
  // Write functions
  { name: 'deployProject', type: 'function', stateMutability: 'payable', inputs: [{ name: '_name', type: 'string' }, { name: '_symbol', type: 'string' }, { name: '_category', type: 'string' }, { name: '_maxSupply', type: 'uint256' }, { name: '_fundingGoal', type: 'uint256' }, { name: '_deadlineDays', type: 'uint256' }, { name: '_metadataUri', type: 'string' }], outputs: [{ name: 'projectId', type: 'uint256' }] },
  { name: 'activateProject', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_projectId', type: 'uint256' }], outputs: [] },
  { name: 'deactivateProject', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_projectId', type: 'uint256' }], outputs: [] },
  { name: 'grantEscrowRole', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_projectId', type: 'uint256' }, { name: '_role', type: 'bytes32' }, { name: '_account', type: 'address' }], outputs: [] },
  { name: 'revokeEscrowRole', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_projectId', type: 'uint256' }, { name: '_role', type: 'bytes32' }, { name: '_account', type: 'address' }], outputs: [] },
  { name: 'upgradeEscrowVault', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_projectId', type: 'uint256' }, { name: '_newImpl', type: 'address' }], outputs: [] },
  { name: 'updateEscrowPriceFeed', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_projectId', type: 'uint256' }, { name: '_priceFeed', type: 'address' }], outputs: [] },
  { name: 'setSecurityTokenImpl', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_impl', type: 'address' }], outputs: [] },
  { name: 'setEscrowVaultImpl', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_impl', type: 'address' }], outputs: [] },
  { name: 'setComplianceImpl', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_impl', type: 'address' }], outputs: [] },
  { name: 'setKYCVerifier', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_impl', type: 'address' }], outputs: [] },
  { name: 'setDividendDistributorImpl', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_impl', type: 'address' }], outputs: [] },
  { name: 'setMaxBalanceModuleImpl', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_impl', type: 'address' }], outputs: [] },
  { name: 'setLockupModuleImpl', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_impl', type: 'address' }], outputs: [] },
  { name: 'setDefaultPriceFeed', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_feed', type: 'address' }], outputs: [] },
  { name: 'setDefaultPaymentTokens', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_usdc', type: 'address' }, { name: '_usdt', type: 'address' }], outputs: [] },
  { name: 'setPlatformFeeRecipient', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_r', type: 'address' }], outputs: [] },
  { name: 'setPlatformFeeBps', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_bps', type: 'uint256' }], outputs: [] },
  { name: 'setCreationFee', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_fee', type: 'uint256' }], outputs: [] },
  { name: 'setProjectNFT', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_nft', type: 'address' }], outputs: [] },
  { name: 'setRequireApproval', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_r', type: 'bool' }], outputs: [] },
  { name: 'setDeployerApproval', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_d', type: 'address' }, { name: '_a', type: 'bool' }], outputs: [] },
  { name: 'setDefaultRestrictedCountry', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_country', type: 'uint16' }, { name: '_add', type: 'bool' }], outputs: [] },
  { name: 'pause', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'unpause', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'transferOwnership', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'newOwner', type: 'address' }], outputs: [] },
  
  // Events
  { name: 'ProjectDeployed', type: 'event', inputs: [{ name: 'projectId', type: 'uint256', indexed: true }, { name: 'deployer', type: 'address', indexed: true }, { name: 'securityToken', type: 'address', indexed: false }, { name: 'escrowVault', type: 'address', indexed: false }, { name: 'compliance', type: 'address', indexed: false }] },
  { name: 'ImplementationUpdated', type: 'event', inputs: [{ name: 'contractType', type: 'string', indexed: true }, { name: 'newImpl', type: 'address', indexed: false }] },
  { name: 'ProjectDeactivated', type: 'event', inputs: [{ name: 'projectId', type: 'uint256', indexed: true }] },
  { name: 'ConfigUpdated', type: 'event', inputs: [{ name: 'key', type: 'string', indexed: true }] },
  
  // Errors
  { name: 'InvalidAddress', type: 'error', inputs: [] },
  { name: 'InvalidFee', type: 'error', inputs: [] },
  { name: 'InsufficientFee', type: 'error', inputs: [] },
  { name: 'InvalidDeadline', type: 'error', inputs: [] },
  { name: 'TransferFailed', type: 'error', inputs: [] },
  { name: 'NotApproved', type: 'error', inputs: [] },
  { name: 'ProjectNotFound', type: 'error', inputs: [] },
] as const;

// ============================================================================
// Tokenization FACTORY ABI
// ============================================================================
export const RWATokenizationFactoryABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "_id", "type": "uint256"}],
    "name": "getDeployment",
    "outputs": [{"components": [{"internalType": "uint256", "name": "deploymentId", "type": "uint256"},{"internalType": "address", "name": "owner", "type": "address"},{"internalType": "address", "name": "securityToken", "type": "address"},{"internalType": "address", "name": "projectNFT", "type": "address"},{"internalType": "address", "name": "tradeEscrow", "type": "address"},{"internalType": "address", "name": "dividendDistributor", "type": "address"},{"internalType": "enum RWATokenizationFactory.DeploymentType", "name": "deploymentType", "type": "uint8"},{"internalType": "uint256", "name": "deployedAt", "type": "uint256"},{"internalType": "bool", "name": "active", "type": "bool"},{"internalType": "string", "name": "metadataURI", "type": "string"},{"internalType": "uint8", "name": "minKYCLevel", "type": "uint8"}], "internalType": "struct RWATokenizationFactory.TokenDeployment", "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "_name", "type": "string"},{"internalType": "string", "name": "_symbol", "type": "string"},{"internalType": "uint256", "name": "_supply", "type": "uint256"},{"internalType": "string", "name": "_metadataURI", "type": "string"}],
    "name": "deployToken",
    "outputs": [{"internalType": "uint256", "name": "deploymentId", "type": "uint256"},{"internalType": "address", "name": "securityToken", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "_name", "type": "string"},{"internalType": "string", "name": "_symbol", "type": "string"},{"internalType": "uint256", "name": "_supply", "type": "uint256"},{"internalType": "string", "name": "_metadataURI", "type": "string"}],
    "name": "deployNFTAndToken",
    "outputs": [{"internalType": "uint256", "name": "deploymentId", "type": "uint256"},{"internalType": "address", "name": "securityToken", "type": "address"},{"internalType": "address", "name": "projectNFT", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "_name", "type": "string"},{"internalType": "string", "name": "_symbol", "type": "string"},{"internalType": "uint256", "name": "_supply", "type": "uint256"},{"internalType": "string", "name": "_metadataURI", "type": "string"}],
    "name": "deployWithEscrow",
    "outputs": [{"internalType": "uint256", "name": "deploymentId", "type": "uint256"},{"internalType": "address", "name": "securityToken", "type": "address"},{"internalType": "address", "name": "projectNFT", "type": "address"},{"internalType": "address", "name": "tradeEscrow", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "deploymentCounter",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_o", "type": "address"}],
    "name": "getOwnerDeployments",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_d", "type": "address"}],
    "name": "isDeployerApproved",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// ============================================================================
// KYC VERIFIER ABI
// ============================================================================
export const KYCVerifierABI = [
  { inputs: [], name: "LEVEL_NONE", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "LEVEL_BASIC", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "LEVEL_STANDARD", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "LEVEL_ACCREDITED", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "LEVEL_INSTITUTIONAL", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "trustedSigner", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "registrationFee", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "feeRecipient", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalFeesCollected", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "address" }], name: "isRegistered", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "address" }], name: "registeredAt", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "paused", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "level", type: "uint8" }, { name: "countryCode", type: "uint16" }, { name: "expiry", type: "uint256" }, { name: "signature", type: "bytes" }], name: "registerWithProof", outputs: [], stateMutability: "payable", type: "function" },
  { inputs: [{ name: "wallet", type: "address" }, { name: "level", type: "uint8" }, { name: "countryCode", type: "uint16" }, { name: "expiry", type: "uint256" }, { name: "signature", type: "bytes" }], name: "verify", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "wallet", type: "address" }, { name: "level", type: "uint8" }, { name: "countryCode", type: "uint16" }, { name: "expiry", type: "uint256" }, { name: "signature", type: "bytes" }], name: "verifyOrRevert", outputs: [], stateMutability: "view", type: "function" },
  { inputs: [{ name: "wallet", type: "address" }, { name: "level", type: "uint8" }, { name: "countryCode", type: "uint16" }, { name: "expiry", type: "uint256" }, { name: "signature", type: "bytes" }, { name: "minLevel", type: "uint8" }], name: "verifyWithMinLevel", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "domainSeparator", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "wallet", type: "address" }], name: "getRegistrationInfo", outputs: [{ name: "registered", type: "bool" }, { name: "registrationTime", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_trustedSigner", type: "address" }], name: "setTrustedSigner", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_fee", type: "uint256" }], name: "setRegistrationFee", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_recipient", type: "address" }], name: "setFeeRecipient", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "emergencyWithdraw", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "oldSigner", type: "address" }, { indexed: true, name: "newSigner", type: "address" }], name: "TrustedSignerUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, name: "oldFee", type: "uint256" }, { indexed: false, name: "newFee", type: "uint256" }], name: "RegistrationFeeUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "oldRecipient", type: "address" }, { indexed: true, name: "newRecipient", type: "address" }], name: "FeeRecipientUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "wallet", type: "address" }, { indexed: false, name: "level", type: "uint8" }, { indexed: false, name: "countryCode", type: "uint16" }, { indexed: false, name: "fee", type: "uint256" }], name: "WalletRegistered", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "recipient", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "FeesWithdrawn", type: "event" },
  { inputs: [], name: "InvalidSignature", type: "error" },
  { inputs: [], name: "ProofExpired", type: "error" },
  { inputs: [], name: "InvalidLevel", type: "error" },
  { inputs: [], name: "ZeroAddress", type: "error" },
  { inputs: [], name: "InsufficientFee", type: "error" },
  { inputs: [], name: "AlreadyRegistered", type: "error" },
  { inputs: [], name: "TransferFailed", type: "error" },
  { inputs: [], name: "CountryRestricted", type: "error" },
  { stateMutability: "payable", type: "receive" }
] as const;

// ============================================================================
// RWA PROJECT NFT ABI
// ============================================================================
export const RWAProjectNFTABI = [
  { inputs: [], name: "MINTER_ROLE", outputs: [{ name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "MANAGER_ROLE", outputs: [{ name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "DEFAULT_ADMIN_ROLE", outputs: [{ name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "name", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_tokenId", type: "uint256" }], name: "tokenURI", outputs: [{ name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_tokenId", type: "uint256" }], name: "ownerOf", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_owner", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSupply", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_tokenId", type: "uint256" }], name: "getProject", outputs: [{ components: [{ name: "owner", type: "address" }, { name: "securityToken", type: "address" }, { name: "escrowVault", type: "address" }, { name: "status", type: "uint8" }, { name: "createdAt", type: "uint256" }, { name: "fundingGoal", type: "uint256" }, { name: "totalRaised", type: "uint256" }, { name: "name", type: "string" }, { name: "category", type: "string" }], name: "", type: "tuple" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "uint256" }], name: "projects", outputs: [{ name: "owner", type: "address" }, { name: "securityToken", type: "address" }, { name: "escrowVault", type: "address" }, { name: "status", type: "uint8" }, { name: "createdAt", type: "uint256" }, { name: "fundingGoal", type: "uint256" }, { name: "totalRaised", type: "uint256" }, { name: "name", type: "string" }, { name: "category", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_tokenId", type: "uint256" }], name: "projectExists", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_owner", type: "address" }], name: "getOwnerProjects", outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalProjects", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_owner", type: "address" }, { name: "_name", type: "string" }, { name: "_category", type: "string" }, { name: "_fundingGoal", type: "uint256" }, { name: "_uri", type: "string" }], name: "createProject", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_tokenId", type: "uint256" }, { name: "_status", type: "uint8" }], name: "updateProjectStatus", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_tokenId", type: "uint256" }, { name: "_securityToken", type: "address" }], name: "linkSecurityToken", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_tokenId", type: "uint256" }, { name: "_escrowVault", type: "address" }], name: "linkEscrowVault", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_tokenId", type: "uint256" }, { name: "_amount", type: "uint256" }], name: "updateTotalRaised", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_tokenId", type: "uint256" }, { name: "_amount", type: "uint256" }], name: "incrementTotalRaised", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_tokenId", type: "uint256" }, { name: "_uri", type: "string" }], name: "updateMetadata", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "hasRole", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "grantRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "revokeRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "paused", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "tokenId", type: "uint256" }, { indexed: true, name: "owner", type: "address" }, { indexed: false, name: "name", type: "string" }], name: "ProjectCreated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "tokenId", type: "uint256" }, { indexed: false, name: "oldStatus", type: "uint8" }, { indexed: false, name: "newStatus", type: "uint8" }, { indexed: false, name: "changedBy", type: "address" }], name: "ProjectStatusUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "tokenId", type: "uint256" }, { indexed: false, name: "securityToken", type: "address" }], name: "SecurityTokenLinked", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "tokenId", type: "uint256" }, { indexed: false, name: "escrowVault", type: "address" }], name: "EscrowVaultLinked", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "tokenId", type: "uint256" }, { indexed: false, name: "totalRaised", type: "uint256" }], name: "FundingUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "tokenId", type: "uint256" }, { indexed: false, name: "uri", type: "string" }], name: "MetadataUpdated", type: "event" },
  { inputs: [], name: "ProjectNotFound", type: "error" },
  { inputs: [], name: "NameAlreadyExists", type: "error" },
  { inputs: [], name: "InvalidStatus", type: "error" },
  { inputs: [], name: "ZeroAddress", type: "error" },
  { inputs: [], name: "NotProjectOwner", type: "error" },
  { inputs: [], name: "SoulboundToken", type: "error" },
  { inputs: [], name: "InvalidStatusTransition", type: "error" },
  { inputs: [], name: "NotAuthorized", type: "error" },
] as const;

// ============================================================================
// RWA SECURITY TOKEN ABI
// ============================================================================
export const RWASecurityTokenABI = [
  { inputs: [], name: "name", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSupply", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transfer", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transferFrom", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "DEFAULT_ADMIN_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "MINTER_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "BURNER_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "FREEZER_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "maxSupply", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "compliance", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "kycVerifier", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "mint", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "amount", type: "uint256" }], name: "burn", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "from", type: "address" }, { name: "amount", type: "uint256" }], name: "burnFrom", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "forcedTransfer", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "isFrozen", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }, { name: "_frozen", type: "bool" }], name: "setAddressFrozen", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }, { name: "amount", type: "uint256" }], name: "freezePartialTokens", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }, { name: "amount", type: "uint256" }], name: "unfreezePartialTokens", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "getFrozenTokens", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "snapshot", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }, { name: "snapshotId", type: "uint256" }], name: "balanceOfAt", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "snapshotId", type: "uint256" }], name: "totalSupplyAt", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "hasRole", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "grantRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "revokeRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "renounceRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_compliance", type: "address" }], name: "setCompliance", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "paused", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "from", type: "address" }, { indexed: true, name: "to", type: "address" }, { indexed: false, name: "value", type: "uint256" }], name: "Transfer", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "owner", type: "address" }, { indexed: true, name: "spender", type: "address" }, { indexed: false, name: "value", type: "uint256" }], name: "Approval", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "account", type: "address" }, { indexed: false, name: "isFrozen", type: "bool" }], name: "AddressFrozen", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "account", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "TokensFrozen", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "account", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "TokensUnfrozen", type: "event" },
] as const;

// ============================================================================
// RWA ESCROW VAULT ABI
// ============================================================================
export const RWAEscrowVaultABI = [
  { inputs: [], name: "DEFAULT_ADMIN_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "ADMIN_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "OPERATOR_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "DISPUTE_RESOLVER_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "kycVerifier", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "usdc", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "usdt", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "platformFeeRecipient", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "projectNFT", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "claimFee", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "feeRecipient", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "paused", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalProjects", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_securityToken", type: "address" }, { name: "_paymentToken", type: "address" }, { name: "_priceFeed", type: "address" }, { name: "_fundingGoal", type: "uint256" }, { name: "_deadline", type: "uint256" }, { name: "_platformFeeBps", type: "uint256" }, { name: "_maxPriceAge", type: "uint256" }], name: "createProject", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }], name: "cancelProject", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }], name: "forceMarkFunded", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }], name: "getProject", outputs: [{ type: "tuple", components: [{ name: "projectId", type: "uint256" }, { name: "projectOwner", type: "address" }, { name: "securityToken", type: "address" }, { name: "paymentToken", type: "address" }, { name: "priceFeed", type: "address" }, { name: "fundingGoal", type: "uint256" }, { name: "totalRaised", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "state", type: "uint8" }, { name: "createdAt", type: "uint256" }, { name: "platformFeeBps", type: "uint256" }, { name: "maxPriceAge", type: "uint256" }] }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }], name: "getProjectFunding", outputs: [{ type: "tuple", components: [{ name: "fundingGoal", type: "uint256" }, { name: "totalRaised", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "state", type: "uint8" }, { name: "investorCount", type: "uint256" }, { name: "milestonesCount", type: "uint256" }, { name: "milestonesReleased", type: "uint256" }, { name: "refundsEnabled", type: "bool" }, { name: "feesDistributed", type: "bool" }] }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_amount", type: "uint256" }, { name: "_paymentToken", type: "address" }, { name: "_kycProof", type: "tuple", components: [{ name: "level", type: "uint8" }, { name: "countryCode", type: "uint16" }, { name: "expiry", type: "uint256" }, { name: "signature", type: "bytes" }] }], name: "invest", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_investor", type: "address" }], name: "getInvestorContribution", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_investor", type: "address" }], name: "getInvestorBalance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_investor", type: "address" }], name: "getClaimableTokens", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_investor", type: "address" }], name: "getInvestorAllocation", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_investor", type: "address" }], name: "hasInvestorClaimed", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_description", type: "string" }, { name: "_amount", type: "uint256" }, { name: "_deadline", type: "uint256" }], name: "addMilestone", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }], name: "getMilestones", outputs: [{ type: "tuple[]", components: [{ name: "description", type: "string" }, { name: "amount", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "state", type: "uint8" }, { name: "releasedAt", type: "uint256" }, { name: "approvedAt", type: "uint256" }] }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_milestoneIndex", type: "uint256" }], name: "approveMilestone", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_milestoneIndex", type: "uint256" }, { name: "_reason", type: "string" }], name: "raiseDispute", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_milestoneIndex", type: "uint256" }, { name: "_approved", type: "bool" }], name: "resolveDispute", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }], name: "claimRefund", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }], name: "claimTokens", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }], name: "getOffChainPending", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }], name: "getAvailableFunds", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }], name: "activateProject", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }], name: "completeProject", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_investor", type: "address" }, { name: "_amount", type: "uint256" }, { name: "_paymentReference", type: "string" }], name: "recordOffChainInvestment", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_amount", type: "uint256" }, { name: "_paymentToken", type: "address" }], name: "injectOffChainFunds", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_milestoneIndex", type: "uint256" }], name: "releaseMilestoneFunds", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_kycVerifier", type: "address" }], name: "setKYCVerifier", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_usdc", type: "address" }, { name: "_usdt", type: "address" }], name: "setPaymentTokens", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_priceFeed", type: "address" }], name: "updateProjectPriceFeed", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_fee", type: "uint256" }], name: "setClaimFee", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_recipient", type: "address" }], name: "setFeeRecipient", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_recipient", type: "address" }], name: "setPlatformFeeRecipient", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "hasRole", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "grantRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "revokeRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "newImplementation", type: "address" }], name: "upgradeTo", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_reference", type: "string" }], name: "isPaymentReferenceUsed", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "projectId", type: "uint256" }, { indexed: false, name: "securityToken", type: "address" }, { indexed: false, name: "fundingGoal", type: "uint256" }, { indexed: false, name: "deadline", type: "uint256" }], name: "ProjectCreated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "projectId", type: "uint256" }], name: "ProjectActivated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "projectId", type: "uint256" }], name: "ProjectCompleted", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "projectId", type: "uint256" }], name: "ProjectCancelled", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "projectId", type: "uint256" }, { indexed: true, name: "investor", type: "address" }, { indexed: false, name: "amount", type: "uint256" }, { indexed: false, name: "paymentToken", type: "address" }], name: "InvestmentReceived", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "projectId", type: "uint256" }, { indexed: true, name: "investor", type: "address" }, { indexed: false, name: "amount", type: "uint256" }, { indexed: false, name: "paymentReference", type: "string" }], name: "OffChainInvestmentRecorded", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "projectId", type: "uint256" }, { indexed: false, name: "amount", type: "uint256" }, { indexed: false, name: "paymentToken", type: "address" }], name: "OffChainFundsInjected", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "projectId", type: "uint256" }, { indexed: true, name: "investor", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "RefundClaimed", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "projectId", type: "uint256" }, { indexed: true, name: "investor", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "TokensClaimed", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "projectId", type: "uint256" }, { indexed: false, name: "milestoneIndex", type: "uint256" }], name: "MilestoneAdded", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "projectId", type: "uint256" }, { indexed: false, name: "milestoneIndex", type: "uint256" }], name: "MilestoneApproved", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "projectId", type: "uint256" }, { indexed: false, name: "milestoneIndex", type: "uint256" }, { indexed: false, name: "amount", type: "uint256" }], name: "MilestoneFundsReleased", type: "event" },
  { inputs: [], name: "InvalidProject", type: "error" },
  { inputs: [], name: "ProjectNotActive", type: "error" },
  { inputs: [], name: "ProjectExpired", type: "error" },
  { inputs: [], name: "InvalidAmount", type: "error" },
  { inputs: [], name: "InvalidToken", type: "error" },
  { inputs: [], name: "KYCNotVerified", type: "error" },
  { inputs: [], name: "CountryRestricted", type: "error" },
  { inputs: [], name: "TransferFailed", type: "error" },
  { inputs: [], name: "InsufficientBalance", type: "error" },
  { inputs: [], name: "AlreadyClaimed", type: "error" },
  { inputs: [], name: "NotFunded", type: "error" },
  { inputs: [], name: "StalePrice", type: "error" },
  { inputs: [], name: "InvalidPrice", type: "error" },
  { inputs: [], name: "NoOffChainPending", type: "error" },
  { inputs: [], name: "RefundsNotEnabled", type: "error" },
  { stateMutability: "payable", type: "receive" }
] as const;

// ============================================================================
// DISPUTE MANAGER ABI
// ============================================================================
export const DisputeManagerABI = [
  { inputs: [], name: "DEFAULT_ADMIN_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "RESOLVER_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "escrowVault", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "maxUnjustifiedDisputes", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalDisputes", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_disputeId", type: "uint256" }], name: "getDispute", outputs: [{ type: "tuple", components: [{ name: "id", type: "uint256" }, { name: "projectId", type: "uint256" }, { name: "initiator", type: "address" }, { name: "projectOwner", type: "address" }, { name: "reason", type: "string" }, { name: "status", type: "uint8" }, { name: "createdAt", type: "uint256" }, { name: "updatedAt", type: "uint256" }, { name: "resolvedAt", type: "uint256" }, { name: "resolution", type: "string" }] }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }], name: "getProjectDisputes", outputs: [{ type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }], name: "getActiveDispute", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }], name: "hasActiveDispute", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_investor", type: "address" }], name: "getInvestorDisputes", outputs: [{ type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_investor", type: "address" }, { name: "_projectId", type: "uint256" }], name: "getUnjustifiedDisputeCount", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_reason", type: "string" }], name: "openDispute", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_disputeId", type: "uint256" }], name: "dismissDispute", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_disputeId", type: "uint256" }, { name: "_refundInvestors", type: "bool" }], name: "resolveDispute", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_disputeId", type: "uint256" }, { name: "_refundInvestors", type: "bool" }, { name: "_resolution", type: "string" }], name: "resolveDisputeWithNote", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_escrowVault", type: "address" }], name: "setEscrowVault", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_max", type: "uint256" }], name: "setMaxUnjustifiedDisputes", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "hasRole", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "grantRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "revokeRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "disputeId", type: "uint256" }, { indexed: true, name: "projectId", type: "uint256" }, { indexed: true, name: "initiator", type: "address" }, { indexed: false, name: "reason", type: "string" }], name: "DisputeOpened", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "disputeId", type: "uint256" }, { indexed: false, name: "resolver", type: "address" }], name: "DisputeDismissed", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "disputeId", type: "uint256" }, { indexed: false, name: "refundInvestors", type: "bool" }, { indexed: false, name: "resolver", type: "address" }], name: "DisputeResolved", type: "event" },
  { inputs: [], name: "DisputeNotFound", type: "error" },
  { inputs: [], name: "DisputeAlreadyResolved", type: "error" },
  { inputs: [], name: "ProjectHasActiveDispute", type: "error" },
  { inputs: [], name: "NotInvestor", type: "error" },
  { inputs: [], name: "TooManyUnjustifiedDisputes", type: "error" },
  { inputs: [], name: "InvalidProject", type: "error" },
  { inputs: [], name: "ProjectNotActive", type: "error" },
] as const;

// ============================================================================
// MODULAR COMPLIANCE ABI
// ============================================================================
export const ModularComplianceABI = [
  { inputs: [], name: "owner", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "newOwner", type: "address" }], name: "transferOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "getTokenBound", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "module", type: "address" }], name: "addModule", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "module", type: "address" }], name: "removeModule", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "module", type: "address" }], name: "isModuleBound", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getModules", outputs: [{ type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "canTransfer", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transferred", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "created", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "from", type: "address" }, { name: "amount", type: "uint256" }], name: "destroyed", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "token", type: "address" }], name: "bindToken", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unbindToken", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_callData", type: "bytes" }, { name: "_module", type: "address" }], name: "callModuleFunction", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "paused", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "module", type: "address" }], name: "ModuleAdded", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "module", type: "address" }], name: "ModuleRemoved", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "token", type: "address" }], name: "TokenBound", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "token", type: "address" }], name: "TokenUnbound", type: "event" },
  { inputs: [], name: "ModuleAlreadyBound", type: "error" },
  { inputs: [], name: "ModuleNotBound", type: "error" },
  { inputs: [], name: "TokenAlreadyBound", type: "error" },
  { inputs: [], name: "TokenNotBound", type: "error" },
  { inputs: [], name: "InvalidModule", type: "error" },
  { inputs: [], name: "InvalidToken", type: "error" },
  { inputs: [], name: "MaxModulesReached", type: "error" },
  { inputs: [], name: "UnauthorizedCaller", type: "error" },
  { inputs: [], name: "ModuleCallFailed", type: "error" },
] as const;

// ============================================================================
// DIVIDEND DISTRIBUTOR ABI
// ============================================================================
export const DividendDistributorABI = [
  { inputs: [], name: "securityToken", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "feeRecipient", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "dividendFeeBps", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "uint256" }], name: "distributions", outputs: [{ name: "paymentToken", type: "address" }, { name: "totalAmount", type: "uint256" }, { name: "claimedAmount", type: "uint256" }, { name: "snapshotId", type: "uint256" }, { name: "createdAt", type: "uint256" }, { name: "expiresAt", type: "uint256" }, { name: "cancelled", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_paymentToken", type: "address" }, { name: "_amount", type: "uint256" }], name: "createDistribution", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_paymentToken", type: "address" }, { name: "_amount", type: "uint256" }, { name: "_snapshotId", type: "uint256" }], name: "createDistributionWithSnapshot", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_distributionId", type: "uint256" }], name: "claimDividend", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_distributionIds", type: "uint256[]" }], name: "batchClaimDividends", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_distributionId", type: "uint256" }, { name: "_account", type: "address" }], name: "getClaimableAmount", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_distributionId", type: "uint256" }, { name: "_account", type: "address" }], name: "hasClaimed", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_distributionId", type: "uint256" }], name: "cancelDistribution", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_distributionId", type: "uint256" }], name: "reclaimExpired", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_feeBps", type: "uint256" }], name: "setDividendFee", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_recipient", type: "address" }], name: "setFeeRecipient", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_token", type: "address" }], name: "setSecurityToken", outputs: [], stateMutability: "nonpayable", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "distributionId", type: "uint256" }, { indexed: true, name: "paymentToken", type: "address" }, { indexed: false, name: "totalAmount", type: "uint256" }, { indexed: false, name: "snapshotId", type: "uint256" }], name: "DistributionCreated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "distributionId", type: "uint256" }, { indexed: true, name: "account", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "DividendClaimed", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "distributionId", type: "uint256" }], name: "DistributionCancelled", type: "event" },
] as const;

// ============================================================================
// PLATFORM FEE MANAGER ABI
// ============================================================================
export const PlatformFeeManagerABI = [
  { name: 'distributeFees', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_projectId', type: 'uint256' }], outputs: [],},
  { name: 'getProjectFees', type: 'function', stateMutability: 'view', inputs: [{ name: '_projectId', type: 'uint256' }], outputs: [{ name: 'totalFees', type: 'uint256' }, { name: 'distributed', type: 'bool' },],},
] as const;

// ============================================================================
// ERC20 ABI
// ============================================================================
export const ERC20ABI = [
  { inputs: [], name: "name", outputs: [{ name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ name: "", type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSupply", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transfer", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transferFrom", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "from", type: "address" }, { indexed: true, name: "to", type: "address" }, { indexed: false, name: "value", type: "uint256" }], name: "Transfer", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "owner", type: "address" }, { indexed: true, name: "spender", type: "address" }, { indexed: false, name: "value", type: "uint256" }], name: "Approval", type: "event" },
] as const;

// ============================================================================
// IACCESS CONTROL ABI
// ============================================================================
export const IAccessControlABI = [
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "hasRole", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }], name: "getRoleAdmin", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "grantRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "revokeRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "callerConfirmation", type: "address" }], name: "renounceRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "role", type: "bytes32" }, { indexed: true, name: "previousAdminRole", type: "bytes32" }, { indexed: true, name: "newAdminRole", type: "bytes32" }], name: "RoleAdminChanged", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "role", type: "bytes32" }, { indexed: true, name: "account", type: "address" }, { indexed: true, name: "sender", type: "address" }], name: "RoleGranted", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "role", type: "bytes32" }, { indexed: true, name: "account", type: "address" }, { indexed: true, name: "sender", type: "address" }], name: "RoleRevoked", type: "event" },
] as const;

// ============================================================================
// COMMON ROLE CONSTANTS
// ============================================================================
export const ACCESS_CONTROL_ROLES = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  MINTER_ROLE: '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
  BURNER_ROLE: '0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848',
  FREEZER_ROLE: '0x5789b43a60de35bcedee40618ae90979bab7d1315fd4b079234241bdab19936d',
  ADMIN_ROLE: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
  OPERATOR_ROLE: '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929',
  DISPUTE_RESOLVER_ROLE: '0x21702c8af46127c7fa207f89d0b0a8441bb32959a0ac7df790e9ab1a25c98926',
  MANAGER_ROLE: '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08',
} as const;

// ============================================================================
// ENUMS
// ============================================================================
export const ProjectStatus = { DRAFT: 0, ACTIVE: 1, FUNDED: 2, COMPLETED: 3, CANCELLED: 4 } as const;
export const ProjectState = { INACTIVE: 0, ACTIVE: 1, FUNDED: 2, COMPLETED: 3, CANCELLED: 4, DISPUTED: 5 } as const;
export const MilestoneState = { PENDING: 0, APPROVED: 1, RELEASED: 2, DISPUTED: 3, CANCELLED: 4 } as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type RWALaunchpadFactoryABIType = typeof RWALaunchpadFactoryABI;
export type RWATokenizationFactoryABIType = typeof RWATokenizationFactoryABI ;
export type KYCVerifierABIType = typeof KYCVerifierABI;
export type RWAProjectNFTABIType = typeof RWAProjectNFTABI;
export type RWASecurityTokenABIType = typeof RWASecurityTokenABI;
export type RWAEscrowVaultABIType = typeof RWAEscrowVaultABI;
export type DisputeManagerABIType = typeof DisputeManagerABI;
export type ModularComplianceABIType = typeof ModularComplianceABI;
export type DividendDistributorABIType = typeof DividendDistributorABI;
export type PlatformFeeManagerABIType = typeof PlatformFeeManagerABI;
export type ERC20ABIType = typeof ERC20ABI;
export type IAccessControlABIType = typeof IAccessControlABI;
