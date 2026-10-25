import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployKYCVerifier, kycProof } from "../helpers/kyc";
import { zeroMappingEntry, zeroStateVariables } from "../helpers/storage";

const EXCHANGE = "contracts/RWASecurityExchange.sol:RWASecurityExchange";
const TOKENS = (n: number) => ethers.parseEther(String(n));
const USD = (n: number) => BigInt(n) * 10n ** 6n;
const BUY = 0;
const SELL = 1;

describe("RWASecurityExchange", function () {
  async function fixture() {
    const [admin, signer, seller, buyer, feeCollector, stranger] = await ethers.getSigners();
    const verifier: any = await deployKYCVerifier(signer.address, admin.address);
    const sec: any = await (await ethers.getContractFactory("MockExchangeToken")).deploy();
    const usdc: any = await (await ethers.getContractFactory("MockERC20")).deploy("USD Coin", "USDC", 6);

    const exchange: any = await upgrades.deployProxy(
      await ethers.getContractFactory("RWASecurityExchange"),
      [admin.address, await verifier.getAddress(), await usdc.getAddress(), feeCollector.address],
      { kind: "uups" }
    );
    const exchangeAddress = await exchange.getAddress();
    await exchange.createTradingPair(await sec.getAddress(), await usdc.getAddress());

    await sec.mint(seller.address, TOKENS(1_000));
    await usdc.mint(buyer.address, USD(1_000_000));
    await sec.connect(seller).approve(exchangeAddress, ethers.MaxUint256);
    await usdc.connect(buyer).approve(exchangeAddress, ethers.MaxUint256);

    const order = async (who: any, side: number, price: bigint, amount: bigint) =>
      exchange.connect(who).createOrder(
        await sec.getAddress(), await usdc.getAddress(), side, price, amount,
        await kycProof(signer, verifier, who.address)
      );
    return { exchange, exchangeAddress, sec, usdc, admin, seller, buyer, stranger, order };
  }

  /** order 1: sell 100 at $2; order 2: buy 50 at $1 (no match); plus stray funds */
  async function openOrdersFixture() {
    const f = await fixture();
    await f.order(f.seller, SELL, USD(2), TOKENS(100));
    await f.order(f.buyer, BUY, USD(1), TOKENS(50));
    await f.sec.mint(f.exchangeAddress, TOKENS(5));
    await f.usdc.mint(f.exchangeAddress, USD(3));
    return f;
  }

  describe("emergencyWithdraw", function () {
    it("cannot take funds of open orders", async function () {
      const { exchange, sec, usdc, admin } = await loadFixture(openOrdersFixture);
      expect(await exchange.escrowedBalance(await sec.getAddress())).to.equal(TOKENS(100));
      expect(await exchange.escrowedBalance(await usdc.getAddress())).to.equal(USD(50));
      await expect(exchange.connect(admin).emergencyWithdraw(await sec.getAddress(), TOKENS(5) + 1n))
        .to.be.revertedWithCustomError(exchange, "InsufficientBalance");
      await expect(exchange.connect(admin).emergencyWithdraw(await usdc.getAddress(), USD(3) + 1n))
        .to.be.revertedWithCustomError(exchange, "InsufficientBalance");
    });

    it("can take what no order is owed", async function () {
      const { exchange, sec, usdc, admin } = await loadFixture(openOrdersFixture);
      expect(await exchange.withdrawableBalance(await usdc.getAddress())).to.equal(USD(3));
      await expect(exchange.connect(admin).emergencyWithdraw(await sec.getAddress(), TOKENS(5)))
        .to.changeTokenBalance(sec, admin, TOKENS(5));
      await expect(exchange.connect(admin).emergencyWithdraw(await usdc.getAddress(), USD(3)))
        .to.changeTokenBalance(usdc, admin, USD(3));
    });

    it("is admin only", async function () {
      const { exchange, usdc, stranger } = await loadFixture(openOrdersFixture);
      await expect(exchange.connect(stranger).emergencyWithdraw(await usdc.getAddress(), 1n)).to.be.reverted;
    });

    it("tracks escrow through cancels and fills", async function () {
      const { exchange, sec, usdc, buyer, order } = await loadFixture(openOrdersFixture);
      await exchange.connect(buyer).cancelOrder(2);
      expect(await exchange.escrowedBalance(await usdc.getAddress())).to.equal(0n);

      await exchange.setFees(0, 0);
      await order(buyer, BUY, USD(2), TOKENS(10)); // fills 10 of the sell order
      expect(await sec.balanceOf(buyer.address)).to.equal(TOKENS(10));
      expect(await exchange.escrowedBalance(await sec.getAddress())).to.equal(TOKENS(90));
      expect(await exchange.escrowedBalance(await usdc.getAddress())).to.equal(0n);
    });
  });

  describe("after an upgrade from v1", function () {
    it("keeps order escrow locked until pre-upgrade orders are added up", async function () {
      const f = await loadFixture(openOrdersFixture);
      const { exchange, exchangeAddress, sec, usdc, admin, buyer } = f;
      await zeroStateVariables(exchangeAddress, EXCHANGE, ["escrowAccountingActive", "escrowTrackedFrom", "escrowLegacySynced"]);
      await zeroMappingEntry(exchangeAddress, EXCHANGE, "escrowedBalance", await sec.getAddress());
      await zeroMappingEntry(exchangeAddress, EXCHANGE, "escrowedBalance", await usdc.getAddress());

      await expect(exchange.connect(admin).emergencyWithdraw(await usdc.getAddress(), 1n))
        .to.be.revertedWithCustomError(exchange, "EscrowAccountingIncomplete");

      await exchange.connect(admin).initializeEscrowAccounting();
      expect(await exchange.escrowTrackedFrom()).to.equal(3n);
      await exchange.connect(buyer).cancelOrder(2); // pre-upgrade order settled before the sync
      await exchange.syncLegacyEscrow(1);
      await expect(exchange.connect(admin).emergencyWithdraw(await usdc.getAddress(), 1n))
        .to.be.revertedWithCustomError(exchange, "EscrowAccountingIncomplete");
      await exchange.syncLegacyEscrow(1);

      expect(await exchange.escrowedBalance(await sec.getAddress())).to.equal(TOKENS(100));
      expect(await exchange.escrowedBalance(await usdc.getAddress())).to.equal(0n);
      await expect(exchange.connect(admin).emergencyWithdraw(await sec.getAddress(), TOKENS(5) + 1n))
        .to.be.revertedWithCustomError(exchange, "InsufficientBalance");
      await exchange.connect(admin).emergencyWithdraw(await usdc.getAddress(), USD(3));
    });
  });
});
