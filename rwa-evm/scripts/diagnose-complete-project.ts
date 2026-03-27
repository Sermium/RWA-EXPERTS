import { ethers } from "hardhat";

const CONTRACTS = {
  RWAEscrowVault: "0xf6bE123965f80b8eA08627F3AA8545a7A92ECC0A",
  PlatformFeeManager: "0xeC644de34d1A641f2E1A67726445C1688ABd44fd",
  USDC: "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786"
};

async function main() {
  console.log("═══ DIAGNOSING COMPLETE PROJECT FAILURE ═══\n");

  const [deployer] = await ethers.getSigners();
  const escrowVault = await ethers.getContractAt("RWAEscrowVault", CONTRACTS.RWAEscrowVault);
  const platformFeeManager = await ethers.getContractAt("PlatformFeeManager", CONTRACTS.PlatformFeeManager);
  const usdc = await ethers.getContractAt("IERC20", CONTRACTS.USDC);

  // Use project ID 7 which is in FUNDED state
  const projectId = 7;
  
  const project = await escrowVault.projects(projectId);
  console.log("=== Project Info ===");
  console.log(`State: ${project.state}`);
  console.log(`Total Raised: ${ethers.formatUnits(project.totalRaised, 6)} USDC`);
  console.log(`Security Token: ${project.securityToken}`);
  console.log(`Fees Transferred: ${project.platformFeesTransferred}`);

  console.log("\n=== Balances & Allowances ===");
  const escrowBalance = await usdc.balanceOf(CONTRACTS.RWAEscrowVault);
  console.log(`Escrow USDC Balance: ${ethers.formatUnits(escrowBalance, 6)} USDC`);

  const allowanceToFeeManager = await usdc.allowance(CONTRACTS.RWAEscrowVault, CONTRACTS.PlatformFeeManager);
  console.log(`Escrow->FeeManager Allowance: ${ethers.formatUnits(allowanceToFeeManager, 6)} USDC`);

  // Calculate expected fee
  const platformFee = (project.totalRaised * 150n) / 10000n;
  console.log(`Expected Platform Fee (1.5%): ${ethers.formatUnits(platformFee, 6)} USDC`);

  console.log("\n=== EscrowVault Functions ===");
  const factory = await ethers.getContractFactory("RWAEscrowVault");
  const funcs = factory.interface.fragments.filter(f => f.type === 'function');
  
  // Look for approval-related functions
  const relevantFuncs = funcs.filter(f => {
    const name = (f as any).name.toLowerCase();
    return name.includes('approve') || name.includes('fee') || name.includes('complete') || name.includes('transfer');
  });
  
  console.log("Relevant functions:");
  relevantFuncs.forEach(f => {
    const fn = f as ethers.FunctionFragment;
    const inputs = fn.inputs.map(i => `${i.type} ${i.name}`).join(", ");
    console.log(`  ${fn.name}(${inputs})`);
  });

  console.log("\n=== PlatformFeeManager Info ===");
  try {
    // Check if there's an ESCROW_ROLE
    const ESCROW_ROLE = await platformFeeManager.ESCROW_ROLE();
    const hasEscrowRole = await platformFeeManager.hasRole(ESCROW_ROLE, CONTRACTS.RWAEscrowVault);
    console.log(`EscrowVault has ESCROW_ROLE: ${hasEscrowRole}`);
  } catch (e) {
    console.log("Could not check ESCROW_ROLE");
  }

  console.log("\n=== Static Call Test ===");
  try {
    await escrowVault.completeProject.staticCall(projectId);
    console.log("✓ Static call would succeed!");
  } catch (e: any) {
    console.log(`✗ Static call failed: ${e.reason || e.message}`);
    
    // Try to decode the error
    if (e.data) {
      console.log(`Error data: ${e.data}`);
    }
  }
}

main().catch(console.error);
