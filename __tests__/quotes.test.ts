/**
 * Tests for US-018: Live quote integration for portfolio holdings.
 *
 * Tests cover:
 * - refreshQuotes function (fetching and caching)
 * - Quote cache operations (get, clear, staleness)
 * - buildPriceMap function
 * - getQuoteStaleness function
 * - isQuoteStale helper
 * - Holdings enrichment with live quotes
 * - RefreshQuotesButton component structure
 * - Portfolio page structure with quote integration
 */

import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ── Quote actions tests ─────────────────────────────────────────────────

describe("Quote actions and cache", () => {
  let refreshQuotes: typeof import("@/lib/actions/quotes").refreshQuotes;
  let getCachedQuote: typeof import("@/lib/quote-cache").getCachedQuote;
  let getAllCachedQuotes: typeof import("@/lib/quote-cache").getAllCachedQuotes;
  let clearQuoteCache: typeof import("@/lib/quote-cache").clearQuoteCache;
  let buildPriceMap: typeof import("@/lib/quote-cache").buildPriceMap;
  let getQuoteStaleness: typeof import("@/lib/quote-cache").getQuoteStaleness;
  let isQuoteStale: typeof import("@/lib/quote-cache").isQuoteStale;
  beforeEach(async () => {
    const actionMod = await import("@/lib/actions/quotes");
    const cacheMod = await import("@/lib/quote-cache");
    refreshQuotes = actionMod.refreshQuotes;
    getCachedQuote = cacheMod.getCachedQuote;
    getAllCachedQuotes = cacheMod.getAllCachedQuotes;
    clearQuoteCache = cacheMod.clearQuoteCache;
    buildPriceMap = cacheMod.buildPriceMap;
    getQuoteStaleness = cacheMod.getQuoteStaleness;
    isQuoteStale = cacheMod.isQuoteStale;
    clearQuoteCache();
  });

  after(() => {
    clearQuoteCache!();
  });

  describe("refreshQuotes", () => {
    it("should return success with fetched quotes", async () => {
      const result = await refreshQuotes(["AAPL", "MSFT"]);
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.ok(result.data.quotes["AAPL"]);
      assert.ok(result.data.quotes["MSFT"]);
      assert.equal(result.data.errors.length, 0);
    });

    it("should cache quotes after refresh", async () => {
      await refreshQuotes(["AAPL"]);
      const cached = getCachedQuote("AAPL");
      assert.ok(cached);
      assert.equal(cached!.symbol, "AAPL");
      assert.equal(typeof cached!.price, "number");
      assert.ok(cached!.price > 0);
    });

    it("should normalize symbols to uppercase", async () => {
      const result = await refreshQuotes(["aapl"]);
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.ok(result.data.quotes["AAPL"]);
      const cached = getCachedQuote("aapl");
      assert.ok(cached);
      assert.equal(cached!.symbol, "AAPL");
    });

    it("should deduplicate symbols", async () => {
      const result = await refreshQuotes(["AAPL", "aapl", " AAPL "]);
      assert.equal(result.success, true);
      if (!result.success) return;
      // Should only have one entry
      assert.equal(Object.keys(result.data.quotes).length, 1);
    });

    it("should handle empty symbol list", async () => {
      const result = await refreshQuotes([]);
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(Object.keys(result.data.quotes).length, 0);
      assert.equal(result.data.errors.length, 0);
    });

    it("should include fetchedAt timestamp", async () => {
      const before = Date.now();
      const result = await refreshQuotes(["GOOGL"]);
      const after = Date.now();
      assert.equal(result.success, true);
      if (!result.success) return;
      const quote = result.data.quotes["GOOGL"];
      assert.ok(quote.fetchedAt >= before);
      assert.ok(quote.fetchedAt <= after);
    });

    it("should include change and changePercent", async () => {
      const result = await refreshQuotes(["TSLA"]);
      assert.equal(result.success, true);
      if (!result.success) return;
      const quote = result.data.quotes["TSLA"];
      assert.equal(typeof quote.change, "number");
      assert.equal(typeof quote.changePercent, "number");
    });
  });

  describe("getCachedQuote", () => {
    it("should return undefined for uncached symbol", () => {
      const cached = getCachedQuote("UNKNOWN");
      assert.equal(cached, undefined);
    });

    it("should return cached quote after refresh", async () => {
      await refreshQuotes(["NFLX"]);
      const cached = getCachedQuote("NFLX");
      assert.ok(cached);
      assert.equal(cached!.symbol, "NFLX");
    });

    it("should normalize symbol lookup", async () => {
      await refreshQuotes(["AMZN"]);
      const cached = getCachedQuote("  amzn  ");
      assert.ok(cached);
      assert.equal(cached!.symbol, "AMZN");
    });
  });

  describe("getAllCachedQuotes", () => {
    it("should return empty object when cache is clear", () => {
      const all = getAllCachedQuotes();
      assert.deepEqual(all, {});
    });

    it("should return all cached quotes", async () => {
      await refreshQuotes(["AAPL", "MSFT"]);
      const all = getAllCachedQuotes();
      assert.ok(all["AAPL"]);
      assert.ok(all["MSFT"]);
      assert.equal(Object.keys(all).length, 2);
    });
  });

  describe("clearQuoteCache", () => {
    it("should clear all cached quotes", async () => {
      await refreshQuotes(["AAPL"]);
      assert.ok(getCachedQuote("AAPL"));
      clearQuoteCache();
      assert.equal(getCachedQuote("AAPL"), undefined);
    });
  });

  describe("isQuoteStale", () => {
    it("should return false for fresh quote", () => {
      const quote = {
        symbol: "AAPL",
        price: 150,
        change: 1,
        changePercent: 0.67,
        fetchedAt: Date.now(),
      };
      assert.equal(isQuoteStale(quote), false);
    });

    it("should return true for quote older than 5 minutes", () => {
      const quote = {
        symbol: "AAPL",
        price: 150,
        change: 1,
        changePercent: 0.67,
        fetchedAt: Date.now() - 6 * 60 * 1000, // 6 minutes ago
      };
      assert.equal(isQuoteStale(quote), true);
    });

    it("should accept custom now parameter", () => {
      const fetchedAt = 1000000;
      const quote = {
        symbol: "AAPL",
        price: 150,
        change: 1,
        changePercent: 0.67,
        fetchedAt,
      };
      // 4 minutes later: not stale
      assert.equal(isQuoteStale(quote, fetchedAt + 4 * 60 * 1000), false);
      // 6 minutes later: stale
      assert.equal(isQuoteStale(quote, fetchedAt + 6 * 60 * 1000), true);
    });
  });

  describe("buildPriceMap", () => {
    it("should return empty object for uncached symbols", () => {
      const prices = buildPriceMap(["AAPL", "MSFT"]);
      assert.deepEqual(prices, {});
    });

    it("should return prices for cached symbols", async () => {
      await refreshQuotes(["AAPL", "MSFT"]);
      const prices = buildPriceMap(["AAPL", "MSFT"]);
      assert.ok(prices["AAPL"]);
      assert.ok(prices["MSFT"]);
      assert.equal(typeof prices["AAPL"], "number");
    });

    it("should skip symbols without cached data", async () => {
      await refreshQuotes(["AAPL"]);
      const prices = buildPriceMap(["AAPL", "UNKNOWN"]);
      assert.ok(prices["AAPL"]);
      assert.equal(prices["UNKNOWN"], undefined);
    });

    it("should normalize symbols", async () => {
      await refreshQuotes(["AAPL"]);
      const prices = buildPriceMap(["aapl"]);
      assert.ok(prices["AAPL"]);
    });
  });

  describe("getQuoteStaleness", () => {
    it("should return empty for uncached symbols", () => {
      const staleness = getQuoteStaleness(["UNKNOWN"]);
      assert.deepEqual(staleness, {});
    });

    it("should return fresh status for recently fetched", async () => {
      await refreshQuotes(["AAPL"]);
      const staleness = getQuoteStaleness(["AAPL"]);
      assert.ok(staleness["AAPL"]);
      assert.equal(staleness["AAPL"].isStale, false);
      assert.equal(typeof staleness["AAPL"].fetchedAt, "number");
    });

    it("should normalize symbols", async () => {
      await refreshQuotes(["AAPL"]);
      const staleness = getQuoteStaleness(["aapl"]);
      assert.ok(staleness["AAPL"]);
    });
  });
});

