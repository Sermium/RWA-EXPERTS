import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("Full Workflow Integration", function () {
    async function deployFullFixture() {
        const [deployer, admin, projectOwner, investor1, investor2, feeRecipient, claimIssuer] = await ethers.getSigners();

        // Deploy all infrastructure
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

        const ModularCompliance = await ethers.getContractFactory("ModularCompliance");
        const modularCompliance = await upgrades.deployProxy(ModularCompliance, [admin.address], { initializer: "initialize", kind: "uups" });

        const RWAProjectNFT = await ethers.getContractFactory("RWAProjectNFT");
        const projectNFT = await upgrades.deployProxy(RWAProjectNFT, [admin.address, "RWA Project NFT", "RWANFT"], { initializer: "initialize", kind: "uups" });

        const MockClaimIssuer = await ethers.getContractFactory("MockClaimIssuer");
        const mockClaimIssuer = await MockClaimIssuer.deploy(claimIssuer.address);

        await claimTopicsRegistry.connect(admin).addClaimTopic(1);
        await claimTopicsRegistry.connect(admin).addClaimTopic(2);
        await trustedIssuersRegistry.connect(admin).addTrustedIssuer(await mockClaimIssuer.getAddress(), [1, 2]);

        return {
            claimTopicsRegistry,
            trustedIssuersRegistry,
            identityRegistryStorage,
            identityRegistry,
            modularCompliance,
            projectNFT,
            mockClaimIssuer,
            deployer,
            admin,
            projectOwner,
            investor1,
            investor2,
            feeRecipient,
            claimIssuer
        };
    }

    describe("Project Creation", function () {
        it("should create a project NFT", async function () {
            const { projectNFT, projectOwner } = await loadFixture(deployFullFixture);
            
            const deadline = (await time.latest()) + 30 * 24 * 60 * 60;
            
            await projectNFT.connect(projectOwner).createProject(
                "ipfs://QmTest",
                ethers.parseEther("100000"),
                ethers.parseEther("100"),
                ethers.parseEther("10000"),
                deadline
            );

            expect(await projectNFT.totalProjects()).to.equal(1);
            const project = await projectNFT.getProject(1);
            expect(project.owner).to.equal(projectOwner.address);
        });
    });

    describe("Investor Registration", function () {
        it("should register and verify an investor", async function () {
            const { identityRegistry, mockClaimIssuer, admin, investor1 } = await loadFixture(deployFullFixture);
            
            const MockIdentity = await ethers.getContractFactory("MockIdentity");
            const investorIdentity = await MockIdentity.deploy(investor1.address);
            await investorIdentity.connect(investor1).addClaim(1, 1, await mockClaimIssuer.getAddress(), "0x", "0x", "");
            await investorIdentity.connect(investor1).addClaim(2, 1, await mockClaimIssuer.getAddress(), "0x", "0x", "");

            await identityRegistry.connect(admin).registerIdentity(investor1.address, await investorIdentity.getAddress(), 840);

            expect(await identityRegistry.isVerified(investor1.address)).to.be.true;
        });
    });

    describe("Project NFT Soulbound", function () {
        it("should not allow transfer before completion", async function () {
            const { projectNFT, projectOwner, investor1 } = await loadFixture(deployFullFixture);
            
            const deadline = (await time.latest()) + 30 * 24 * 60 * 60;
            await projectNFT.connect(projectOwner).createProject(
                "ipfs://QmTest",
                ethers.parseEther("100000"),
                ethers.parseEther("100"),
                ethers.parseEther("10000"),
                deadline
            );

            await expect(
                projectNFT.connect(projectOwner).transferFrom(projectOwner.address, investor1.address, 1)
            ).to.be.revertedWith("RWAProjectNFT: soulbound until completion");
        });
    });
});
