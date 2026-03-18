import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("IdentityRegistry", function () {
    async function deployFixture() {
        const [deployer, admin, investor1, investor2, claimIssuer] = await ethers.getSigners();

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

        const MockClaimIssuer = await ethers.getContractFactory("MockClaimIssuer");
        const mockClaimIssuer = await MockClaimIssuer.deploy(claimIssuer.address);

        await claimTopicsRegistry.connect(admin).addClaimTopic(1);
        await claimTopicsRegistry.connect(admin).addClaimTopic(2);
        await trustedIssuersRegistry.connect(admin).addTrustedIssuer(await mockClaimIssuer.getAddress(), [1, 2]);

        const MockIdentity = await ethers.getContractFactory("MockIdentity");

        return {
            identityRegistry,
            identityRegistryStorage,
            claimTopicsRegistry,
            trustedIssuersRegistry,
            mockClaimIssuer,
            MockIdentity,
            deployer,
            admin,
            investor1,
            investor2,
            claimIssuer
        };
    }

    describe("Initialization", function () {
        it("should be initialized with correct registries", async function () {
            const { identityRegistry, claimTopicsRegistry, trustedIssuersRegistry, identityRegistryStorage } = await loadFixture(deployFixture);
            expect(await identityRegistry.topicsRegistry()).to.equal(await claimTopicsRegistry.getAddress());
            expect(await identityRegistry.issuersRegistry()).to.equal(await trustedIssuersRegistry.getAddress());
            expect(await identityRegistry.identityStorage()).to.equal(await identityRegistryStorage.getAddress());
        });
    });

    describe("Identity Registration", function () {
        it("should register an identity", async function () {
            const { identityRegistry, MockIdentity, mockClaimIssuer, admin, investor1 } = await loadFixture(deployFixture);
            
            const investorIdentity = await MockIdentity.deploy(investor1.address);
            await investorIdentity.connect(investor1).addClaim(1, 1, await mockClaimIssuer.getAddress(), "0x", "0x", "");
            await investorIdentity.connect(investor1).addClaim(2, 1, await mockClaimIssuer.getAddress(), "0x", "0x", "");

            await identityRegistry.connect(admin).registerIdentity(investor1.address, await investorIdentity.getAddress(), 840);

            expect(await identityRegistry.contains(investor1.address)).to.be.true;
            expect(await identityRegistry.investorCountry(investor1.address)).to.equal(840);
        });

        it("should verify investor with valid claims", async function () {
            const { identityRegistry, MockIdentity, mockClaimIssuer, admin, investor1 } = await loadFixture(deployFixture);
            
            const investorIdentity = await MockIdentity.deploy(investor1.address);
            await investorIdentity.connect(investor1).addClaim(1, 1, await mockClaimIssuer.getAddress(), "0x", "0x", "");
            await investorIdentity.connect(investor1).addClaim(2, 1, await mockClaimIssuer.getAddress(), "0x", "0x", "");

            await identityRegistry.connect(admin).registerIdentity(investor1.address, await investorIdentity.getAddress(), 840);

            expect(await identityRegistry.isVerified(investor1.address)).to.be.true;
        });

        it("should delete an identity", async function () {
            const { identityRegistry, MockIdentity, mockClaimIssuer, admin, investor1 } = await loadFixture(deployFixture);
            
            const investorIdentity = await MockIdentity.deploy(investor1.address);
            await investorIdentity.connect(investor1).addClaim(1, 1, await mockClaimIssuer.getAddress(), "0x", "0x", "");
            await identityRegistry.connect(admin).registerIdentity(investor1.address, await investorIdentity.getAddress(), 840);
            
            await identityRegistry.connect(admin).deleteIdentity(investor1.address);
            expect(await identityRegistry.contains(investor1.address)).to.be.false;
        });
    });
});
