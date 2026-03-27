import { ethers, upgrades } from "hardhat";

async function main() {
  const proxyAddress = "0x72d613fC933fb5561Cc235bf87Ef7dddF2e6eD23";
  
  console.log("Force importing existing proxy...");
  
  const RWAEscrowVault = await ethers.getContractFactory("RWAEscrowVault");
  
  // Force import the existing proxy
  await upgrades.forceImport(proxyAddress, RWAEscrowVault, {
    kind: 'uups'
  });
  
  console.log("Proxy imported successfully!");
  console.log("Now upgrading...");
  
  const upgraded = await upgrades.upgradeProxy(proxyAddress, RWAEscrowVault, {
    kind: 'uups'
  });
  await upgraded.waitForDeployment();
  
  console.log("RWAEscrowVault upgraded successfully!");
  console.log("Proxy address:", proxyAddress);
  console.log("New implementation:", await upgrades.erc1967.getImplementationAddress(proxyAddress));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
