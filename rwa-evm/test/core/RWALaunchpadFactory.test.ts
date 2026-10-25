import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { cacheKYC, deployKYCVerifier, kycProof } from "../helpers/kyc";

const USD = (n: number) => BigInt(n) * 10n ** 6n;
const GOAL = USD(10_000);
const SUPPLY = ethers.parseEther("100000");
const TOKEN_ROLES = ["MINTER_ROLE", "BURNER_ROLE", "COMPLIANCE_ROLE", "SNAPSHOT_ROLE", "AGENT_ROLE", "RECOVERY_ROLE"];

describe("RWALaunchpadFactory", function () {
  async function fixture() {
    const [owner, signer, deployer, investor, feeReceiver, liquidity, treasury] = await ethers.getSigners();
    const verifier: any = await deployKYCVerifier(signer.address, owner.address);
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc: any = await MockERC20.deploy("USD Coin", "USDC", 6);
    const usdt: any = await MockERC20.deploy("Tether", "USDT", 6);

    const feeManager: any = await upgrades.deployProxy(
      await ethers.getContractFactory("PlatformFeeManager"),
      [owner.address, feeReceiver.address, liquidity.address, treasury.address],
      { kind: "uups" }
    );
    const nft: any = await upgrades.deployProxy(
      await ethers.getContractFactory("RWAProjectNFT"),
      ["RWA Projects", "RWAP", owner.address],
      { kind: "uups" }
    );
    const tokenImpl = await (await ethers.getContractFactory("RWASecurityToken")).deploy();
    const vaultImpl = await (await ethers.getContractFactory("RWAEscrowVault")).deploy();
    const complianceImpl = await (await ethers.getContractFactory("ModularCompliance")).deploy();

    const factory: any = await upgrades.deployProxy(
      await ethers.getContractFactory("RWALaunchpadFactory"),
      [
        owner.address,
        await tokenImpl.getAddress(),
        await vaultImpl.getAddress(),
        await complianceImpl.getAddress(),
        await verifier.getAddress(),
        await nft.getAddress(),
        feeReceiver.address,
      ],
      { kind: "uups" }
    );
    const factoryAddress = await factory.getAddress();
    // platform wiring, as scripts/deploy-complete.ts does it
    await nft.grantRole(await nft.MINTER_ROLE(), factoryAddress);
    await nft.grantRole(await nft.MANAGER_ROLE(), factoryAddress);
    await feeManager.grantRole(await feeManager.ADMIN_ROLE(), factoryAddress);
    await factory.setPlatformFeeManager(await feeManager.getAddress());
    await factory.setDefaultPaymentTokens(await usdc.getAddress(), await usdt.getAddress());

    await usdc.mint(investor.address, USD(1_000_000));
    return { factory, factoryAddress, feeManager, nft, usdc, verifier, owner, signer, deployer, investor, liquidity, treasury };
  }

  async function deployedFixture() {
    const f = await fixture();
    await f.factory.connect(f.deployer).deployProject("Solar Farm", "SOLAR", "energy", SUPPLY, GOAL, 30, "ipfs://meta");
    const d = await f.factory.getDeployment(0);
    const vault: any = await ethers.getContractAt("RWAEscrowVault", d.escrowVault);
    const token: any = await ethers.getContractAt("RWASecurityToken", d.securityToken);
    const vaultProjectId = await f.factory.getVaultProjectId(0);
    return { ...f, vault, token, vaultProjectId };
  }

  it("refuses to deploy before a fee manager is configured", async function () {
    const { deployer, owner, verifier, nft } = await loadFixture(fixture);
    const bare: any = await upgrades.deployProxy(
      await ethers.getContractFactory("RWALaunchpadFactory"),
      [
        owner.address,
        await (await (await ethers.getContractFactory("RWASecurityToken")).deploy()).getAddress(),
        await (await (await ethers.getContractFactory("RWAEscrowVault")).deploy()).getAddress(),
        await (await (await ethers.getContractFactory("ModularCompliance")).deploy()).getAddress(),
        await verifier.getAddress(),
        await nft.getAddress(),
        owner.address,
      ],
      { kind: "uups" }
    );
    await expect(bare.connect(deployer).deployProject("A", "A", "x", SUPPLY, GOAL, 30, ""))
      .to.be.revertedWithCustomError(bare, "InvalidAddress");
  });

  it("books the project under its NFT id, owned by the deployer", async function () {
    const { vault, nft, deployer, vaultProjectId, token } = await loadFixture(deployedFixture);
    const project = await vault.getProject(vaultProjectId);
    expect(project.projectOwner).to.equal(deployer.address);
    expect(project.securityToken).to.equal(await token.getAddress());
    expect(await nft.ownerOf(vaultProjectId)).to.equal(deployer.address);
  });

  it("leaves the factory without operational roles on the token", async function () {
    const { token, vault, factoryAddress, deployer, owner } = await loadFixture(deployedFixture);
    for (const role of TOKEN_ROLES) {
      expect(await token.hasRole(ethers.id(role), factoryAddress), role).to.equal(false);
    }
    expect(await token.hasRole(ethers.ZeroHash, factoryAddress)).to.equal(false);
    expect(await token.hasRole(ethers.ZeroHash, deployer.address)).to.equal(true);
    expect(await token.hasRole(ethers.ZeroHash, owner.address)).to.equal(true);
    expect(await token.hasRole(ethers.id("MINTER_ROLE"), await vault.getAddress())).to.equal(true);
    expect(await token.hasRole(ethers.id("SNAPSHOT_ROLE"), await vault.getAddress())).to.equal(true);
  });

  it("does not let another project's vault change this project's NFT status", async function () {
    const f = await loadFixture(deployedFixture);
    await f.factory.connect(f.deployer).deployProject("Wind Farm", "WIND", "energy", SUPPLY, GOAL, 30, "ipfs://meta2");
    const other: any = await ethers.getContractAt("RWAEscrowVault", (await f.factory.getDeployment(1)).escrowVault);
    await ethers.provider.send("hardhat_impersonateAccount", [await other.getAddress()]);
    await ethers.provider.send("hardhat_setBalance", [await other.getAddress(), "0xDE0B6B3A7640000"]);
    const otherVault = await ethers.getSigner(await other.getAddress());
    await expect(f.nft.connect(otherVault).updateProjectStatus(f.vaultProjectId, 4))
      .to.be.revertedWithCustomError(f.nft, "NotAuthorized");
  });

  it("runs a raise end to end: invest, complete, claim, release", async function () {
    const f = await loadFixture(deployedFixture);
    const { factory, vault, token, usdc, feeManager, signer, verifier, deployer, investor, liquidity, treasury, owner } = f;
    const pid = f.vaultProjectId;
    expect(await feeManager.hasRole(await feeManager.ESCROW_ROLE(), await vault.getAddress())).to.equal(true);

    await factory.connect(deployer).activateProject(0);
    await usdc.connect(investor).approve(await vault.getAddress(), GOAL);
    // The project's own vault may update its NFT status without MANAGER_ROLE
    await expect(
      vault.connect(investor).invest(pid, GOAL, await usdc.getAddress(), await kycProof(signer, verifier, investor.address))
    ).to.not.emit(vault, "ProjectNFTUpdateFailed");
    expect((await vault.getProject(pid)).state).to.equal(2); // FUNDED
    expect((await f.nft.getProject(pid)).status).to.equal(2); // NFT FUNDED

    await cacheKYC(token, signer, verifier, [liquidity.address, treasury.address, investor.address]);
    await vault.connect(deployer).completeProject(pid);
    expect(await usdc.balanceOf(await feeManager.getAddress())).to.equal(USD(150));

    await vault.connect(investor).claimTokens(pid);
    expect(await token.balanceOf(investor.address)).to.equal((SUPPLY * 99n) / 100n);

    await expect(vault.connect(owner).releaseMilestoneFunds(pid, USD(9_850), "m1"))
      .to.changeTokenBalance(usdc, deployer, USD(9_850));
  });
});
