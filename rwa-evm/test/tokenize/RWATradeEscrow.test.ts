import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { deployKYCVerifier, kycProof } from "../helpers/kyc";
import { zeroStateVariables } from "../helpers/storage";

const TOKENS = (n: number) => ethers.parseEther(String(n));
const USD = (n: number) => BigInt(n) * 10n ** 6n;
const PRICE = USD(2); // stablecoin per whole token

describe("RWATradeEscrow", function () {
  async function fixture() {
    const [owner, signer, seller, buyer, feeRecipient, stranger] = await ethers.getSigners();
    const verifier: any = await deployKYCVerifier(signer.address, owner.address);
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const sec: any = await MockERC20.deploy("Security", "SEC", 18);
    const stable: any = await MockERC20.deploy("USD Coin", "USDC", 6);
    const other: any = await MockERC20.deploy("Other", "OTH", 18);

    const escrow: any = await upgrades.deployProxy(
      await ethers.getContractFactory("RWATradeEscrow"),
      [owner.address, await sec.getAddress(), await stable.getAddress(), await verifier.getAddress(), feeRecipient.address, 100],
      { kind: "uups" }
    );
    const escrowAddress = await escrow.getAddress();
    await sec.mint(seller.address, TOKENS(1_000));
    await stable.mint(buyer.address, USD(1_000_000));
    await sec.connect(seller).approve(escrowAddress, ethers.MaxUint256);
    await stable.connect(buyer).approve(escrowAddress, ethers.MaxUint256);

    const proof = (who: any) => kycProof(signer, verifier, who.address);
    /** seller lists `amount` tokens and deposits them */
    const listWithDeposit = async (amount: bigint) =>
      escrow.connect(seller).createTradeAndDepositWithKYC(amount, PRICE, 0, 0, await proof(seller));
    /** seller lists `amount` tokens without depositing; buyer accepts and pays */
    const listAndPay = async (amount: bigint, tradeId: number) => {
      await escrow.connect(seller).createTradeWithKYC(amount, PRICE, 0, 0, await proof(seller));
      await escrow.connect(buyer).acceptAndDepositWithKYC(tradeId, await proof(buyer));
    };
    return { escrow, escrowAddress, sec, stable, other, owner, seller, buyer, stranger, proof, listWithDeposit, listAndPay };
  }

  /** trade 0: seller deposited 100 tokens; trade 1: buyer paid 100 USDC for 50 tokens; plus stray funds */
  async function openTradesFixture() {
    const f = await fixture();
    await f.listWithDeposit(TOKENS(100));
    await f.listAndPay(TOKENS(50), 1);
    await f.sec.mint(f.escrowAddress, TOKENS(5));
    await f.stable.mint(f.escrowAddress, USD(3));
    await f.other.mint(f.escrowAddress, TOKENS(7));
    return f;
  }

  describe("emergencyWithdraw", function () {
    it("cannot take deposits of open trades", async function () {
      const { escrow, sec, stable, owner } = await loadFixture(openTradesFixture);
      expect(await escrow.escrowedTokens()).to.equal(TOKENS(100));
      expect(await escrow.escrowedStable()).to.equal(USD(100));

      await expect(escrow.connect(owner).emergencyWithdraw(await sec.getAddress(), TOKENS(5) + 1n))
        .to.be.revertedWithCustomError(escrow, "InsufficientBalance");
      await expect(escrow.connect(owner).emergencyWithdraw(await stable.getAddress(), USD(3) + 1n))
        .to.be.revertedWithCustomError(escrow, "InsufficientBalance");
    });

    it("can take what no trade is owed", async function () {
      const { escrow, sec, stable, other, owner } = await loadFixture(openTradesFixture);
      expect(await escrow.withdrawableBalance(await sec.getAddress())).to.equal(TOKENS(5));
      await expect(escrow.connect(owner).emergencyWithdraw(await sec.getAddress(), TOKENS(5)))
        .to.changeTokenBalance(sec, owner, TOKENS(5));
      await expect(escrow.connect(owner).emergencyWithdraw(await stable.getAddress(), USD(3)))
        .to.changeTokenBalance(stable, owner, USD(3));
      await expect(escrow.connect(owner).emergencyWithdraw(await other.getAddress(), TOKENS(7)))
        .to.changeTokenBalance(other, owner, TOKENS(7));
    });

    it("is owner only", async function () {
      const { escrow, other, stranger } = await loadFixture(openTradesFixture);
      await expect(escrow.connect(stranger).emergencyWithdraw(await other.getAddress(), 1n))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("tracks deposits leaving escrow when trades settle or are cancelled", async function () {
      const { escrow, buyer, seller, proof } = await loadFixture(openTradesFixture);
      await escrow.connect(buyer).acceptAndDepositWithKYC(0, await proof(buyer)); // completes trade 0
      expect(await escrow.escrowedTokens()).to.equal(0n);
      expect(await escrow.escrowedStable()).to.equal(USD(100));

      await escrow.connect(seller).cancelTrade(1);
      expect(await escrow.escrowedStable()).to.equal(0n);
    });
  });

  describe("expired trades", function () {
    it("cannot be refunded a second time through cancelTrade or a dispute", async function () {
      const { escrow, sec, seller, listWithDeposit } = await loadFixture(fixture);
      await listWithDeposit(TOKENS(100));
      await time.increase(25 * 3600);
      await expect(escrow.expireTrade(0)).to.changeTokenBalance(sec, seller, TOKENS(100));

      await expect(escrow.connect(seller).cancelTrade(0)).to.be.revertedWithCustomError(escrow, "InvalidTradeStatus");
      await expect(escrow.connect(seller).raiseDispute(0, "again")).to.be.revertedWithCustomError(escrow, "InvalidTradeStatus");
    });
  });

  describe("disputed trades", function () {
    async function disputedFixture() {
      const f = await fixture();
      await f.listWithDeposit(TOKENS(100));
      await f.escrow.connect(f.seller).raiseDispute(0, "buyer never paid");
      return f;
    }

    it("cannot be cancelled or expired by a participant", async function () {
      const { escrow, seller } = await loadFixture(disputedFixture);
      await expect(escrow.connect(seller).cancelTrade(0)).to.be.revertedWithCustomError(escrow, "InvalidTradeStatus");
      await time.increase(25 * 3600);
      await expect(escrow.expireTrade(0)).to.be.revertedWithCustomError(escrow, "InvalidTradeStatus");
    });

    it("are settled by the arbitrator", async function () {
      const { escrow, sec, owner, seller } = await loadFixture(disputedFixture);
      await expect(escrow.connect(owner).resolveDispute(0, true)).to.changeTokenBalance(sec, seller, TOKENS(100));
      expect(await escrow.escrowedTokens()).to.equal(0n);
    });
  });

  describe("after an upgrade from v1", function () {
    async function upgradedFixture() {
      const f = await openTradesFixture();
      await zeroStateVariables(f.escrowAddress, "contracts/tokenize/RWATradeEscrow.sol:RWATradeEscrow", [
        "escrowedTokens", "escrowedStable", "escrowAccountingActive", "escrowTrackedFrom", "escrowLegacySynced",
      ]);
      return f;
    }

    it("keeps escrowed tokens locked until pre-upgrade trades are added up", async function () {
      const { escrow, sec, stable, other, owner, seller, listWithDeposit } = await loadFixture(upgradedFixture);
      await expect(escrow.connect(owner).emergencyWithdraw(await sec.getAddress(), 1n))
        .to.be.revertedWithCustomError(escrow, "EscrowAccountingIncomplete");
      // unrelated tokens are not held back
      await escrow.connect(owner).emergencyWithdraw(await other.getAddress(), TOKENS(7));

      await escrow.connect(owner).initializeEscrowAccounting();
      await expect(escrow.connect(owner).initializeEscrowAccounting())
        .to.be.revertedWithCustomError(escrow, "EscrowAccountingAlreadyActive");
      await listWithDeposit(TOKENS(10)); // trade 2, tracked live
      expect(await escrow.escrowedTokens()).to.equal(TOKENS(10));

      await escrow.syncLegacyEscrow(1); // trade 0
      await expect(escrow.connect(owner).emergencyWithdraw(await sec.getAddress(), 1n))
        .to.be.revertedWithCustomError(escrow, "EscrowAccountingIncomplete");

      // trade 1 settles before it is synced: its refund must not be subtracted
      await escrow.connect(seller).cancelTrade(1);
      await escrow.syncLegacyEscrow(10);
      expect(await escrow.escrowLegacySynced()).to.equal(2n);
      expect(await escrow.escrowedTokens()).to.equal(TOKENS(110));
      expect(await escrow.escrowedStable()).to.equal(0n);

      expect(await escrow.withdrawableBalance(await sec.getAddress())).to.equal(TOKENS(5));
      await expect(escrow.connect(owner).emergencyWithdraw(await sec.getAddress(), TOKENS(5) + 1n))
        .to.be.revertedWithCustomError(escrow, "InsufficientBalance");
      await escrow.connect(owner).emergencyWithdraw(await stable.getAddress(), USD(3));
    });

    it("subtracts a synced pre-upgrade trade when it settles", async function () {
      const { escrow, owner, seller } = await loadFixture(upgradedFixture);
      await escrow.connect(owner).initializeEscrowAccounting();
      await escrow.syncLegacyEscrow(10);
      expect(await escrow.escrowedTokens()).to.equal(TOKENS(100));
      await escrow.connect(seller).cancelTrade(0);
      expect(await escrow.escrowedTokens()).to.equal(0n);
    });
  });
});
