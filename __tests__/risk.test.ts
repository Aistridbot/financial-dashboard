import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateConcentration,
  calculateDiversificationScore,
  calculatePortfolioRisk,
} from "../lib/risk";
import type { HoldingInput } from "../lib/risk";

// ── Test fixtures ──────────────────────────────────────────────────────

const singleHolding: HoldingInput[] = [
  { symbol: "AAPL", quantity: 10, avgCostBasis: 150 },
];

const twoHoldings: HoldingInput[] = [
  { symbol: "AAPL", quantity: 10, avgCostBasis: 100 }, // 1000
  { symbol: "MSFT", quantity: 10, avgCostBasis: 100 }, // 1000
];

const unevenHoldings: HoldingInput[] = [
  { symbol: "AAPL", quantity: 80, avgCostBasis: 100 }, // 8000 = 80%
  { symbol: "MSFT", quantity: 10, avgCostBasis: 100 }, // 1000 = 10%
  { symbol: "GOOG", quantity: 10, avgCostBasis: 100 }, // 1000 = 10%
];

const mediumConcentration: HoldingInput[] = [
  { symbol: "AAPL", quantity: 30, avgCostBasis: 100 }, // 3000 = 30%
  { symbol: "MSFT", quantity: 25, avgCostBasis: 100 }, // 2500 = 25%
  { symbol: "GOOG", quantity: 25, avgCostBasis: 100 }, // 2500 = 25%
  { symbol: "AMZN", quantity: 20, avgCostBasis: 100 }, // 2000 = 20%
];

const evenFiveHoldings: HoldingInput[] = [
  { symbol: "AAPL", quantity: 10, avgCostBasis: 100 },
  { symbol: "MSFT", quantity: 10, avgCostBasis: 100 },
  { symbol: "GOOG", quantity: 10, avgCostBasis: 100 },
  { symbol: "AMZN", quantity: 10, avgCostBasis: 100 },
  { symbol: "META", quantity: 10, avgCostBasis: 100 },
];

const withCurrentPrices: HoldingInput[] = [
  { symbol: "AAPL", quantity: 10, avgCostBasis: 100, currentPrice: 200 }, // 2000
  { symbol: "MSFT", quantity: 10, avgCostBasis: 100, currentPrice: 100 }, // 1000
];

// ── calculateConcentration ─────────────────────────────────────────────

describe("calculateConcentration", () => {
  it("returns empty array for empty holdings", () => {
    assert.deepStrictEqual(calculateConcentration([]), []);
  });

  it("returns 100% for single holding", () => {
    const result = calculateConcentration(singleHolding);
    assert.equal(result.length, 1);
    assert.equal(result[0].symbol, "AAPL");
    assert.equal(result[0].percentage, 100);
  });

  it("returns 50/50 for equal holdings", () => {
    const result = calculateConcentration(twoHoldings);
    assert.equal(result.length, 2);
    assert.equal(result[0].percentage, 50);
    assert.equal(result[1].percentage, 50);
  });

  it("calculates correct percentages for uneven holdings", () => {
    const result = calculateConcentration(unevenHoldings);
    assert.equal(result[0].symbol, "AAPL");
    assert.equal(result[0].percentage, 80);
    assert.equal(result[1].percentage, 10);
    assert.equal(result[2].percentage, 10);
  });

  it("sorts by percentage descending", () => {
    const result = calculateConcentration(mediumConcentration);
    for (let i = 1; i < result.length; i++) {
      assert.ok(result[i - 1].percentage >= result[i].percentage);
    }
  });

  it("uses currentPrice when provided", () => {
    const result = calculateConcentration(withCurrentPrices);
    // AAPL: 10*200=2000, MSFT: 10*100=1000, total=3000
    const aapl = result.find((r) => r.symbol === "AAPL")!;
    const msft = result.find((r) => r.symbol === "MSFT")!;
    assert.ok(Math.abs(aapl.percentage - 66.67) < 0.1);
    assert.ok(Math.abs(msft.percentage - 33.33) < 0.1);
  });

  it("falls back to avgCostBasis when currentPrice is undefined", () => {
    const result = calculateConcentration(twoHoldings);
    assert.equal(result[0].percentage, 50);
  });

  it("percentages sum to 100", () => {
    const result = calculateConcentration(mediumConcentration);
    const total = result.reduce((s, r) => s + r.percentage, 0);
    assert.ok(Math.abs(total - 100) < 0.01);
  });

  it("handles zero-value holdings gracefully", () => {
    const zeroHoldings: HoldingInput[] = [
      { symbol: "AAPL", quantity: 0, avgCostBasis: 100 },
    ];
    const result = calculateConcentration(zeroHoldings);
    assert.equal(result[0].percentage, 0);
  });
});

// ── calculateDiversificationScore ──────────────────────────────────────

