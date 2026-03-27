import { ethers } from "hardhat";

const CONTRACTS = {
  RWAEscrowVault: "0xf6bE123965f80b8eA08627F3AA8545a7A92ECC0A",
  // Correct token addresses
  USDC: "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786",
  USDT: "0x224e403397F3aec9a0D2875445dC32dB00ea31C3"
};

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("         FIXING ESCROW PAYMENT TOKEN CONFIGURATION");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const [deployer] = await ethers.getSigners();
  const escrowVault = await ethers.getContractAt("RWAEscrowVault", CONTRACTS.RWAEscrowVault);

  // Check current configuration
  console.log("=== Current Configuration ===");
  const currentUSDC = await escrowVault.usdc();
  const currentUSDT = await escrowVault.usdt();
  console.log(`Current USDC: ${currentUSDC}`);
  console.log(`Current USDT: ${currentUSDT}`);

  console.log("\n=== Correct Addresses ===");
  console.log(`Correct USDC: ${CONTRACTS.USDC}`);
  console.log(`Correct USDT: ${CONTRACTS.USDT}`);

  // Check if deployer has admin role
  const ADMIN_ROLE = await escrowVault.ADMIN_ROLE();
  const isAdmin = await escrowVault.hasRole(ADMIN_ROLE, deployer.address);
  console.log(`\nDeployer has ADMIN_ROLE: ${isAdmin}`);

  if (!isAdmin) {
    console.log("❌ Cannot update - deployer is not admin");
    return;
  }

  // Update token addresses
  console.log("\n=== Updating Token Addresses ===");
  
  const tx = await escrowVault.setPaymentTokens(CONTRACTS.USDC, CONTRACTS.USDT);
  await tx.wait();
  console.log(`✓ Transaction: ${tx.hash}`);

  // Verify update
  console.log("\n=== Verifying Update ===");
  const newUSDC = await escrowVault.usdc();
  const newUSDT = await escrowVault.usdt();
  console.log(`New USDC: ${newUSDC} ${newUSDC.toLowerCase() === CONTRACTS.USDC.toLowerCase() ? '✓' : '❌'}`);
  console.log(`New USDT: ${newUSDT} ${newUSDT.toLowerCase() === CONTRACTS.USDT.toLowerCase() ? '✓' : '❌'}`);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                    CONFIGURATION UPDATED");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
