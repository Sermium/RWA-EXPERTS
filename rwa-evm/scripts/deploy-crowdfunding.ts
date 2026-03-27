// scripts/deploy-crowdfunding.ts
import { ethers, upgrades, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface ChainConfig {
  usdc: string;
  usdt: string;
  priceFeed: string;
  explorerUrl: string;
}

interface PlatformWallets {
  feeReceiver: string;
  liquidityWallet: string;
  treasuryWallet: string;
}

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  43114: {
    usdc: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    usdt: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    priceFeed: ethers.ZeroAddress,
    explorerUrl: "https://snowtrace.io"
  },
  43113: {
    usdc: "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786",
    usdt: "0x224e403397F3aec9a0D2875445dC32dB00ea31C3",
    priceFeed: ethers.ZeroAddress,
    explorerUrl: "https://testnet.snowtrace.io"
  },
  31337: {
    usdc: ethers.ZeroAddress,
    usdt: ethers.ZeroAddress,
    priceFeed: ethers.ZeroAddress,
    explorerUrl: ""
  }
};

// Platform wallets - UPDATE THESE FOR PRODUCTION
const PLATFORM_WALLETS: Record<number, PlatformWallets> = {
  43114: {
    feeReceiver: "", // TODO: Set mainnet fee receiver
    liquidityWallet: "", // TODO: Set mainnet liquidity wallet (for Exchange MM)
    treasuryWallet: "" // TODO: Set mainnet treasury wallet
  },
  43113: {
    feeReceiver: "", // Will use deployer if empty
    liquidityWallet: "", // Will use deployer if empty
    treasuryWallet: "" // Will use deployer if empty
  },
  31337: {
    feeReceiver: "",
    liquidityWallet: "",
    treasuryWallet: ""
  }
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const config = CHAIN_CONFIGS[chainId];
  const wallets = PLATFORM_WALLETS[chainId];

  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  // Use deployer address for empty wallet configs (testnet/local)
  const feeReceiver = wallets.feeReceiver || deployer.address;
  const liquidityWallet = wallets.liquidityWallet || deployer.address;
  const treasuryWallet = wallets.treasuryWallet || deployer.address;

  console.log("=".repeat(60));
  console.log("RWA Crowdfunding Platform Deployment");
  console.log("=".repeat(60));
  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} AVAX`);
  console.log("=".repeat(60));
  console.log("\nPlatform Wallets:");
  console.log(`  Fee Receiver:     ${feeReceiver}`);
  console.log(`  Liquidity Wallet: ${liquidityWallet}`);
  console.log(`  Treasury Wallet:  ${treasuryWallet}`);
  console.log("=".repeat(60));

  // ============ [1/12] Deploy Implementations ============
  console.log("\n[1/12] Deploying implementations...");

  const KYCVerifier = await ethers.getContractFactory("KYCVerifier");
  const kycVerifierImpl = await KYCVerifier.deploy();
  await kycVerifierImpl.waitForDeployment();
  console.log(`  KYCVerifier impl: ${await kycVerifierImpl.getAddress()}`);

  const RWASecurityToken = await ethers.getContractFactory("RWASecurityToken");
  const securityTokenImpl = await RWASecurityToken.deploy();
  await securityTokenImpl.waitForDeployment();
  console.log(`  RWASecurityToken impl: ${await securityTokenImpl.getAddress()}`);

  const RWAEscrowVault = await ethers.getContractFactory("RWAEscrowVault");
  const escrowVaultImpl = await RWAEscrowVault.deploy();
  await escrowVaultImpl.waitForDeployment();
  console.log(`  RWAEscrowVault impl: ${await escrowVaultImpl.getAddress()}`);

  const ModularCompliance = await ethers.getContractFactory("ModularCompliance");
  const complianceImpl = await ModularCompliance.deploy();
  await complianceImpl.waitForDeployment();
  console.log(`  ModularCompliance impl: ${await complianceImpl.getAddress()}`);

  const RWAProjectNFT = await ethers.getContractFactory("RWAProjectNFT");
  const projectNFTImpl = await RWAProjectNFT.deploy();
  await projectNFTImpl.waitForDeployment();
  console.log(`  RWAProjectNFT impl: ${await projectNFTImpl.getAddress()}`);

  const DividendDistributor = await ethers.getContractFactory("DividendDistributor");
  const dividendImpl = await DividendDistributor.deploy();
  await dividendImpl.waitForDeployment();
  console.log(`  DividendDistributor impl: ${await dividendImpl.getAddress()}`);

  const MaxBalanceModule = await ethers.getContractFactory("MaxBalanceModule");
  const maxBalanceImpl = await MaxBalanceModule.deploy();
  await maxBalanceImpl.waitForDeployment();
  console.log(`  MaxBalanceModule impl: ${await maxBalanceImpl.getAddress()}`);

  const LockupModule = await ethers.getContractFactory("LockupModule");
  const lockupImpl = await LockupModule.deploy();
  await lockupImpl.waitForDeployment();
  console.log(`  LockupModule impl: ${await lockupImpl.getAddress()}`);

  const PlatformFeeManager = await ethers.getContractFactory("PlatformFeeManager");
  const platformFeeManagerImpl = await PlatformFeeManager.deploy();
  await platformFeeManagerImpl.waitForDeployment();
  console.log(`  PlatformFeeManager impl: ${await platformFeeManagerImpl.getAddress()}`);

  const DisputeManager = await ethers.getContractFactory("DisputeManager");
  const disputeManagerImpl = await DisputeManager.deploy();
  await disputeManagerImpl.waitForDeployment();
  console.log(`  DisputeManager impl: ${await disputeManagerImpl.getAddress()}`);

  // ============ [2/12] Deploy KYCVerifier Proxy ============
  console.log("\n[2/12] Deploying KYCVerifier proxy...");
  const registrationFee = ethers.parseEther("0");
  const kycVerifierProxy = await upgrades.deployProxy(
    KYCVerifier,
    [deployer.address, registrationFee, deployer.address],
    { initializer: "initialize", kind: "uups" }
  );
  await kycVerifierProxy.waitForDeployment();
  console.log(`  KYCVerifier proxy: ${await kycVerifierProxy.getAddress()}`);

  // ============ [3/12] Deploy ProjectNFT Proxy ============
  console.log("\n[3/12] Deploying RWAProjectNFT proxy...");
  const projectNFTProxy = await upgrades.deployProxy(
    RWAProjectNFT,
    ["RWA Project NFT", "RWANFT", deployer.address],
    { initializer: "initialize", kind: "uups" }
  );
  await projectNFTProxy.waitForDeployment();
  console.log(`  RWAProjectNFT proxy: ${await projectNFTProxy.getAddress()}`);

  // ============ [4/12] Deploy PlatformFeeManager Proxy ============
  console.log("\n[4/12] Deploying PlatformFeeManager proxy...");
  const platformFeeManagerProxy = await upgrades.deployProxy(
    PlatformFeeManager,
    [deployer.address, feeReceiver, liquidityWallet, treasuryWallet],
    { initializer: "initialize", kind: "uups" }
  );
  await platformFeeManagerProxy.waitForDeployment();
  const platformFeeManagerAddress = await platformFeeManagerProxy.getAddress();
  console.log(`  PlatformFeeManager proxy: ${platformFeeManagerAddress}`);

  // ============ [5/12] Deploy EscrowVault Proxy ============
  console.log("\n[5/12] Deploying RWAEscrowVault proxy...");
  const escrowVaultProxy = await upgrades.deployProxy(
    RWAEscrowVault,
    [deployer.address, platformFeeManagerAddress, await projectNFTProxy.getAddress()],
    { initializer: "initialize", kind: "uups" }
  );
  await escrowVaultProxy.waitForDeployment();
  const escrowAddress = await escrowVaultProxy.getAddress();
  console.log(`  RWAEscrowVault proxy: ${escrowAddress}`);

  // ============ [6/12] Deploy DisputeManager Proxy ============
  console.log("\n[6/12] Deploying DisputeManager proxy...");
  const disputeManagerProxy = await upgrades.deployProxy(
    DisputeManager,
    [deployer.address, escrowAddress],
    { initializer: "initialize", kind: "uups" }
  );
  await disputeManagerProxy.waitForDeployment();
  const disputeManagerAddress = await disputeManagerProxy.getAddress();
  console.log(`  DisputeManager proxy: ${disputeManagerAddress}`);

  // ============ [7/12] Deploy Factory Proxy ============
  console.log("\n[7/12] Deploying RWALaunchpadFactory proxy...");
  const RWALaunchpadFactory = await ethers.getContractFactory("RWALaunchpadFactory");

  const factoryProxy = await upgrades.deployProxy(
    RWALaunchpadFactory,
    [
      deployer.address,
      await securityTokenImpl.getAddress(),
      await escrowVaultImpl.getAddress(),
      await complianceImpl.getAddress(),
      await kycVerifierProxy.getAddress(),
      await projectNFTProxy.getAddress(),
      deployer.address
    ],
    { initializer: "initialize", kind: "uups" }
  );
  await factoryProxy.waitForDeployment();
  const factoryAddress = await factoryProxy.getAddress();
  console.log(`  RWALaunchpadFactory proxy: ${factoryAddress}`);

  // ============ [8/12] Configure Factory ============
  console.log("\n[8/12] Configuring Factory...");
  const factory = await ethers.getContractAt("RWALaunchpadFactory", factoryAddress);

  if (config.usdc !== ethers.ZeroAddress || config.usdt !== ethers.ZeroAddress) {
    await (await factory.setDefaultPaymentTokens(config.usdc, config.usdt)).wait();
    console.log(`  Default payment tokens set: USDC=${config.usdc}, USDT=${config.usdt}`);
  }

  await (await factory.setDefaultPriceFeed(config.priceFeed)).wait();
  console.log(`  Default price feed set: ${config.priceFeed}`);

  await (await factory.setMaxBalanceModuleImpl(await maxBalanceImpl.getAddress())).wait();
  console.log(`  MaxBalanceModule impl set`);

  await (await factory.setLockupModuleImpl(await lockupImpl.getAddress())).wait();
  console.log(`  LockupModule impl set`);

  await (await factory.setDividendDistributorImpl(await dividendImpl.getAddress())).wait();
  console.log(`  DividendDistributor impl set`);

  // ============ [9/12] Configure EscrowVault ============
  console.log("\n[9/12] Configuring EscrowVault...");
  const escrowVault = await ethers.getContractAt("RWAEscrowVault", escrowAddress);

  await (await escrowVault.setKYCVerifier(await kycVerifierProxy.getAddress())).wait();
  console.log(`  KYCVerifier set on EscrowVault`);

  if (config.usdc !== ethers.ZeroAddress && config.usdt !== ethers.ZeroAddress) {
    await (await escrowVault.setPaymentTokens(config.usdc, config.usdt)).wait();
    console.log(`  Payment tokens set on EscrowVault`);
  }

  // Grant DISPUTE_MANAGER_ROLE to DisputeManager
  await (await escrowVault.grantDisputeManagerRole(disputeManagerAddress)).wait();
  console.log(`  DISPUTE_MANAGER_ROLE granted to DisputeManager`);

  // ============ [10/12] Configure PlatformFeeManager Roles ============
  console.log("\n[10/12] Configuring PlatformFeeManager roles...");
  const platformFeeManager = await ethers.getContractAt("PlatformFeeManager", platformFeeManagerAddress);

  // Grant ESCROW_ROLE to EscrowVault
  await (await platformFeeManager.grantEscrowRole(escrowAddress)).wait();
  console.log(`  ESCROW_ROLE granted to EscrowVault`);

  // Grant DISPUTE_MANAGER_ROLE to DisputeManager
  await (await platformFeeManager.grantDisputeManagerRole(disputeManagerAddress)).wait();
  console.log(`  DISPUTE_MANAGER_ROLE granted to DisputeManager`);

  // ============ [11/12] Configure ProjectNFT Roles ============
  console.log("\n[11/12] Configuring ProjectNFT roles...");
  const projectNFT = await ethers.getContractAt("RWAProjectNFT", await projectNFTProxy.getAddress());
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE"));

  await (await projectNFT.grantRole(MINTER_ROLE, factoryAddress)).wait();
  console.log(`  MINTER_ROLE granted to Factory`);

  await (await projectNFT.grantRole(MANAGER_ROLE, factoryAddress)).wait();
  console.log(`  MANAGER_ROLE granted to Factory`);

  await (await projectNFT.grantRole(MANAGER_ROLE, escrowAddress)).wait();
  console.log(`  MANAGER_ROLE granted to EscrowVault`);

  // ============ [12/12] Verify & Save Deployment ============
  console.log("\n[12/12] Verifying and saving deployment...");

  // Verify permissions
  const factoryOwner = await factory.owner();
  console.log(`  Factory owner: ${factoryOwner}`);

  const kycVerifier = await ethers.getContractAt("KYCVerifier", await kycVerifierProxy.getAddress());
  const kycOwner = await kycVerifier.owner();
  console.log(`  KYCVerifier owner: ${kycOwner}`);

  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const hasNFTAdmin = await projectNFT.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  console.log(`  Deployer has ProjectNFT admin: ${hasNFTAdmin}`);

  const escrowHasManagerRole = await projectNFT.hasRole(MANAGER_ROLE, escrowAddress);
  console.log(`  EscrowVault has MANAGER_ROLE on ProjectNFT: ${escrowHasManagerRole}`);

  // Save deployment
  const deployment = {
    chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      implementations: {
        kycVerifier: await kycVerifierImpl.getAddress(),
        securityToken: await securityTokenImpl.getAddress(),
        escrowVault: await escrowVaultImpl.getAddress(),
        compliance: await complianceImpl.getAddress(),
        projectNFT: await projectNFTImpl.getAddress(),
        dividend: await dividendImpl.getAddress(),
        maxBalanceModule: await maxBalanceImpl.getAddress(),
        lockupModule: await lockupImpl.getAddress(),
        platformFeeManager: await platformFeeManagerImpl.getAddress(),
        disputeManager: await disputeManagerImpl.getAddress()
      },
      proxies: {
        kycVerifier: await kycVerifierProxy.getAddress(),
        projectNFT: await projectNFTProxy.getAddress(),
        factory: factoryAddress,
        escrowVault: escrowAddress,
        platformFeeManager: platformFeeManagerAddress,
        disputeManager: disputeManagerAddress
      }
    },
    platformWallets: {
      feeReceiver,
      liquidityWallet,
      treasuryWallet
    },
    config: {
      usdc: config.usdc,
      usdt: config.usdt,
      priceFeed: config.priceFeed,
      registrationFee: registrationFee.toString()
    },
    roles: {
      factoryHasMinterRole: true,
      factoryHasManagerRole: true,
      escrowHasManagerRole: escrowHasManagerRole,
      escrowHasDisputeManagerRole: true,
      platformFeeManagerHasEscrowRole: true,
      platformFeeManagerHasDisputeRole: true
    }
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filePath = path.join(deploymentsDir, `crowdfunding-${chainId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deployment, null, 2));
  console.log(`  Saved to: ${filePath}`);

  // ============ Summary ============
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));

  console.log("\n📦 Proxies (use these addresses):");
  console.log(`  KYCVerifier:         ${await kycVerifierProxy.getAddress()}`);
  console.log(`  RWAProjectNFT:       ${await projectNFTProxy.getAddress()}`);
  console.log(`  RWALaunchpadFactory: ${factoryAddress}`);
  console.log(`  RWAEscrowVault:      ${escrowAddress}`);
  console.log(`  PlatformFeeManager:  ${platformFeeManagerAddress}`);
  console.log(`  DisputeManager:      ${disputeManagerAddress}`);

  console.log("\n🔧 Implementations:");
  console.log(`  KYCVerifier:         ${await kycVerifierImpl.getAddress()}`);
  console.log(`  RWASecurityToken:    ${await securityTokenImpl.getAddress()}`);
  console.log(`  RWAEscrowVault:      ${await escrowVaultImpl.getAddress()}`);
  console.log(`  ModularCompliance:   ${await complianceImpl.getAddress()}`);
  console.log(`  RWAProjectNFT:       ${await projectNFTImpl.getAddress()}`);
  console.log(`  DividendDistributor: ${await dividendImpl.getAddress()}`);
  console.log(`  MaxBalanceModule:    ${await maxBalanceImpl.getAddress()}`);
  console.log(`  LockupModule:        ${await lockupImpl.getAddress()}`);
  console.log(`  PlatformFeeManager:  ${await platformFeeManagerImpl.getAddress()}`);
  console.log(`  DisputeManager:      ${await disputeManagerImpl.getAddress()}`);

  console.log("\n💰 Platform Wallets:");
  console.log(`  Fee Receiver:     ${feeReceiver} (34% USDT)`);
  console.log(`  Liquidity Wallet: ${liquidityWallet} (33% USDT + 50% tokens)`);
  console.log(`  Treasury Wallet:  ${treasuryWallet} (33% USDT + 50% tokens)`);

  console.log("\n🔐 Roles Configured:");
  console.log(`  Factory → ProjectNFT:        MINTER_ROLE, MANAGER_ROLE`);
  console.log(`  EscrowVault → ProjectNFT:    MANAGER_ROLE`);
  console.log(`  EscrowVault → PlatformFeeManager: ESCROW_ROLE`);
  console.log(`  DisputeManager → EscrowVault: DISPUTE_MANAGER_ROLE`);
  console.log(`  DisputeManager → PlatformFeeManager: DISPUTE_MANAGER_ROLE`);

  console.log("\n⚙️ Fee Structure:");
  console.log(`  Platform USDT Fee: 1.5% of raised amount`);
  console.log(`  Platform Token Fee: 1% of token supply`);
  console.log(`  Investor Tokens: 99% of token supply`);
  console.log(`  USDT Split: 34% fee receiver, 33% liquidity, 33% treasury`);
  console.log(`  Token Split: 50% liquidity, 50% treasury`);

  console.log("\n🔄 Upgrade Permissions:");
  console.log(`  All contracts upgradeable by: ${deployer.address}`);

  if (config.explorerUrl) {
    console.log("\n🔗 Explorer Links:");
    console.log(`  Factory:            ${config.explorerUrl}/address/${factoryAddress}`);
    console.log(`  KYCVerifier:        ${config.explorerUrl}/address/${await kycVerifierProxy.getAddress()}`);
    console.log(`  ProjectNFT:         ${config.explorerUrl}/address/${await projectNFTProxy.getAddress()}`);
    console.log(`  EscrowVault:        ${config.explorerUrl}/address/${escrowAddress}`);
    console.log(`  PlatformFeeManager: ${config.explorerUrl}/address/${platformFeeManagerAddress}`);
    console.log(`  DisputeManager:     ${config.explorerUrl}/address/${disputeManagerAddress}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Deployment complete!");
  console.log("=".repeat(60));

  // ============ Post-Deployment Checklist ============
  console.log("\n📋 POST-DEPLOYMENT CHECKLIST:");
  console.log("=".repeat(60));
  console.log("1. [ ] Update platform wallet addresses for mainnet");
  console.log("2. [ ] Set claim fee if needed: escrowVault.setClaimFee(feeBps)");
  console.log("3. [ ] Set claim fee recipient: escrowVault.setClaimFeeRecipient(address)");
  console.log("4. [ ] Verify contracts on explorer");
  console.log("5. [ ] Test full flow on testnet:");
  console.log("       - Create project");
  console.log("       - Activate project");
  console.log("       - Invest");
  console.log("       - Complete project");
  console.log("       - Claim tokens");
  console.log("       - Release milestone funds");
  console.log("       - Open dispute");
  console.log("       - Block/resolve dispute");
  console.log("6. [ ] Update frontend config with new addresses");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
