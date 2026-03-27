// scripts/inspect-kyc-verifier.ts
import { ethers } from "hardhat";

async function main() {
  console.log("═══ INSPECTING KYCVerifier ═══\n");
  
  const KYCVerifier = await ethers.getContractFactory("KYCVerifier");
  
  const functions = KYCVerifier.interface.fragments
    .filter((f: any) => f.type === "function")
    .map((f: any) => {
      const inputs = f.inputs.map((i: any) => `${i.type} ${i.name}`).join(", ");
      return `${f.name}(${inputs})`;
    });
  
  console.log("Available functions:\n");
  functions.sort().forEach((f: string) => console.log(`  ${f}`));

  // Try to read current signer
  const KYC_VERIFIER = "0x3CA5b7e66cF25E8C761aA07f318e06B83d0bde7B";
  const kycVerifier = await ethers.getContractAt("KYCVerifier", KYC_VERIFIER);
  
  console.log("\n═══ Current State ═══\n");
  
  // Try different getter names
  const possibleGetters = ["kycSigner", "signer", "getSigner", "authorizedSigner", "trustedSigner"];
  
  for (const getter of possibleGetters) {
    try {
      const value = await (kycVerifier as any)[getter]();
      console.log(`${getter}(): ${value}`);
    } catch {
      // Not a valid function
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
