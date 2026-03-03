import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateAvgCostBasis,
  calculatePositionValue,
  calculateGainLoss,
} from "../lib/calculations";

describe("calculateAvgCostBasis", () => {
  it("returns newPrice when starting from zero", () => {
    const avg = calculateAvgCostBasis(0, 0, 10, 50);
    assert.equal(avg, 50);
  });

  it("calculates weighted average for additional buy", () => {
    // Hold 10 @ $50, buy 10 @ $60 → avg = (500 + 600) / 20 = 55
    const avg = calculateAvgCostBasis(10, 50, 10, 60);
    assert.equal(avg, 55);
  });

  it("handles unequal quantities", () => {
    // Hold 20 @ $100, buy 10 @ $130 → avg = (2000 + 1300) / 30 = 110
    const avg = calculateAvgCostBasis(20, 100, 10, 130);
    assert.ok(Math.abs(avg - 110) < 0.01);
  });

  it("throws for non-positive new quantity", () => {
    assert.throws(() => calculateAvgCostBasis(10, 50, 0, 60), /positive/i);
    assert.throws(() => calculateAvgCostBasis(10, 50, -5, 60), /positive/i);
  });
});

describe("calculatePositionValue", () => {
  it("multiplies quantity by price", () => {
    assert.equal(calculatePositionValue(10, 150), 1500);
  });

  it("returns 0 for zero quantity", () => {
    assert.equal(calculatePositionValue(0, 150), 0);
  });
});

describe("calculateGainLoss", () => {
  it("calculates positive gain", () => {
    // 10 shares, avg $100, now $120 → gain = 200, 20%
    const result = calculateGainLoss(10, 100, 120);
    assert.equal(result.gainLoss, 200);
    assert.equal(result.gainLossPercent, 20);
  });

  it("calculates negative loss", () => {
    // 10 shares, avg $100, now $80 → loss = -200, -20%
    const result = calculateGainLoss(10, 100, 80);
    assert.equal(result.gainLoss, -200);
    assert.equal(result.gainLossPercent, -20);
  });

  it("returns zero when price equals cost", () => {
    const result = calculateGainLoss(10, 100, 100);
    assert.equal(result.gainLoss, 0);
    assert.equal(result.gainLossPercent, 0);
  });

  it("handles zero cost basis without dividing by zero", () => {
    const result = calculateGainLoss(0, 0, 100);
    assert.equal(result.gainLoss, 0);
    assert.equal(result.gainLossPercent, 0);
  });
});
