import { ethers } from "hardhat";

async function main() {
  const escrowVault = await ethers.getContractAt("RWAEscrowVault", "0xf6bE123965f80b8eA08627F3AA8545a7A92ECC0A");
  
  console.log("=== Checking New Functions ===\n");
  
  // List all functions
  const functions = escrowVault.interface.fragments
    .filter(f => f.type === 'function')
    .map(f => (f as any).name);
  
  console.log("injectOffChainFunds exists:", functions.includes("injectOffChainFunds"));
  console.log("getOffChainPending exists:", functions.includes("getOffChainPending"));
  
  // Test getOffChainPending on project 13 (from earlier test)
  try {
    const pending = await escrowVault.getOffChainPending(13);
    console.log(`\nProject 13 off-chain pending: ${ethers.formatUnits(pending, 6)} USD`);
  } catch (e: any) {
    console.log(`Error: ${e.message}`);
  }
}

main().catch(console.error);