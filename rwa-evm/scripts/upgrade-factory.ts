import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading with account:", deployer.address);

  const FACTORY_PROXY = "0x90FF863603b9450F185E3641c6EF3df469886Bd3";

  console.log("\n=== UPGRADING FACTORY ===");
  
  // Get the new implementation
  const RWALaunchpadFactory = await ethers.getContractFactory("RWALaunchpadFactory");
  
  console.log("Current proxy:", FACTORY_PROXY);
  console.log("Deploying new implementation...");

  // Upgrade the proxy
  const upgraded = await upgrades.upgradeProxy(FACTORY_PROXY, RWALaunchpadFactory);
  await upgraded.waitForDeployment();

  const newImplAddress = await upgrades.erc1967.getImplementationAddress(FACTORY_PROXY);
  console.log("New implementation:", newImplAddress);
  console.log("Proxy address (unchanged):", await upgraded.getAddress());

  // Verify it works
  console.log("\n=== VERIFYING UPGRADE ===");
  const factory = await ethers.getContractAt("RWALaunchpadFactory", FACTORY_PROXY);
  
  const owner = await factory.owner();
  console.log("Owner:", owner);
  
  const impl = await factory.getImplementations();
  console.log("Security Token impl:", impl.securityToken);
  console.log("Escrow Vault impl:", impl.escrowVault);

  // Test deployment
  console.log("\n=== TESTING DEPLOY ===");
  try {
    const result = await factory.deployProject.staticCall(
      "Test Token",
      "TEST", 
      "real-estate",
      ethers.parseUnits("1000000", 18),
      ethers.parseUnits("100000", 6),
      30n,
      "ipfs://QmTest123",
      { value: 0 }
    );
    console.log("Simulation SUCCESS! Project ID:", result.toString());
  } catch (error: any) {
    console.error("Simulation failed:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
  }

  console.log("\n=== UPGRADE COMPLETE ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
