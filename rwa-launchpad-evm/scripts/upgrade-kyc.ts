import { ethers, upgrades } from "hardhat";

async function main() {
  const KYCVerifier = await ethers.getContractFactory("KYCVerifier");
  const proxy = "0xee84Effbdb909Daef5e8D6184C64953d7cE04D6f";
  
  console.log("Upgrading...");
  await upgrades.upgradeProxy(proxy, KYCVerifier);
  console.log("Done!");
}

main().catch(console.error);