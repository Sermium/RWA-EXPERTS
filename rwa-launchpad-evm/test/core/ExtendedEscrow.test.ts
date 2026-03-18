import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("RWAEscrowVault Extended", function () {
  let admin: SignerWithAddress;
  let projectOwner: SignerWithAddress;
  let investor1: SignerWithAddress;
  let investor2: SignerWithAddress;
  let feeRecipient: SignerWithAddress;

  let escrowVault: any;
  let securityToken: any;
  let paymentToken: any;
  let projectNFT: any;
  let identityRegistry: any;
  let modularCompliance: any;

  let PROJECT_ID: number;
  const FUNDING_GOAL = ethers.parseEther("100000");
  const MIN_INVESTMENT = ethers.parseEther("100");
  const MAX_INVESTMENT = ethers.parseEther("10000");

  beforeEach(async function () {
    [admin, projectOwner, investor1, investor2, feeRecipient] = await ethers.getSigners();

    // Deploy mock payment token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    paymentToken = await MockERC20.deploy("USDC", "USDC", 18);
    await paymentToken.waitForDeployment();

    // Mint tokens to investors
    await paymentToken.mint(investor1.address, ethers.parseEther("50000"));
    await paymentToken.mint(investor2.address, ethers.parseEther("50000"));

    // Deploy registry infrastructure
    const ClaimTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry");
    const claimTopicsRegistry = await upgrades.deployProxy(ClaimTopicsRegistry, [admin.address], { kind: 'uups' });

    const TrustedIssuersRegistry = await ethers.getContractFactory("TrustedIssuersRegistry");
    const trustedIssuersRegistry = await upgrades.deployProxy(TrustedIssuersRegistry, [admin.address], { kind: 'uups' });

    const IdentityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage");
    const identityRegistryStorage = await upgrades.deployProxy(IdentityRegistryStorage, [admin.address], { kind: 'uups' });

    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await upgrades.deployProxy(
      IdentityRegistry,
      [admin.address, await claimTopicsRegistry.getAddress(), await trustedIssuersRegistry.getAddress(), await identityRegistryStorage.getAddress()],
      { kind: 'uups' }
    );

    await identityRegistryStorage.bindIdentityRegistry(await identityRegistry.getAddress());

    // Setup claim topics
    await claimTopicsRegistry.addClaimTopic(1);
    await claimTopicsRegistry.addClaimTopic(2);

    // Setup mock identity and issuer
    const MockClaimIssuer = await ethers.getContractFactory("MockClaimIssuer");
    const mockClaimIssuer = await MockClaimIssuer.deploy(admin.address);

    await trustedIssuersRegistry.addTrustedIssuer(await mockClaimIssuer.getAddress(), [1, 2]);

    // Register investors
    const MockIdentity = await ethers.getContractFactory("MockIdentity");
    for (const investor of [investor1, investor2]) {
      const identity = await MockIdentity.deploy(investor.address);
      const claimData = ethers.toUtf8Bytes("verified");
      const signature = await admin.signMessage(claimData);
      await identity.addClaim(1, 1, await mockClaimIssuer.getAddress(), signature, claimData, "");
      await identity.addClaim(2, 1, await mockClaimIssuer.getAddress(), signature, claimData, "");
      await identityRegistry.registerIdentity(investor.address, await identity.getAddress(), 840);
    }

    // Deploy compliance
    const ModularCompliance = await ethers.getContractFactory("ModularCompliance");
    modularCompliance = await upgrades.deployProxy(ModularCompliance, [admin.address], { kind: 'uups' });

    // Deploy Project NFT
    const RWAProjectNFT = await ethers.getContractFactory("RWAProjectNFT");
    projectNFT = await upgrades.deployProxy(RWAProjectNFT, [admin.address, "RWA Projects", "RWAP"], { kind: 'uups' });

    // Create a project in the NFT contract first
    const deadline = (await time.latest()) + 30 * 24 * 60 * 60;
    const tx = await projectNFT.connect(projectOwner).createProject(
      "ipfs://metadata",
      FUNDING_GOAL,
      MIN_INVESTMENT,
      MAX_INVESTMENT,
      deadline
    );
    const receipt = await tx.wait();
    // Get the project ID from events or assume it's 1
    PROJECT_ID = 1;

    // Deploy Security Token
    const RWASecurityToken = await ethers.getContractFactory("RWASecurityToken");
    securityToken = await upgrades.deployProxy(
      RWASecurityToken,
      [
        "Project Token",
        "PROJ",
        18,
        PROJECT_ID,
        await projectNFT.getAddress(),
        await identityRegistry.getAddress(),
        await modularCompliance.getAddress(),
        FUNDING_GOAL,
        admin.address,
        ethers.ZeroAddress
      ],
      { kind: 'uups' }
    );

    // Deploy Escrow Vault
    const RWAEscrowVault = await ethers.getContractFactory("RWAEscrowVault");
    escrowVault = await upgrades.deployProxy(
      RWAEscrowVault,
      [admin.address, feeRecipient.address, await projectNFT.getAddress()],
      { kind: 'uups' }
    );

    // Grant roles
    const AGENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AGENT_ROLE"));
    await securityToken.grantRole(AGENT_ROLE, await escrowVault.getAddress());

    const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
    await projectNFT.grantRole(OPERATOR_ROLE, await escrowVault.getAddress());

    // Link escrow vault to project
    await projectNFT.connect(admin).linkEscrowVault(PROJECT_ID, await escrowVault.getAddress());

    // Initialize project in escrow
    const escrowDeadline = (await time.latest()) + 30 * 24 * 60 * 60;
    await escrowVault.initializeProject(
      PROJECT_ID,
      FUNDING_GOAL,
      MIN_INVESTMENT,
      MAX_INVESTMENT,
      escrowDeadline,
      await paymentToken.getAddress(),
      projectOwner.address,
      await securityToken.getAddress()
    );
  });

  describe("Investment Flow", function () {
    it("should accept investment", async function () {
      const investAmount = ethers.parseEther("1000");
      await paymentToken.connect(investor1).approve(await escrowVault.getAddress(), investAmount);
      
      await escrowVault.connect(investor1).invest(PROJECT_ID, investAmount);
      
      const investorAmount = await escrowVault.getInvestorAmount(PROJECT_ID, investor1.address);
      expect(investorAmount).to.equal(investAmount);
    });

    it("should reject investment below minimum", async function () {
      const investAmount = ethers.parseEther("50");
      await paymentToken.connect(investor1).approve(await escrowVault.getAddress(), investAmount);
      
      await expect(
        escrowVault.connect(investor1).invest(PROJECT_ID, investAmount)
      ).to.be.reverted;
    });

    it("should reject investment above maximum", async function () {
      const investAmount = ethers.parseEther("15000");
      await paymentToken.connect(investor1).approve(await escrowVault.getAddress(), investAmount);
      
      await expect(
        escrowVault.connect(investor1).invest(PROJECT_ID, investAmount)
      ).to.be.reverted;
    });

    it("should track multiple investments", async function () {
      const investAmount = ethers.parseEther("5000");
      await paymentToken.connect(investor1).approve(await escrowVault.getAddress(), investAmount);
      await escrowVault.connect(investor1).invest(PROJECT_ID, investAmount);

      await paymentToken.connect(investor2).approve(await escrowVault.getAddress(), investAmount);
      await escrowVault.connect(investor2).invest(PROJECT_ID, investAmount);

      const funding = await escrowVault.getProjectFunding(PROJECT_ID);
      expect(funding.totalRaised).to.equal(ethers.parseEther("10000"));
    });
  });

  describe("Milestone Management", function () {
    beforeEach(async function () {
      // Add milestones before funding
      await escrowVault.addMilestone(PROJECT_ID, "Phase 1", 3000);
      await escrowVault.addMilestone(PROJECT_ID, "Phase 2", 4000);
      await escrowVault.addMilestone(PROJECT_ID, "Phase 3", 3000);

      // Fund the project with smaller amounts to stay within max
      const investAmount = ethers.parseEther("10000");
      await paymentToken.connect(investor1).approve(await escrowVault.getAddress(), investAmount);
      await escrowVault.connect(investor1).invest(PROJECT_ID, investAmount);

      await paymentToken.connect(investor2).approve(await escrowVault.getAddress(), investAmount);
      await escrowVault.connect(investor2).invest(PROJECT_ID, investAmount);
    });

    it("should get milestones", async function () {
      const milestones = await escrowVault.getMilestones(PROJECT_ID);
      expect(milestones.length).to.equal(3);
    });
  });

  describe("Admin Functions", function () {
    it("should update fee recipient", async function () {
      await escrowVault.setFeeRecipient(investor1.address);
      // Should not revert
    });

    it("should pause and unpause", async function () {
      await escrowVault.pause();
      expect(await escrowVault.paused()).to.be.true;

      await escrowVault.unpause();
      expect(await escrowVault.paused()).to.be.false;
    });
  });
});