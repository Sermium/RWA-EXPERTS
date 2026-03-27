// scripts/update-platform-wallets.ts
import { ethers } from "hardhat";
import * as fs from "fs";

interface WalletConfig {
  feeReceiver: string;
  liquidityWallet: string;
  treasuryWallet: string;
}

// ============================================
// CONFIGURE NEW WALLETS HERE
// ============================================
const NEW_WALLETS: WalletConfig = {
  feeReceiver: "0xdD4104A780142EfB9566659f26d3317714a81510",
  liquidityWallet: "0xe7c533355a7Fa04baf083C726a442db7Dc0971b1",
  treasuryWallet: "0x2Db96c4F203fBc13c98bBa428ba9E09B48543b0A",
};

// PlatformFeeManager address (override if needed)
const PLATFORM_FEE_MANAGER_ADDRESS = "0xeC644de34d1A641f2E1A67726445C1688ABd44fd";

async function main() {
  const [admin] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log("=".repeat(60));
  console.log("Update Platform Wallets");
  console.log("=".repeat(60));
  console.log(`Chain ID: ${chainId}`);
  console.log(`Admin: ${admin.address}`);
  console.log(`PlatformFeeManager: ${PLATFORM_FEE_MANAGER_ADDRESS}`);
  console.log("=".repeat(60));

  const platformFeeManager = await ethers.getContractAt(
    "PlatformFeeManager",
    PLATFORM_FEE_MANAGER_ADDRESS
  );

  // Get current wallets
  console.log("\n📋 Current Wallets:");
  const currentFeeReceiver = await platformFeeManager.feeReceiver();
  const currentLiquidityWallet = await platformFeeManager.liquidityWallet();
  const currentTreasuryWallet = await platformFeeManager.treasuryWallet();

  console.log(`  Fee Receiver:     ${currentFeeReceiver}`);
  console.log(`  Liquidity Wallet: ${currentLiquidityWallet}`);
  console.log(`  Treasury Wallet:  ${currentTreasuryWallet}`);

  console.log("\n📋 New Wallets:");
  console.log(`  Fee Receiver:     ${NEW_WALLETS.feeReceiver}`);
  console.log(`  Liquidity Wallet: ${NEW_WALLETS.liquidityWallet}`);
  console.log(`  Treasury Wallet:  ${NEW_WALLETS.treasuryWallet}`);

  // Validate addresses
  if (!ethers.isAddress(NEW_WALLETS.feeReceiver)) {
    console.error("❌ Invalid feeReceiver address");
    process.exit(1);
  }
  if (!ethers.isAddress(NEW_WALLETS.liquidityWallet)) {
    console.error("❌ Invalid liquidityWallet address");
    process.exit(1);
  }
  if (!ethers.isAddress(NEW_WALLETS.treasuryWallet)) {
    console.error("❌ Invalid treasuryWallet address");
    process.exit(1);
  }

  // Check if admin has permission
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const hasAdminRole = await platformFeeManager.hasRole(ADMIN_ROLE, admin.address);
  
  if (!hasAdminRole) {
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
    const hasDefaultAdmin = await platformFeeManager.hasRole(DEFAULT_ADMIN_ROLE, admin.address);
    
    if (!hasDefaultAdmin) {
      console.error("❌ Admin does not have ADMIN_ROLE on PlatformFeeManager");
      console.error(`   Your address: ${admin.address}`);
      process.exit(1);
    }
  }

  console.log("\n🔄 Updating wallets...\n");

  // Update Fee Receiver
  if (currentFeeReceiver.toLowerCase() !== NEW_WALLETS.feeReceiver.toLowerCase()) {
    console.log("1. Updating Fee Receiver...");
    try {
      const tx1 = await platformFeeManager.setFeeReceiver(NEW_WALLETS.feeReceiver);
      await tx1.wait();
      console.log(`   ✅ Fee Receiver updated: ${NEW_WALLETS.feeReceiver}`);
      console.log(`   TX: ${tx1.hash}`);
    } catch (e: any) {
      console.error(`   ❌ Failed: ${e.message}`);
    }
  } else {
    console.log("1. Fee Receiver already set ✅");
  }

  // Update Liquidity Wallet
  if (currentLiquidityWallet.toLowerCase() !== NEW_WALLETS.liquidityWallet.toLowerCase()) {
    console.log("2. Updating Liquidity Wallet...");
    try {
      const tx2 = await platformFeeManager.setLiquidityWallet(NEW_WALLETS.liquidityWallet);
      await tx2.wait();
      console.log(`   ✅ Liquidity Wallet updated: ${NEW_WALLETS.liquidityWallet}`);
      console.log(`   TX: ${tx2.hash}`);
    } catch (e: any) {
      console.error(`   ❌ Failed: ${e.message}`);
    }
  } else {
    console.log("2. Liquidity Wallet already set ✅");
  }

  // Update Treasury Wallet
  if (currentTreasuryWallet.toLowerCase() !== NEW_WALLETS.treasuryWallet.toLowerCase()) {
    console.log("3. Updating Treasury Wallet...");
    try {
      const tx3 = await platformFeeManager.setTreasuryWallet(NEW_WALLETS.treasuryWallet);
      await tx3.wait();
      console.log(`   ✅ Treasury Wallet updated: ${NEW_WALLETS.treasuryWallet}`);
      console.log(`   TX: ${tx3.hash}`);
    } catch (e: any) {
      console.error(`   ❌ Failed: ${e.message}`);
    }
  } else {
    console.log("3. Treasury Wallet already set ✅");
  }

  // Verify updates
  console.log("\n📋 Verifying Updates...");
  const newFeeReceiver = await platformFeeManager.feeReceiver();
  const newLiquidityWallet = await platformFeeManager.liquidityWallet();
  const newTreasuryWallet = await platformFeeManager.treasuryWallet();

  const feeReceiverOk = newFeeReceiver.toLowerCase() === NEW_WALLETS.feeReceiver.toLowerCase();
  const liquidityOk = newLiquidityWallet.toLowerCase() === NEW_WALLETS.liquidityWallet.toLowerCase();
  const treasuryOk = newTreasuryWallet.toLowerCase() === NEW_WALLETS.treasuryWallet.toLowerCase();

  console.log(`  Fee Receiver:     ${newFeeReceiver} ${feeReceiverOk ? "✅" : "❌"}`);
  console.log(`  Liquidity Wallet: ${newLiquidityWallet} ${liquidityOk ? "✅" : "❌"}`);
  console.log(`  Treasury Wallet:  ${newTreasuryWallet} ${treasuryOk ? "✅" : "❌"}`);

  // Update deployment file if exists
  const latestFilename = `deployments/latest-${chainId}.json`;
  if (fs.existsSync(latestFilename) && feeReceiverOk && liquidityOk && treasuryOk) {
    console.log("\n💾 Updating deployment file...");
    
    const deployment = JSON.parse(fs.readFileSync(latestFilename, "utf8"));
    deployment.platformWallets = {
      feeReceiver: NEW_WALLETS.feeReceiver,
      liquidityWallet: NEW_WALLETS.liquidityWallet,
      treasuryWallet: NEW_WALLETS.treasuryWallet,
    };
    deployment.platformFeeManager = PLATFORM_FEE_MANAGER_ADDRESS;

    fs.writeFileSync(latestFilename, JSON.stringify(deployment, null, 2));
    console.log(`   ✅ Updated ${latestFilename}`);
  }

  console.log("\n" + "=".repeat(60));
  if (feeReceiverOk && liquidityOk && treasuryOk) {
    console.log("✅ All wallets updated successfully!");
  } else {
    console.log("⚠️  Some updates may have failed. Check above.");
  }
  console.log("=".repeat(60));

  // Display fee distribution summary
  console.log("\n💰 Fee Distribution Summary:");
  console.log("┌─────────────────────┬─────────────────────────────────────────────┬───────────────────┐");
  console.log("│ Wallet              │ Address                                     │ Receives          │");
  console.log("├─────────────────────┼─────────────────────────────────────────────┼───────────────────┤");
  console.log(`│ Fee Receiver        │ ${NEW_WALLETS.feeReceiver} │ 34% USDT          │`);
  console.log(`│ Liquidity Wallet    │ ${NEW_WALLETS.liquidityWallet} │ 33% USDT + 50% TK │`);
  console.log(`│ Treasury Wallet     │ ${NEW_WALLETS.treasuryWallet} │ 33% USDT + 50% TK │`);
  console.log("└─────────────────────┴─────────────────────────────────────────────┴───────────────────┘");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