// ── Holdings enrichment with quotes ─────────────────────────────────────

describe("Holdings enrichment with live quotes", () => {
  let getHoldings: typeof import("@/lib/actions/holding").getHoldings;
  let createPortfolio: typeof import("@/lib/actions/portfolio").createPortfolio;
  let deletePortfolio: typeof import("@/lib/actions/portfolio").deletePortfolio;
  let createTransaction: typeof import("@/lib/actions/transaction").createTransaction;
  let refreshQuotes: typeof import("@/lib/actions/quotes").refreshQuotes;
  let buildPriceMap: typeof import("@/lib/quote-cache").buildPriceMap;
  let clearQuoteCache: typeof import("@/lib/quote-cache").clearQuoteCache;

  let testPortfolioId: string;

  beforeEach(async () => {
    const holdingMod = await import("@/lib/actions/holding");
    const portfolioMod = await import("@/lib/actions/portfolio");
    const txMod = await import("@/lib/actions/transaction");
    const quotesActionMod = await import("@/lib/actions/quotes");
    const cacheMod = await import("@/lib/quote-cache");
    getHoldings = holdingMod.getHoldings;
    createPortfolio = portfolioMod.createPortfolio;
    deletePortfolio = portfolioMod.deletePortfolio;
    createTransaction = txMod.createTransaction;
    refreshQuotes = quotesActionMod.refreshQuotes;
    buildPriceMap = cacheMod.buildPriceMap;
    clearQuoteCache = cacheMod.clearQuoteCache;

    clearQuoteCache();

    // Create a test portfolio with a holding
    const pResult = await createPortfolio({ name: "quote-test-portfolio" });
    assert.equal(pResult.success, true);
    if (!pResult.success) return;
    testPortfolioId = pResult.data.id;

    await createTransaction({
      portfolioId: testPortfolioId,
      symbol: "AAPL",
      type: "BUY",
      quantity: 10,
      price: 100,
      fees: 0,
      occurredAt: new Date("2024-01-01"),
    });
  });

  after(async () => {
    if (testPortfolioId) {
      const portfolioMod = await import("@/lib/actions/portfolio");
      await portfolioMod.deletePortfolio(testPortfolioId);
    }
    const cacheMod = await import("@/lib/quote-cache");
    cacheMod.clearQuoteCache();
  });

  it("should return null computed fields without quotes", async () => {
    const result = await getHoldings(testPortfolioId);
    assert.equal(result.success, true);
    if (!result.success) return;
    const holding = result.data.find((h) => h.symbol === "AAPL");
    assert.ok(holding);
    assert.equal(holding!.currentValue, null);
    assert.equal(holding!.gainLoss, null);
    assert.equal(holding!.gainLossPercent, null);
  });

  it("should enrich holdings with live quote data", async () => {
    await refreshQuotes(["AAPL"]);
    const prices = buildPriceMap(["AAPL"]);
    const result = await getHoldings(testPortfolioId, prices);
    assert.equal(result.success, true);
    if (!result.success) return;
    const holding = result.data.find((h) => h.symbol === "AAPL");
    assert.ok(holding);
    assert.notEqual(holding!.currentValue, null);
    assert.notEqual(holding!.gainLoss, null);
    assert.notEqual(holding!.gainLossPercent, null);
    assert.equal(typeof holding!.currentValue, "number");
    assert.ok(holding!.currentValue! > 0);
  });

  it("should calculate unrealized gain/loss correctly", async () => {
    await refreshQuotes(["AAPL"]);
    const prices = buildPriceMap(["AAPL"]);
    const result = await getHoldings(testPortfolioId, prices);
    assert.equal(result.success, true);
    if (!result.success) return;
    const holding = result.data.find((h) => h.symbol === "AAPL");
    assert.ok(holding);
    // currentValue = quantity * currentPrice
    // gainLoss = currentValue - (quantity * avgCostBasis)
    const expectedValue = 10 * prices["AAPL"];
    const expectedGainLoss = expectedValue - 10 * 100;
    assert.equal(holding!.currentValue, expectedValue);
    assert.equal(holding!.gainLoss, expectedGainLoss);
  });
});

