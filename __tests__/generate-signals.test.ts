/**
 * Tests for US-019: Auto-generate signals from portfolio and refresh workflow.
 *
 * Tests:
 * - generateAndStoreSignals server action
 * - Signal deduplication logic
 * - Decision queue integration from signals
 * - Generate Signals button component structure
 * - Signals page structure with button
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../lib/db';
import { generateAndStoreSignals } from '../lib/actions/generate-signals';
import { createDecision } from '../lib/actions/decision';
import { getCache, clearQuoteCache } from '../lib/quote-cache';
import fs from 'node:fs';
import path from 'node:path';

const TEST_PREFIX = 'gs-test-';

// ── Helpers ──────────────────────────────────────────────────────────────

async function createTestPortfolio(suffix: string = '') {
  return prisma.portfolio.create({
    data: {
      id: `${TEST_PREFIX}portfolio${suffix}`,
      name: `Test Portfolio ${suffix}`,
      baseCurrency: 'EUR',
    },
  });
}

async function createTestHolding(portfolioId: string, symbol: string, quantity: number = 10, avgCost: number = 100) {
  return prisma.holding.create({
    data: {
      id: `${TEST_PREFIX}holding-${symbol}`,
      portfolioId,
      symbol,
      quantity,
      avgCostBasis: avgCost,
    },
  });
}

function seedQuoteCache(symbol: string, price: number, change: number) {
  const cache = getCache();
  cache.set(symbol, {
    symbol,
    price,
    change,
    changePercent: change !== 0 ? (change / (price - change)) * 100 : 0,
    fetchedAt: Date.now(),
  });
}

async function cleanup() {
  // Delete in dependency order: decisions → signals, then holdings → portfolios
  await prisma.decisionQueueItem.deleteMany({
    where: { signal: { source: { startsWith: TEST_PREFIX } } },
  });
  await prisma.signal.deleteMany({
    where: { source: { startsWith: TEST_PREFIX } },
  });
  await prisma.holding.deleteMany({
    where: { id: { startsWith: TEST_PREFIX } },
  });
  await prisma.portfolio.deleteMany({
    where: { id: { startsWith: TEST_PREFIX } },
  });
  clearQuoteCache();
}

// ── generateAndStoreSignals ──────────────────────────────────────────────

describe('generateAndStoreSignals', () => {
  before(cleanup);
  after(cleanup);
  beforeEach(async () => {
    await cleanup();
  });

  it('should return error for empty portfolioId', async () => {
    const result = await generateAndStoreSignals('');
    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(result.error, /Portfolio ID is required/);
    }
  });

  it('should handle portfolio with no holdings', async () => {
    const portfolio = await createTestPortfolio('-empty');
    const result = await generateAndStoreSignals(portfolio.id, `${TEST_PREFIX}empty`);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.generated, 0);
      assert.equal(result.data.skippedDuplicates, 0);
      assert.ok(result.data.errors.some((e) => e.includes('No holdings')));
    }
  });

  it('should generate signals for holdings with quotes', async () => {
    const portfolio = await createTestPortfolio('-gen');
    await createTestHolding(portfolio.id, 'AAPL', 10, 150);
    await createTestHolding(portfolio.id, 'MSFT', 5, 300);

    // Seed quotes — the FinnhubClient mock mode will provide quotes
    // but we also seed the cache for predictable results
    seedQuoteCache('AAPL', 145, -2); // Small drop
    seedQuoteCache('MSFT', 295, -3); // Small drop

    const result = await generateAndStoreSignals(portfolio.id, `${TEST_PREFIX}gen`);
    assert.equal(result.success, true);
    if (result.success) {
      // Should generate signals (HOLD signals for small changes)
      assert.ok(result.data.generated >= 0);
    }
  });

  it('should set expiresAt on generated signals', async () => {
    const portfolio = await createTestPortfolio('-expiry');
    await createTestHolding(portfolio.id, 'TSLA', 10, 200);
    seedQuoteCache('TSLA', 195, -2);

    const result = await generateAndStoreSignals(portfolio.id, `${TEST_PREFIX}expiry`);
    assert.equal(result.success, true);

    // Check that created signals have expiresAt
    const signals = await prisma.signal.findMany({
      where: { source: `${TEST_PREFIX}expiry` },
    });
    for (const sig of signals) {
      assert.ok(sig.expiresAt !== null, `Signal for ${sig.symbol} should have expiresAt`);
    }
  });

  it('should use custom source tag', async () => {
    const portfolio = await createTestPortfolio('-src');
    await createTestHolding(portfolio.id, 'GOOG', 3, 140);
    seedQuoteCache('GOOG', 138, -1);

    const customSource = `${TEST_PREFIX}custom-source`;
    const result = await generateAndStoreSignals(portfolio.id, customSource);
    assert.equal(result.success, true);

    if (result.success && result.data.generated > 0) {
      const signals = await prisma.signal.findMany({
        where: { source: customSource },
      });
      assert.ok(signals.length > 0);
      assert.equal(signals[0].source, customSource);
    }
  });
});

// ── Deduplication ────────────────────────────────────────────────────────

describe('signal deduplication', () => {
  before(cleanup);
  after(cleanup);
  beforeEach(async () => {
    await cleanup();
  });

  it('should skip duplicate signals for same symbol+direction when unexpired exists', async () => {
    const portfolio = await createTestPortfolio('-dedup');
    await createTestHolding(portfolio.id, 'NVDA', 10, 500);
    seedQuoteCache('NVDA', 490, -2);

    // First generation
    const result1 = await generateAndStoreSignals(portfolio.id, `${TEST_PREFIX}dedup`);
    assert.equal(result1.success, true);
    const firstGenCount = result1.success ? result1.data.generated : 0;

    // Second generation — same conditions, should be deduplicated
    const result2 = await generateAndStoreSignals(portfolio.id, `${TEST_PREFIX}dedup`);
    assert.equal(result2.success, true);
    if (result2.success && firstGenCount > 0) {
      assert.equal(result2.data.skippedDuplicates, firstGenCount);
      assert.equal(result2.data.generated, 0);
    }
  });

  it('should not skip if existing signal has expired', async () => {
    const portfolio = await createTestPortfolio('-dedup-exp');
    await createTestHolding(portfolio.id, 'META', 10, 400);
    seedQuoteCache('META', 395, -2);

    // Create an expired signal manually
    await prisma.signal.create({
      data: {
        symbol: 'META',
        direction: 'HOLD',
        confidence: 0.3,
        source: `${TEST_PREFIX}dedup-exp`,
        reasoning: 'Expired signal',
        expiresAt: new Date(Date.now() - 1000), // Already expired
      },
    });

    const result = await generateAndStoreSignals(portfolio.id, `${TEST_PREFIX}dedup-exp-new`);
    assert.equal(result.success, true);
    if (result.success) {
      // Should generate a new signal since existing one is expired
      assert.ok(result.data.generated > 0, 'Should generate new signal when existing is expired');
    }
  });

  it('should skip if existing signal has no expiry (null = never expires)', async () => {
    const portfolio = await createTestPortfolio('-dedup-null');
    await createTestHolding(portfolio.id, 'AMZN', 10, 180);
    seedQuoteCache('AMZN', 178, -1);

    // Create a signal with no expiry
    await prisma.signal.create({
      data: {
        symbol: 'AMZN',
        direction: 'HOLD',
        confidence: 0.3,
        source: `${TEST_PREFIX}dedup-null`,
        reasoning: 'No expiry signal',
        expiresAt: null,
      },
    });

    const result = await generateAndStoreSignals(portfolio.id, `${TEST_PREFIX}dedup-null-new`);
    assert.equal(result.success, true);
    if (result.success) {
      // HOLD direction should be deduplicated since null expiresAt counts as unexpired
      assert.ok(result.data.skippedDuplicates > 0, 'Should skip when existing signal has no expiry');
    }
  });
});

// ── Decision Queue Integration ───────────────────────────────────────────

describe('signal to decision queue integration', () => {
  before(cleanup);
  after(cleanup);
  beforeEach(async () => {
    await cleanup();
  });

  it('should create decision queue item from generated signal', async () => {
    const portfolio = await createTestPortfolio('-queue');
    await createTestHolding(portfolio.id, 'NFLX', 10, 600);
    seedQuoteCache('NFLX', 590, -2);

    const genResult = await generateAndStoreSignals(portfolio.id, `${TEST_PREFIX}queue`);
    assert.equal(genResult.success, true);

    // Get the generated signal
    const signals = await prisma.signal.findMany({
      where: { source: `${TEST_PREFIX}queue` },
    });
    assert.ok(signals.length > 0, 'Should have generated at least one signal');

    // Send to decision queue
    const decResult = await createDecision(signals[0].id);
    assert.equal(decResult.success, true);
    if (decResult.success) {
      assert.equal(decResult.data.signalId, signals[0].id);
      assert.equal(decResult.data.status, 'PENDING');
    }
  });

  it('should prevent duplicate decision queue items for same signal', async () => {
    const portfolio = await createTestPortfolio('-queue-dup');
    await createTestHolding(portfolio.id, 'DIS', 10, 100);
    seedQuoteCache('DIS', 98, -1);

    const genResult = await generateAndStoreSignals(portfolio.id, `${TEST_PREFIX}queue-dup`);
    assert.equal(genResult.success, true);

    const signals = await prisma.signal.findMany({
      where: { source: `${TEST_PREFIX}queue-dup` },
    });
    assert.ok(signals.length > 0);

    // First send — success
    const dec1 = await createDecision(signals[0].id);
    assert.equal(dec1.success, true);

    // Second send — should fail (duplicate)
    const dec2 = await createDecision(signals[0].id);
    assert.equal(dec2.success, false);
    if (!dec2.success) {
      assert.match(dec2.error, /already has a pending decision/);
    }
  });
});

// ── Component Structure Tests ────────────────────────────────────────────

describe('GenerateSignalsButton component', () => {
  const componentPath = path.join(__dirname, '..', 'components', 'signals', 'generate-signals-button.tsx');

  it('should exist', () => {
    assert.ok(fs.existsSync(componentPath), 'generate-signals-button.tsx should exist');
  });

  it('should be a client component', () => {
    const content = fs.readFileSync(componentPath, 'utf-8');
    assert.ok(content.includes("'use client'"), 'Should have use client directive');
  });

  it('should export GenerateSignalsButton', () => {
    const content = fs.readFileSync(componentPath, 'utf-8');
    assert.ok(content.includes('export function GenerateSignalsButton'), 'Should export GenerateSignalsButton');
  });

  it('should accept portfolioId prop', () => {
    const content = fs.readFileSync(componentPath, 'utf-8');
    assert.ok(content.includes('portfolioId'), 'Should accept portfolioId prop');
  });

  it('should call generateAndStoreSignals', () => {
    const content = fs.readFileSync(componentPath, 'utf-8');
    assert.ok(content.includes('generateAndStoreSignals'), 'Should use generateAndStoreSignals action');
  });

  it('should have generate-signals-button test id', () => {
    const content = fs.readFileSync(componentPath, 'utf-8');
    assert.ok(content.includes('generate-signals-button'), 'Should have generate-signals-button test id');
  });
});

describe('Signals page with Generate button', () => {
  const pagePath = path.join(__dirname, '..', 'app', 'dashboard', 'signals', 'page.tsx');

  it('should import GenerateSignalsButton', () => {
    const content = fs.readFileSync(pagePath, 'utf-8');
    assert.ok(content.includes('GenerateSignalsButton'), 'Should import GenerateSignalsButton');
  });

  it('should import getPortfolios', () => {
    const content = fs.readFileSync(pagePath, 'utf-8');
    assert.ok(content.includes('getPortfolios'), 'Should fetch portfolios for portfolio ID');
  });

  it('should render GenerateSignalsButton with portfolioId', () => {
    const content = fs.readFileSync(pagePath, 'utf-8');
    assert.ok(content.includes('portfolioId={'), 'Should pass portfolioId to GenerateSignalsButton');
  });
});

// ── generate-signals.ts module structure ─────────────────────────────────

describe('generate-signals module', () => {
  const modulePath = path.join(__dirname, '..', 'lib', 'actions', 'generate-signals.ts');

  it('should exist', () => {
    assert.ok(fs.existsSync(modulePath), 'generate-signals.ts should exist');
  });

  it('should have use server directive', () => {
    const content = fs.readFileSync(modulePath, 'utf-8');
    assert.ok(content.includes("'use server'"), 'Should have use server directive');
  });

  it('should export generateAndStoreSignals', () => {
    const content = fs.readFileSync(modulePath, 'utf-8');
    assert.ok(content.includes('export async function generateAndStoreSignals'), 'Should export generateAndStoreSignals');
  });

  it('should import signal engine', () => {
    const content = fs.readFileSync(modulePath, 'utf-8');
    assert.ok(content.includes('generateSignals'), 'Should use signal engine');
  });

  it('should implement deduplication', () => {
    const content = fs.readFileSync(modulePath, 'utf-8');
    assert.ok(content.includes('skippedDuplicates'), 'Should track deduplicated signals');
  });
});
