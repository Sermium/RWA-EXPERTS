import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RWALaunchpadFactory", function () {
  let admin: SignerWithAddress;
  let operator: SignerWithAddress;
  let projectOwner: SignerWithAddress;
  let feeRecipient: SignerWithAddress;

  let factory: any;
  let projectNFT: any;
  let identityRegistry: any;
  let claimTopicsRegistry: any;
  let trustedIssuersRegistry: any;
  let identityRegistryStorage: any;
  let securityTokenImpl: any;
  let escrowVaultImpl: any;
  let complianceImpl: any;

  beforeEach(async function () {
    [admin, operator, projectOwner, feeRecipient] = await ethers.getSigners();

    // Deploy registry infrastructure
    const ClaimTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry");
    claimTopicsRegistry = await upgrades.deployProxy(ClaimTopicsRegistry, [admin.address], { kind: 'uups' });

    const TrustedIssuersRegistry = await ethers.getContractFactory("TrustedIssuersRegistry");
    trustedIssuersRegistry = await upgrades.deployProxy(TrustedIssuersRegistry, [admin.address], { kind: 'uups' });

    const IdentityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage");
    identityRegistryStorage = await upgrades.deployProxy(IdentityRegistryStorage, [admin.address], { kind: 'uups' });

    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await upgrades.deployProxy(
      IdentityRegistry,
      [admin.address, await claimTopicsRegistry.getAddress(), await trustedIssuersRegistry.getAddress(), await identityRegistryStorage.getAddress()],
      { kind: 'uups' }
    );

    await identityRegistryStorage.bindIdentityRegistry(await identityRegistry.getAddress());

    // Deploy Project NFT
    const RWAProjectNFT = await ethers.getContractFactory("RWAProjectNFT");
    projectNFT = await upgrades.deployProxy(RWAProjectNFT, [admin.address, "RWA Projects", "RWAP"], { kind: 'uups' });

    // Deploy implementation contracts
    const RWASecurityToken = await ethers.getContractFactory("RWASecurityToken");
    securityTokenImpl = await RWASecurityToken.deploy();

    const RWAEscrowVault = await ethers.getContractFactory("RWAEscrowVault");
    escrowVaultImpl = await RWAEscrowVault.deploy();

    const ModularCompliance = await ethers.getContractFactory("ModularCompliance");
    complianceImpl = await ModularCompliance.deploy();

    // Deploy Factory
    const RWALaunchpadFactory = await ethers.getContractFactory("RWALaunchpadFactory");
    factory = await upgrades.deployProxy(
      RWALaunchpadFactory,
      [
        admin.address,
        feeRecipient.address,
        await projectNFT.getAddress(),
        await identityRegistry.getAddress(),
        250, // 2.5% platform fee
        100  // 1% creation fee
      ],
      { kind: 'uups' }
    );

    // Set implementations
    await factory.setImplementations(
      await securityTokenImpl.getAddress(),
      await escrowVaultImpl.getAddress(),
      await complianceImpl.getAddress()
    );

    // Grant factory role to factory on project NFT
    const FACTORY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FACTORY_ROLE"));
    await projectNFT.grantRole(FACTORY_ROLE, await factory.getAddress());
  });

  describe("Initialization", function () {
    it("should initialize with correct parameters", async function () {
      expect(await factory.feeRecipient()).to.equal(feeRecipient.address);
      expect(await factory.platformFeeBps()).to.equal(250);
      expect(await factory.creationFeeBps()).to.equal(100);
      expect(await factory.projectNFT()).to.equal(await projectNFT.getAddress());
    });
  });

  describe("Fee Management", function () {
    it("should update platform fee", async function () {
      await factory.setPlatformFee(500);
      expect(await factory.platformFeeBps()).to.equal(500);
    });

    it("should not allow fee above maximum", async function () {
      await expect(factory.setPlatformFee(1001)).to.be.reverted;
    });

    it("should update creation fee", async function () {
      await factory.setCreationFee(200);
      expect(await factory.creationFeeBps()).to.equal(200);
    });

    it("should update fee recipient", async function () {
      await factory.setFeeRecipient(operator.address);
      expect(await factory.feeRecipient()).to.equal(operator.address);
    });
  });

  describe("Admin Functions", function () {
    it("should pause and unpause", async function () {
      await factory.pause();
      expect(await factory.paused()).to.be.true;

      await factory.unpause();
      expect(await factory.paused()).to.be.false;
    });

    it("should set identity registry", async function () {
      const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
      const newRegistry = await upgrades.deployProxy(
        IdentityRegistry,
        [admin.address, await claimTopicsRegistry.getAddress(), await trustedIssuersRegistry.getAddress(), await identityRegistryStorage.getAddress()],
        { kind: 'uups' }
      );

      await factory.setIdentityRegistry(await newRegistry.getAddress());
      expect(await factory.identityRegistry()).to.equal(await newRegistry.getAddress());
    });
  });
});