// ── Component structure tests ──────────────────────────────────────────

describe("RefreshQuotesButton component", () => {
  const componentPath = join(
    __dirname,
    "..",
    "components",
    "portfolio",
    "refresh-quotes-button.tsx"
  );

  it("should exist", () => {
    assert.ok(existsSync(componentPath));
  });

  it("should be a client component", () => {
    const content = readFileSync(componentPath, "utf-8");
    assert.ok(content.includes('"use client"'));
  });

  it("should export RefreshQuotesButton", () => {
    const content = readFileSync(componentPath, "utf-8");
    assert.ok(content.includes("export function RefreshQuotesButton"));
  });

  it("should have data-testid for the button", () => {
    const content = readFileSync(componentPath, "utf-8");
    assert.ok(content.includes('data-testid="refresh-quotes-button"'));
  });

  it("should call refreshQuotes action", () => {
    const content = readFileSync(componentPath, "utf-8");
    assert.ok(content.includes("refreshQuotes"));
  });

  it("should show loading state", () => {
    const content = readFileSync(componentPath, "utf-8");
    assert.ok(content.includes("Refreshing"));
  });

  it("should show error indicator", () => {
    const content = readFileSync(componentPath, "utf-8");
    assert.ok(content.includes('data-testid="refresh-quotes-error"'));
  });

  it("should accept symbols prop", () => {
    const content = readFileSync(componentPath, "utf-8");
    assert.ok(content.includes("symbols: string[]"));
  });
});

