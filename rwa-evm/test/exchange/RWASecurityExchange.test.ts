import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { cacheKYC, deployKYCVerifier, deploySecurityToken, kycProof } from "../helpers/kyc";
import { zeroMappingEntry, zeroStateVariables } from "../helpers/storage";

const EXCHANGE = "contracts/RWASecurityExchange.sol:RWASecurityExchange";
const TOKENS = (n: number) => ethers.parseEther(String(n));
const USD = (n: number) => BigInt(Math.round(n * 1e6));
const BUY = 0;
const SELL = 1;
// default fees: maker 10 bps, taker 25 bps; buy orders escrow the higher rate on top of the cost
const withFeeReserve = (cost: bigint) => cost + (cost * 25n) / 10000n;

describe("RWASecurityExchange", function () {
  async function fixture() {
    const [admin, signer, seller, buyer, feeCollector, stranger] = await ethers.getSigners();
    const verifier: any = await deployKYCVerifier(signer.address, admin.address);
    const { token: sec } = await deploySecurityToken(admin, verifier);
    const usdc: any = await (await ethers.getContractFactory("MockERC20")).deploy("USD Coin", "USDC", 6);

    const exchange: any = await upgrades.deployProxy(
      await ethers.getContractFactory("RWASecurityExchange"),
      [admin.address, await verifier.getAddress(), await usdc.getAddress(), feeCollector.address],
      { kind: "uups" }
    );
    const exchangeAddress = await exchange.getAddress();
    await exchange.createTradingPair(await sec.getAddress(), await usdc.getAddress());

    // KYC is enforced on the security token, the exchange holds tokens too
    await cacheKYC(sec, signer, verifier, [seller.address, buyer.address, exchangeAddress]);
    await sec.mint(seller.address, TOKENS(1_000));
    await usdc.mint(buyer.address, USD(1_000_000));
    await sec.connect(seller).approve(exchangeAddress, ethers.MaxUint256);
    await usdc.connect(buyer).approve(exchangeAddress, ethers.MaxUint256);

    const order = async (who: any, side: number, price: bigint, amount: bigint) =>
      exchange.connect(who).createOrder(
        await sec.getAddress(), await usdc.getAddress(), side, price, amount,
        await kycProof(signer, verifier, who.address)
      );
    return { exchange, exchangeAddress, sec, usdc, admin, seller, buyer, feeCollector, stranger, order };
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

  describe("security token checks", function () {
    it("rejects orders from frozen wallets and sells of frozen tokens", async function () {
      const { sec, admin, seller, order, exchange } = await loadFixture(fixture);
      await sec.connect(admin).freezePartialTokens(seller.address, TOKENS(990));
      await expect(order(seller, SELL, USD(2), TOKENS(11))).to.be.revertedWithCustomError(exchange, "TokensLocked");
      await order(seller, SELL, USD(2), TOKENS(10));

      await sec.connect(admin).setAddressFrozen(seller.address, true);
      await expect(order(seller, SELL, USD(2), TOKENS(1))).to.be.revertedWithCustomError(exchange, "AccountFrozen");
    });
  });

  describe("fees", function () {
    it("matches at equal prices, with the buyer's fee paid on top of the price", async function () {
      const { exchange, exchangeAddress, usdc, seller, buyer, feeCollector, order } = await loadFixture(fixture);
      await order(seller, SELL, USD(2), TOKENS(10)); // maker
      // taker buy at the same price: 20 USDC + 0.25% taker fee; seller pays the 0.10% maker fee
      await expect(order(buyer, BUY, USD(2), TOKENS(10))).to.changeTokenBalances(
        usdc,
        [buyer, seller, feeCollector],
        [-USD(20.05), USD(19.98), USD(0.07)]
      );
      expect(await usdc.balanceOf(exchangeAddress)).to.equal(0n);
      expect(await exchange.escrowedBalance(await usdc.getAddress())).to.equal(0n);
    });

    it("refunds the unused fee reserve when the buyer is the maker, across partial fills", async function () {
      const { exchange, exchangeAddress, usdc, sec, seller, buyer, feeCollector, order } = await loadFixture(fixture);
      const before = await usdc.balanceOf(buyer.address);
      await order(buyer, BUY, USD(2), TOKENS(10)); // maker, escrows 20.05
      expect(await exchange.buyOrderEscrow(1)).to.equal(USD(20.05));
      await order(seller, SELL, USD(2), TOKENS(4));
      await order(seller, SELL, USD(2), TOKENS(6));

      expect(await sec.balanceOf(buyer.address)).to.equal(TOKENS(10));
      // 20 for the tokens + 0.10% maker fee
      expect(before - (await usdc.balanceOf(buyer.address))).to.equal(USD(20.02));
      // maker 0.02 from the buyer, taker 0.05 from the seller
      expect(await usdc.balanceOf(feeCollector.address)).to.equal(USD(0.07));
      expect(await usdc.balanceOf(exchangeAddress)).to.equal(0n);
      expect(await exchange.buyOrderEscrow(1)).to.equal(0n);
      expect(await exchange.escrowedBalance(await usdc.getAddress())).to.equal(0n);
    });

    it("refunds the whole reserve when a buy order is cancelled", async function () {
      const { exchange, usdc, buyer, order } = await loadFixture(fixture);
      await order(buyer, BUY, USD(1), TOKENS(50));
      await expect(exchange.connect(buyer).cancelOrder(1)).to.changeTokenBalance(usdc, buyer, withFeeReserve(USD(50)));
    });
  });

  describe("emergencyWithdraw", function () {
    it("cannot take funds of open orders", async function () {
      const { exchange, sec, usdc, admin } = await loadFixture(openOrdersFixture);
      expect(await exchange.escrowedBalance(await sec.getAddress())).to.equal(TOKENS(100));
      expect(await exchange.escrowedBalance(await usdc.getAddress())).to.equal(withFeeReserve(USD(50)));
      await expect(exchange.connect(admin).emergencyWithdraw(await sec.getAddress(), TOKENS(5) + 1n))
        .to.be.revertedWithCustomError(exchange, "InsufficientBalance");
      await expect(exchange.connect(admin).emergencyWithdraw(await usdc.getAddress(), USD(3) + 1n))
        .to.be.revertedWithCustomError(exchange, "InsufficientBalance");
    });

    it("can take what no order is owed", async function () {
      const { exchange, sec, usdc, admin } = await loadFixture(openOrdersFixture);
      expect(await exchange.withdrawableBalance(await usdc.getAddress())).to.equal(USD(3));
      await expect(exchange.connect(admin).emergencyWithdraw(await usdc.getAddress(), USD(3)))
        .to.changeTokenBalance(usdc, admin, USD(3));
      expect(await exchange.withdrawableBalance(await sec.getAddress())).to.equal(TOKENS(5));
    });

    it("is admin only", async function () {
      const { exchange, usdc, stranger } = await loadFixture(openOrdersFixture);
      await expect(exchange.connect(stranger).emergencyWithdraw(await usdc.getAddress(), 1n)).to.be.reverted;
    });

    it("tracks escrow through cancels and fills", async function () {
      const { exchange, sec, usdc, buyer, order } = await loadFixture(openOrdersFixture);
      await exchange.connect(buyer).cancelOrder(2);
      expect(await exchange.escrowedBalance(await usdc.getAddress())).to.equal(0n);

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

    it("prices pre-upgrade buy orders without a fee reserve and still settles them", async function () {
      const f = await loadFixture(fixture);
      const { exchange, exchangeAddress, usdc, seller, buyer, order } = f;
      await order(buyer, BUY, USD(2), TOKENS(10));
      // a v1 buy order escrowed only price * amount and has no recorded escrow
      await zeroMappingEntry(exchangeAddress, EXCHANGE, "_buyEscrowRecorded", 1n);
      await zeroMappingEntry(exchangeAddress, EXCHANGE, "buyOrderEscrow", 1n);

      // fill against the legacy order: fees are capped to what it holds, nothing reverts
      await order(seller, SELL, USD(2), TOKENS(4));
      await order(seller, SELL, USD(2), TOKENS(6));
      expect((await exchange.getOrder(1)).status).to.equal(1); // Filled
      // the v2 deposit's 0.05 reserve was never part of the v1 order, so it stays behind as surplus
      expect(await usdc.balanceOf(exchangeAddress)).to.equal(USD(0.05));
    });
  });
});
