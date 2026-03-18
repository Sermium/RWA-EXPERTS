import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading contracts with:", deployer.address);

  const PROJECT_NFT_PROXY = "0x3b5913C46452cc7A27Fba55E4ED11B8554D78b2F";
  const FACTORY_ADDRESS = "0x1dE0B39E286996405E473c278E10E27A11577435";

  // 1. RWAProjectNFT already upgraded
  console.log("✅ RWAProjectNFT already upgraded");
  console.log("   Proxy:", PROJECT_NFT_PROXY);
  console.log("   New Implementation: 0x703227d0eFEC154741C585228599bC98C0C7514E");

  // 2. Deploy new EscrowVault implementation
  console.log("\n2. Deploying new RWAEscrowVault implementation...");
  const RWAEscrowVault = await ethers.getContractFactory("RWAEscrowVault");
  const escrowVaultImpl = await RWAEscrowVault.deploy();
  await escrowVaultImpl.waitForDeployment();
  const escrowVaultImplAddress = await escrowVaultImpl.getAddress();
  console.log("✅ New EscrowVault implementation deployed:", escrowVaultImplAddress);

  // 3. Update factory to use new implementation
  console.log("\n3. Updating factory with new EscrowVault implementation...");
  const factory = await ethers.getContractAt("RWALaunchpadFactory", FACTORY_ADDRESS);
  const tx = await factory.setEscrowVaultImplementation(escrowVaultImplAddress);
  await tx.wait();
  console.log("✅ Factory updated with new EscrowVault implementation");

  // 4. Grant MANAGER_ROLE on ProjectNFT to new escrow vaults (done per-project)
  // For now, grant to factory so it can manage projects
  console.log("\n4. Checking roles on ProjectNFT...");
  const projectNFT = await ethers.getContractAt("RWAProjectNFT", PROJECT_NFT_PROXY);
  const MANAGER_ROLE = await projectNFT.MANAGER_ROLE();
  
  const factoryHasRole = await projectNFT.hasRole(MANAGER_ROLE, FACTORY_ADDRESS);
  if (!factoryHasRole) {
    console.log("   Granting MANAGER_ROLE to Factory...");
    const tx2 = await projectNFT.grantRole(MANAGER_ROLE, FACTORY_ADDRESS);
    await tx2.wait();
    console.log("   ✅ MANAGER_ROLE granted to Factory");
  } else {
    console.log("   ✅ Factory already has MANAGER_ROLE");
  }

  console.log("\n========================================");
  console.log("UPGRADE COMPLETE");
  console.log("========================================");
  console.log("RWAProjectNFT Proxy:", PROJECT_NFT_PROXY);
  console.log("RWAProjectNFT New Impl: 0x703227d0eFEC154741C585228599bC98C0C7514E");
  console.log("RWAEscrowVault New Impl:", escrowVaultImplAddress);
  console.log("Factory:", FACTORY_ADDRESS);
  console.log("\n⚠️  UPDATE YOUR CONFIG:");
  console.log(`   EscrowVault: '${escrowVaultImplAddress}',`);
  console.log(`   ProjectNFT: '0x703227d0eFEC154741C585228599bC98C0C7514E',`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