describe("calculateDiversificationScore", () => {
  it("returns 0 for empty holdings", () => {
    assert.equal(calculateDiversificationScore([]), 0);
  });

  it("returns 10 for single holding", () => {
    assert.equal(calculateDiversificationScore(singleHolding), 10);
  });

  it("returns higher score for more positions", () => {
    const twoScore = calculateDiversificationScore(twoHoldings);
    const fiveScore = calculateDiversificationScore(evenFiveHoldings);
    assert.ok(
      fiveScore > twoScore,
      `5 positions (${fiveScore}) should score higher than 2 (${twoScore})`
    );
  });

  it("returns higher score for even distribution", () => {
    const evenScore = calculateDiversificationScore(evenFiveHoldings);
    // Create uneven 5-position portfolio
    const unevenFive: HoldingInput[] = [
      { symbol: "AAPL", quantity: 90, avgCostBasis: 100 },
      { symbol: "MSFT", quantity: 2, avgCostBasis: 100 },
      { symbol: "GOOG", quantity: 3, avgCostBasis: 100 },
      { symbol: "AMZN", quantity: 3, avgCostBasis: 100 },
      { symbol: "META", quantity: 2, avgCostBasis: 100 },
    ];
    const unevenScore = calculateDiversificationScore(unevenFive);
    assert.ok(
      evenScore > unevenScore,
      `Even (${evenScore}) should score higher than uneven (${unevenScore})`
    );
  });

  it("returns score between 0 and 100", () => {
    const score = calculateDiversificationScore(mediumConcentration);
    assert.ok(score >= 0 && score <= 100, `Score ${score} out of range`);
  });

  it("perfectly even 5-position portfolio scores high", () => {
    const score = calculateDiversificationScore(evenFiveHoldings);
    assert.ok(score >= 70, `Expected >=70 for 5 even positions, got ${score}`);
  });
});

// ── calculatePortfolioRisk ─────────────────────────────────────────────

describe("calculatePortfolioRisk", () => {
  it("returns safe defaults for empty holdings", () => {
    const result = calculatePortfolioRisk([]);
    assert.equal(result.totalValue, 0);
    assert.equal(result.concentrationRisk, "LOW");
    assert.equal(result.diversificationScore, 0);
    assert.equal(result.largestPosition.symbol, "");
    assert.equal(result.largestPosition.percentage, 0);
  });

  it("returns HIGH concentration when position exceeds 40%", () => {
    // AAPL is 80% of portfolio
    const result = calculatePortfolioRisk(unevenHoldings);
    assert.equal(result.concentrationRisk, "HIGH");
    assert.equal(result.largestPosition.symbol, "AAPL");
    assert.equal(result.largestPosition.percentage, 80);
  });

  it("returns MEDIUM concentration when position exceeds 25% but not 40%", () => {
    // AAPL is 30%
    const result = calculatePortfolioRisk(mediumConcentration);
    assert.equal(result.concentrationRisk, "MEDIUM");
  });

  it("returns LOW concentration when no position exceeds 25%", () => {
    const result = calculatePortfolioRisk(evenFiveHoldings);
    assert.equal(result.concentrationRisk, "LOW");
    assert.equal(result.largestPosition.percentage, 20);
  });

  it("calculates correct totalValue", () => {
    const result = calculatePortfolioRisk(twoHoldings);
    // 10*100 + 10*100 = 2000
    assert.equal(result.totalValue, 2000);
  });

  it("uses currentPrice for totalValue when available", () => {
    const result = calculatePortfolioRisk(withCurrentPrices);
    // 10*200 + 10*100 = 3000
    assert.equal(result.totalValue, 3000);
  });

  it("identifies the largest position correctly", () => {
    const result = calculatePortfolioRisk(mediumConcentration);
    assert.equal(result.largestPosition.symbol, "AAPL");
    assert.equal(result.largestPosition.percentage, 30);
  });

  it("returns 100% single holding as HIGH risk", () => {
    const result = calculatePortfolioRisk(singleHolding);
    assert.equal(result.concentrationRisk, "HIGH");
    assert.equal(result.largestPosition.percentage, 100);
    assert.equal(result.totalValue, 1500);
  });

  it("boundary: exactly 25% is LOW (not MEDIUM)", () => {
    const boundary: HoldingInput[] = [
      { symbol: "A", quantity: 25, avgCostBasis: 100 },
      { symbol: "B", quantity: 25, avgCostBasis: 100 },
      { symbol: "C", quantity: 25, avgCostBasis: 100 },
      { symbol: "D", quantity: 25, avgCostBasis: 100 },
    ];
    const result = calculatePortfolioRisk(boundary);
    assert.equal(result.concentrationRisk, "LOW");
  });

  it("boundary: exactly 40% is MEDIUM (not HIGH)", () => {
    const boundary: HoldingInput[] = [
      { symbol: "A", quantity: 40, avgCostBasis: 100 },
      { symbol: "B", quantity: 30, avgCostBasis: 100 },
      { symbol: "C", quantity: 30, avgCostBasis: 100 },
    ];
    const result = calculatePortfolioRisk(boundary);
    assert.equal(result.concentrationRisk, "MEDIUM");
  });

  it("includes diversificationScore in result", () => {
    const result = calculatePortfolioRisk(evenFiveHoldings);
    assert.ok(typeof result.diversificationScore === "number");
    assert.ok(result.diversificationScore >= 0);
    assert.ok(result.diversificationScore <= 100);
  });
});
