import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/db";
import { createTransaction, getTransactions } from "../lib/actions/transaction";
import { getHoldings } from "../lib/actions/holding";

// ── Test helpers ────────────────────────────────────────────────────────

const TEST_PREFIX = "txn-test-";

async function createTestPortfolio(name: string) {
  return prisma.portfolio.create({
    data: { id: `${TEST_PREFIX}${name}`, name, baseCurrency: "EUR" },
  });
}

async function cleanup() {
  // Delete test portfolios (cascades to holdings + transactions)
  await prisma.portfolio.deleteMany({
    where: { id: { startsWith: TEST_PREFIX } },
  });
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("Transaction & Holding actions", () => {
  before(async () => {
    await cleanup();
  });

  after(async () => {
    await cleanup();
  });

  describe("createTransaction — BUY", () => {
    it("creates a BUY transaction and a new holding", async () => {
      const portfolio = await createTestPortfolio("buy-new");

      const result = await createTransaction({
        portfolioId: portfolio.id,
        symbol: "AAPL",
        type: "BUY",
        quantity: 10,
        price: 150,
      });

      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data.symbol, "AAPL");
      assert.equal(result.data.type, "BUY");
      assert.equal(result.data.quantity, 10);

      // Verify holding was created
      const holdings = await getHoldings(portfolio.id);
      assert.equal(holdings.success, true);
      if (!holdings.success) return;
      assert.equal(holdings.data.length, 1);
      assert.equal(holdings.data[0].symbol, "AAPL");
      assert.equal(holdings.data[0].quantity, 10);
      assert.equal(holdings.data[0].avgCostBasis, 150);
    });

    it("updates existing holding on additional BUY", async () => {
      const portfolio = await createTestPortfolio("buy-add");

      // First BUY: 10 @ $100
      await createTransaction({
        portfolioId: portfolio.id,
        symbol: "MSFT",
        type: "BUY",
        quantity: 10,
        price: 100,
      });

      // Second BUY: 10 @ $120
      await createTransaction({
        portfolioId: portfolio.id,
        symbol: "MSFT",
        type: "BUY",
        quantity: 10,
        price: 120,
      });

      const holdings = await getHoldings(portfolio.id);
      assert.equal(holdings.success, true);
      if (!holdings.success) return;
      assert.equal(holdings.data.length, 1);
      assert.equal(holdings.data[0].quantity, 20);
      assert.equal(holdings.data[0].avgCostBasis, 110); // (1000+1200)/20
    });
  });

  describe("createTransaction — SELL", () => {
    it("decreases holding quantity on SELL", async () => {
      const portfolio = await createTestPortfolio("sell-partial");

      await createTransaction({
        portfolioId: portfolio.id,
        symbol: "GOOG",
        type: "BUY",
        quantity: 20,
        price: 200,
      });

      const sellResult = await createTransaction({
        portfolioId: portfolio.id,
        symbol: "GOOG",
        type: "SELL",
        quantity: 5,
        price: 220,
      });

      assert.equal(sellResult.success, true);

      const holdings = await getHoldings(portfolio.id);
      assert.equal(holdings.success, true);
      if (!holdings.success) return;
      assert.equal(holdings.data[0].quantity, 15);
      // avgCostBasis stays the same on SELL
      assert.equal(holdings.data[0].avgCostBasis, 200);
    });

    it("removes holding when fully sold", async () => {
      const portfolio = await createTestPortfolio("sell-full");

      await createTransaction({
        portfolioId: portfolio.id,
        symbol: "TSLA",
        type: "BUY",
        quantity: 5,
        price: 300,
      });

      await createTransaction({
        portfolioId: portfolio.id,
        symbol: "TSLA",
        type: "SELL",
        quantity: 5,
        price: 350,
      });

      const holdings = await getHoldings(portfolio.id);
      assert.equal(holdings.success, true);
      if (!holdings.success) return;
      assert.equal(holdings.data.length, 0);
    });

    it("rejects SELL with insufficient shares", async () => {
      const portfolio = await createTestPortfolio("sell-insuff");

      await createTransaction({
        portfolioId: portfolio.id,
        symbol: "NVDA",
        type: "BUY",
        quantity: 3,
        price: 500,
      });

      const result = await createTransaction({
        portfolioId: portfolio.id,
        symbol: "NVDA",
        type: "SELL",
        quantity: 10,
        price: 550,
      });

      assert.equal(result.success, false);
      if (result.success) return;
      assert.ok(result.error.includes("Insufficient shares"));
    });

    it("rejects SELL when no holding exists", async () => {
      const portfolio = await createTestPortfolio("sell-none");

      const result = await createTransaction({
        portfolioId: portfolio.id,
        symbol: "AMZN",
        type: "SELL",
        quantity: 1,
        price: 100,
      });

      assert.equal(result.success, false);
      if (result.success) return;
      assert.ok(result.error.includes("Insufficient shares"));
    });
  });

  describe("getTransactions", () => {
    it("returns transactions for a portfolio", async () => {
      const portfolio = await createTestPortfolio("get-txns");

      await createTransaction({
        portfolioId: portfolio.id,
        symbol: "META",
        type: "BUY",
        quantity: 5,
        price: 400,
      });
      await createTransaction({
        portfolioId: portfolio.id,
        symbol: "META",
        type: "BUY",
        quantity: 3,
        price: 420,
      });

      const result = await getTransactions(portfolio.id);
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data.length, 2);
    });

    it("returns empty array for portfolio with no transactions", async () => {
      const portfolio = await createTestPortfolio("get-empty");
      const result = await getTransactions(portfolio.id);
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data.length, 0);
    });
  });

  describe("getHoldings — computed fields", () => {
    it("returns null computed fields when no prices provided", async () => {
      const portfolio = await createTestPortfolio("hold-noprices");

      await createTransaction({
        portfolioId: portfolio.id,
        symbol: "AAPL",
        type: "BUY",
        quantity: 10,
        price: 150,
      });

      const result = await getHoldings(portfolio.id);
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data[0].currentValue, null);
      assert.equal(result.data[0].gainLoss, null);
      assert.equal(result.data[0].gainLossPercent, null);
    });

    it("computes fields when prices are provided", async () => {
      const portfolio = await createTestPortfolio("hold-prices");

      await createTransaction({
        portfolioId: portfolio.id,
        symbol: "AAPL",
        type: "BUY",
        quantity: 10,
        price: 150,
      });

      const result = await getHoldings(portfolio.id, { AAPL: 170 });
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data[0].currentValue, 1700);
      assert.equal(result.data[0].gainLoss, 200);
      assert.ok(Math.abs(result.data[0].gainLossPercent! - 13.33) < 0.01);
    });
  });

  describe("input validation", () => {
    it("rejects empty symbol", async () => {
      const portfolio = await createTestPortfolio("val-symbol");
      const result = await createTransaction({
        portfolioId: portfolio.id,
        symbol: "  ",
        type: "BUY",
        quantity: 1,
        price: 100,
      });
      assert.equal(result.success, false);
    });

    it("rejects zero quantity", async () => {
      const portfolio = await createTestPortfolio("val-qty");
      const result = await createTransaction({
        portfolioId: portfolio.id,
        symbol: "TEST",
        type: "BUY",
        quantity: 0,
        price: 100,
      });
      assert.equal(result.success, false);
    });

    it("rejects non-existent portfolio", async () => {
      const result = await createTransaction({
        portfolioId: "does-not-exist",
        symbol: "TEST",
        type: "BUY",
        quantity: 1,
        price: 100,
      });
      assert.equal(result.success, false);
      if (result.success) return;
      assert.ok(result.error.includes("Portfolio not found"));
    });
  });
});
