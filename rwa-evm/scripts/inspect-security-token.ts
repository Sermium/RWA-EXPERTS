// scripts/inspect-security-token.ts
import { ethers } from "hardhat";

async function main() {
  console.log("═══ INSPECTING RWASecurityToken ABI ═══\n");
  
  const RWASecurityToken = await ethers.getContractFactory("RWASecurityToken");
  
  console.log("Available functions:\n");
  
  const functions = RWASecurityToken.interface.fragments
    .filter((f: any) => f.type === "function")
    .map((f: any) => {
      const inputs = f.inputs.map((i: any) => `${i.type} ${i.name}`).join(", ");
      return `${f.name}(${inputs})`;
    });
  
  functions.sort().forEach((f: string) => {
    console.log(`  ${f}`);
  });

  // Specifically look for initialize
  console.log("\n═══ initialize function details ═══\n");
  
  const initFunctions = RWASecurityToken.interface.fragments
    .filter((f: any) => f.type === "function" && f.name === "initialize");
  
  initFunctions.forEach((f: any) => {
    console.log(`Function: ${f.name}`);
    console.log("Parameters:");
    f.inputs.forEach((input: any, index: number) => {
      console.log(`  ${index + 1}. ${input.type} ${input.name}`);
    });
  });

  // Check constructor
  console.log("\n═══ Constructor ═══\n");
  const constructor = RWASecurityToken.interface.fragments
    .find((f: any) => f.type === "constructor");
  
  if (constructor) {
    console.log("Constructor parameters:");
    constructor.inputs.forEach((input: any, index: number) => {
      console.log(`  ${index + 1}. ${input.type} ${input.name}`);
    });
  } else {
    console.log("No constructor with parameters found");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
