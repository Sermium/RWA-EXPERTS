import { ethers } from "hardhat";

const CONTRACTS = {
  RWAEscrowVault: "0xf6bE123965f80b8eA08627F3AA8545a7A92ECC0A",
  PlatformFeeManager: "0xeC644de34d1A641f2E1A67726445C1688ABd44fd",
  USDC: "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786"
};

const PLATFORM_WALLETS = {
  feeReceiver: "0xdD4104A780142EfB9566659f26d3317714a81510",
  liquidityWallet: "0xe7c533355a7Fa04baf083C726a442db7Dc0971b1",
  treasuryWallet: "0x2Db96c4F203fBc13c98bBa428ba9E09B48543b0A"
};

async function main() {
  console.log("═══ DIAGNOSING COMPLETE PROJECT V2 ═══\n");

  const [deployer] = await ethers.getSigners();
  const escrowVault = await ethers.getContractAt("RWAEscrowVault", CONTRACTS.RWAEscrowVault);
  const platformFeeManager = await ethers.getContractAt("PlatformFeeManager", CONTRACTS.PlatformFeeManager);
  const usdc = await ethers.getContractAt("IERC20", CONTRACTS.USDC);

  const projectId = 7;
  const project = await escrowVault.projects(projectId);
  const securityToken = await ethers.getContractAt("RWASecurityToken", project.securityToken);

  console.log("=== Project Info ===");
  console.log(`Project Owner: ${project.projectOwner}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Is Owner: ${project.projectOwner.toLowerCase() === deployer.address.toLowerCase()}`);
  
  const ADMIN_ROLE = await escrowVault.ADMIN_ROLE();
  const isAdmin = await escrowVault.hasRole(ADMIN_ROLE, deployer.address);
  console.log(`Deployer has ADMIN_ROLE: ${isAdmin}`);

  console.log(`\nProject State: ${project.state}`);
  console.log(`Fees Transferred: ${project.platformFeesTransferred}`);
  console.log(`Payment Token: ${project.paymentToken}`);

  // Check fee manager wallets
  console.log("\n=== Fee Manager Wallets ===");
  try {
    const wallets = await platformFeeManager.getWallets();
    console.log(`Fee Receiver: ${wallets[0]}`);
    console.log(`Liquidity: ${wallets[1]}`);
    console.log(`Treasury: ${wallets[2]}`);
  } catch (e: any) {
    console.log(`❌ getWallets() failed: ${e.message}`);
  }

  // Check security token minting
  console.log("\n=== Security Token Checks ===");
  const MINTER_ROLE = await securityToken.MINTER_ROLE();
  const escrowCanMint = await securityToken.hasRole(MINTER_ROLE, CONTRACTS.RWAEscrowVault);
  console.log(`Escrow has MINTER_ROLE: ${escrowCanMint}`);

  const maxSupply = await securityToken.maxSupply();
  const currentSupply = await securityToken.totalSupply();
  const platformTokens = (project.totalSupply * 100n) / 10000n;
  
  console.log(`Current Supply: ${ethers.formatUnits(currentSupply, 18)}`);
  console.log(`Max Supply: ${ethers.formatUnits(maxSupply, 18)}`);
  console.log(`Tokens to mint: ${ethers.formatUnits(platformTokens, 18)}`);
  console.log(`Would exceed max: ${currentSupply + platformTokens > maxSupply}`);

  // Check USDC balances and allowances
  console.log("\n=== USDC Checks ===");
  const escrowUSDC = await usdc.balanceOf(CONTRACTS.RWAEscrowVault);
  const platformUSDT = (project.totalRaised * 150n) / 10000n;
  console.log(`Escrow USDC Balance: ${ethers.formatUnits(escrowUSDC, 6)}`);
  console.log(`Platform fee needed: ${ethers.formatUnits(platformUSDT, 6)}`);
  console.log(`Has enough USDC: ${escrowUSDC >= platformUSDT}`);

  // Check ESCROW_ROLE on fee manager
  console.log("\n=== Fee Manager Role Check ===");
  const ESCROW_ROLE = await platformFeeManager.ESCROW_ROLE();
  const escrowHasRole = await platformFeeManager.hasRole(ESCROW_ROLE, CONTRACTS.RWAEscrowVault);
  console.log(`Escrow has ESCROW_ROLE on FeeManager: ${escrowHasRole}`);

  // Check if paused
  console.log("\n=== Pause Status ===");
  try {
    const isPaused = await escrowVault.paused();
    console.log(`Escrow is paused: ${isPaused}`);
  } catch {
    console.log("Could not check pause status");
  }

  // Try static call with detailed error
  console.log("\n=== Static Call Test ===");
  try {
    await escrowVault.completeProject.staticCall(projectId);
    console.log("✓ Static call would succeed!");
  } catch (e: any) {
    console.log(`❌ Static call failed`);
    console.log(`Reason: ${e.reason || "unknown"}`);
    console.log(`Message: ${e.message}`);
    
    if (e.data) {
      console.log(`Error data: ${e.data}`);
      
      // Try to decode custom errors
      try {
        const iface = escrowVault.interface;
        const decoded = iface.parseError(e.data);
        console.log(`Decoded error: ${decoded?.name}`);
      } catch {}
    }

    // Check specific conditions
    console.log("\n=== Checking Specific Conditions ===");
    
    // 1. Is deployer authorized?
    const isOwner = project.projectOwner.toLowerCase() === deployer.address.toLowerCase();
    console.log(`1. Is project owner: ${isOwner}`);
    console.log(`   Has ADMIN_ROLE: ${isAdmin}`);
    console.log(`   → Authorized: ${isOwner || isAdmin}`);

    // 2. Is project in FUNDED state?
    console.log(`2. Project state: ${project.state} (expected: 2)`);
    console.log(`   → Correct state: ${project.state === 2n}`);

    // 3. Are fees already transferred?
    console.log(`3. Fees transferred: ${project.platformFeesTransferred}`);
    console.log(`   → Not yet transferred: ${!project.platformFeesTransferred}`);

    // 4. Can mint tokens?
    console.log(`4. Can mint tokens: ${escrowCanMint}`);
    console.log(`   Would exceed max: ${currentSupply + platformTokens > maxSupply}`);

    // 5. Has enough USDC?
    console.log(`5. Has enough USDC: ${escrowUSDC >= platformUSDT}`);

    // 6. Fee manager role?
    console.log(`6. Escrow has ESCROW_ROLE: ${escrowHasRole}`);
  }

  // Try to simulate each step
  console.log("\n=== Simulating Individual Steps ===");

  // Step 1: Try minting tokens to liquidity wallet
  console.log("\n1. Testing token mint to liquidity...");
  const tokensToLiquidity = platformTokens / 2n;
  try {
    // Check if we can call mint (as escrow would)
    const mintData = securityToken.interface.encodeFunctionData("mint", [
      PLATFORM_WALLETS.liquidityWallet,
      tokensToLiquidity
    ]);
    console.log(`   Mint call data prepared for ${ethers.formatUnits(tokensToLiquidity, 18)} tokens`);
  } catch (e: any) {
    console.log(`   ❌ Mint encoding failed: ${e.message}`);
  }

  // Step 2: Check safeApprove
  console.log("\n2. Testing USDC approval...");
  const currentAllowance = await usdc.allowance(CONTRACTS.RWAEscrowVault, CONTRACTS.PlatformFeeManager);
  console.log(`   Current allowance: ${ethers.formatUnits(currentAllowance, 6)}`);
  if (currentAllowance > 0n) {
    console.log(`   ⚠️ Existing allowance may cause safeApprove to fail!`);
    console.log(`   safeApprove requires current allowance to be 0`);
  }

  // Step 3: Check receiveFees
  console.log("\n3. Testing receiveFees parameters...");
  console.log(`   Project ID: ${projectId}`);
  console.log(`   Payment Token: ${project.paymentToken}`);
  console.log(`   USDT Amount: ${ethers.formatUnits(platformUSDT, 6)}`);
  console.log(`   Security Token: ${project.securityToken}`);
  console.log(`   Token Amount: 0 (minted directly to wallets)`);

  console.log("\n═══════════════════════════════════════════════════════════════");
}

main().catch(console.error);
