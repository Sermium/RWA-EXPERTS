import { ethers, upgrades } from "hardhat";

async function main() {
  const FACTORY_PROXY = "0x496f98ecc190ac342C78601B5E01563464958E98";
  
  console.log("Upgrading RWALaunchpadFactory...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", await deployer.getAddress());

  // Force import the existing proxy
  const RWALaunchpadFactory = await ethers.getContractFactory("RWALaunchpadFactory");
  
  try {
    await upgrades.forceImport(FACTORY_PROXY, RWALaunchpadFactory, {
      kind: 'uups'
    });
    console.log("Proxy imported successfully!");
  } catch (e: any) {
    if (!e.message.includes("already registered")) {
      throw e;
    }
    console.log("Proxy already registered");
  }

  // Upgrade
  const upgraded = await upgrades.upgradeProxy(FACTORY_PROXY, RWALaunchpadFactory, {
    kind: 'uups'
  });
  await upgraded.waitForDeployment();

  console.log("Factory upgraded!");
  console.log("New implementation:", await upgrades.erc1967.getImplementationAddress(FACTORY_PROXY));
  
  // Now grant yourself roles on the existing escrow vault
  const factory = await ethers.getContractAt("RWALaunchpadFactory", FACTORY_PROXY);
  
  console.log("\nGranting roles on existing EscrowVault (project 0)...");
  const yourAddress = await deployer.getAddress();
  
  try {
    const tx = await factory.grantAllEscrowRoles(0, yourAddress);
    await tx.wait();
    console.log("All escrow roles granted to:", yourAddress);
  } catch (e: any) {
    console.log("Note: grantAllEscrowRoles may fail if factory doesn't have permission yet");
    console.log("Error:", e.message);
  }

  // Set price feed to address(0) for stablecoins
  console.log("\nSetting price feed to address(0) for project 0...");
  try {
    const tx2 = await factory.updateEscrowPriceFeed(0, ethers.ZeroAddress);
    await tx2.wait();
    console.log("Price feed set to address(0)!");
  } catch (e: any) {
    console.log("Error setting price feed:", e.message);
  }

  console.log("\n✅ Upgrade complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });