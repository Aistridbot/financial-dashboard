import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTOBTax } from '../lib/tob-tax';
import type { InstrumentType } from '../lib/tob-tax';

describe('calculateTOBTax', () => {
  describe('stock rate (0.35%, cap €1,600)', () => {
    it('calculates tax for a small stock purchase', () => {
      const result = calculateTOBTax('BUY', 10000);
      assert.equal(result.taxRate, 0.0035);
      assert.equal(result.taxAmount, 35); // 10000 * 0.0035
      assert.equal(result.cappedAt, 1600);
    });

    it('calculates tax for a stock sale', () => {
      const result = calculateTOBTax('SELL', 50000);
      assert.equal(result.taxRate, 0.0035);
      assert.equal(result.taxAmount, 175); // 50000 * 0.0035
      assert.equal(result.cappedAt, 1600);
    });

    it('caps tax at €1,600 for large stock transactions', () => {
      // 500000 * 0.0035 = 1750, capped at 1600
      const result = calculateTOBTax('BUY', 500000);
      assert.equal(result.taxAmount, 1600);
    });

    it('caps tax exactly at boundary', () => {
      // 1600 / 0.0035 ≈ 457142.86 — at 457143 the raw tax exceeds cap
      const result = calculateTOBTax('BUY', 457143);
      assert.equal(result.taxAmount, 1600); // capped
    });

    it('defaults to stock rate when instrumentType is undefined', () => {
      const result = calculateTOBTax('BUY', 10000, undefined);
      assert.equal(result.taxRate, 0.0035);
      assert.equal(result.taxAmount, 35);
      assert.equal(result.cappedAt, 1600);
    });

    it('uses stock rate when explicitly specified', () => {
      const result = calculateTOBTax('BUY', 10000, 'stock');
      assert.equal(result.taxRate, 0.0035);
      assert.equal(result.taxAmount, 35);
    });
  });

  describe('accumulating fund rate (1.32%, cap €4,000)', () => {
    it('calculates tax for accumulating fund purchase', () => {
      const result = calculateTOBTax('BUY', 10000, 'accumulating_fund');
      assert.equal(result.taxRate, 0.0132);
      assert.equal(result.taxAmount, 132); // 10000 * 0.0132
      assert.equal(result.cappedAt, 4000);
    });

    it('caps tax at €4,000 for large accumulating fund transactions', () => {
      // 400000 * 0.0132 = 5280, capped at 4000
      const result = calculateTOBTax('SELL', 400000, 'accumulating_fund');
      assert.equal(result.taxAmount, 4000);
    });

    it('does not cap when just below threshold', () => {
      // 300000 * 0.0132 = 3960, below cap
      const result = calculateTOBTax('BUY', 300000, 'accumulating_fund');
      assert.equal(result.taxAmount, 3960);
    });
  });

  describe('bond/ETF rate (0.12%, cap €1,300)', () => {
    it('calculates tax for bond/ETF purchase', () => {
      const result = calculateTOBTax('BUY', 100000, 'bond_etf');
      assert.equal(result.taxRate, 0.0012);
      assert.equal(result.taxAmount, 120); // 100000 * 0.0012
      assert.equal(result.cappedAt, 1300);
    });

    it('caps tax at €1,300 for large bond/ETF transactions', () => {
      // 2000000 * 0.0012 = 2400, capped at 1300
      const result = calculateTOBTax('SELL', 2000000, 'bond_etf');
      assert.equal(result.taxAmount, 1300);
    });

    it('does not cap when just below threshold', () => {
      // 1000000 * 0.0012 = 1200, below cap
      const result = calculateTOBTax('BUY', 1000000, 'bond_etf');
      assert.equal(result.taxAmount, 1200);
    });
  });

  describe('edge cases', () => {
    it('returns zero tax for zero amount', () => {
      const result = calculateTOBTax('BUY', 0);
      assert.equal(result.taxAmount, 0);
      assert.equal(result.taxRate, 0.0035);
    });

    it('rounds tax to cents', () => {
      // 333 * 0.0035 = 1.1655 → should round to 1.17
      const result = calculateTOBTax('BUY', 333);
      assert.equal(result.taxAmount, 1.17);
    });

    it('handles very small amounts', () => {
      const result = calculateTOBTax('BUY', 1, 'stock');
      assert.equal(result.taxAmount, 0); // 0.0035, rounds to 0.00
    });

    it('BUY and SELL produce same tax for same amount', () => {
      const buy = calculateTOBTax('BUY', 25000, 'stock');
      const sell = calculateTOBTax('SELL', 25000, 'stock');
      assert.equal(buy.taxAmount, sell.taxAmount);
      assert.equal(buy.taxRate, sell.taxRate);
    });
  });
});
