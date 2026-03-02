import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSignals,
  priceDropBuyStrategy,
  priceRiseSellStrategy,
  defaultHoldStrategy,
  DEFAULT_STRATEGIES,
  type HoldingForSignal,
  type QuoteForSignal,
  type SignalStrategy,
  type GeneratedSignal,
} from '../lib/signal-engine';

// ── Helper ───────────────────────────────────────────────────────────

function makeHolding(symbol: string, qty = 10, avg = 100): HoldingForSignal {
  return { symbol, quantity: qty, avgCostBasis: avg };
}

function makeQuotes(
  entries: [string, number, number][]
): Map<string, QuoteForSignal> {
  const map = new Map<string, QuoteForSignal>();
  for (const [sym, current, prev] of entries) {
    map.set(sym, { currentPrice: current, previousClose: prev });
  }
  return map;
}

// ── priceDropBuyStrategy ─────────────────────────────────────────────

describe('priceDropBuyStrategy', () => {
  it('returns BUY when price drops more than 5%', () => {
    const h = makeHolding('AAPL');
    const q: QuoteForSignal = { currentPrice: 90, previousClose: 100 };
    const result = priceDropBuyStrategy(h, q);
    assert.ok(result);
    assert.equal(result.direction, 'BUY');
    assert.equal(result.symbol, 'AAPL');
    assert.ok(result.confidence >= 0 && result.confidence <= 1);
    assert.ok(result.reasoning.length > 0);
  });

  it('returns null when price drops exactly 5%', () => {
    const h = makeHolding('AAPL');
    const q: QuoteForSignal = { currentPrice: 95, previousClose: 100 };
    const result = priceDropBuyStrategy(h, q);
    assert.equal(result, null);
  });

  it('returns null when price drops less than 5%', () => {
    const h = makeHolding('AAPL');
    const q: QuoteForSignal = { currentPrice: 97, previousClose: 100 };
    const result = priceDropBuyStrategy(h, q);
    assert.equal(result, null);
  });

  it('returns null when price is unchanged', () => {
    const h = makeHolding('AAPL');
    const q: QuoteForSignal = { currentPrice: 100, previousClose: 100 };
    const result = priceDropBuyStrategy(h, q);
    assert.equal(result, null);
  });

  it('returns null when previousClose is 0', () => {
    const h = makeHolding('AAPL');
    const q: QuoteForSignal = { currentPrice: 50, previousClose: 0 };
    const result = priceDropBuyStrategy(h, q);
    assert.equal(result, null);
  });

  it('higher drop gives higher confidence', () => {
    const h = makeHolding('AAPL');
    const small = priceDropBuyStrategy(h, { currentPrice: 93, previousClose: 100 });
    const large = priceDropBuyStrategy(h, { currentPrice: 70, previousClose: 100 });
    assert.ok(small);
    assert.ok(large);
    assert.ok(large.confidence > small.confidence);
  });

  it('confidence caps at 1.0 for extreme drops', () => {
    const h = makeHolding('AAPL');
    const result = priceDropBuyStrategy(h, { currentPrice: 10, previousClose: 100 });
    assert.ok(result);
    assert.ok(result.confidence <= 1);
  });
});

// ── priceRiseSellStrategy ────────────────────────────────────────────

