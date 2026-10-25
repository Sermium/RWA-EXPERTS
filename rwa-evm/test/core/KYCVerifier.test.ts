import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { deployKYCVerifier, kycProof, signKYC, US } from "../helpers/kyc";

describe("KYCVerifier", function () {
  async function fixture() {
    const [owner, signer, feeRecipient, alice, bob, mallory] = await ethers.getSigners();
    const verifier: any = await deployKYCVerifier(signer.address, feeRecipient.address, ethers.parseEther("0.01"));
    return { verifier, owner, signer, feeRecipient, alice, bob, mallory };
  }

  describe("verify", function () {
    it("accepts a proof signed by the trusted signer", async function () {
      const { verifier, signer, alice } = await loadFixture(fixture);
      const p = await kycProof(signer, verifier, alice.address, 2, US);
      expect(await verifier.verify(alice.address, p.level, p.countryCode, p.expiry, p.signature)).to.equal(true);
    });

    it("rejects a proof whose wallet, level or country was changed", async function () {
      const { verifier, signer, alice, bob } = await loadFixture(fixture);
      const p = await kycProof(signer, verifier, alice.address, 1, US);
      expect(await verifier.verify(bob.address, p.level, p.countryCode, p.expiry, p.signature)).to.equal(false);
      expect(await verifier.verify(alice.address, 4, p.countryCode, p.expiry, p.signature)).to.equal(false);
      expect(await verifier.verify(alice.address, p.level, 826, p.expiry, p.signature)).to.equal(false);
    });

    it("rejects a proof signed by anyone else", async function () {
      const { verifier, mallory, alice } = await loadFixture(fixture);
      const p = await kycProof(mallory, verifier, alice.address, 4, US);
      expect(await verifier.verify(alice.address, p.level, p.countryCode, p.expiry, p.signature)).to.equal(false);
    });

    it("rejects an expired proof", async function () {
      const { verifier, signer, alice } = await loadFixture(fixture);
      const expiry = BigInt(await time.latest()) + 60n;
      const sig = await signKYC(signer, await verifier.getAddress(), alice.address, 1, US, expiry);
      expect(await verifier.verify(alice.address, 1, US, expiry, sig)).to.equal(true);
      await time.increase(120);
      expect(await verifier.verify(alice.address, 1, US, expiry, sig)).to.equal(false);
    });

    it("binds proofs to one verifier deployment", async function () {
      const { verifier, signer, feeRecipient, alice } = await loadFixture(fixture);
      const other: any = await deployKYCVerifier(signer.address, feeRecipient.address);
      const p = await kycProof(signer, verifier, alice.address);
      expect(await other.verify(alice.address, p.level, p.countryCode, p.expiry, p.signature)).to.equal(false);
    });

    it("rejects malformed signatures instead of reverting", async function () {
      const { verifier, alice } = await loadFixture(fixture);
      const expiry = BigInt(await time.latest()) + 3600n;
      expect(await verifier.verify(alice.address, 1, US, expiry, "0x1234")).to.equal(false);
    });

    it("verifyWithMinLevel requires the minimum level", async function () {
      const { verifier, signer, alice } = await loadFixture(fixture);
      const p = await kycProof(signer, verifier, alice.address, 2, US);
      expect(await verifier.verifyWithMinLevel(alice.address, p.level, p.countryCode, p.expiry, p.signature, 2)).to.equal(true);
      expect(await verifier.verifyWithMinLevel(alice.address, p.level, p.countryCode, p.expiry, p.signature, 3)).to.equal(false);
    });

    it("verifyOrRevert reverts on a bad proof", async function () {
      const { verifier, mallory, alice } = await loadFixture(fixture);
      const p = await kycProof(mallory, verifier, alice.address);
      await expect(verifier.verifyOrRevert(alice.address, p.level, p.countryCode, p.expiry, p.signature))
        .to.be.revertedWithCustomError(verifier, "InvalidSignature");
    });
  });

  describe("registerWithProof", function () {
    it("registers the caller and forwards the fee", async function () {
      const { verifier, signer, feeRecipient, alice } = await loadFixture(fixture);
      const p = await kycProof(signer, verifier, alice.address, 1, US);
      const fee = await verifier.registrationFee();
      await expect(
        verifier.connect(alice).registerWithProof(p.level, p.countryCode, p.expiry, p.signature, { value: fee })
      ).to.changeEtherBalances([alice, feeRecipient], [-fee, fee]);
      expect(await verifier.isRegistered(alice.address)).to.equal(true);
      expect(await verifier.totalFeesCollected()).to.equal(fee);
    });

    it("rejects someone else's proof, a short fee and a bad level", async function () {
      const { verifier, signer, alice, bob } = await loadFixture(fixture);
      const fee = await verifier.registrationFee();
      const p = await kycProof(signer, verifier, alice.address, 1, US);
      await expect(verifier.connect(bob).registerWithProof(p.level, p.countryCode, p.expiry, p.signature, { value: fee }))
        .to.be.revertedWithCustomError(verifier, "InvalidSignature");
      await expect(verifier.connect(alice).registerWithProof(p.level, p.countryCode, p.expiry, p.signature, { value: fee - 1n }))
        .to.be.revertedWithCustomError(verifier, "InsufficientFee");
      const p0 = await kycProof(signer, verifier, alice.address, 0, US);
      await expect(verifier.connect(alice).registerWithProof(p0.level, p0.countryCode, p0.expiry, p0.signature, { value: fee }))
        .to.be.revertedWithCustomError(verifier, "InvalidLevel");
    });
  });

  describe("admin", function () {
    it("only the owner can rotate the signer, and old proofs stop verifying", async function () {
      const { verifier, owner, signer, alice, mallory } = await loadFixture(fixture);
      const p = await kycProof(signer, verifier, alice.address);
      await expect(verifier.connect(mallory).setTrustedSigner(mallory.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
      await verifier.connect(owner).setTrustedSigner(mallory.address);
      expect(await verifier.verify(alice.address, p.level, p.countryCode, p.expiry, p.signature)).to.equal(false);
    });

    it("pauses registration", async function () {
      const { verifier, owner, signer, alice } = await loadFixture(fixture);
      await verifier.connect(owner).pause();
      const p = await kycProof(signer, verifier, alice.address);
      await expect(verifier.connect(alice).registerWithProof(p.level, p.countryCode, p.expiry, p.signature, { value: ethers.parseEther("0.01") }))
        .to.be.revertedWith("Pausable: paused");
    });
  });
});
