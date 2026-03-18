const { ethers, upgrades } = require("hardhat");

async function main() {
  const PROXY_ADDRESS = "0x2EA195e382bBBC10Ce2284e44fF3eB9101C3B11c"; // Your existing proxy
  
  console.log("Upgrading KYCManager...");
  
  const KYCManagerV2 = await ethers.getContractFactory("KYCManager");
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, KYCManagerV2);
  
  await upgraded.waitForDeployment();
  
  console.log("KYCManager upgraded successfully!");
  console.log("Proxy address (unchanged):", PROXY_ADDRESS);
  console.log("New implementation:", await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
