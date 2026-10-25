import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { cacheKYC, deployKYCVerifier, deploySecurityToken, kycProof } from "../helpers/kyc";
import { zeroMappingEntry } from "../helpers/storage";

const VAULT = "contracts/core/RWAEscrowVault.sol:RWAEscrowVault";
const USD = (n: number | bigint) => BigInt(n) * 10n ** 6n;
const GOAL = USD(10_000);
const SUPPLY = ethers.parseEther("100000");
const DAY = 24 * 3600;

enum State { INACTIVE, ACTIVE, FUNDED, COMPLETED, CANCELLED, DISPUTED }

describe("RWAEscrowVault", function () {
  async function fixture() {
    const [admin, signer, owner, inv1, inv2, inv3, feeReceiver, liquidity, treasury, disputer, stranger] =
      await ethers.getSigners();
    const verifier: any = await deployKYCVerifier(signer.address, admin.address);

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc: any = await MockERC20.deploy("USD Coin", "USDC", 6);
    const usdt: any = await MockERC20.deploy("Tether", "USDT", 6);

    const feeManager: any = await upgrades.deployProxy(
      await ethers.getContractFactory("PlatformFeeManager"),
      [admin.address, feeReceiver.address, liquidity.address, treasury.address],
      { kind: "uups" }
    );
    const nft: any = await (await ethers.getContractFactory("MockProjectNFT")).deploy();
    const vault: any = await upgrades.deployProxy(
      await ethers.getContractFactory("RWAEscrowVault"),
      [admin.address, await feeManager.getAddress(), await nft.getAddress()],
      { kind: "uups" }
    );
    const vaultAddress = await vault.getAddress();
    await vault.setKYCVerifier(await verifier.getAddress());
    await vault.setPaymentTokens(await usdc.getAddress(), await usdt.getAddress());
    await feeManager.grantEscrowRole(vaultAddress);
    await feeManager.grantDisputeManagerRole(vaultAddress);
    await vault.grantDisputeManagerRole(disputer.address);

    for (const w of [inv1, inv2, inv3, admin]) {
      await usdc.mint(w.address, USD(1_000_000));
      await usdt.mint(w.address, USD(1_000_000));
      await usdc.connect(w).approve(vaultAddress, ethers.MaxUint256);
      await usdt.connect(w).approve(vaultAddress, ethers.MaxUint256);
    }

    const tokens: Record<number, any> = {};
    async function newProject(pid: number) {
      const { token } = await deploySecurityToken(admin, verifier, SUPPLY * 2n);
      await token.grantRole(ethers.id("MINTER_ROLE"), vaultAddress);
      await token.grantRole(ethers.id("SNAPSHOT_ROLE"), vaultAddress);
      const deadline = (await time.latest()) + 10 * DAY;
      await vault.connect(owner).createProject(pid, await token.getAddress(), GOAL, deadline, SUPPLY);
      await vault.activateProject(pid);
      tokens[pid] = token;
      return token;
    }
    async function invest(inv: any, pid: number, amount: bigint, payWith: any = usdc) {
      return vault.connect(inv).invest(pid, amount, await payWith.getAddress(), await kycProof(signer, verifier, inv.address));
    }
    /** Holders of a project's token need KYC cached shortly before tokens are minted to them */
    async function cacheHolders(pid: number, wallets: string[]) {
      await cacheKYC(tokens[pid], signer, verifier, wallets);
    }
    /** completeProject mints platform tokens, so the platform wallets need KYC on the token */
    async function complete(pid: number) {
      await cacheHolders(pid, [liquidity.address, treasury.address]);
      return vault.connect(owner).completeProject(pid);
    }

    return {
      vault, feeManager, nft, usdc, usdt, verifier,
      admin, signer, owner, inv1, inv2, inv3, liquidity, treasury, disputer, stranger,
      newProject, invest, cacheHolders, complete, tokens,
    };
  }
  const setup = fixture;

  describe("per-project custody", function () {
    it("never pays one project out of another project's funds", async function () {
      const { vault, usdc, owner, inv1, inv2, newProject, invest, complete } = await loadFixture(setup);
      await newProject(1);
      await newProject(2);
      await invest(inv1, 1, USD(6_000));
      await invest(inv2, 2, GOAL);
      await complete(2);

      expect(await vault.projectBalance(2)).to.equal(USD(9_850));
      await vault.releaseMilestoneFunds(2, USD(9_850), "m1");
      // the vault still holds project 1's 6,000, but none of it is project 2's
      await expect(vault.releaseMilestoneFunds(2, 1n, "m2")).to.be.revertedWithCustomError(vault, "InsufficientBalance");
      expect(await usdc.balanceOf(owner.address)).to.equal(USD(9_850));

      await time.increase(11 * DAY);
      await expect(vault.connect(inv1).claimRefund(1)).to.changeTokenBalance(usdc, inv1, USD(6_000));
      expect(await usdc.balanceOf(await vault.getAddress())).to.equal(0n);
    });

    it("settles every project in a single payment token", async function () {
      const { vault, usdt, inv1, inv2, owner, newProject, invest } = await loadFixture(setup);
      await newProject(1);
      await invest(inv1, 1, USD(1_000));
      await expect(invest(inv2, 1, USD(1_000), usdt)).to.be.revertedWithCustomError(vault, "PaymentTokenMismatch");
      await expect(vault.connect(owner).setProjectPaymentToken(1, await usdt.getAddress()))
        .to.be.revertedWithCustomError(vault, "PaymentTokenMismatch");

      await newProject(2);
      await vault.connect(owner).setProjectPaymentToken(2, await usdt.getAddress());
      await expect(invest(inv1, 2, USD(1_000))).to.be.revertedWithCustomError(vault, "PaymentTokenMismatch");
      await invest(inv1, 2, USD(1_000), usdt);
      expect(await vault.projectBalance(2)).to.equal(USD(1_000));
    });
  });

  describe("fees and payouts use on-chain funds", function () {
    it("takes the platform fee on stablecoins actually held, not on off-chain records", async function () {
      const { vault, feeManager, usdc, admin, inv1, inv3, newProject, invest, complete } = await loadFixture(setup);
      await newProject(1);
      await vault.recordOffChainInvestment(1, inv3.address, USD(4_000), "wire-1");
      await invest(inv1, 1, USD(6_000));
      expect((await vault.getProject(1)).state).to.equal(State.FUNDED);

      await complete(1);
      expect(await usdc.balanceOf(await feeManager.getAddress())).to.equal(USD(90)); // 1.5% of 6,000
      expect(await vault.getAvailableFunds(1)).to.equal(USD(5_910));

      // off-chain money can no longer be injected once the fee has been settled
      await expect(vault.connect(admin).injectOffChainFunds(1, USD(4_000), await usdc.getAddress()))
        .to.be.revertedWithCustomError(vault, "InvalidState");
    });

    it("counts injected off-chain funds once they are in", async function () {
      const { vault, feeManager, usdc, admin, inv1, inv3, newProject, invest, complete } = await loadFixture(setup);
      await newProject(1);
      await vault.recordOffChainInvestment(1, inv3.address, USD(4_000), "wire-1");
      await invest(inv1, 1, USD(6_000));
      await vault.connect(admin).injectOffChainFunds(1, USD(4_000), await usdc.getAddress());
      await complete(1);
      expect(await usdc.balanceOf(await feeManager.getAddress())).to.equal(USD(150));
      expect(await vault.getAvailableFunds(1)).to.equal(USD(9_850));
    });
  });

  describe("refunds", function () {
    it("lets investors get their money back from a FUNDED project that is never completed", async function () {
      const { vault, nft, usdc, owner, inv1, inv2, newProject, invest } = await loadFixture(setup);
      await newProject(1);
      await invest(inv1, 1, USD(6_000));
      await invest(inv2, 1, USD(4_000));
      await expect(vault.connect(inv1).claimRefund(1)).to.be.revertedWithCustomError(vault, "InvalidState");

      await time.increase(91 * DAY);
      await expect(vault.connect(inv1).claimRefund(1)).to.changeTokenBalance(usdc, inv1, USD(6_000));
      expect((await vault.getProject(1)).state).to.equal(State.CANCELLED);
      expect(await nft.status(1)).to.equal(4); // CANCELLED
      await expect(vault.connect(owner).completeProject(1)).to.be.revertedWithCustomError(vault, "InvalidState");
      await expect(vault.connect(inv2).claimRefund(1)).to.changeTokenBalance(usdc, inv2, USD(4_000));
      await expect(vault.connect(inv2).claimRefund(1)).to.be.revertedWithCustomError(vault, "NotInvestor");
    });

    it("refunds on-chain investors and returns injected funds to the admin on cancellation", async function () {
      const { vault, usdc, admin, inv1, inv3, newProject, invest } = await loadFixture(setup);
      await newProject(1);
      await vault.recordOffChainInvestment(1, inv3.address, USD(4_000), "wire-1");
      await vault.connect(admin).injectOffChainFunds(1, USD(4_000), await usdc.getAddress());
      await invest(inv1, 1, USD(6_000));
      await vault.cancelProject(1);

      await expect(vault.connect(inv1).claimRefund(1)).to.changeTokenBalance(usdc, inv1, USD(6_000));
      await expect(vault.connect(inv3).claimRefund(1)).to.be.revertedWithCustomError(vault, "NothingToRefund");
      await expect(vault.connect(admin).reclaimInjectedFunds(1)).to.changeTokenBalance(usdc, admin, USD(4_000));
      expect(await vault.projectBalance(1)).to.equal(0n);
    });

    it("cannot cancel a completed project outside a dispute", async function () {
      const { vault, inv1, newProject, invest, complete } = await loadFixture(setup);
      await newProject(1);
      await invest(inv1, 1, GOAL);
      await complete(1);
      await expect(vault.cancelProject(1)).to.be.revertedWithCustomError(vault, "InvalidState");
    });
  });

  describe("disputes", function () {
    it("unblocking returns the project to the state it was in", async function () {
      const { vault, disputer, inv1, newProject, invest } = await loadFixture(setup);
      await newProject(1);
      await invest(inv1, 1, USD(1_000));
      await vault.connect(disputer).blockProject(1);
      expect((await vault.getProject(1)).state).to.equal(State.DISPUTED);
      await vault.connect(disputer).unblockProject(1);
      expect((await vault.getProject(1)).state).to.equal(State.ACTIVE);

      await invest(inv1, 1, USD(9_000));
      await vault.connect(disputer).blockProject(1);
      await vault.connect(disputer).unblockProject(1);
      expect((await vault.getProject(1)).state).to.equal(State.FUNDED);
      expect(await vault.projectBlockedByDispute(1)).to.equal(false);
    });

    it("a dispute before completion turns into plain refunds", async function () {
      const { vault, usdc, disputer, inv1, newProject, invest } = await loadFixture(setup);
      await newProject(1);
      await invest(inv1, 1, USD(3_000));
      await vault.connect(disputer).blockProject(1);
      await vault.connect(disputer).refundForDispute(1);
      expect((await vault.getProject(1)).state).to.equal(State.CANCELLED);
      await expect(vault.connect(inv1).claimDisputeRefund(1)).to.be.revertedWithCustomError(vault, "InvalidState");
      await expect(vault.connect(inv1).claimRefund(1)).to.changeTokenBalance(usdc, inv1, USD(3_000));
    });

    it("refunds a completed project pro rata to snapshot holders, who pull their share", async function () {
      const f = await loadFixture(setup);
      const { vault, feeManager, usdc, disputer, owner, inv1, inv2, liquidity, treasury, stranger } = f;
      const token = await f.newProject(1);
      await f.invest(inv1, 1, USD(6_000));
      await f.invest(inv2, 1, USD(4_000));
      await f.complete(1);

      // Claiming tokens needs KYC on the security token
      await expect(vault.connect(inv1).claimTokens(1)).to.be.revertedWithCustomError(token, "KYCNotVerified");
      await f.cacheHolders(1, [inv1.address, inv2.address]);
      await vault.connect(inv1).claimTokens(1);
      await vault.connect(inv2).claimTokens(1);
      await vault.releaseMilestoneFunds(1, USD(1_850), "m1");
      expect(await vault.projectBalance(1)).to.equal(USD(8_000));

      await vault.connect(disputer).blockProject(1);
      await vault.connect(disputer).refundForDispute(1);

      // the undistributed 150 platform fee came back through PlatformFeeManager.refundForDispute
      expect((await feeManager.getProjectFees(1)).refunded).to.equal(true);
      expect(await vault.disputeRefundPool(1)).to.equal(USD(8_150));
      expect((await vault.getProject(1)).state).to.equal(State.CANCELLED);

      // supply at snapshot: inv1 59.4%, inv2 39.6%, liquidity 0.5%, treasury 0.5%
      const expected = [
        [inv1, USD(8_150) * 594n / 1000n],
        [inv2, USD(8_150) * 396n / 1000n],
        [liquidity, USD(8_150) * 5n / 1000n],
        [treasury, USD(8_150) * 5n / 1000n],
      ] as const;
      for (const [holder, amount] of expected) {
        expect(await vault.getDisputeRefund(1, holder.address)).to.equal(amount);
        await expect(vault.connect(holder).claimDisputeRefund(1)).to.changeTokenBalance(usdc, holder, amount);
      }
      expect(await vault.projectBalance(1)).to.equal(0n);

      await expect(vault.connect(inv1).claimDisputeRefund(1)).to.be.revertedWithCustomError(vault, "AlreadyClaimed");
      await expect(vault.connect(stranger).claimDisputeRefund(1)).to.be.revertedWithCustomError(vault, "NothingToRefund");
      await expect(vault.connect(inv1).claimRefund(1)).to.be.revertedWithCustomError(vault, "InvalidState");
      await expect(vault.connect(owner).completeProject(1)).to.be.revertedWithCustomError(vault, "InvalidState");
    });

    it("only the dispute manager can block, unblock or refund", async function () {
      const { vault, stranger, inv1, newProject, invest } = await loadFixture(setup);
      await newProject(1);
      await invest(inv1, 1, USD(1_000));
      await expect(vault.connect(stranger).blockProject(1)).to.be.reverted;
      await expect(vault.connect(stranger).refundForDispute(1)).to.be.reverted;
    });
  });

  describe("legacy projects", function () {
    it("move no funds until migrated, and migration cannot book more than the vault holds", async function () {
      const { vault, usdc, inv1, newProject, invest } = await loadFixture(setup);
      await newProject(1);
      await invest(inv1, 1, USD(2_000));
      // Turn project 1 into a pre-v2 project: the v2 books read zero, the funds are still in the vault
      const vaultAddress = await vault.getAddress();
      for (const label of ["projectAccountingEnabled", "projectBalance", "projectOnChainRaised"]) {
        await zeroMappingEntry(vaultAddress, VAULT, label, 1n);
      }
      await zeroMappingEntry(vaultAddress, VAULT, "totalProjectBalances", await usdc.getAddress());
      await zeroMappingEntry(vaultAddress, VAULT, "investorOnChainContribution", 1n, inv1.address);
      expect(await vault.projectAccountingEnabled(1)).to.equal(false);
      expect(await vault.investorOnChainContribution(1, inv1.address)).to.equal(0n);

      await expect(invest(inv1, 1, USD(1_000))).to.be.revertedWithCustomError(vault, "LegacyProject");
      await expect(vault.migrateLegacyProject(1, USD(2_001), 0)).to.be.revertedWithCustomError(vault, "InsufficientBalance");
      await vault.migrateLegacyProject(1, USD(2_000), 0);
      expect(await vault.investorOnChainContribution(1, inv1.address)).to.equal(USD(2_000));
      await invest(inv1, 1, USD(1_000));
      expect(await vault.projectBalance(1)).to.equal(USD(3_000));
    });
  });
});
