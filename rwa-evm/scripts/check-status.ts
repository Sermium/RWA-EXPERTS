import { ethers } from "hardhat";

async function main() {
  const PROJECT_NFT = "0x129287D01f98e32213519345F3bBCCcBA3fe3941";
  const [deployer] = await ethers.getSigners();
  
  const nft = await ethers.getContractAt("RWAProjectNFT", PROJECT_NFT);

  console.log("=== NFT DETAILED CHECK ===");
  
  // Check implementation
  const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  const implAddress = await ethers.provider.getStorage(PROJECT_NFT, implSlot);
  console.log("NFT Implementation:", "0x" + implAddress.slice(-40));

  // Check if there's a max supply
  console.log("\n=== CHECKING LIMITS ===");
  const totalSupply = await nft.totalSupply();
  console.log("Total supply:", totalSupply.toString());
  
  try {
    const maxSupply = await nft.maxSupply();
    console.log("Max supply:", maxSupply.toString());
  } catch {
    console.log("No maxSupply function");
  }

  try {
    const cap = await nft.cap();
    console.log("Cap:", cap.toString());
  } catch {
    console.log("No cap function");
  }

  // Check last project
  console.log("\n=== LAST PROJECT ===");
  try {
    const lastProject = await nft.getProject(totalSupply - 1n);
    console.log("Project", (totalSupply - 1n).toString(), ":");
    console.log("  Owner:", lastProject.owner);
    console.log("  Name:", lastProject.name);
  } catch (e: any) {
    console.log("Can't get last project:", e.message);
  }

  // Check if there's a factory restriction
  console.log("\n=== CHECKING FACTORY SETTING ===");
  try {
    const factoryAddr = await nft.factory();
    console.log("Factory:", factoryAddr);
  } catch {
    console.log("No factory() function");
  }

  try {
    const launchpad = await nft.launchpad();
    console.log("Launchpad:", launchpad);
  } catch {
    console.log("No launchpad() function");
  }
}

main().catch(console.error);
