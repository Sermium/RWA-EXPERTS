import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("RWASecurityToken", function () {
    async function deployFixture() {
        const [deployer, admin, investor1, investor2, feeRecipient, claimIssuer] = await ethers.getSigners();

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

        // Deploy Mock Claim Issuer
        const MockClaimIssuer = await ethers.getContractFactory("MockClaimIssuer");
        const mockClaimIssuer = await MockClaimIssuer.deploy(claimIssuer.address);

        // Setup claim topics
        await claimTopicsRegistry.connect(admin).addClaimTopic(1); // KYC
        await claimTopicsRegistry.connect(admin).addClaimTopic(2); // AML

        // Add trusted issuer
        await trustedIssuersRegistry.connect(admin).addTrustedIssuer(await mockClaimIssuer.getAddress(), [1, 2]);

        // Create investor identity
        const MockIdentity = await ethers.getContractFactory("MockIdentity");
        const investorIdentity = await MockIdentity.deploy(investor1.address);

        // Add claims
        await investorIdentity.connect(investor1).addClaim(1, 1, await mockClaimIssuer.getAddress(), "0x", "0x", "");
        await investorIdentity.connect(investor1).addClaim(2, 1, await mockClaimIssuer.getAddress(), "0x", "0x", "");

        // Register investor
        await identityRegistry.connect(admin).registerIdentity(investor1.address, await investorIdentity.getAddress(), 840);

        return {
            securityToken,
            identityRegistry,
            modularCompliance,
            claimTopicsRegistry,
            trustedIssuersRegistry,
            projectNFT,
            mockClaimIssuer,
            investorIdentity,
            deployer,
            admin,
            investor1,
            investor2,
            feeRecipient,
            claimIssuer
        };
    }

    describe("Initialization", function () {
        it("should initialize with correct parameters", async function () {
            const { securityToken, admin } = await loadFixture(deployFixture);
            expect(await securityToken.name()).to.equal("Test Security Token");
            expect(await securityToken.symbol()).to.equal("TST");
            expect(await securityToken.decimals()).to.equal(18);
        });
    });

    describe("Minting", function () {
        it("should mint tokens to verified investor", async function () {
            const { securityToken, admin, investor1 } = await loadFixture(deployFixture);
            await securityToken.connect(admin).mint(investor1.address, ethers.parseEther("1000"));
            expect(await securityToken.balanceOf(investor1.address)).to.equal(ethers.parseEther("1000"));
        });

        it("should not mint to unverified investor", async function () {
            const { securityToken, admin, investor2 } = await loadFixture(deployFixture);
            await expect(
                securityToken.connect(admin).mint(investor2.address, ethers.parseEther("1000"))
            ).to.be.reverted;
        });
    });

    describe("Freezing", function () {
        it("should freeze investor address", async function () {
            const { securityToken, admin, investor1 } = await loadFixture(deployFixture);
            await securityToken.connect(admin).mint(investor1.address, ethers.parseEther("1000"));
            await securityToken.connect(admin).setAddressFrozen(investor1.address, true);
            expect(await securityToken.isFrozen(investor1.address)).to.be.true;
        });

        it("should unfreeze investor address", async function () {
            const { securityToken, admin, investor1 } = await loadFixture(deployFixture);
            await securityToken.connect(admin).setAddressFrozen(investor1.address, true);
            await securityToken.connect(admin).setAddressFrozen(investor1.address, false);
            expect(await securityToken.isFrozen(investor1.address)).to.be.false;
        });
    });

    describe("Snapshots", function () {
        it("should create snapshot", async function () {
            const { securityToken, admin, investor1 } = await loadFixture(deployFixture);
            await securityToken.connect(admin).mint(investor1.address, ethers.parseEther("1000"));
            await securityToken.connect(admin).snapshot();
            const balance = await securityToken.balanceOfAt(investor1.address, 1);
            expect(balance).to.equal(ethers.parseEther("1000"));
        });
    });

    describe("Pausing", function () {
        it("should pause and unpause", async function () {
            const { securityToken, admin } = await loadFixture(deployFixture);
            await securityToken.connect(admin).pause();
            expect(await securityToken.paused()).to.be.true;
            await securityToken.connect(admin).unpause();
            expect(await securityToken.paused()).to.be.false;
        });
    });
});
