import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const FACTORY_PROXY = "0x90FF863603b9450F185E3641c6EF3df469886Bd3";
  const factory = await ethers.getContractAt("RWALaunchpadFactory", FACTORY_PROXY);

  console.log("\n=== DEPLOYING REAL PROJECT ===");

  const tx = await factory.deployProject(
    "Test Token",
    "TEST",
    "real-estate",
    ethers.parseUnits("1000000", 18),  // 1M tokens
    ethers.parseUnits("100000", 6),    // $100k goal
    30n,                                // 30 days
    "ipfs://QmTest123",
    { value: 0 }
  );

  console.log("TX Hash:", tx.hash);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("Confirmed in block:", receipt?.blockNumber);

  // Parse ProjectDeployed event
  for (const log of receipt?.logs || []) {
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed?.name === "ProjectDeployed") {
        console.log("\n=== PROJECT DEPLOYED ===");
        console.log("Project ID:", parsed.args.projectId.toString());
        console.log("Deployer:", parsed.args.deployer);
        console.log("Security Token:", parsed.args.securityToken);
        console.log("Escrow Vault:", parsed.args.escrowVault);
        console.log("Compliance:", parsed.args.compliance);
      }
    } catch {}
  }

  console.log("\n=== SUCCESS! ===");
  console.log("Now test from the frontend!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
