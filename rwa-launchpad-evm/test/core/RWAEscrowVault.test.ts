import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("RWAEscrowVault", function () {
    async function deployFixture() {
        const [deployer, admin, projectOwner, investor1, investor2, feeRecipient, claimIssuer] = await ethers.getSigners();

        // Deploy Registry Infrastructure
        const ClaimTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry");
        const claimTopicsRegistry = await upgrades.deployProxy(ClaimTopicsRegistry, [admin.address], { initializer: "initialize", kind: "uups" });

        const TrustedIssuersRegistry = await ethers.getContractFactory("TrustedIssuersRegistry");
        const trustedIssuersRegistry = await upgrades.deployProxy(TrustedIssuersRegistry, [admin.address], { initializer: "initialize", kind: "uups" });

        const IdentityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage");
        const identityRegistryStorage = await upgrades.deployProxy(IdentityRegistryStorage, [admin.address], { initializer: "initialize", kind: "uups" });

        const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
        const identityRegistry = await upgrades.deployProxy(
            IdentityRegistry,
            [admin.address, await claimTopicsRegistry.getAddress(), await trustedIssuersRegistry.getAddress(), await identityRegistryStorage.getAddress()],
            { initializer: "initialize", kind: "uups" }
        );

        await identityRegistryStorage.connect(admin).bindIdentityRegistry(await identityRegistry.getAddress());

        // Deploy Compliance
        const ModularCompliance = await ethers.getContractFactory("ModularCompliance");
        const modularCompliance = await upgrades.deployProxy(ModularCompliance, [admin.address], { initializer: "initialize", kind: "uups" });

        // Deploy Project NFT
        const RWAProjectNFT = await ethers.getContractFactory("RWAProjectNFT");
        const projectNFT = await upgrades.deployProxy(RWAProjectNFT, [admin.address, "RWA Project NFT", "RWANFT"], { initializer: "initialize", kind: "uups" });

        // Deploy Security Token
        const RWASecurityToken = await ethers.getContractFactory("RWASecurityToken");
        const securityToken = await upgrades.deployProxy(
            RWASecurityToken,
            ["Test Security Token", "TST", 18, 1, await projectNFT.getAddress(), await identityRegistry.getAddress(), await modularCompliance.getAddress(), 0, admin.address, ethers.ZeroAddress],
            { initializer: "initialize", kind: "uups" }
        );

        // Deploy Escrow Vault
        const RWAEscrowVault = await ethers.getContractFactory("RWAEscrowVault");
        const escrowVault = await upgrades.deployProxy(
            RWAEscrowVault,
            [admin.address, feeRecipient.address, await projectNFT.getAddress()],
            { initializer: "initialize", kind: "uups" }
        );

        // Deploy Mock Claim Issuer
        const MockClaimIssuer = await ethers.getContractFactory("MockClaimIssuer");
        const mockClaimIssuer = await MockClaimIssuer.deploy(claimIssuer.address);

        // Setup claim topics
        await claimTopicsRegistry.connect(admin).addClaimTopic(1);
        await claimTopicsRegistry.connect(admin).addClaimTopic(2);
        await trustedIssuersRegistry.connect(admin).addTrustedIssuer(await mockClaimIssuer.getAddress(), [1, 2]);

        // Create and register investor identity
        const MockIdentity = await ethers.getContractFactory("MockIdentity");
        const investorIdentity = await MockIdentity.deploy(investor1.address);
        await investorIdentity.connect(investor1).addClaim(1, 1, await mockClaimIssuer.getAddress(), "0x", "0x", "");
        await investorIdentity.connect(investor1).addClaim(2, 1, await mockClaimIssuer.getAddress(), "0x", "0x", "");
        await identityRegistry.connect(admin).registerIdentity(investor1.address, await investorIdentity.getAddress(), 840);

        // Grant roles
        const AGENT_ROLE = ethers.id("AGENT_ROLE");
        const OPERATOR_ROLE = ethers.id("OPERATOR_ROLE");
        await securityToken.connect(admin).grantRole(AGENT_ROLE, await escrowVault.getAddress());
        await escrowVault.connect(admin).grantRole(OPERATOR_ROLE, admin.address);

        return {
            escrowVault,
            securityToken,
            identityRegistry,
            modularCompliance,
            projectNFT,
            deployer,
            admin,
            projectOwner,
            investor1,
            investor2,
            feeRecipient
        };
    }

    describe("Initialization", function () {
        it("should initialize with correct parameters", async function () {
            const { escrowVault, feeRecipient } = await loadFixture(deployFixture);
            expect(await escrowVault.feeRecipient()).to.equal(feeRecipient.address);
        });
    });

    describe("Project Initialization", function () {
        it("should initialize a project", async function () {
            const { escrowVault, securityToken, admin, projectOwner } = await loadFixture(deployFixture);
            
            const deadline = (await time.latest()) + 30 * 24 * 60 * 60; // 30 days
            
            await escrowVault.connect(admin).initializeProject(
                1, // projectId
                ethers.parseEther("10000"), // fundingGoal
                ethers.parseEther("100"), // minInvestment
                ethers.parseEther("5000"), // maxInvestment
                deadline,
                ethers.ZeroAddress, // ETH
                projectOwner.address,
                await securityToken.getAddress()
            );

            const funding = await escrowVault.getProjectFunding(1);
            expect(funding.fundingGoal).to.equal(ethers.parseEther("10000"));
        });
    });

    describe("Milestones", function () {
        it("should add a milestone", async function () {
            const { escrowVault, securityToken, admin, projectOwner } = await loadFixture(deployFixture);
            
            const deadline = (await time.latest()) + 30 * 24 * 60 * 60;
            await escrowVault.connect(admin).initializeProject(
                1, ethers.parseEther("10000"), ethers.parseEther("100"), ethers.parseEther("5000"),
                deadline, ethers.ZeroAddress, projectOwner.address, await securityToken.getAddress()
            );

            await escrowVault.connect(projectOwner).addMilestone(1, "Development Phase 1", 5000);
            
            const milestones = await escrowVault.getMilestones(1);
            expect(milestones.length).to.equal(1);
            expect(milestones[0].percentage).to.equal(5000);
        });
    });
});
