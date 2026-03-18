import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  console.log("\n🔍 DEPLOYMENT VERIFICATION\n");
  
  // Load latest deployment
  const network = await ethers.provider.getNetwork();
  const deploymentFile = `deployments/latest-${network.name}.json`;
  
  if (!fs.existsSync(deploymentFile)) {
    console.error(`Deployment file not found: ${deploymentFile}`);
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  console.log(`Loaded deployment from ${deploymentFile}`);
  console.log(`Timestamp: ${deployment.timestamp}\n`);
  
  const [deployer] = await ethers.getSigners();
  let errors = 0;
  let warnings = 0;
  
  // ==========================================================================
  // 1. CHECK FACTORY
  // ==========================================================================
  
  console.log("1. Checking Factory...");
  const factory = await ethers.getContractAt("RWALaunchpadFactory", deployment.factory);
  
  const identityRegistry = await factory.identityRegistry();
  const projectNFT = await factory.projectNFT();
  const implementations = await factory.implementations();
  
  if (identityRegistry === deployment.identityRegistry) {
    console.log("   ✅ Identity Registry correctly set");
  } else {
    console.log("   ❌ Identity Registry mismatch!");
    errors++;
  }
  
  if (projectNFT === deployment.projectNFT) {
    console.log("   ✅ Project NFT correctly set");
  } else {
    console.log("   ❌ Project NFT mismatch!");
    errors++;
  }
  
  if (implementations.securityToken === deployment.securityTokenImpl) {
    console.log("   ✅ Security Token impl correctly set");
  } else {
    console.log("   ❌ Security Token impl mismatch!");
    errors++;
  }
  
  if (implementations.escrowVault === deployment.escrowVaultImpl) {
    console.log("   ✅ Escrow Vault impl correctly set");
  } else {
    console.log("   ❌ Escrow Vault impl mismatch!");
    errors++;
  }
  
  // ==========================================================================
  // 2. CHECK IDENTITY REGISTRY
  // ==========================================================================
  
  console.log("\n2. Checking Identity Registry...");
  const ir = await ethers.getContractAt("IdentityRegistry", deployment.identityRegistry);
  
  const storage = await ir.identityStorage();
  if (storage === deployment.identityRegistryStorage) {
    console.log("   ✅ Storage correctly bound");
  } else {
    console.log("   ❌ Storage mismatch!");
    errors++;
  }
  
  // ==========================================================================
  // 3. CHECK ROLES
  // ==========================================================================
  
  console.log("\n3. Checking Roles...");
  const nft = await ethers.getContractAt("RWAProjectNFT", deployment.projectNFT);
  
  const FACTORY_ROLE = await nft.FACTORY_ROLE();
  const hasFactoryRole = await nft.hasRole(FACTORY_ROLE, deployment.factory);
  
  if (hasFactoryRole) {
    console.log("   ✅ Factory has FACTORY_ROLE on ProjectNFT");
  } else {
    console.log("   ❌ Factory missing FACTORY_ROLE!");
    errors++;
  }
  
  const REGISTRAR_ROLE = await ir.REGISTRAR_ROLE();
  const deployerHasRegistrar = await ir.hasRole(REGISTRAR_ROLE, deployer.address);
  const factoryHasRegistrar = await ir.hasRole(REGISTRAR_ROLE, deployment.factory);
  
  if (deployerHasRegistrar) {
    console.log("   ✅ Deployer has REGISTRAR_ROLE on IdentityRegistry");
  } else {
    console.log("   ⚠️  Deployer missing REGISTRAR_ROLE (needed for manual KYC)");
    warnings++;
  }
  
  if (factoryHasRegistrar) {
    console.log("   ✅ Factory has REGISTRAR_ROLE on IdentityRegistry");
  } else {
    console.log("   ⚠️  Factory missing REGISTRAR_ROLE (needed for auto-KYC)");
    warnings++;
  }
  
  // ==========================================================================
  // 4. CHECK PRICE FEEDS
  // ==========================================================================
  
  console.log("\n4. Checking Price Feeds...");
  
  const nativeFeed = await factory.nativePriceFeed();
  if (nativeFeed !== ethers.ZeroAddress) {
    console.log(`   ✅ Native price feed set: ${nativeFeed}`);
    
    // Try to get price
    try {
      const AggregatorV3 = await ethers.getContractAt(
        ["function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)"],
        nativeFeed
      );
      const [, price, , timestamp] = await AggregatorV3.latestRoundData();
      const age = Math.floor(Date.now() / 1000) - Number(timestamp);
      console.log(`   ✅ Native price: $${Number(price) / 1e8} (${age}s old)`);
    } catch {
      console.log("   ⚠️  Could not read native price feed");
      warnings++;
    }
  } else {
    console.log("   ⚠️  No native price feed set");
    warnings++;
  }
  
  // Check stablecoin feeds
  const stablecoins = await factory.getDefaultStablecoins();
  for (const stable of stablecoins) {
    const [feed, isStable] = await factory.tokenPriceFeeds(stable);
    if (isStable) {
      console.log(`   ✅ ${stable} configured as stablecoin ($1.00)`);
    } else if (feed !== ethers.ZeroAddress) {
      console.log(`   ✅ ${stable} has price feed: ${feed}`);
    } else {
      console.log(`   ⚠️  ${stable} has no price configuration`);
      warnings++;
    }
  }
  
  // ==========================================================================
  // 5. TEST PROJECT CREATION (DRY RUN)
  // ==========================================================================
  
  console.log("\n5. Testing Project Creation (estimation only)...");
  
  try {
    const now = Math.floor(Date.now() / 1000);
    const oneWeek = 7 * 24 * 60 * 60;
    
    await factory.createProject.estimateGas(
      "Test Project",
      "TEST",
      "ipfs://QmTest",
      ethers.parseUnits("100000", 6),   // $100k goal
      ethers.parseUnits("100", 6),       // $100 min
      ethers.parseUnits("10000", 6),     // $10k max
      now + 3600,                         // Start in 1 hour
      now + oneWeek,                      // End in 1 week
      [30, 30, 40],                       // Milestone percentages
      ["M1", "M2", "M3"]                  // Milestone descriptions
    );
    console.log("   ✅ Project creation would succeed");
  } catch (error: any) {
    console.log(`   ❌ Project creation would fail: ${error.reason || error.message}`);
    errors++;
  }
  
  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  
  console.log("\n" + "=".repeat(50));
  console.log("VERIFICATION SUMMARY");
  console.log("=".repeat(50));
  
  if (errors === 0 && warnings === 0) {
    console.log("\n✅ All checks passed! Deployment is ready.\n");
  } else if (errors === 0) {
    console.log(`\n⚠️  ${warnings} warning(s), but deployment should work.\n`);
  } else {
    console.log(`\n❌ ${errors} error(s), ${warnings} warning(s). Fix issues before use.\n`);
  }
  
  return { errors, warnings };
}

main()
  .then(({ errors }) => process.exit(errors > 0 ? 1 : 0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
