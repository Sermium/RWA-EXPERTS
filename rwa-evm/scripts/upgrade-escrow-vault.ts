import { ethers, upgrades } from "hardhat";

// Avalanche Fuji addresses
const CONTRACTS = {
  RWAEscrowVault: "0xf6bE123965f80b8eA08627F3AA8545a7A92ECC0A",
  PlatformFeeManager: "0xeC644de34d1A641f2E1A67726445C1688ABd44fd",
  DisputeManager: "0x1C7496477eAeaBBf4fFAE127772422C57d11f025",
  RWAProjectNFT: "0x129287D01f98e32213519345F3bBCCcBA3fe3941",
  KYCVerifier: "0x3CA5b7e66cF25E8C761aA07f318e06B83d0bde7B",
  USDC: "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786",
  USDT: "0x224e403397F3aec9a0D2875445dC32dB00ea31C3"
};

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("         UPGRADING RWAEscrowVault CONTRACT");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} AVAX\n`);

  // Verify we're on Fuji
  if (chainId !== 43113) {
    console.log("⚠️  Warning: Not on Avalanche Fuji testnet!");
    console.log("   Expected chain ID: 43113");
    console.log("   Actual chain ID:", chainId);
    const proceed = process.env.FORCE_UPGRADE === "true";
    if (!proceed) {
      console.log("\n   Set FORCE_UPGRADE=true to proceed anyway");
      return;
    }
  }

  // Get current proxy info
  console.log("=== Current Contract State ===");
  const currentEscrow = await ethers.getContractAt("RWAEscrowVault", CONTRACTS.RWAEscrowVault);
  
  // Check current configuration
  const currentFeeManager = await currentEscrow.platformFeeManager();
  const currentKYCVerifier = await currentEscrow.kycVerifier();
  const currentProjectNFT = await currentEscrow.projectNFT();
  const currentUSDC = await currentEscrow.usdc();
  const currentUSDT = await currentEscrow.usdt();

  console.log(`Platform Fee Manager: ${currentFeeManager}`);
  console.log(`KYC Verifier: ${currentKYCVerifier}`);
  console.log(`Project NFT: ${currentProjectNFT}`);
  console.log(`USDC: ${currentUSDC}`);
  console.log(`USDT: ${currentUSDT}`);

  // Check deployer has admin role
  const ADMIN_ROLE = await currentEscrow.ADMIN_ROLE();
  const DEFAULT_ADMIN_ROLE = await currentEscrow.DEFAULT_ADMIN_ROLE();
  const isAdmin = await currentEscrow.hasRole(ADMIN_ROLE, deployer.address);
  const isDefaultAdmin = await currentEscrow.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  
  console.log(`\nDeployer has ADMIN_ROLE: ${isAdmin}`);
  console.log(`Deployer has DEFAULT_ADMIN_ROLE: ${isDefaultAdmin}`);

  if (!isDefaultAdmin) {
    console.log("\n❌ Error: Deployer must have DEFAULT_ADMIN_ROLE to upgrade");
    return;
  }

  // Check existing projects to make sure we don't break anything
  console.log("\n=== Checking Existing Projects ===");
  for (let i = 0; i <= 7; i++) {
    try {
      const project = await currentEscrow.projects(i);
      if (project.projectOwner !== ethers.ZeroAddress) {
        console.log(`Project ${i}: State=${project.state}, Raised=${ethers.formatUnits(project.totalRaised, 6)} USDC, FeesTransferred=${project.platformFeesTransferred}`);
      }
    } catch {}
  }

  // Compile and upgrade
  console.log("\n=== Upgrading Contract ===");
  console.log("Compiling new implementation...");
  
  const RWAEscrowVaultV2 = await ethers.getContractFactory("RWAEscrowVault");
  
  console.log("Upgrading proxy to new implementation...");
  
  const upgraded = await upgrades.upgradeProxy(
    CONTRACTS.RWAEscrowVault,
    RWAEscrowVaultV2,
    {
      unsafeAllow: ["constructor"],
      redeployImplementation: "always"
    }
  );

  await upgraded.waitForDeployment();
  const upgradedAddress = await upgraded.getAddress();

  console.log(`✓ Proxy upgraded at: ${upgradedAddress}`);

  // Get new implementation address
  const implementationSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  const implementationAddress = await ethers.provider.getStorage(upgradedAddress, implementationSlot);
  const newImplementation = "0x" + implementationAddress.slice(-40);
  console.log(`✓ New implementation: ${newImplementation}`);

  // Verify state is preserved
  console.log("\n=== Verifying State Preservation ===");
  const upgradedEscrow = await ethers.getContractAt("RWAEscrowVault", CONTRACTS.RWAEscrowVault);

  const afterFeeManager = await upgradedEscrow.platformFeeManager();
  const afterKYCVerifier = await upgradedEscrow.kycVerifier();
  const afterProjectNFT = await upgradedEscrow.projectNFT();
  const afterUSDC = await upgradedEscrow.usdc();
  const afterUSDT = await upgradedEscrow.usdt();

  console.log(`Platform Fee Manager: ${afterFeeManager} ${afterFeeManager === currentFeeManager ? '✓' : '❌ CHANGED!'}`);
  console.log(`KYC Verifier: ${afterKYCVerifier} ${afterKYCVerifier === currentKYCVerifier ? '✓' : '❌ CHANGED!'}`);
  console.log(`Project NFT: ${afterProjectNFT} ${afterProjectNFT === currentProjectNFT ? '✓' : '❌ CHANGED!'}`);
  console.log(`USDC: ${afterUSDC} ${afterUSDC === currentUSDC ? '✓' : '❌ CHANGED!'}`);
  console.log(`USDT: ${afterUSDT} ${afterUSDT === currentUSDT ? '✓' : '❌ CHANGED!'}`);

  // Check a project still exists
  console.log("\n=== Verifying Project Data ===");
  const project7 = await upgradedEscrow.projects(7);
  console.log(`Project 7 still exists: ${project7.projectOwner !== ethers.ZeroAddress ? '✓' : '❌'}`);
  console.log(`Project 7 Total Raised: ${ethers.formatUnits(project7.totalRaised, 6)} USDC`);
  console.log(`Project 7 State: ${project7.state}`);

  // Test that new completeProject function exists by checking it doesn't revert on static call
  console.log("\n=== Testing New completeProject Function ===");
  try {
    // Try a static call - it should fail with a revert reason, not "function doesn't exist"
    await upgradedEscrow.completeProject.staticCall(7);
    console.log("✓ Function exists and would execute (static call passed)");
  } catch (e: any) {
    if (e.message.includes("NotAuthorized") || 
        e.message.includes("InvalidState") || 
        e.message.includes("execution reverted")) {
      console.log("✓ Function exists (reverted with expected error)");
    } else {
      console.log(`⚠️ Unexpected error: ${e.message}`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                    UPGRADE COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`\nProxy Address: ${CONTRACTS.RWAEscrowVault}`);
  console.log(`New Implementation: ${newImplementation}`);
  console.log("\nNext steps:");
  console.log("1. Verify the new implementation on Snowtrace");
  console.log("2. Run the E2E test to confirm completeProject works");
  console.log("3. Test with project 7 which is in FUNDED state");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });