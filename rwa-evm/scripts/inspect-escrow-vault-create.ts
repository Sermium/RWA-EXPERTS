// scripts/inspect-escrow-vault-create.ts
import { ethers } from "hardhat";

const ESCROW_VAULT = "0xf6bE123965f80b8eA08627F3AA8545a7A92ECC0A";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("═══ INSPECTING RWAEscrowVault.createProject ═══\n");
  
  const escrowVault = await ethers.getContractAt("RWAEscrowVault", ESCROW_VAULT);
  
  // Get the createProject function details
  const RWAEscrowVault = await ethers.getContractFactory("RWAEscrowVault");
  
  const createProjectFragments = RWAEscrowVault.interface.fragments
    .filter((f: any) => f.type === "function" && f.name === "createProject");
  
  console.log("createProject function signature:");
  createProjectFragments.forEach((f: any) => {
    console.log(`\nFunction: ${f.name}`);
    console.log("Parameters:");
    f.inputs.forEach((input: any, index: number) => {
      console.log(`  ${index + 1}. ${input.type} ${input.name}`);
    });
  });

  // Check if project 3 already exists
  console.log("\n═══ Checking existing projects ═══\n");
  for (let i = 0; i <= 5; i++) {
    try {
      const project = await escrowVault.projects(i);
      console.log(`Project ${i}:`);
      console.log(`  securityToken: ${project.securityToken}`);
      console.log(`  exists: ${project.securityToken !== ethers.ZeroAddress}`);
    } catch (e: any) {
      console.log(`Project ${i}: Error - ${e.message}`);
    }
  }

  // Try static call to see error
  console.log("\n═══ Testing createProject static call ═══\n");
  
  const testParams = {
    projectId: 3,
    securityToken: "0x0F966157Fd38556BCE9BA3678aB6fD63A19B0d61",
    fundingGoal: ethers.parseUnits("100", 6),
    deadline: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
    totalSupply: ethers.parseUnits("10000", 18),
  };

  console.log("Test parameters:");
  console.log(`  projectId: ${testParams.projectId}`);
  console.log(`  securityToken: ${testParams.securityToken}`);
  console.log(`  fundingGoal: ${testParams.fundingGoal}`);
  console.log(`  deadline: ${testParams.deadline}`);
  console.log(`  totalSupply: ${testParams.totalSupply}`);

  try {
    await escrowVault.createProject.staticCall(
      testParams.projectId,
      testParams.securityToken,
      testParams.fundingGoal,
      testParams.deadline,
      testParams.totalSupply
    );
    console.log("\n✓ Static call succeeded");
  } catch (e: any) {
    console.log(`\n✗ Static call failed: ${e.reason || e.message}`);
    
    // Try to decode error
    if (e.data) {
      console.log(`Error data: ${e.data}`);
      try {
        const decodedError = escrowVault.interface.parseError(e.data);
        console.log(`Decoded error: ${decodedError?.name}`);
        console.log(`Args: ${JSON.stringify(decodedError?.args)}`);
      } catch {}
    }
  }

  // Check deployer roles
  console.log("\n═══ Checking roles ═══\n");
  const OPERATOR_ROLE = await escrowVault.OPERATOR_ROLE();
  const ADMIN_ROLE = await escrowVault.DEFAULT_ADMIN_ROLE();
  
  console.log(`OPERATOR_ROLE: ${OPERATOR_ROLE}`);
  console.log(`Deployer has OPERATOR_ROLE: ${await escrowVault.hasRole(OPERATOR_ROLE, deployer.address)}`);
  console.log(`Deployer has ADMIN_ROLE: ${await escrowVault.hasRole(ADMIN_ROLE, deployer.address)}`);

  // Check ProjectNFT linkage
  console.log("\n═══ Checking ProjectNFT ═══\n");
  const projectNFT = await escrowVault.projectNFT();
  console.log(`ProjectNFT address: ${projectNFT}`);
  
  if (projectNFT !== ethers.ZeroAddress) {
    const nft = await ethers.getContractAt("RWAProjectNFT", projectNFT);
    try {
      const exists = await nft.projectExists(3);
      console.log(`Project 3 exists in NFT: ${exists}`);
      
      if (exists) {
        const projectData = await nft.getProject(3);
        console.log(`  Owner: ${projectData.owner}`);
        console.log(`  Name: ${projectData.name}`);
        console.log(`  Status: ${projectData.status}`);
      }
    } catch (e: any) {
      console.log(`Error checking NFT: ${e.message}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