describe('priceRiseSellStrategy', () => {
  it('returns SELL when price rises more than 10%', () => {
    const h = makeHolding('TSLA');
    const q: QuoteForSignal = { currentPrice: 115, previousClose: 100 };
    const result = priceRiseSellStrategy(h, q);
    assert.ok(result);
    assert.equal(result.direction, 'SELL');
    assert.equal(result.symbol, 'TSLA');
    assert.ok(result.confidence >= 0 && result.confidence <= 1);
    assert.ok(result.reasoning.length > 0);
  });

  it('returns null when price rises exactly 10%', () => {
    const h = makeHolding('TSLA');
    const q: QuoteForSignal = { currentPrice: 110, previousClose: 100 };
    const result = priceRiseSellStrategy(h, q);
    assert.equal(result, null);
  });

  it('returns null when price rises less than 10%', () => {
    const h = makeHolding('TSLA');
    const q: QuoteForSignal = { currentPrice: 105, previousClose: 100 };
    const result = priceRiseSellStrategy(h, q);
    assert.equal(result, null);
  });

  it('returns null when previousClose is 0', () => {
    const h = makeHolding('TSLA');
    const q: QuoteForSignal = { currentPrice: 200, previousClose: 0 };
    const result = priceRiseSellStrategy(h, q);
    assert.equal(result, null);
  });

  it('higher rise gives higher confidence', () => {
    const h = makeHolding('TSLA');
    const small = priceRiseSellStrategy(h, { currentPrice: 112, previousClose: 100 });
    const large = priceRiseSellStrategy(h, { currentPrice: 140, previousClose: 100 });
    assert.ok(small);
    assert.ok(large);
    assert.ok(large.confidence > small.confidence);
  });

  it('confidence caps at 1.0 for extreme rises', () => {
    const h = makeHolding('TSLA');
    const result = priceRiseSellStrategy(h, { currentPrice: 300, previousClose: 100 });
    assert.ok(result);
    assert.ok(result.confidence <= 1);
  });
});

// ── defaultHoldStrategy ──────────────────────────────────────────────

describe('defaultHoldStrategy', () => {
  it('returns HOLD with 0.3 confidence', () => {
    const h = makeHolding('MSFT');
    const q: QuoteForSignal = { currentPrice: 102, previousClose: 100 };
    const result = defaultHoldStrategy(h, q);
    assert.ok(result);
    assert.equal(result.direction, 'HOLD');
    assert.equal(result.confidence, 0.3);
    assert.ok(result.reasoning.includes('+2.0%'));
  });

  it('handles zero previousClose gracefully', () => {
    const h = makeHolding('MSFT');
    const q: QuoteForSignal = { currentPrice: 100, previousClose: 0 };
    const result = defaultHoldStrategy(h, q);
    assert.ok(result);
    assert.equal(result.direction, 'HOLD');
  });
});

// ── generateSignals ──────────────────────────────────────────────────

