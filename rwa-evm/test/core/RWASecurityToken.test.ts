import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { cacheKYC, deployKYCVerifier, deploySecurityToken, kycProof, IRAN } from "../helpers/kyc";

describe("RWASecurityToken", function () {
  async function fixture() {
    const [admin, signer, alice, bob, carol] = await ethers.getSigners();
    const verifier: any = await deployKYCVerifier(signer.address, admin.address);
    const { token, compliance, module } = await deploySecurityToken(admin, verifier);
    const cache = (wallets: string[], level = 1, country?: number) =>
      cacheKYC(token, signer, verifier, wallets, level, country);
    return { token, compliance, module, verifier, admin, signer, alice, bob, carol, cache };
  }

  /** alice holds 100 tokens; alice, bob and carol all have cached KYC */
  async function fundedFixture() {
    const f = await fixture();
    await f.cache([f.alice.address, f.bob.address, f.carol.address]);
    await f.token.mint(f.alice.address, 100n);
    return f;
  }

  describe("KYC enforcement", function () {
    it("is on for a freshly initialised token", async function () {
      const { token } = await loadFixture(fixture);
      expect(await token.kycEnforced()).to.equal(true);
    });

    it("refuses to mint to a wallet without cached KYC", async function () {
      const { token, alice, cache } = await loadFixture(fixture);
      await expect(token.mint(alice.address, 10n)).to.be.revertedWithCustomError(token, "KYCNotVerified");
      await cache([alice.address]);
      await token.mint(alice.address, 10n);
      expect(await token.balanceOf(alice.address)).to.equal(10n);
    });

    it("batchMint skips wallets without valid KYC", async function () {
      const { token, alice, bob, cache } = await loadFixture(fixture);
      await cache([alice.address]);
      await token.batchMint([alice.address, bob.address], [5n, 7n]);
      expect(await token.balanceOf(alice.address)).to.equal(5n);
      expect(await token.balanceOf(bob.address)).to.equal(0n);
    });

    it("applies the minimum level and country restrictions", async function () {
      const { token, alice, bob, cache } = await loadFixture(fixture);
      await cache([alice.address], 1);
      await cache([bob.address], 3, IRAN);
      await token.setMinKYCLevel(2);
      await expect(token.mint(alice.address, 1n)).to.be.revertedWithCustomError(token, "KYCNotVerified");
      await expect(token.mint(bob.address, 1n)).to.be.revertedWithCustomError(token, "KYCNotVerified");
    });

    it("rejects KYC proofs not signed by the verifier's signer", async function () {
      const { token, verifier, alice, bob } = await loadFixture(fixture);
      const forged = await kycProof(bob, verifier, alice.address, 4);
      await expect(token.cacheKYC(alice.address, forged)).to.be.revertedWithCustomError(token, "InvalidKYCProof");
    });

    it("blocks transfers to a wallet without KYC", async function () {
      const { token, alice } = await loadFixture(fundedFixture);
      const stranger = ethers.Wallet.createRandom().address;
      await expect(token.connect(alice).transfer(stranger, 1n)).to.be.revertedWithCustomError(token, "KYCNotVerified");
    });
  });

  describe("forced transfers", function () {
    it("moves tokens out of a frozen wallet", async function () {
      const { token, alice, bob } = await loadFixture(fundedFixture);
      await token.setAddressFrozen(alice.address, true);
      await expect(token.connect(alice).transfer(bob.address, 1n)).to.be.revertedWithCustomError(token, "AddressIsFrozen");

      await token.forcedTransfer(alice.address, bob.address, 60n);
      expect(await token.balanceOf(alice.address)).to.equal(40n);
      expect(await token.balanceOf(bob.address)).to.equal(60n);
    });

    it("unfreezes only the frozen tokens it has to move", async function () {
      const { token, alice, bob } = await loadFixture(fundedFixture);
      await token.freezePartialTokens(alice.address, 80n);
      // 20 free + 30 of the 80 frozen
      await expect(token.forcedTransfer(alice.address, bob.address, 50n))
        .to.emit(token, "TokensUnfrozen").withArgs(alice.address, 30n);
      expect(await token.getFrozenTokens(alice.address)).to.equal(50n);
      expect(await token.balanceOf(alice.address)).to.equal(50n);
    });

    it("reports each forced transfer to compliance exactly once", async function () {
      const { token, module, alice, bob, carol } = await loadFixture(fundedFixture);
      const before = await module.transferActions();
      await token.forcedTransfer(alice.address, bob.address, 10n);
      expect(await module.transferActions()).to.equal(before + 1n);

      await token.batchForcedTransfer([alice.address, alice.address], [bob.address, carol.address], [5n, 5n]);
      expect(await module.transferActions()).to.equal(before + 3n);
    });

    it("still requires KYC on the receiver and a compliant transfer", async function () {
      const { token, module, alice, bob } = await loadFixture(fundedFixture);
      const stranger = ethers.Wallet.createRandom().address;
      await expect(token.forcedTransfer(alice.address, stranger, 1n)).to.be.revertedWithCustomError(token, "KYCNotVerified");
      await module.setBlockTransfers(true);
      await expect(token.forcedTransfer(alice.address, bob.address, 1n)).to.be.revertedWithCustomError(token, "TransferNotCompliant");
    });

    it("is restricted to agents", async function () {
      const { token, alice, bob } = await loadFixture(fundedFixture);
      await expect(token.connect(bob).forcedTransfer(alice.address, bob.address, 1n)).to.be.reverted;
    });

    it("does not leave holder checks switched off afterwards", async function () {
      const { token, alice, bob } = await loadFixture(fundedFixture);
      await token.setAddressFrozen(alice.address, true);
      await token.forcedTransfer(alice.address, bob.address, 10n);
      await expect(token.connect(alice).transfer(bob.address, 1n)).to.be.revertedWithCustomError(token, "AddressIsFrozen");
    });
  });

  describe("recoveryAddress", function () {
    it("recovers a frozen wallet and carries its freeze state over", async function () {
      const { token, module, alice, carol } = await loadFixture(fundedFixture);
      await token.freezePartialTokens(alice.address, 10n);
      await token.setAddressFrozen(alice.address, true);
      const before = await module.transferActions();

      await expect(token.recoveryAddress(alice.address, carol.address, ethers.Wallet.createRandom().address))
        .to.emit(token, "RecoverySuccess");

      expect(await token.balanceOf(alice.address)).to.equal(0n);
      expect(await token.balanceOf(carol.address)).to.equal(100n);
      expect(await token.isFrozen(alice.address)).to.equal(false);
      expect(await token.isFrozen(carol.address)).to.equal(true);
      expect(await token.getFrozenTokens(alice.address)).to.equal(0n);
      expect(await token.getFrozenTokens(carol.address)).to.equal(10n);
      expect(await module.transferActions()).to.equal(before + 1n);
    });

    it("requires KYC on the new wallet", async function () {
      const { token, alice } = await loadFixture(fundedFixture);
      const stranger = ethers.Wallet.createRandom().address;
      await expect(token.recoveryAddress(alice.address, stranger, stranger))
        .to.be.revertedWithCustomError(token, "KYCNotVerified");
    });
  });

  describe("regular transfers", function () {
    it("are reported to compliance once", async function () {
      const { token, module, alice, bob } = await loadFixture(fundedFixture);
      const before = await module.transferActions();
      await token.connect(alice).transfer(bob.address, 5n);
      expect(await module.transferActions()).to.equal(before + 1n);
    });

    it("cannot move partially frozen tokens", async function () {
      const { token, alice, bob } = await loadFixture(fundedFixture);
      await token.freezePartialTokens(alice.address, 95n);
      await expect(token.connect(alice).transfer(bob.address, 6n)).to.be.revertedWithCustomError(token, "InsufficientUnfrozenBalance");
      await token.connect(alice).transfer(bob.address, 5n);
    });
  });
});
