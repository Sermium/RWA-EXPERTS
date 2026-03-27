// scripts/inspect-escrow-vault.ts
import { ethers } from "hardhat";

async function main() {
  console.log("═══ INSPECTING RWAEscrowVault ABI ═══\n");
  
  const ESCROW_VAULT = "0xf6bE123965f80b8eA08627F3AA8545a7A92ECC0A";
  
  // Get the contract factory to inspect the ABI
  const RWAEscrowVault = await ethers.getContractFactory("RWAEscrowVault");
  
  console.log("Available functions:\n");
  
  // Get all function fragments
  const functions = RWAEscrowVault.interface.fragments
    .filter((f: any) => f.type === "function")
    .map((f: any) => {
      const inputs = f.inputs.map((i: any) => `${i.type} ${i.name}`).join(", ");
      return `${f.name}(${inputs})`;
    });
  
  functions.sort().forEach((f: string) => {
    console.log(`  ${f}`);
  });
  
  // Specifically look for createProject
  console.log("\n═══ createProject function details ═══\n");
  
  const createProjectFragments = RWAEscrowVault.interface.fragments
    .filter((f: any) => f.type === "function" && f.name === "createProject");
  
  if (createProjectFragments.length === 0) {
    console.log("❌ No createProject function found!");
    console.log("\nLooking for similar functions...");
    
    const similar = RWAEscrowVault.interface.fragments
      .filter((f: any) => f.type === "function" && f.name.toLowerCase().includes("project"));
    
    similar.forEach((f: any) => {
      const inputs = f.inputs.map((i: any) => `${i.type} ${i.name}`).join(", ");
      console.log(`  ${f.name}(${inputs})`);
    });
  } else {
    createProjectFragments.forEach((f: any) => {
      console.log(`Function: ${f.name}`);
      console.log("Parameters:");
      f.inputs.forEach((input: any, index: number) => {
        console.log(`  ${index + 1}. ${input.type} ${input.name}`);
      });
    });
  }
  
  // Also check for any initialization or project-related structs
  console.log("\n═══ Checking for Project struct in getProject ═══\n");
  
  const getProjectFragment = RWAEscrowVault.interface.fragments
    .find((f: any) => f.type === "function" && f.name === "getProject");
  
  if (getProjectFragment) {
    console.log("getProject returns:");
    console.log(getProjectFragment.outputs);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
