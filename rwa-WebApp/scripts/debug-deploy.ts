import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const FACTORY_ADDRESS = "0x90FF863603b9450F185E3641c6EF3df469886Bd3";
  
  const factory = await ethers.getContractAt("RWALaunchpadFactory", FACTORY_ADDRESS);

  // ============ READ CONTRACT STATE ============
  console.log("\n=== CONTRACT STATE ===");
  
  const owner = await factory.owner();
  console.log("Owner:", owner);
  console.log("Is deployer owner?:", owner.toLowerCase() === deployer.address.toLowerCase());

  const requireApproval = await factory.requireApproval();
  console.log("Require approval:", requireApproval);

  const isApproved = await factory.approvedDeployers(deployer.address);
  console.log("Is approved:", isApproved);

  const creationFee = await factory.creationFee();
  console.log("Creation fee:", ethers.formatEther(creationFee), "AVAX");

  const projectNFT = await factory.projectNFT();
  console.log("Project NFT:", projectNFT);

  const impl = await factory.getImplementations();
  console.log("\nImplementations:");
  console.log("  Security Token:", impl.securityToken);
  console.log("  Escrow Vault:", impl.escrowVault);
  console.log("  Compliance:", impl.compliance);
  console.log("  KYC Verifier:", impl.kycVerifier);

  const platformFeeRecipient = await factory.platformFeeRecipient();
  console.log("\nPlatform fee recipient:", platformFeeRecipient);

  const defaultPriceFeed = await factory.defaultPriceFeed();
  console.log("Default price feed:", defaultPriceFeed);

  // ============ CHECK CONSTANTS ============
  console.log("\n=== CHECKING CONSTANTS ===");
  
  // Try to read Constants from a deployed contract or log what we're sending
  const tokenName = "Test Token";
  const tokenSymbol = "TEST";
  const category = "real-estate";
  const maxSupply = ethers.parseUnits("1000000", 18); // 1M tokens
  const fundingGoal = ethers.parseUnits("100000", 6); // $100,000 USDC (6 decimals)
  const deadlineDays = 30n;
  const metadataUri = "ipfs://QmTest123";

  console.log("\nDeploy params:");
  console.log("  Token name:", tokenName);
  console.log("  Token symbol:", tokenSymbol);
  console.log("  Category:", category);
  console.log("  Max supply:", maxSupply.toString(), "(raw)");
  console.log("  Funding goal:", fundingGoal.toString(), "(raw 6 decimals)");
  console.log("  Deadline days:", deadlineDays.toString());
  console.log("  Metadata URI:", metadataUri);

  // ============ TRY STATIC CALL FIRST ============
  console.log("\n=== SIMULATING DEPLOY ===");
  
  try {
    const result = await factory.deployProject.staticCall(
      tokenName,
      tokenSymbol,
      category,
      maxSupply,
      fundingGoal,
      deadlineDays,
      metadataUri,
      { value: creationFee }
    );
    console.log("Simulation SUCCESS! Project ID would be:", result.toString());
  } catch (error: any) {
    console.error("Simulation FAILED!");
    console.error("Error:", error.message);
    
    // Try to decode the error
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    if (error.errorName) {
      console.error("Error name:", error.errorName);
    }
    
    // Check specific issues
    console.log("\n=== DEBUGGING CHECKS ===");
    
    // Check if NFT contract is valid
    try {
      const nftContract = await ethers.getContractAt("IRWAProjectNFT", projectNFT);
      const nftOwner = await nftContract.owner();
      console.log("NFT contract owner:", nftOwner);
      console.log("Factory can create projects on NFT?");
    } catch (e: any) {
      console.error("NFT contract check failed:", e.message);
    }

    return;
  }

  // ============ ACTUAL DEPLOY ============
  console.log("\n=== DEPLOYING FOR REAL ===");
  
  const tx = await factory.deployProject(
    tokenName,
    tokenSymbol,
    category,
    maxSupply,
    fundingGoal,
    deadlineDays,
    metadataUri,
    { value: creationFee }
  );

  console.log("TX Hash:", tx.hash);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("TX confirmed in block:", receipt?.blockNumber);

  // Parse events
  const deployedEvent = receipt?.logs.find((log: any) => {
    try {
      const parsed = factory.interface.parseLog(log);
      return parsed?.name === "ProjectDeployed";
    } catch {
      return false;
    }
  });

  if (deployedEvent) {
    const parsed = factory.interface.parseLog(deployedEvent);
    console.log("\n=== PROJECT DEPLOYED ===");
    console.log("Project ID:", parsed?.args.projectId.toString());
    console.log("Security Token:", parsed?.args.securityToken);
    console.log("Escrow Vault:", parsed?.args.escrowVault);
    console.log("Compliance:", parsed?.args.compliance);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
