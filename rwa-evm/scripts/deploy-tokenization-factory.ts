import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // ============ Configuration ============
  const CONFIG = {
    identityRegistry: "0x01395d6ac65868A48eE2Df3DB41e2Fd4d4387B5D",
    feeRecipient: "0xA2fF1ef754b3186f12d2d8D4D922CC31d7BF1969",
    // Existing implementations to reuse
    securityTokenImpl: "0x90Ae280C9b591F136883A243661ce63df517108a",
    projectNFTImpl: "0x0F6a4f7486ad12e03C89800F251e7f046fD2Ec4e",
    complianceImpl: "0x2ac12b2Dbf343146A11cCA2DC1467148DAEb4447",
    tradeEscrowImpl: "0x847082755E336b629eD5B7d300a032587eD96058",
    dividendDistributorImpl: "0x02D074440967709a56E91cDACfdB37f8Ca2843D9",
  };

  console.log("\n========================================");
  console.log("Fresh RWA Tokenization Factory Deployment");
  console.log("========================================\n");

  // Deploy factory proxy
  console.log("Deploying RWATokenizationFactory...");
  const RWATokenizationFactory = await ethers.getContractFactory("RWATokenizationFactory");
  
  const factory = await upgrades.deployProxy(
    RWATokenizationFactory,
    [
      deployer.address,
      CONFIG.securityTokenImpl,
      CONFIG.projectNFTImpl,
      CONFIG.complianceImpl,
      CONFIG.identityRegistry,
      CONFIG.feeRecipient,
    ],
    { 
      initializer: "initialize",
      unsafeAllow: ["constructor"]
    }
  );

  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ Factory deployed at:", factoryAddress);

  // Get implementation address
  const implAddress = await upgrades.erc1967.getImplementationAddress(factoryAddress);
  console.log("✅ Implementation at:", implAddress);

  // Set trade escrow implementation
  console.log("\nSetting trade escrow implementation...");
  let tx = await factory.setTradeEscrowImplementation(CONFIG.tradeEscrowImpl);
  await tx.wait();
  console.log("✅ Trade escrow impl set");

  // Set dividend distributor implementation
  console.log("Setting dividend distributor implementation...");
  tx = await factory.setDividendDistributorImplementation(CONFIG.dividendDistributorImpl);
  await tx.wait();
  console.log("✅ Dividend distributor impl set");

  // Approve deployer
  console.log("Approving deployer...");
  tx = await factory.setDeployerApproval(deployer.address, true);
  await tx.wait();
  console.log("✅ Deployer approved");

  // Verify setup
  console.log("\n--- Verifying setup ---");
  const impls = await factory.getImplementations();
  console.log("Security Token:", impls.securityToken);
  console.log("Project NFT:", impls.assetNFT);
  console.log("Compliance:", impls.compliance);
  console.log("Trade Escrow:", impls.tradeEscrow);
  console.log("Dividend:", impls.dividendDistributor);

  const isApproved = await factory.isDeployerApproved(deployer.address);
  console.log("Deployer approved:", isApproved);

  // Test static call
  console.log("\n--- Testing deployment ---");
  try {
    const supply = ethers.parseUnits("1000000", 18);
    const result = await factory.deployNFTAndToken.staticCall(
      "Test Project",
      "TEST",
      supply,
      "ipfs://test"
    );
    console.log("✅ Static call SUCCESS!");
    console.log("   Deployment ID:", result[0].toString());
    console.log("   Security Token:", result[1]);
    console.log("   Project NFT:", result[2]);
  } catch (error: any) {
    console.log("❌ Static call failed:", error.reason || error.message);
  }

  // Output summary
  console.log("\n========================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log("Factory Address:", factoryAddress);
  console.log("Implementation:", implAddress);
  console.log("========================================");
  console.log("\nUpdate your frontend config with:");
  console.log(`FACTORY_ADDRESS = "${factoryAddress}"`);
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });