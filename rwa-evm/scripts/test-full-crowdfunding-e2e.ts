import { ethers, upgrades } from "hardhat";

// ============ AVALANCHE FUJI CONTRACT ADDRESSES ============
const CONTRACTS = {
  RWAEscrowVault: "0xf6bE123965f80b8eA08627F3AA8545a7A92ECC0A",
  PlatformFeeManager: "0xeC644de34d1A641f2E1A67726445C1688ABd44fd",
  DisputeManager: "0x1C7496477eAeaBBf4fFAE127772422C57d11f025",
  RWAProjectNFT: "0x129287D01f98e32213519345F3bBCCcBA3fe3941",
  KYCVerifier: "0x3CA5b7e66cF25E8C761aA07f318e06B83d0bde7B",
  USDC: "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786",
  USDT: "0x224e403397F3aec9a0D2875445dC32dB00ea31C3"
};

const PLATFORM_WALLETS = {
  feeReceiver: "0xdD4104A780142EfB9566659f26d3317714a81510",
  liquidityWallet: "0xe7c533355a7Fa04baf083C726a442db7Dc0971b1",
  treasuryWallet: "0x2Db96c4F203fBc13c98bBa428ba9E09B48543b0A"
};

const TIMESTAMP = Date.now();
const TEST_CONFIG = {
  projectName: `Test Project ${TIMESTAMP}`,
  projectCategory: "Real Estate",
  fundingGoal: ethers.parseUnits("10000", 6),
  tokenSupply: ethers.parseUnits("1000000", 18),
  investmentAmount: ethers.parseUnits("10000", 6),
  milestone1Amount: ethers.parseUnits("3000", 6)
};

interface TestResult {
  step: string;
  status: string;
  details: string;
}

const results: TestResult[] = [];

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("         CROWDFUNDING END-TO-END TEST v11");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  
  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`AVAX Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} AVAX\n`);

  // Load contracts
  console.log("Loading contracts...");
  const escrowVault = await ethers.getContractAt("RWAEscrowVault", CONTRACTS.RWAEscrowVault);
  const platformFeeManager = await ethers.getContractAt("PlatformFeeManager", CONTRACTS.PlatformFeeManager);
  const disputeManager = await ethers.getContractAt("DisputeManager", CONTRACTS.DisputeManager);
  const projectNFT = await ethers.getContractAt("RWAProjectNFT", CONTRACTS.RWAProjectNFT);
  const kycVerifier = await ethers.getContractAt("KYCVerifier", CONTRACTS.KYCVerifier);
  const usdc = await ethers.getContractAt("IERC20", CONTRACTS.USDC);
  console.log("✓ All contracts loaded\n");

  // Check balances
  const usdcBalance = await usdc.balanceOf(deployer.address);
  console.log(`USDC Balance: ${ethers.formatUnits(usdcBalance, 6)} USDC\n`);

  // ============ STEP 1: SETUP ROLES ============
  console.log("═══ STEP 1: Setup Roles ═══");
  try {
    const OPERATOR_ROLE = await escrowVault.OPERATOR_ROLE();
    const MINTER_ROLE = await projectNFT.MINTER_ROLE();
    const MANAGER_ROLE = await projectNFT.MANAGER_ROLE();

    const isOperator = await escrowVault.hasRole(OPERATOR_ROLE, deployer.address);
    const isMinter = await projectNFT.hasRole(MINTER_ROLE, deployer.address);
    const isManager = await projectNFT.hasRole(MANAGER_ROLE, deployer.address);

    console.log(`OPERATOR: ${isOperator}, MINTER: ${isMinter}, MANAGER: ${isManager}`);

    if (!isOperator) await (await escrowVault.grantRole(OPERATOR_ROLE, deployer.address)).wait();
    if (!isMinter) await (await projectNFT.grantRole(MINTER_ROLE, deployer.address)).wait();
    if (!isManager) await (await projectNFT.grantRole(MANAGER_ROLE, deployer.address)).wait();

    results.push({ step: "Setup Roles", status: "✓ PASS", details: "All roles configured" });
    console.log("✓ Roles configured\n");
  } catch (error: any) {
    results.push({ step: "Setup Roles", status: "✗ FAIL", details: error.message });
    console.log(`✗ Failed: ${error.message}\n`);
  }

  // ============ STEP 2: CREATE PROJECT NFT ============
  console.log("═══ STEP 2: Create Project NFT ═══");
  let projectId: bigint = 0n;
  
  try {
    const tx = await projectNFT.createProject(
      deployer.address,
      TEST_CONFIG.projectName,
      TEST_CONFIG.projectCategory,
      TEST_CONFIG.fundingGoal,
      `ipfs://test-${TIMESTAMP}`
    );
    const receipt = await tx.wait();
    
    const event = receipt?.logs.find((log: any) => {
      try { return projectNFT.interface.parseLog(log)?.name === "ProjectCreated"; } 
      catch { return false; }
    });
    
    if (event) {
      const parsed = projectNFT.interface.parseLog(event);
      projectId = parsed?.args[0];
    } else {
      projectId = await projectNFT.totalProjects();
    }

    console.log(`✓ Project NFT created: ID ${projectId}`);
    results.push({ step: "Create Project NFT", status: "✓ PASS", details: `ID: ${projectId}` });
  } catch (error: any) {
    results.push({ step: "Create Project NFT", status: "✗ FAIL", details: error.message });
    printResults(results);
    return;
  }

  // ============ STEP 3: DEPLOY TOKEN & COMPLIANCE ============
  console.log("\n═══ STEP 3: Deploy Token & Compliance ═══");
  let securityTokenAddress = "";
  let complianceAddress = "";
  
  try {
    const ModularCompliance = await ethers.getContractFactory("ModularCompliance");
    const compliance = await upgrades.deployProxy(ModularCompliance, [deployer.address], 
      { initializer: "initialize", kind: "uups", unsafeAllow: ["constructor"] });
    await compliance.waitForDeployment();
    complianceAddress = await compliance.getAddress();
    console.log(`✓ Compliance: ${complianceAddress}`);

    const RWASecurityToken = await ethers.getContractFactory("RWASecurityToken");
    const securityToken = await upgrades.deployProxy(RWASecurityToken,
      [`${TEST_CONFIG.projectName} Token`, `RWA${projectId}`, deployer.address, 
       complianceAddress, CONTRACTS.KYCVerifier, TEST_CONFIG.tokenSupply],
      { initializer: "initialize", kind: "uups", unsafeAllow: ["constructor"] });
    await securityToken.waitForDeployment();
    securityTokenAddress = await securityToken.getAddress();
    console.log(`✓ Token: ${securityTokenAddress}`);

    await (await compliance.bindToken(securityTokenAddress)).wait();
    const MINTER_ROLE = await securityToken.MINTER_ROLE();
    await (await securityToken.grantRole(MINTER_ROLE, CONTRACTS.RWAEscrowVault)).wait();
    await (await projectNFT.linkSecurityToken(projectId, securityTokenAddress)).wait();

    results.push({ step: "Deploy Token & Compliance", status: "✓ PASS", details: `Token: ${securityTokenAddress.slice(0, 10)}...` });
    console.log("✓ Token configured\n");
  } catch (error: any) {
    results.push({ step: "Deploy Token & Compliance", status: "✗ FAIL", details: error.message });
    printResults(results);
    return;
  }

  // ============ STEP 4: CREATE ESCROW PROJECT ============
  console.log("═══ STEP 4: Create Escrow Project ═══");
  try {
    const deadline = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    
    await (await escrowVault.createProject(
      projectId, securityTokenAddress, TEST_CONFIG.fundingGoal, deadline, TEST_CONFIG.tokenSupply
    )).wait();
    
    await (await projectNFT.linkEscrowVault(projectId, CONTRACTS.RWAEscrowVault)).wait();

    const project = await escrowVault.projects(projectId);
    console.log(`✓ Escrow created, state: ${getStateName(Number(project.state))}`);
    results.push({ step: "Create Escrow Project", status: "✓ PASS", details: `State: ${getStateName(Number(project.state))}` });
  } catch (error: any) {
    results.push({ step: "Create Escrow Project", status: "✗ FAIL", details: error.message });
    printResults(results);
    return;
  }

  // ============ STEP 5: ACTIVATE PROJECT ============
  console.log("\n═══ STEP 5: Activate Project ═══");
  try {
    await (await escrowVault.activateProject(projectId)).wait();
    await (await projectNFT.updateProjectStatus(projectId, 1)).wait();
    
    const project = await escrowVault.projects(projectId);
    console.log(`✓ Activated, state: ${getStateName(Number(project.state))}`);
    results.push({ step: "Activate Project", status: "✓ PASS", details: `State: ACTIVE` });
  } catch (error: any) {
    results.push({ step: "Activate Project", status: "✗ FAIL", details: error.message });
  }

  // ============ STEP 6: INVEST WITH KYC ============
  console.log("\n═══ STEP 6: Invest with KYC ═══");
  try {
    const level = 3, countryCode = 840;
    const expiry = Math.floor(Date.now() / 1000) + 86400;

    // EIP-712 signature
    const domain = {
      name: "RWA KYC Verifier",
      version: "1",
      chainId: chainId,
      verifyingContract: CONTRACTS.KYCVerifier
    };
    const types = {
      KYCProof: [
        { name: "wallet", type: "address" },
        { name: "level", type: "uint8" },
        { name: "countryCode", type: "uint16" },
        { name: "expiry", type: "uint256" }
      ]
    };
    const value = { wallet: deployer.address, level, countryCode, expiry };
    const signature = await deployer.signTypedData(domain, types, value);

    // Verify
    const isValid = await kycVerifier.verify(deployer.address, level, countryCode, expiry, signature);
    console.log(`KYC Verification: ${isValid}`);

    // Approve and invest
    await (await usdc.approve(CONTRACTS.RWAEscrowVault, TEST_CONFIG.investmentAmount)).wait();
    console.log("✓ USDC approved");

    const kycProof = { wallet: deployer.address, level, countryCode, expiry, signature };
    
    const investTx = await escrowVault.invest(projectId, TEST_CONFIG.investmentAmount, CONTRACTS.USDC, kycProof);
    const investReceipt = await investTx.wait();
    console.log(`✓ Investment TX: ${investReceipt?.hash}`);

    // Get project state to check investment
    const project = await escrowVault.projects(projectId);
    console.log(`  Total Raised: ${ethers.formatUnits(project.totalRaised, 6)} USDC`);
    console.log(`  Project State: ${getStateName(Number(project.state))}`);

    // Try to get allocation (different possible function names)
    try {
      const allocation = await escrowVault.getAllocation(projectId, deployer.address);
      console.log(`  Token Allocation: ${ethers.formatUnits(allocation, 18)}`);
    } catch {
      try {
        const allocation = await escrowVault.tokenAllocations(projectId, deployer.address);
        console.log(`  Token Allocation: ${ethers.formatUnits(allocation, 18)}`);
      } catch {
        console.log("  (Allocation getter not found)");
      }
    }

    results.push({ step: "Invest", status: "✓ PASS", details: `${ethers.formatUnits(project.totalRaised, 6)} USDC raised` });
  } catch (error: any) {
    results.push({ step: "Invest", status: "✗ FAIL", details: error.message });
    console.log(`✗ Failed: ${error.message}\n`);
    printResults(results);
    return;
  }

  // ============ STEP 7: COMPLETE PROJECT ============
  console.log("\n═══ STEP 7: Complete Project ═══");
  try {
    let project = await escrowVault.projects(projectId);
    
    // Force mark funded if still ACTIVE
    if (Number(project.state) === 1) {
      console.log("Force marking as funded...");
      await (await escrowVault.forceMarkFunded(projectId, "Test complete")).wait();
      project = await escrowVault.projects(projectId);
      console.log(`  State after force fund: ${getStateName(Number(project.state))}`);
    }

    // Get balances before
    const feeReceiverBefore = await usdc.balanceOf(PLATFORM_WALLETS.feeReceiver);
    const liquidityBefore = await usdc.balanceOf(PLATFORM_WALLETS.liquidityWallet);
    const treasuryBefore = await usdc.balanceOf(PLATFORM_WALLETS.treasuryWallet);

    // Complete
    console.log("Completing project...");
    await (await escrowVault.completeProject(projectId)).wait();
    await (await projectNFT.updateProjectStatus(projectId, 3)).wait();

    // Get balances after
    const feeReceiverAfter = await usdc.balanceOf(PLATFORM_WALLETS.feeReceiver);
    const liquidityAfter = await usdc.balanceOf(PLATFORM_WALLETS.liquidityWallet);
    const treasuryAfter = await usdc.balanceOf(PLATFORM_WALLETS.treasuryWallet);

    console.log("\nFee Distribution:");
    console.log(`  Fee Receiver: +${ethers.formatUnits(feeReceiverAfter - feeReceiverBefore, 6)} USDC`);
    console.log(`  Liquidity:    +${ethers.formatUnits(liquidityAfter - liquidityBefore, 6)} USDC`);
    console.log(`  Treasury:     +${ethers.formatUnits(treasuryAfter - treasuryBefore, 6)} USDC`);

    project = await escrowVault.projects(projectId);
    console.log(`\n✓ Completed, fees transferred: ${project.platformFeesTransferred}`);
    
    results.push({ step: "Complete Project", status: "✓ PASS", details: `Fees transferred: ${project.platformFeesTransferred}` });
  } catch (error: any) {
    results.push({ step: "Complete Project", status: "✗ FAIL", details: error.message });
    console.log(`✗ Failed: ${error.message}\n`);
  }

  // ============ STEP 8: CLAIM TOKENS ============
  console.log("\n═══ STEP 8: Claim Tokens ═══");
  try {
    const project = await escrowVault.projects(projectId);
    
    if (Number(project.state) !== 3 || !project.platformFeesTransferred) {
      results.push({ step: "Claim Tokens", status: "⊘ SKIPPED", details: "Not ready" });
      console.log("⊘ Skipped\n");
    } else {
      const securityToken = await ethers.getContractAt("RWASecurityToken", securityTokenAddress);
      const balanceBefore = await securityToken.balanceOf(deployer.address);
      
      await (await escrowVault.claimTokens(projectId)).wait();
      
      const balanceAfter = await securityToken.balanceOf(deployer.address);
      const claimed = balanceAfter - balanceBefore;
      console.log(`✓ Claimed: ${ethers.formatUnits(claimed, 18)} tokens`);
      
      results.push({ step: "Claim Tokens", status: "✓ PASS", details: `${ethers.formatUnits(claimed, 18)} tokens` });
    }
  } catch (error: any) {
    results.push({ step: "Claim Tokens", status: "✗ FAIL", details: error.message });
    console.log(`✗ Failed: ${error.message}\n`);
  }

  // ============ STEP 9: RELEASE MILESTONE ============
  console.log("\n═══ STEP 9: Release Milestone ═══");
  try {
    const project = await escrowVault.projects(projectId);
    
    if (Number(project.state) !== 3) {
      results.push({ step: "Release Milestone", status: "⊘ SKIPPED", details: "Not completed" });
      console.log("⊘ Skipped\n");
    } else {
      const availableFunds = await escrowVault.getAvailableFunds(projectId);
      console.log(`Available funds: ${ethers.formatUnits(availableFunds, 6)} USDC`);
      
      const ownerBefore = await usdc.balanceOf(deployer.address);
      
      await (await escrowVault.releaseMilestoneFunds(
        projectId, TEST_CONFIG.milestone1Amount, `MS-${TIMESTAMP}`
      )).wait();
      
      const ownerAfter = await usdc.balanceOf(deployer.address);
      console.log(`✓ Released: ${ethers.formatUnits(ownerAfter - ownerBefore, 6)} USDC`);
      
      const remainingFunds = await escrowVault.getAvailableFunds(projectId);
      console.log(`Remaining: ${ethers.formatUnits(remainingFunds, 6)} USDC`);
      
      results.push({ step: "Release Milestone", status: "✓ PASS", details: `${ethers.formatUnits(TEST_CONFIG.milestone1Amount, 6)} USDC` });
    }
  } catch (error: any) {
    results.push({ step: "Release Milestone", status: "✗ FAIL", details: error.message });
    console.log(`✗ Failed: ${error.message}\n`);
  }

  // ============ STEP 10: DISPUTE FLOW ============
  console.log("\n═══ STEP 10: Dispute Flow ═══");
  try {
    const project = await escrowVault.projects(projectId);
    
    if (!project.platformFeesTransferred) {
      results.push({ step: "Dispute Flow", status: "⊘ SKIPPED", details: "No fees" });
      console.log("⊘ Skipped\n");
    } else {
      console.log("Opening dispute...");
      const openTx = await disputeManager.openDispute(
        projectId, "E2E Test Dispute", ["https://evidence.test/1"]
      );
      const receipt = await openTx.wait();
      
      const event = receipt?.logs.find((log: any) => {
        try { return disputeManager.interface.parseLog(log)?.name === "DisputeOpened"; }
        catch { return false; }
      });
      
      let disputeId = 1n;
      if (event) {
        const parsed = disputeManager.interface.parseLog(event);
        disputeId = parsed?.args[0] || 1n;
      }
      console.log(`✓ Dispute opened: ID ${disputeId}`);
      
      console.log("Dismissing dispute...");
      await (await disputeManager.dismissDispute(disputeId, "Test dismissal")).wait();
      console.log("✓ Dispute dismissed");
      
      results.push({ step: "Dispute Flow", status: "✓ PASS", details: `ID: ${disputeId}` });
    }
  } catch (error: any) {
    results.push({ step: "Dispute Flow", status: "✗ FAIL", details: error.message });
    console.log(`✗ Failed: ${error.message}\n`);
  }

  // ============ FINAL SUMMARY ============
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                      TEST SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════\n");

  printResults(results);

  try {
    const project = await escrowVault.projects(projectId);
    const availableFunds = await escrowVault.getAvailableFunds(projectId);
    
    console.log("\n═══ Final State ═══");
    console.log(`Project ID: ${projectId}`);
    console.log(`Token: ${securityTokenAddress}`);
    console.log(`State: ${getStateName(Number(project.state))}`);
    console.log(`Total Raised: ${ethers.formatUnits(project.totalRaised, 6)} USDC`);
    console.log(`Available Funds: ${ethers.formatUnits(availableFunds, 6)} USDC`);
    console.log(`Fees Transferred: ${project.platformFeesTransferred}`);
  } catch {}

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                    TEST COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

function getStateName(state: number): string {
  const states = ["INACTIVE", "ACTIVE", "FUNDED", "COMPLETED", "FAILED", "CANCELLED"];
  return states[state] || `UNKNOWN(${state})`;
}

function printResults(results: TestResult[]) {
  console.log("┌────────────────────────────┬──────────┬────────────────────────────────┐");
  console.log("│ Step                       │ Status   │ Details                        │");
  console.log("├────────────────────────────┼──────────┼────────────────────────────────┤");
  
  for (const r of results) {
    const step = r.step.padEnd(26);
    const status = r.status.padEnd(8);
    const details = r.details.substring(0, 30).padEnd(30);
    console.log(`│ ${step} │ ${status} │ ${details} │`);
  }
  
  console.log("└────────────────────────────┴──────────┴────────────────────────────────┘");
  
  const passed = results.filter(r => r.status.includes("PASS")).length;
  const failed = results.filter(r => r.status.includes("FAIL")).length;
  const skipped = results.filter(r => r.status.includes("SKIP")).length;
  
  console.log(`\nResults: ${passed} passed, ${failed} failed, ${skipped} skipped`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
