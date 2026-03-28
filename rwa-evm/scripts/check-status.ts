// scripts/check-status.ts
import { ethers } from "hardhat";

async function main() {
  const PROJECT_NFT = "0x129287D01f98e32213519345F3bBCCcBA3fe3941";
  const nft = await ethers.getContractAt("RWAProjectNFT", PROJECT_NFT);

  console.log("=== DEBUGGING isNameTaken ===\n");

  // Check total supply
  const totalSupply = await nft.totalSupply();
  console.log("Total NFTs:", totalSupply.toString());

  // List all project names
  console.log("\n=== ALL PROJECT NAMES ===");
  for (let i = 0; i < Math.min(Number(totalSupply), 10); i++) {
    try {
      const project = await nft.getProject(i);
      console.log(`NFT #${i}: "${project.name}"`);
      
      // Check if this name is marked as taken
      const isTaken = await nft.isNameTaken(project.name);
      console.log(`  isNameTaken: ${isTaken}`);
    } catch (e: any) {
      console.log(`NFT #${i}: ERROR - ${e.message}`);
    }
  }

  // Test various name formats
  console.log("\n=== NAME AVAILABILITY TESTS ===");
  const testNames = [
    "tgf",
    "TGF",  // case sensitivity check
    "Test",
    "test",
    "Brand New Project",
    "",
    " ",
    "Project With Spaces",
  ];

  for (const name of testNames) {
    try {
      const isTaken = await nft.isNameTaken(name);
      console.log(`"${name}": ${isTaken ? "TAKEN" : "AVAILABLE"}`);
    } catch (e: any) {
      console.log(`"${name}": ERROR`);
    }
  }
}

main().catch(console.error);
