// scripts/test-crowdfunding-flow.ts
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║           CROWDFUNDING FULL FLOW TEST                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`\nChain ID: ${chainId}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} AVAX`);
  
  // Hardcoded addresses for Avalanche Fuji (43113)
  const ESCROW_VAULT = "0xf6bE123965f80b8eA08627F3AA8545a7A92ECC0A";
  const PLATFORM_FEE_MANAGER = "0xeC644de34d1A641f2E1A67726445C1688ABd44fd";
  const DISPUTE_MANAGER = "0x1C7496477eAeaBBf4fFAE127772422C57d11f025";
  const PROJECT_NFT = "0x129287D01f98e32213519345F3bBCCcBA3fe3941";
  const KYC_VERIFIER = "0x3CA5b7e66cF25E8C761aA07f318e06B83d0bde7B";
  const USDC = "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786";

  console.log("\n=== Loading Contracts ===");
  console.log(`EscrowVault address: ${ESCROW_VAULT}`);
  
  // Load contracts one by one with error handling
  let escrowVault, feeManager, disputeManager, projectNFT, kycVerifier;
  
  try {
    escrowVault = await ethers.getContractAt("RWAEscrowVault", ESCROW_VAULT);
    console.log("✓ RWAEscrowVault loaded");
  } catch (e: any) {
    console.error("✗ Failed to load RWAEscrowVault:", e.message);
    return;
  }
  
  try {
    feeManager = await ethers.getContractAt("PlatformFeeManager", PLATFORM_FEE_MANAGER);
    console.log("✓ PlatformFeeManager loaded");
  } catch (e: any) {
    console.error("✗ Failed to load PlatformFeeManager:", e.message);
    return;
  }
  
  try {
    disputeManager = await ethers.getContractAt("DisputeManager", DISPUTE_MANAGER);
    console.log("✓ DisputeManager loaded");
  } catch (e: any) {
    console.error("✗ Failed to load DisputeManager:", e.message);
    return;
  }
  
  try {
    projectNFT = await ethers.getContractAt("RWAProjectNFT", PROJECT_NFT);
    console.log("✓ RWAProjectNFT loaded");
  } catch (e: any) {
    console.error("✗ Failed to load RWAProjectNFT:", e.message);
    return;
  }
  
  try {
    kycVerifier = await ethers.getContractAt("KYCVerifier", KYC_VERIFIER);
    console.log("✓ KYCVerifier loaded");
  } catch (e: any) {
    console.error("✗ Failed to load KYCVerifier:", e.message);
    return;
  }

  // Check USDC balance
  console.log("\n=== Token Balances ===");
  try {
    const usdc = await ethers.getContractAt("IERC20", USDC);
    const balance = await usdc.balanceOf(deployer.address);
    console.log(`USDC Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  } catch (e: any) {
    console.log("Could not check USDC balance:", e.message);
  }

  // Read EscrowVault configuration
  console.log("\n=== EscrowVault Configuration ===");
  try {
    console.log(`KYC Verifier: ${await escrowVault.kycVerifier()}`);
    console.log(`Platform Fee Manager: ${await escrowVault.platformFeeManager()}`);
    console.log(`Project NFT: ${await escrowVault.projectNFT()}`);
    console.log(`PLATFORM_USDT_FEE_BPS: ${await escrowVault.PLATFORM_USDT_FEE_BPS()} (1.5%)`);
    console.log(`PLATFORM_TOKEN_FEE_BPS: ${await escrowVault.PLATFORM_TOKEN_FEE_BPS()} (1%)`);
    console.log(`INVESTOR_TOKEN_BPS: ${await escrowVault.INVESTOR_TOKEN_BPS()} (99%)`);
  } catch (e: any) {
    console.error("Error reading EscrowVault:", e.message);
  }

  // Read PlatformFeeManager configuration
  console.log("\n=== PlatformFeeManager Configuration ===");
  try {
    console.log(`Fee Receiver: ${await feeManager.feeReceiver()}`);
    console.log(`Liquidity Wallet: ${await feeManager.liquidityWallet()}`);
    console.log(`Treasury Wallet: ${await feeManager.treasuryWallet()}`);
  } catch (e: any) {
    console.error("Error reading PlatformFeeManager:", e.message);
  }

  // Read DisputeManager configuration
  console.log("\n=== DisputeManager Configuration ===");
  try {
    console.log(`Escrow Vault: ${await disputeManager.escrowVault()}`);
    console.log(`Max Unjustified Disputes: ${await disputeManager.maxUnjustifiedDisputes()}`);
    console.log(`Total Disputes: ${await disputeManager.disputeCounter()}`);
  } catch (e: any) {
    console.error("Error reading DisputeManager:", e.message);
  }

  // Check roles
  console.log("\n=== Role Verification ===");
  try {
    const OPERATOR_ROLE = await escrowVault.OPERATOR_ROLE();
    const ADMIN_ROLE = await escrowVault.DEFAULT_ADMIN_ROLE();
    
    console.log(`Deployer has OPERATOR_ROLE: ${await escrowVault.hasRole(OPERATOR_ROLE, deployer.address)}`);
    console.log(`Deployer has ADMIN_ROLE: ${await escrowVault.hasRole(ADMIN_ROLE, deployer.address)}`);
  } catch (e: any) {
    console.error("Error checking roles:", e.message);
  }

  // Try to create a test project
  console.log("\n=== Create Test Project ===");
  try {
    const OPERATOR_ROLE = await escrowVault.OPERATOR_ROLE();
    const hasRole = await escrowVault.hasRole(OPERATOR_ROLE, deployer.address);
    
    if (!hasRole) {
      console.log("Granting OPERATOR_ROLE to deployer...");
      const grantTx = await escrowVault.grantRole(OPERATOR_ROLE, deployer.address);
      await grantTx.wait();
      console.log("✓ OPERATOR_ROLE granted");
    }
    
    const currentBlock = await ethers.provider.getBlock("latest");
    const deadline = currentBlock!.timestamp + (30 * 24 * 60 * 60); // 30 days
    
    const fundingGoal = ethers.parseUnits("10000", 6); // 10,000 USDC
    const tokenSupply = ethers.parseUnits("1000000", 18); // 1M tokens
    const tokenPrice = ethers.parseUnits("0.01", 6); // $0.01 per token
    
    console.log("\nCreating project...");
    console.log(`  Funding Goal: 10,000 USDC`);
    console.log(`  Token Supply: 1,000,000`);
    console.log(`  Token Price: 0.01 USDC`);
    
    const tx = await escrowVault.createProject(
      deployer.address,      // owner
      USDC,                  // payment token
      fundingGoal,           // funding goal
      deadline,              // deadline
      tokenSupply,           // token supply
      tokenPrice,            // token price
      ethers.ZeroAddress,    // security token (none yet)
      "ipfs://QmTest123"     // metadata
    );
    
    const receipt = await tx.wait();
    console.log(`✓ Project created! Tx: ${receipt?.hash}`);
    
    // Try to find project ID from events
    for (const log of receipt?.logs || []) {
      try {
        const parsed = escrowVault.interface.parseLog({
          topics: log.topics as string[],
          data: log.data
        });
        if (parsed?.name === "ProjectCreated") {
          console.log(`✓ Project ID: ${parsed.args[0]}`);
        }
      } catch {}
    }
    
  } catch (e: any) {
    console.error("✗ Project creation failed:", e.reason || e.message);
    
    // Check if there's an existing project
    try {
      const project = await escrowVault.getProject(1);
      if (project.owner !== ethers.ZeroAddress) {
        console.log("\nExisting Project Found (ID: 1):");
        console.log(`  Owner: ${project.owner}`);
        console.log(`  State: ${["INACTIVE", "ACTIVE", "FUNDED", "COMPLETED", "CANCELLED", "DISPUTED"][Number(project.state)]}`);
        console.log(`  Funding Goal: ${ethers.formatUnits(project.fundingGoal, 6)} USDC`);
        console.log(`  Total Raised: ${ethers.formatUnits(project.totalRaised, 6)} USDC`);
      }
    } catch {
      console.log("No existing projects found");
    }
  }

  console.log("\n=== Test Complete ===");
  console.log(`
Next Steps for Full Testing:
1. Fund deployer with test USDC (use faucet or mint)
2. Invest in the project (requires KYC proof)
3. Complete project when funding goal reached
4. Claim tokens as investor
5. Release milestone funds as admin
6. Test dispute flow
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