describe('generateSignals', () => {
  it('produces BUY signal for >5% price drop', () => {
    const holdings = [makeHolding('AAPL')];
    const quotes = makeQuotes([['AAPL', 90, 100]]);
    const signals = generateSignals(holdings, quotes);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].direction, 'BUY');
    assert.equal(signals[0].symbol, 'AAPL');
  });

  it('produces SELL signal for >10% price rise', () => {
    const holdings = [makeHolding('TSLA')];
    const quotes = makeQuotes([['TSLA', 115, 100]]);
    const signals = generateSignals(holdings, quotes);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].direction, 'SELL');
  });

  it('produces HOLD signal for normal price range', () => {
    const holdings = [makeHolding('MSFT')];
    const quotes = makeQuotes([['MSFT', 102, 100]]);
    const signals = generateSignals(holdings, quotes);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].direction, 'HOLD');
  });

  it('handles multiple holdings', () => {
    const holdings = [makeHolding('AAPL'), makeHolding('TSLA'), makeHolding('MSFT')];
    const quotes = makeQuotes([
      ['AAPL', 90, 100],  // BUY
      ['TSLA', 115, 100], // SELL
      ['MSFT', 102, 100], // HOLD
    ]);
    const signals = generateSignals(holdings, quotes);
    assert.equal(signals.length, 3);

    const bySymbol = new Map(signals.map((s) => [s.symbol, s]));
    assert.equal(bySymbol.get('AAPL')?.direction, 'BUY');
    assert.equal(bySymbol.get('TSLA')?.direction, 'SELL');
    assert.equal(bySymbol.get('MSFT')?.direction, 'HOLD');
  });

  it('skips holdings without matching quote', () => {
    const holdings = [makeHolding('AAPL'), makeHolding('GOOG')];
    const quotes = makeQuotes([['AAPL', 90, 100]]);
    const signals = generateSignals(holdings, quotes);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].symbol, 'AAPL');
  });

  it('returns empty array for empty holdings', () => {
    const quotes = makeQuotes([['AAPL', 90, 100]]);
    const signals = generateSignals([], quotes);
    assert.equal(signals.length, 0);
  });

  it('returns empty array for empty quotes', () => {
    const holdings = [makeHolding('AAPL')];
    const signals = generateSignals(holdings, new Map());
    assert.equal(signals.length, 0);
  });

  it('all signals have confidence between 0 and 1', () => {
    const holdings = [makeHolding('A'), makeHolding('B'), makeHolding('C')];
    const quotes = makeQuotes([
      ['A', 50, 100],  // big drop
      ['B', 200, 100], // big rise
      ['C', 100, 100], // flat
    ]);
    const signals = generateSignals(holdings, quotes);
    for (const s of signals) {
      assert.ok(s.confidence >= 0, `${s.symbol} confidence >= 0`);
      assert.ok(s.confidence <= 1, `${s.symbol} confidence <= 1`);
    }
  });

  it('all signals have reasoning text', () => {
    const holdings = [makeHolding('A'), makeHolding('B')];
    const quotes = makeQuotes([
      ['A', 80, 100],
      ['B', 120, 100],
    ]);
    const signals = generateSignals(holdings, quotes);
    for (const s of signals) {
      assert.ok(s.reasoning.length > 0, `${s.symbol} has reasoning`);
    }
  });

  // ── Custom strategies ─────────────────────────────────────────────

  it('accepts custom strategy array', () => {
    const customStrategy: SignalStrategy = (holding, quote) => ({
      symbol: holding.symbol,
      direction: 'BUY',
      confidence: 0.99,
      reasoning: 'Custom strategy always buys',
      source: 'custom',
    });

    const holdings = [makeHolding('TEST')];
    const quotes = makeQuotes([['TEST', 100, 100]]);
    const signals = generateSignals(holdings, quotes, [customStrategy]);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].direction, 'BUY');
    assert.equal(signals[0].confidence, 0.99);
    assert.equal(signals[0].source, 'custom');
  });

  it('picks highest-confidence signal when multiple strategies fire', () => {
    const lowConf: SignalStrategy = () => ({
      symbol: 'X',
      direction: 'HOLD',
      confidence: 0.2,
      reasoning: 'Low',
      source: 'low',
    });
    const highConf: SignalStrategy = () => ({
      symbol: 'X',
      direction: 'BUY',
      confidence: 0.9,
      reasoning: 'High',
      source: 'high',
    });

    const holdings = [makeHolding('X')];
    const quotes = makeQuotes([['X', 100, 100]]);
    const signals = generateSignals(holdings, quotes, [lowConf, highConf]);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].confidence, 0.9);
    assert.equal(signals[0].direction, 'BUY');
  });

  it('skips strategies that return null', () => {
    const abstain: SignalStrategy = () => null;
    const act: SignalStrategy = (h) => ({
      symbol: h.symbol,
      direction: 'SELL',
      confidence: 0.7,
      reasoning: 'Only non-null',
      source: 'act',
    });

    const holdings = [makeHolding('Y')];
    const quotes = makeQuotes([['Y', 100, 100]]);
    const signals = generateSignals(holdings, quotes, [abstain, act]);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].direction, 'SELL');
  });

  it('returns empty when all strategies return null', () => {
    const abstain: SignalStrategy = () => null;
    const holdings = [makeHolding('Z')];
    const quotes = makeQuotes([['Z', 100, 100]]);
    const signals = generateSignals(holdings, quotes, [abstain]);
    assert.equal(signals.length, 0);
  });

  it('DEFAULT_STRATEGIES is an array of functions', () => {
    assert.ok(Array.isArray(DEFAULT_STRATEGIES));
    assert.ok(DEFAULT_STRATEGIES.length >= 3);
    for (const s of DEFAULT_STRATEGIES) {
      assert.equal(typeof s, 'function');
    }
  });
});
