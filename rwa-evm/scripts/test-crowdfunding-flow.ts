// scripts/test-crowdfunding-flow.ts
import { ethers } from "hardhat";

async function main() {
  const [deployer, investor1, investor2] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  
  console.log("=".repeat(60));
  console.log("Crowdfunding Full Flow Test");
  console.log("=".repeat(60));
  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployer: ${deployer.address}`);
  
  // Skip if mainnet
  if (chainId === 43114 || chainId === 137 || chainId === 1) {
    console.log("⚠️  Skipping test on mainnet");
    return;
  }

  let deployment;
  try {
    deployment = require(`../deployments/latest-${chainId}.json`);
  } catch (e) {
    console.log("❌ No deployment found");
    return;
  }

  const escrow = await ethers.getContractAt("RWAEscrowVault", deployment.escrowVault);
  const feeManager = await ethers.getContractAt("PlatformFeeManager", deployment.platformFeeManager);
  const disputeManager = await ethers.getContractAt("DisputeManager", deployment.disputeManager);
  const projectNFT = await ethers.getContractAt("RWAProjectNFT", deployment.projectNFT);

  // Get test tokens
  const usdcAddress = deployment.tokens?.USDC || deployment.acceptedTokens?.USDC;
  if (!usdcAddress || usdcAddress === ethers.ZeroAddress) {
    console.log("⚠️  No USDC configured, skipping investment test");
    return;
  }

  console.log("\n📋 Test Flow:");
  console.log("1. Create project");
  console.log("2. Activate project");
  console.log("3. Invest (mock - requires KYC)");
  console.log("4. Complete project");
  console.log("5. Claim tokens");
  console.log("6. Release milestone");
  console.log("7. Open dispute");
  console.log("8. Resolve dispute");

  // This is a skeleton - actual test would need:
  // - Mock KYC signatures
  // - Test USDC with balance
  // - Security token deployment
  
  console.log("\n✅ Test skeleton complete");
  console.log("For full integration testing, deploy mock tokens and generate KYC proofs");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
