import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { cacheKYC, deployKYCVerifier, kycProof } from "../helpers/kyc";

const ROLES = ["MINTER_ROLE", "BURNER_ROLE", "COMPLIANCE_ROLE", "SNAPSHOT_ROLE", "AGENT_ROLE", "RECOVERY_ROLE"].map((r) => ({
  name: r,
  hash: ethers.id(r),
}));
const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
const SUPPLY = ethers.parseEther("1000");

describe("RWATokenizationFactory", function () {
  async function fixture() {
    const [owner, signer, issuer, bob, stranger, feeRecipient] = await ethers.getSigners();
    const verifier: any = await deployKYCVerifier(signer.address, owner.address);

    const tokenImpl = await (await ethers.getContractFactory("RWASecurityToken")).deploy();
    const nftImpl = await (await ethers.getContractFactory("RWAProjectNFT")).deploy();
    const complianceImpl = await (await ethers.getContractFactory("ModularCompliance")).deploy();

    const Factory = await ethers.getContractFactory("RWATokenizationFactory");
    const factory: any = await upgrades.deployProxy(
      Factory,
      [
        owner.address,
        await tokenImpl.getAddress(),
        await nftImpl.getAddress(),
        await complianceImpl.getAddress(),
        await verifier.getAddress(),
        feeRecipient.address,
      ],
      { kind: "uups" }
    );
    await factory.connect(owner).setDeployerApproval(issuer.address, true);
    return { factory, verifier, owner, signer, issuer, bob, stranger };
  }

  async function deployedTokenFixture() {
    const f = await fixture();
    await f.factory.connect(f.issuer).deployToken("Asset", "AST", SUPPLY, "ipfs://meta");
    const d = await f.factory.getDeployment(0);
    const token: any = await ethers.getContractAt("RWASecurityToken", d.securityToken);
    const compliance: any = await ethers.getContractAt("ModularCompliance", await token.compliance());
    return { ...f, token, compliance };
  }

  it("mints the supply to the issuer", async function () {
    const { token, issuer } = await loadFixture(deployedTokenFixture);
    expect(await token.balanceOf(issuer.address)).to.equal(SUPPLY);
    expect(await token.totalSupply()).to.equal(SUPPLY);
  });

  it("hands every token role to the issuer and keeps none", async function () {
    const { token, factory, issuer } = await loadFixture(deployedTokenFixture);
    const factoryAddress = await factory.getAddress();
    expect(await token.hasRole(DEFAULT_ADMIN_ROLE, issuer.address)).to.equal(true);
    expect(await token.hasRole(DEFAULT_ADMIN_ROLE, factoryAddress)).to.equal(false);
    for (const role of ROLES) {
      expect(await token.hasRole(role.hash, issuer.address), `issuer ${role.name}`).to.equal(true);
      expect(await token.hasRole(role.hash, factoryAddress), `factory ${role.name}`).to.equal(false);
    }
  });

  it("transfers compliance ownership so the issuer can add modules", async function () {
    const { compliance, issuer, token } = await loadFixture(deployedTokenFixture);
    expect(await compliance.owner()).to.equal(issuer.address);
    expect(await compliance.getTokenBound()).to.equal(await token.getAddress());

    const module = await (await ethers.getContractFactory("MockComplianceModule")).deploy();
    await compliance.connect(issuer).addModule(await module.getAddress());
    expect(await compliance.isModuleBound(await module.getAddress())).to.equal(true);
  });

  it("deploys tokens with KYC enforced", async function () {
    const { token, verifier, signer, issuer, bob } = await loadFixture(deployedTokenFixture);
    expect(await token.kycEnforced()).to.equal(true);
    expect(await token.minKYCLevel()).to.equal(1);

    // The initial issuance does not open a KYC-free path: moving the tokens needs KYC on both ends
    await expect(token.connect(issuer).transfer(bob.address, 1n)).to.be.revertedWithCustomError(token, "KYCNotVerified");
    await cacheKYC(token, signer, verifier, [issuer.address, bob.address]);
    await token.connect(issuer).transfer(bob.address, 1n);
    expect(await token.balanceOf(bob.address)).to.equal(1n);
  });

  it("applies the requested minimum KYC level", async function () {
    const { factory, verifier, signer, issuer } = await loadFixture(fixture);
    const proof = await kycProof(signer, verifier, issuer.address, 3);
    await factory.connect(issuer).deployNFTAndTokenWithKYC("Asset", "AST", SUPPLY, "ipfs://meta", 3, proof);
    const d = await factory.getDeployment(0);
    expect(d.minKYCLevel).to.equal(3);
    const token: any = await ethers.getContractAt("RWASecurityToken", d.securityToken);
    expect(await token.minKYCLevel()).to.equal(3);
    expect(await token.kycEnforced()).to.equal(true);
    expect(await token.hasRole(ethers.id("AGENT_ROLE"), await factory.getAddress())).to.equal(false);
  });

  it("rejects an invalid minimum KYC level", async function () {
    const { factory, verifier, signer, issuer } = await loadFixture(fixture);
    const proof = await kycProof(signer, verifier, issuer.address, 1);
    await expect(factory.connect(issuer).deployNFTAndTokenWithKYC("A", "A", SUPPLY, "", 5, proof))
      .to.be.revertedWithCustomError(factory, "InvalidKYCLevel");
  });

  it("only lets approved deployers deploy", async function () {
    const { factory, stranger } = await loadFixture(fixture);
    await expect(factory.connect(stranger).deployToken("A", "A", SUPPLY, ""))
      .to.be.revertedWithCustomError(factory, "DeployerNotApproved");
  });

  describe("trade escrow", function () {
    async function escrowReadyFixture() {
      const f = await fixture();
      const escrowImpl = await (await ethers.getContractFactory("RWATradeEscrow")).deploy();
      const usdc = await (await ethers.getContractFactory("MockERC20")).deploy("USD Coin", "USDC", 6);
      await f.factory.connect(f.owner).setTradeEscrowImplementation(await escrowImpl.getAddress());
      return { ...f, usdc };
    }

    it("is not deployed until a settlement stablecoin is configured", async function () {
      const { factory, issuer } = await loadFixture(escrowReadyFixture);
      await expect(factory.connect(issuer).deployWithEscrow("Asset", "AST", SUPPLY, ""))
        .to.be.revertedWithCustomError(factory, "InvalidAddress");
    });

    it("deployWithEscrow initialises the escrow for the issuer's token", async function () {
      const { factory, owner, issuer, usdc } = await loadFixture(escrowReadyFixture);
      await factory.connect(owner).setEscrowStablecoin(await usdc.getAddress());
      await factory.connect(issuer).deployWithEscrow("Asset", "AST", SUPPLY, "ipfs://meta");
      const d = await factory.getDeployment(0);
      const escrow: any = await ethers.getContractAt("RWATradeEscrow", d.tradeEscrow);
      expect(await escrow.owner()).to.equal(issuer.address);
      expect(await escrow.securityToken()).to.equal(d.securityToken);
      expect(await escrow.stablecoin()).to.equal(await usdc.getAddress());
      expect(await escrow.platformFeeBps()).to.equal(await factory.escrowTransactionFeeBps());
      expect(await escrow.kycEnforced()).to.equal(true);
    });

    it("addEscrow adds one to an existing deployment", async function () {
      const { factory, owner, issuer, usdc } = await loadFixture(escrowReadyFixture);
      await factory.connect(issuer).deployToken("Asset", "AST", SUPPLY, "");
      await factory.connect(owner).setEscrowStablecoin(await usdc.getAddress());
      await factory.connect(issuer).addEscrow(0);
      const d = await factory.getDeployment(0);
      const escrow: any = await ethers.getContractAt("RWATradeEscrow", d.tradeEscrow);
      expect(await escrow.securityToken()).to.equal(d.securityToken);
    });
  });

  describe("releaseLegacyToken", function () {
    /** Put a deployment back in the state v1 of the factory left tokens in */
    async function legacyFixture() {
      const f = await deployedTokenFixture();
      const factoryAddress = await f.factory.getAddress();
      for (const role of ROLES) await f.token.connect(f.issuer).grantRole(role.hash, factoryAddress);
      await f.compliance.connect(f.issuer).transferOwnership(factoryAddress);
      return f;
    }

    it("drops the factory's leftover roles and returns compliance to the issuer", async function () {
      const { factory, token, compliance, issuer } = await loadFixture(legacyFixture);
      await expect(factory.connect(issuer).releaseLegacyToken(0)).to.emit(factory, "TokenReleasedToIssuer");
      for (const role of ROLES) {
        expect(await token.hasRole(role.hash, await factory.getAddress()), role.name).to.equal(false);
      }
      expect(await compliance.owner()).to.equal(issuer.address);
      // idempotent
      await factory.connect(issuer).releaseLegacyToken(0);
    });

    it("can be called by the factory owner but no one else", async function () {
      const { factory, owner, stranger } = await loadFixture(legacyFixture);
      await expect(factory.connect(stranger).releaseLegacyToken(0)).to.be.revertedWithCustomError(factory, "NotDeploymentOwner");
      await factory.connect(owner).releaseLegacyToken(0);
    });
  });
});
