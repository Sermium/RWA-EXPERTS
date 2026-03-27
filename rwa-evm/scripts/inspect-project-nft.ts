// scripts/inspect-project-nft.ts
import { ethers } from "hardhat";

async function main() {
  console.log("═══ INSPECTING RWAProjectNFT ABI ═══\n");
  
  const RWAProjectNFT = await ethers.getContractFactory("RWAProjectNFT");
  
  console.log("Available functions:\n");
  
  const functions = RWAProjectNFT.interface.fragments
    .filter((f: any) => f.type === "function")
    .map((f: any) => {
      const inputs = f.inputs.map((i: any) => `${i.type} ${i.name}`).join(", ");
      return `${f.name}(${inputs})`;
    });
  
  functions.sort().forEach((f: string) => {
    console.log(`  ${f}`);
  });

  // Look for mint-related functions
  console.log("\n═══ Mint/Create related functions ═══\n");
  
  const mintFunctions = RWAProjectNFT.interface.fragments
    .filter((f: any) => 
      f.type === "function" && 
      (f.name.toLowerCase().includes("mint") || 
       f.name.toLowerCase().includes("create") ||
       f.name.toLowerCase().includes("register"))
    );
  
  mintFunctions.forEach((f: any) => {
    console.log(`Function: ${f.name}`);
    console.log("Parameters:");
    f.inputs.forEach((input: any, index: number) => {
      console.log(`  ${index + 1}. ${input.type} ${input.name}`);
    });
    console.log("");
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