describe("Portfolio page with quote integration", () => {
  const pagePath = join(
    __dirname,
    "..",
    "app",
    "dashboard",
    "portfolio",
    "page.tsx"
  );

  it("should import RefreshQuotesButton", () => {
    const content = readFileSync(pagePath, "utf-8");
    assert.ok(content.includes("RefreshQuotesButton"));
  });

  it("should import buildPriceMap from quote-cache", () => {
    const content = readFileSync(pagePath, "utf-8");
    assert.ok(content.includes("buildPriceMap"));
    assert.ok(content.includes("quote-cache"));
  });

  it("should import getQuoteStaleness from quote-cache", () => {
    const content = readFileSync(pagePath, "utf-8");
    assert.ok(content.includes("getQuoteStaleness"));
  });

  it("should render stale quotes warning", () => {
    const content = readFileSync(pagePath, "utf-8");
    assert.ok(content.includes('data-testid="stale-quotes-warning"'));
  });

  it("should pass symbols to RefreshQuotesButton", () => {
    const content = readFileSync(pagePath, "utf-8");
    assert.ok(content.includes("symbols={symbols}"));
  });

  it("should use currentPrices with getHoldings", () => {
    const content = readFileSync(pagePath, "utf-8");
    assert.ok(content.includes("getHoldings(portfolio.id, currentPrices)"));
  });
});

describe("HoldingsTable with stale/missing indicators", () => {
  const tablePath = join(
    __dirname,
    "..",
    "components",
    "portfolio",
    "holdings-table.tsx"
  );

  it("should have quoteStale field in HoldingRow", () => {
    const content = readFileSync(tablePath, "utf-8");
    assert.ok(content.includes("quoteStale"));
  });

  it("should have quoteMissing field in HoldingRow", () => {
    const content = readFileSync(tablePath, "utf-8");
    assert.ok(content.includes("quoteMissing"));
  });

  it("should show warning for missing quotes", () => {
    const content = readFileSync(tablePath, "utf-8");
    assert.ok(content.includes("quote-missing-"));
  });

  it("should show indicator for stale quotes", () => {
    const content = readFileSync(tablePath, "utf-8");
    assert.ok(content.includes("quote-stale-"));
  });
});
