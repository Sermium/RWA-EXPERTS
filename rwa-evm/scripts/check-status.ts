import { ethers } from "hardhat";

async function main() {
  // Let's just try a real deploy and catch the exact error
  const FACTORY = "0x90FF863603b9450F185E3641c6EF3df469886Bd3";
  const factory = await ethers.getContractAt("RWALaunchpadFactory", FACTORY);

  console.log("=== ATTEMPTING DEPLOY WITH GAS ESTIMATION ===");
  
  try {
    const gasEstimate = await factory.deployProject.estimateGas(
      "Test", "TST", "Other",
      ethers.parseUnits("200000", 18),
      ethers.parseUnits("200000", 6),
      30n,
      "ipfs://test",
      { value: 0 }
    );
    console.log("Gas estimate:", gasEstimate.toString());
  } catch (e: any) {
    console.log("Gas estimation failed");
    console.log("Error:", e.message);
    if (e.error) console.log("Inner error:", e.error);
    if (e.reason) console.log("Reason:", e.reason);
    if (e.data) console.log("Data:", e.data);
    
    // Try to decode the error
    if (e.data && e.data !== "0x") {
      try {
        const iface = factory.interface;
        const decoded = iface.parseError(e.data);
        console.log("Decoded error:", decoded);
      } catch {
        console.log("Could not decode error");
      }
    }
  }
}

main().catch(console.error);
