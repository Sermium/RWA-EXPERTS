import { ethers, upgrades } from "hardhat";

const CONTRACTS = {
  RWAEscrowVault: "0xf6bE123965f80b8eA08627F3AA8545a7A92ECC0A"
};

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("   UPGRADING RWAEscrowVault WITH OFF-CHAIN INJECTION FEATURE");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} AVAX\n`);

  // Get current state
  const currentEscrow = await ethers.getContractAt("RWAEscrowVault", CONTRACTS.RWAEscrowVault);
  
  // Check admin role
  const DEFAULT_ADMIN_ROLE = await currentEscrow.DEFAULT_ADMIN_ROLE();
  const isDefaultAdmin = await currentEscrow.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  
  console.log(`Deployer has DEFAULT_ADMIN_ROLE: ${isDefaultAdmin}`);

  if (!isDefaultAdmin) {
    console.log("\n❌ Error: Deployer must have DEFAULT_ADMIN_ROLE to upgrade");
    return;
  }

  // Upgrade
  console.log("\n=== Upgrading Contract ===");
  
  const RWAEscrowVaultV3 = await ethers.getContractFactory("RWAEscrowVault");
  
  const upgraded = await upgrades.upgradeProxy(
    CONTRACTS.RWAEscrowVault,
    RWAEscrowVaultV3,
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

  // Test new functions exist
  console.log("\n=== Testing New Functions ===");
  const upgradedEscrow = await ethers.getContractAt("RWAEscrowVault", CONTRACTS.RWAEscrowVault);

  try {
    // Check function exists by trying to encode it
    upgradedEscrow.interface.encodeFunctionData("injectOffChainFunds", [
      1, // projectId
      ethers.parseUnits("1000", 6), // amount
      "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786", // USDC
      "TEST-REF"
    ]);
    console.log("✓ injectOffChainFunds() function exists");
  } catch (e) {
    console.log("❌ injectOffChainFunds() function NOT found");
  }

  try {
    upgradedEscrow.interface.encodeFunctionData("batchInjectOffChainFunds", [
      1,
      [ethers.parseUnits("1000", 6)],
      "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786",
      ["TEST-REF"]
    ]);
    console.log("✓ batchInjectOffChainFunds() function exists");
  } catch (e) {
    console.log("❌ batchInjectOffChainFunds() function NOT found");
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                    UPGRADE COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`\nNew features available:`);
  console.log(`  • injectOffChainFunds() - Convert single off-chain payment`);
  console.log(`  • batchInjectOffChainFunds() - Convert multiple at once`);
  console.log(`\nProxy Address: ${CONTRACTS.RWAEscrowVault}`);
  console.log(`New Implementation: ${newImplementation}`);
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });