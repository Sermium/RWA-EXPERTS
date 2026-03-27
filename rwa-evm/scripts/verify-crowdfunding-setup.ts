// scripts/verify-crowdfunding-setup.ts - Updated with correct addresses
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║        CROWDFUNDING SETUP VERIFICATION                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`\nDeployer: ${deployer.address}`);
  
  // Avalanche Fuji (43113) addresses
  const ADDRESSES = {
    // Core
    KYCVerifier: "0x3CA5b7e66cF25E8C761aA07f318e06B83d0bde7B",
    RWAProjectNFT: "0x129287D01f98e32213519345F3bBCCcBA3fe3941",
    RWALaunchpadFactory: "0x90FF863603b9450F185E3641c6EF3df469886Bd3",
    
    // Crowdfunding
    RWAEscrowVault: "0xf6bE123965f80b8eA08627F3AA8545a7A92ECC0A",
    PlatformFeeManager: "0xeC644de34d1A641f2E1A67726445C1688ABd44fd",
    DisputeManager: "0x1C7496477eAeaBBf4fFAE127772422C57d11f025",
    
    // Tokens
    USDC: "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786",
    USDT: "0x224e403397F3aec9a0D2875445dC32dB00ea31C3",
  };
  
  // Platform Wallets
  const PLATFORM_WALLETS = {
    feeReceiver: "0xdD4104A780142EfB9566659f26d3317714a81510",
    liquidityWallet: "0xe7c533355a7Fa04baf083C726a442db7Dc0971b1",
    treasuryWallet: "0x2Db96c4F203fBc13c98bBa428ba9E09B48543b0A",
  };
  
  console.log("\n=== Contract Addresses ===");
  for (const [name, address] of Object.entries(ADDRESSES)) {
    const code = await ethers.provider.getCode(address);
    const status = code !== "0x" ? "✓" : "✗";
    console.log(`${status} ${name}: ${address}`);
  }
  
  // Get contract instances
  const escrowVault = await ethers.getContractAt("RWAEscrowVault", ADDRESSES.RWAEscrowVault);
  const feeManager = await ethers.getContractAt("PlatformFeeManager", ADDRESSES.PlatformFeeManager);
  const disputeManager = await ethers.getContractAt("DisputeManager", ADDRESSES.DisputeManager);
  const projectNFT = await ethers.getContractAt("RWAProjectNFT", ADDRESSES.RWAProjectNFT);
  
  // ========== EscrowVault Configuration ==========
  console.log("\n=== EscrowVault Configuration ===");
  try {
    console.log("KYC Verifier:", await escrowVault.kycVerifier());
    console.log("Platform Fee Manager:", await escrowVault.platformFeeManager());
    console.log("Project NFT:", await escrowVault.projectNFT());
    console.log("PLATFORM_USDT_FEE_BPS:", (await escrowVault.PLATFORM_USDT_FEE_BPS()).toString(), "(1.5%)");
    console.log("PLATFORM_TOKEN_FEE_BPS:", (await escrowVault.PLATFORM_TOKEN_FEE_BPS()).toString(), "(1%)");
    console.log("INVESTOR_TOKEN_BPS:", (await escrowVault.INVESTOR_TOKEN_BPS()).toString(), "(99%)");
  } catch (e: any) {
    console.error("Error:", e.message);
  }
  
  // ========== PlatformFeeManager Configuration ==========
  console.log("\n=== PlatformFeeManager Configuration ===");
  try {
    const feeReceiver = await feeManager.feeReceiver();
    const liquidityWallet = await feeManager.liquidityWallet();
    const treasuryWallet = await feeManager.treasuryWallet();
    
    console.log("Fee Receiver:", feeReceiver, feeReceiver === PLATFORM_WALLETS.feeReceiver ? "✓" : "✗ MISMATCH");
    console.log("Liquidity Wallet:", liquidityWallet, liquidityWallet === PLATFORM_WALLETS.liquidityWallet ? "✓" : "✗ MISMATCH");
    console.log("Treasury Wallet:", treasuryWallet, treasuryWallet === PLATFORM_WALLETS.treasuryWallet ? "✓" : "✗ MISMATCH");
  } catch (e: any) {
    console.error("Error:", e.message);
  }
  
  // ========== DisputeManager Configuration ==========
  console.log("\n=== DisputeManager Configuration ===");
  try {
    console.log("Escrow Vault:", await disputeManager.escrowVault());
    console.log("Max Unjustified Disputes:", (await disputeManager.maxUnjustifiedDisputes()).toString());
  } catch (e: any) {
    console.error("Error:", e.message);
  }
  
  // ========== Role Verification ==========
  console.log("\n=== Role Verification ===");
  
  // EscrowVault roles
  try {
    const DISPUTE_MANAGER_ROLE = await escrowVault.DISPUTE_MANAGER_ROLE();
    const hasDisputeRole = await escrowVault.hasRole(DISPUTE_MANAGER_ROLE, ADDRESSES.DisputeManager);
    console.log(`DisputeManager has DISPUTE_MANAGER_ROLE on EscrowVault: ${hasDisputeRole ? "✓" : "✗ MISSING"}`);
  } catch (e: any) {
    console.log("DisputeManager DISPUTE_MANAGER_ROLE check failed:", e.message);
  }
  
  // PlatformFeeManager roles
  try {
    const ESCROW_ROLE = await feeManager.ESCROW_ROLE();
    const hasEscrowRole = await feeManager.hasRole(ESCROW_ROLE, ADDRESSES.RWAEscrowVault);
    console.log(`EscrowVault has ESCROW_ROLE on PlatformFeeManager: ${hasEscrowRole ? "✓" : "✗ MISSING"}`);
    
    const DISPUTE_ROLE = await feeManager.DISPUTE_MANAGER_ROLE();
    const hasDisputeRoleFee = await feeManager.hasRole(DISPUTE_ROLE, ADDRESSES.DisputeManager);
    console.log(`DisputeManager has DISPUTE_MANAGER_ROLE on PlatformFeeManager: ${hasDisputeRoleFee ? "✓" : "✗ MISSING"}`);
  } catch (e: any) {
    console.log("PlatformFeeManager role check failed:", e.message);
  }
  
  // ProjectNFT roles
  try {
    const MANAGER_ROLE = await projectNFT.MANAGER_ROLE();
    const hasManagerRole = await projectNFT.hasRole(MANAGER_ROLE, ADDRESSES.RWAEscrowVault);
    console.log(`EscrowVault has MANAGER_ROLE on ProjectNFT: ${hasManagerRole ? "✓" : "✗ MISSING"}`);
  } catch (e: any) {
    console.log("ProjectNFT role check failed:", e.message);
  }
  
  // ========== Summary ==========
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                      SUMMARY                                 ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`
Crowdfunding Contracts (Avalanche Fuji - 43113):
┌─────────────────────┬──────────────────────────────────────────────┐
│ Contract            │ Address                                      │
├─────────────────────┼──────────────────────────────────────────────┤
│ RWAEscrowVault      │ 0xf6bE123965f80b8eA08627F3AA8545a7A92ECC0A   │
│ PlatformFeeManager  │ 0xeC644de34d1A641f2E1A67726445C1688ABd44fd   │
│ DisputeManager      │ 0x1C7496477eAeaBBf4fFAE127772422C57d11f025   │
└─────────────────────┴──────────────────────────────────────────────┘

Platform Wallets:
┌─────────────────────┬──────────────────────────────────────────────┬───────────────┐
│ Wallet              │ Address                                      │ Distribution  │
├─────────────────────┼──────────────────────────────────────────────┼───────────────┤
│ Fee Receiver        │ 0xdD4104A780142EfB9566659f26d3317714a81510   │ 34% USDT      │
│ Liquidity Wallet    │ 0xe7c533355a7Fa04baf083C726a442db7Dc0971b1   │ 33% USDT+50%T │
│ Treasury Wallet     │ 0x2Db96c4F203fBc13c98bBa428ba9E09B48543b0A   │ 33% USDT+50%T │
└─────────────────────┴──────────────────────────────────────────────┴───────────────┘
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
