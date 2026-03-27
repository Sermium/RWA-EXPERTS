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
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("         COMPLETING PROJECT 7 (Post-Upgrade Test)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const [deployer] = await ethers.getSigners();
  
  const escrowVault = await ethers.getContractAt("RWAEscrowVault", CONTRACTS.RWAEscrowVault);
  const platformFeeManager = await ethers.getContractAt("PlatformFeeManager", CONTRACTS.PlatformFeeManager);
  const usdc = await ethers.getContractAt("IERC20", CONTRACTS.USDC);

  const projectId = 7;
  const project = await escrowVault.projects(projectId);
  const securityToken = await ethers.getContractAt("RWASecurityToken", project.securityToken);

  console.log("=== Project 7 Status ===");
  console.log(`State: ${project.state} (2 = FUNDED)`);
  console.log(`Total Raised: ${ethers.formatUnits(project.totalRaised, 6)} USDC`);
  console.log(`Total Supply: ${ethers.formatUnits(project.totalSupply, 18)} tokens`);
  console.log(`Fees Transferred: ${project.platformFeesTransferred}`);
  console.log(`Security Token: ${project.securityToken}`);

  if (project.state !== 2n) {
    console.log("\n❌ Project is not in FUNDED state");
    return;
  }

  if (project.platformFeesTransferred) {
    console.log("\n❌ Fees already transferred");
    return;
  }

  // Calculate expected fees
  const platformUSDT = (project.totalRaised * 150n) / 10000n;
  const platformTokens = (project.totalSupply * 100n) / 10000n;
  const tokensToLiquidity = platformTokens / 2n;
  const tokensToTreasury = platformTokens - tokensToLiquidity;

  console.log("\n=== Expected Fee Distribution ===");
  console.log(`Platform USDT (1.5%): ${ethers.formatUnits(platformUSDT, 6)} USDC`);
  console.log(`  → 34% to Fee Receiver: ${ethers.formatUnits((platformUSDT * 3400n) / 10000n, 6)} USDC`);
  console.log(`  → 33% to Liquidity: ${ethers.formatUnits((platformUSDT * 3300n) / 10000n, 6)} USDC`);
  console.log(`  → 33% to Treasury: ${ethers.formatUnits((platformUSDT * 3300n) / 10000n, 6)} USDC`);
  console.log(`\nPlatform Tokens (1%): ${ethers.formatUnits(platformTokens, 18)} tokens`);
  console.log(`  → 50% to Liquidity: ${ethers.formatUnits(tokensToLiquidity, 18)} tokens`);
  console.log(`  → 50% to Treasury: ${ethers.formatUnits(tokensToTreasury, 18)} tokens`);

  // Get balances before
  console.log("\n=== Balances BEFORE ===");
  const feeReceiverUSDCBefore = await usdc.balanceOf(PLATFORM_WALLETS.feeReceiver);
  const liquidityUSDCBefore = await usdc.balanceOf(PLATFORM_WALLETS.liquidityWallet);
  const treasuryUSDCBefore = await usdc.balanceOf(PLATFORM_WALLETS.treasuryWallet);
  const liquidityTokensBefore = await securityToken.balanceOf(PLATFORM_WALLETS.liquidityWallet);
  const treasuryTokensBefore = await securityToken.balanceOf(PLATFORM_WALLETS.treasuryWallet);

  console.log(`Fee Receiver USDC: ${ethers.formatUnits(feeReceiverUSDCBefore, 6)}`);
  console.log(`Liquidity USDC: ${ethers.formatUnits(liquidityUSDCBefore, 6)}`);
  console.log(`Treasury USDC: ${ethers.formatUnits(treasuryUSDCBefore, 6)}`);
  console.log(`Liquidity Tokens: ${ethers.formatUnits(liquidityTokensBefore, 18)}`);
  console.log(`Treasury Tokens: ${ethers.formatUnits(treasuryTokensBefore, 18)}`);

  // Complete project
  console.log("\n=== Completing Project ===");
  try {
    const tx = await escrowVault.completeProject(projectId);
    console.log(`Transaction: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✓ Transaction confirmed in block ${receipt?.blockNumber}`);
  } catch (e: any) {
    console.log(`❌ Failed: ${e.reason || e.message}`);
    return;
  }

  // Get balances after
  console.log("\n=== Balances AFTER ===");
  const feeReceiverUSDCAfter = await usdc.balanceOf(PLATFORM_WALLETS.feeReceiver);
  const liquidityUSDCAfter = await usdc.balanceOf(PLATFORM_WALLETS.liquidityWallet);
  const treasuryUSDCAfter = await usdc.balanceOf(PLATFORM_WALLETS.treasuryWallet);
  const liquidityTokensAfter = await securityToken.balanceOf(PLATFORM_WALLETS.liquidityWallet);
  const treasuryTokensAfter = await securityToken.balanceOf(PLATFORM_WALLETS.treasuryWallet);

  console.log(`Fee Receiver USDC: ${ethers.formatUnits(feeReceiverUSDCAfter, 6)} (+${ethers.formatUnits(feeReceiverUSDCAfter - feeReceiverUSDCBefore, 6)})`);
  console.log(`Liquidity USDC: ${ethers.formatUnits(liquidityUSDCAfter, 6)} (+${ethers.formatUnits(liquidityUSDCAfter - liquidityUSDCBefore, 6)})`);
  console.log(`Treasury USDC: ${ethers.formatUnits(treasuryUSDCAfter, 6)} (+${ethers.formatUnits(treasuryUSDCAfter - treasuryUSDCBefore, 6)})`);
  console.log(`Liquidity Tokens: ${ethers.formatUnits(liquidityTokensAfter, 18)} (+${ethers.formatUnits(liquidityTokensAfter - liquidityTokensBefore, 18)})`);
  console.log(`Treasury Tokens: ${ethers.formatUnits(treasuryTokensAfter, 18)} (+${ethers.formatUnits(treasuryTokensAfter - treasuryTokensBefore, 18)})`);

  // Verify final state
  const projectAfter = await escrowVault.projects(projectId);
  console.log("\n=== Final Project State ===");
  console.log(`State: ${projectAfter.state} (3 = COMPLETED)`);
  console.log(`Fees Transferred: ${projectAfter.platformFeesTransferred}`);

  // Check fee manager received the USDT fees
  const feeManagerFees = await platformFeeManager.getProjectFees(projectId);
  console.log(`\n=== Fee Manager Record ===`);
  console.log(`USDT Amount: ${ethers.formatUnits(feeManagerFees.usdtAmount, 6)}`);
  console.log(`Token Amount: ${ethers.formatUnits(feeManagerFees.tokenAmount, 18)} (should be 0)`);
  console.log(`Distributed: ${feeManagerFees.distributed}`);

  // Distribute fees through fee manager
  if (!feeManagerFees.distributed && feeManagerFees.usdtAmount > 0n) {
    console.log("\n=== Distributing USDT Fees ===");
    try {
      const distTx = await platformFeeManager.distributeFees(projectId);
      await distTx.wait();
      console.log("✓ Fees distributed to platform wallets");
      
      // Check final balances
      const finalFeeReceiver = await usdc.balanceOf(PLATFORM_WALLETS.feeReceiver);
      const finalLiquidity = await usdc.balanceOf(PLATFORM_WALLETS.liquidityWallet);
      const finalTreasury = await usdc.balanceOf(PLATFORM_WALLETS.treasuryWallet);
      
      console.log(`\nFinal USDC balances after distribution:`);
      console.log(`Fee Receiver: ${ethers.formatUnits(finalFeeReceiver, 6)} (+${ethers.formatUnits(finalFeeReceiver - feeReceiverUSDCBefore, 6)} total)`);
      console.log(`Liquidity: ${ethers.formatUnits(finalLiquidity, 6)} (+${ethers.formatUnits(finalLiquidity - liquidityUSDCBefore, 6)} total)`);
      console.log(`Treasury: ${ethers.formatUnits(finalTreasury, 6)} (+${ethers.formatUnits(finalTreasury - treasuryUSDCBefore, 6)} total)`);
    } catch (e: any) {
      console.log(`❌ Distribution failed: ${e.reason || e.message}`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                    COMPLETE!");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });