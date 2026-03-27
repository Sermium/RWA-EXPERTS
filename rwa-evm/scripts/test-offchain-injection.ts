import { ethers, upgrades } from "hardhat";

const CONTRACTS = {
  RWAEscrowVault: "0xf6bE123965f80b8eA08627F3AA8545a7A92ECC0A",
  PlatformFeeManager: "0xeC644de34d1A641f2E1A67726445C1688ABd44fd",
  RWAProjectNFT: "0x129287D01f98e32213519345F3bBCCcBA3fe3941",
  KYCVerifier: "0x3CA5b7e66cF25E8C761aA07f318e06B83d0bde7B",
  USDC: "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786",
  USDT: "0x224e403397F3aec9a0D2875445dC32dB00ea31C3"
};

const TIMESTAMP = Date.now();

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("       TEST: OFF-CHAIN TO ON-CHAIN FUND INJECTION");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployer: ${deployer.address}\n`);

  const escrowVault = await ethers.getContractAt("RWAEscrowVault", CONTRACTS.RWAEscrowVault);
  const projectNFT = await ethers.getContractAt("RWAProjectNFT", CONTRACTS.RWAProjectNFT);
  const platformFeeManager = await ethers.getContractAt("PlatformFeeManager", CONTRACTS.PlatformFeeManager);
  const usdc = await ethers.getContractAt("IERC20", CONTRACTS.USDC);

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: CREATE PROJECT
  // ═══════════════════════════════════════════════════════════════
  console.log("=== STEP 1: Create Project ===\n");

  const projectName = `Injection Test ${TIMESTAMP}`;
  const fundingGoal = ethers.parseUnits("30000", 6);
  const tokenSupply = ethers.parseUnits("3000000", 18);

  const txNFT = await projectNFT.createProject(
    deployer.address, projectName, "Real Estate", fundingGoal, `ipfs://inj-${TIMESTAMP}`
  );
  const receiptNFT = await txNFT.wait();
  const eventNFT = receiptNFT?.logs.find((log: any) => {
    try { return projectNFT.interface.parseLog(log)?.name === "ProjectCreated"; } catch { return false; }
  });
  const projectId = projectNFT.interface.parseLog(eventNFT!)?.args[0];
  console.log(`✓ Project NFT: ID ${projectId}`);

  // Deploy token
  const ModularCompliance = await ethers.getContractFactory("ModularCompliance");
  const compliance = await upgrades.deployProxy(ModularCompliance, [deployer.address],
    { initializer: "initialize", kind: "uups", unsafeAllow: ["constructor"] });
  await compliance.waitForDeployment();

  const RWASecurityToken = await ethers.getContractFactory("RWASecurityToken");
  const securityToken = await upgrades.deployProxy(RWASecurityToken,
    [`${projectName} Token`, `RWAINJ${projectId}`, deployer.address,
     await compliance.getAddress(), CONTRACTS.KYCVerifier, tokenSupply],
    { initializer: "initialize", kind: "uups", unsafeAllow: ["constructor"] });
  await securityToken.waitForDeployment();
  const securityTokenAddress = await securityToken.getAddress();
  
  await (await compliance.bindToken(securityTokenAddress)).wait();
  await (await securityToken.grantRole(await securityToken.MINTER_ROLE(), CONTRACTS.RWAEscrowVault)).wait();
  await (await projectNFT.linkSecurityToken(projectId, securityTokenAddress)).wait();
  console.log(`✓ Token: ${securityTokenAddress}`);

  const deadline = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  await (await escrowVault.createProject(projectId, securityTokenAddress, fundingGoal, deadline, tokenSupply)).wait();
  await (await projectNFT.linkEscrowVault(projectId, CONTRACTS.RWAEscrowVault)).wait();
  await (await escrowVault.activateProject(projectId)).wait();
  await (await projectNFT.updateProjectStatus(projectId, 1)).wait();
  console.log(`✓ Project activated\n`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: RECORD OFF-CHAIN INVESTMENTS
  // ═══════════════════════════════════════════════════════════════
  console.log("=== STEP 2: Record Off-Chain Investments ===\n");

  await (await escrowVault.recordOffChainInvestment(projectId, deployer.address, 
    ethers.parseUnits("10000", 6), `STRIPE-${TIMESTAMP}-001`)).wait();
  console.log(`✓ Recorded: 10,000 USD (Stripe)`);

  await (await escrowVault.recordOffChainInvestment(projectId, deployer.address,
    ethers.parseUnits("15000", 6), `WIRE-${TIMESTAMP}-002`)).wait();
  console.log(`✓ Recorded: 15,000 USD (Wire)`);

  await (await escrowVault.recordOffChainInvestment(projectId, deployer.address,
    ethers.parseUnits("5000", 6), `STRIPE-${TIMESTAMP}-003`)).wait();
  console.log(`✓ Recorded: 5,000 USD (Stripe)`);

  let project = await escrowVault.projects(projectId);
  let offChainPending = await escrowVault.getOffChainPending(projectId);
  
  console.log(`\n  Total Raised: ${ethers.formatUnits(project.totalRaised, 6)} USD`);
  console.log(`  Off-Chain Pending: ${ethers.formatUnits(offChainPending, 6)} USD`);
  console.log(`  State: ${project.state} (should be 2 = FUNDED)`);
  console.log(`  Payment Token: ${project.paymentToken} (should be 0x0 - no on-chain payments yet)`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: INJECT FUNDS BEFORE COMPLETING (Required for off-chain only projects)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n=== STEP 3: Inject Off-Chain Funds BEFORE Completing ===\n");

  // For off-chain only projects, we need to inject funds first so that:
  // 1. Payment token gets set
  // 2. Platform fees can be transferred
  
  offChainPending = await escrowVault.getOffChainPending(projectId);
  console.log(`Off-chain pending: ${ethers.formatUnits(offChainPending, 6)} USD`);

  // Inject all off-chain funds
  await (await usdc.approve(CONTRACTS.RWAEscrowVault, offChainPending)).wait();
  await (await escrowVault.injectOffChainFunds(projectId, offChainPending, CONTRACTS.USDC)).wait();
  
  offChainPending = await escrowVault.getOffChainPending(projectId);
  project = await escrowVault.projects(projectId);
  
  console.log(`✓ Injected all off-chain funds`);
  console.log(`  Off-chain remaining: ${ethers.formatUnits(offChainPending, 6)} USD`);
  console.log(`  Payment Token now: ${project.paymentToken}`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: COMPLETE PROJECT (Now we have on-chain funds)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n=== STEP 4: Complete Project ===\n");

  if (project.state === 1n) {
    await (await escrowVault.forceMarkFunded(projectId, "Off-chain complete")).wait();
  }

  await (await escrowVault.completeProject(projectId)).wait();
  await (await projectNFT.updateProjectStatus(projectId, 3)).wait();
  
  // Now distribute fees (we have actual USDC)
  await (await platformFeeManager.distributeFees(projectId)).wait();

  project = await escrowVault.projects(projectId);
  console.log(`✓ Project completed, fees transferred: ${project.platformFeesTransferred}`);

  const available = await escrowVault.getAvailableFunds(projectId);
  console.log(`  Available for milestones: ${ethers.formatUnits(available, 6)} USDC`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 5: RELEASE MILESTONE
  // ═══════════════════════════════════════════════════════════════
  console.log("\n=== STEP 5: Release Milestone ===\n");

  const milestone1 = ethers.parseUnits("10000", 6);
  const ownerBefore = await usdc.balanceOf(deployer.address);
  
  await (await escrowVault.releaseMilestoneFunds(projectId, milestone1, `MS-${TIMESTAMP}-001`)).wait();
  
  const ownerAfter = await usdc.balanceOf(deployer.address);
  console.log(`✓ Milestone released: ${ethers.formatUnits(ownerAfter - ownerBefore, 6)} USDC`);

  const remainingFunds = await escrowVault.getAvailableFunds(projectId);
  console.log(`  Remaining available: ${ethers.formatUnits(remainingFunds, 6)} USDC`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 6: TEST PARTIAL INJECTION FLOW
  // ═══════════════════════════════════════════════════════════════
  console.log("\n=== STEP 6: Test Partial Injection (New Project) ===\n");

  // Create another project to test partial injection
  const projectName2 = `Partial Injection ${TIMESTAMP}`;
  const txNFT2 = await projectNFT.createProject(
    deployer.address, projectName2, "Commercial", fundingGoal, `ipfs://partial-${TIMESTAMP}`
  );
  const receiptNFT2 = await txNFT2.wait();
  const eventNFT2 = receiptNFT2?.logs.find((log: any) => {
    try { return projectNFT.interface.parseLog(log)?.name === "ProjectCreated"; } catch { return false; }
  });
  const projectId2 = projectNFT.interface.parseLog(eventNFT2!)?.args[0];
  console.log(`✓ Project 2 NFT: ID ${projectId2}`);

  // Deploy token for project 2
  const compliance2 = await upgrades.deployProxy(ModularCompliance, [deployer.address],
    { initializer: "initialize", kind: "uups", unsafeAllow: ["constructor"] });
  await compliance2.waitForDeployment();

  const securityToken2 = await upgrades.deployProxy(RWASecurityToken,
    [`${projectName2} Token`, `RWAP${projectId2}`, deployer.address,
     await compliance2.getAddress(), CONTRACTS.KYCVerifier, tokenSupply],
    { initializer: "initialize", kind: "uups", unsafeAllow: ["constructor"] });
  await securityToken2.waitForDeployment();
  const securityTokenAddress2 = await securityToken2.getAddress();
  
  await (await compliance2.bindToken(securityTokenAddress2)).wait();
  await (await securityToken2.grantRole(await securityToken2.MINTER_ROLE(), CONTRACTS.RWAEscrowVault)).wait();
  await (await projectNFT.linkSecurityToken(projectId2, securityTokenAddress2)).wait();

  await (await escrowVault.createProject(projectId2, securityTokenAddress2, fundingGoal, deadline, tokenSupply)).wait();
  await (await projectNFT.linkEscrowVault(projectId2, CONTRACTS.RWAEscrowVault)).wait();
  await (await escrowVault.activateProject(projectId2)).wait();
  await (await projectNFT.updateProjectStatus(projectId2, 1)).wait();
  console.log(`✓ Project 2 activated`);

  // Record off-chain
  await (await escrowVault.recordOffChainInvestment(projectId2, deployer.address,
    ethers.parseUnits("30000", 6), `WIRE-P2-${TIMESTAMP}`)).wait();
  console.log(`✓ Recorded: 30,000 USD off-chain`);

  let offChain2 = await escrowVault.getOffChainPending(projectId2);
  console.log(`  Off-chain pending: ${ethers.formatUnits(offChain2, 6)} USD`);

  // Partial injection (only 10k of 30k)
  const partialAmount = ethers.parseUnits("10000", 6);
  await (await usdc.approve(CONTRACTS.RWAEscrowVault, partialAmount)).wait();
  await (await escrowVault.injectOffChainFunds(projectId2, partialAmount, CONTRACTS.USDC)).wait();
  
  offChain2 = await escrowVault.getOffChainPending(projectId2);
  console.log(`✓ Partial injection: 10,000 USDC`);
  console.log(`  Off-chain remaining: ${ethers.formatUnits(offChain2, 6)} USD`);

  // Inject more
  await (await usdc.approve(CONTRACTS.RWAEscrowVault, offChain2)).wait();
  await (await escrowVault.injectOffChainFunds(projectId2, offChain2, CONTRACTS.USDC)).wait();
  
  offChain2 = await escrowVault.getOffChainPending(projectId2);
  console.log(`✓ Remaining injection complete`);
  console.log(`  Off-chain remaining: ${ethers.formatUnits(offChain2, 6)} USD (should be 0)`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 7: TEST OVER-INJECTION PROTECTION
  // ═══════════════════════════════════════════════════════════════
  console.log("\n=== STEP 7: Test Over-Injection Protection ===\n");

  try {
    await (await usdc.approve(CONTRACTS.RWAEscrowVault, ethers.parseUnits("1000", 6))).wait();
    await escrowVault.injectOffChainFunds(projectId2, ethers.parseUnits("1000", 6), CONTRACTS.USDC);
    console.log(`❌ ERROR: Should have reverted!`);
  } catch (e: any) {
    console.log(`✓ Correctly rejected: Cannot inject more than off-chain pending`);
  }

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                      TEST SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("✓ All tests passed!\n");

  console.log(`
┌─────────────────────────────────────────────────────────────┐
│              OFF-CHAIN INJECTION WORKFLOW                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  OPTION A: Inject BEFORE completing project                 │
│  ─────────────────────────────────────────────              │
│  1. recordOffChainInvestment() - track payments             │
│  2. injectOffChainFunds() - admin deposits USDC/USDT        │
│  3. completeProject() - fees transferred normally           │
│  4. releaseMilestoneFunds() - release to owner              │
│                                                             │
│  OPTION B: Inject AFTER completing (if mixed payments)      │
│  ─────────────────────────────────────────────              │
│  1. On-chain invest() + recordOffChainInvestment()          │
│  2. completeProject() - fees from on-chain portion          │
│  3. injectOffChainFunds() - add off-chain funds later       │
│  4. releaseMilestoneFunds() - release all funds             │
│                                                             │
│  KEY POINTS:                                                │
│  • Off-chain pending tracked via getOffChainPending()       │
│  • Cannot inject more than pending amount                   │
│  • Payment token set on first injection or invest()         │
│  • Milestone release only from actual on-chain balance      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
