import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSignal, getSignals, getSignal } from '../lib/actions/signal';
import { prisma } from '../lib/db';

const TEST_PREFIX = 'sig-test-';

// ── Cleanup ──────────────────────────────────────────────────────────

before(async () => {
  await prisma.signal.deleteMany({ where: { source: { startsWith: TEST_PREFIX } } });
});

after(async () => {
  await prisma.signal.deleteMany({ where: { source: { startsWith: TEST_PREFIX } } });
});

// ── createSignal ─────────────────────────────────────────────────────

describe('createSignal', () => {
  it('creates a signal with valid input', async () => {
    const result = await createSignal({
      symbol: 'aapl',
      direction: 'BUY',
      confidence: 0.75,
      source: `${TEST_PREFIX}basic`,
      reasoning: 'Test reasoning',
    });
    assert.ok(result.success);
    if (!result.success) return;
    assert.equal(result.data.symbol, 'AAPL'); // normalized
    assert.equal(result.data.direction, 'BUY');
    assert.equal(result.data.confidence, 0.75);
    assert.equal(result.data.reasoning, 'Test reasoning');
  });

  it('rejects empty symbol', async () => {
    const result = await createSignal({
      symbol: '  ',
      direction: 'BUY',
      confidence: 0.5,
      source: `${TEST_PREFIX}empty`,
    });
    assert.equal(result.success, false);
  });

  it('rejects invalid direction', async () => {
    const result = await createSignal({
      symbol: 'AAPL',
      direction: 'INVALID' as any,
      confidence: 0.5,
      source: `${TEST_PREFIX}baddir`,
    });
    assert.equal(result.success, false);
  });

  it('rejects confidence below 0', async () => {
    const result = await createSignal({
      symbol: 'AAPL',
      direction: 'BUY',
      confidence: -0.1,
      source: `${TEST_PREFIX}lowconf`,
    });
    assert.equal(result.success, false);
  });

  it('rejects confidence above 1', async () => {
    const result = await createSignal({
      symbol: 'AAPL',
      direction: 'BUY',
      confidence: 1.5,
      source: `${TEST_PREFIX}highconf`,
    });
    assert.equal(result.success, false);
  });

  it('rejects empty source', async () => {
    const result = await createSignal({
      symbol: 'AAPL',
      direction: 'BUY',
      confidence: 0.5,
      source: '  ',
    });
    assert.equal(result.success, false);
  });

  it('creates signal without reasoning', async () => {
    const result = await createSignal({
      symbol: 'MSFT',
      direction: 'HOLD',
      confidence: 0.3,
      source: `${TEST_PREFIX}noreason`,
    });
    assert.ok(result.success);
    if (!result.success) return;
    assert.equal(result.data.reasoning, null);
  });

  it('creates signal with expiresAt', async () => {
    const expiry = new Date(Date.now() + 86400000);
    const result = await createSignal({
      symbol: 'GOOG',
      direction: 'SELL',
      confidence: 0.8,
      source: `${TEST_PREFIX}expiry`,
      expiresAt: expiry,
    });
    assert.ok(result.success);
    if (!result.success) return;
    assert.ok(result.data.expiresAt);
  });
});

// ── getSignals ───────────────────────────────────────────────────────

describe('getSignals', () => {
  it('returns all signals (no filters)', async () => {
    const result = await getSignals();
    assert.ok(result.success);
    if (!result.success) return;
    assert.ok(Array.isArray(result.data));
  });

  it('filters by symbol', async () => {
    // Create a unique signal
    await createSignal({
      symbol: 'UNIQUESYM',
      direction: 'BUY',
      confidence: 0.6,
      source: `${TEST_PREFIX}filter`,
    });
    const result = await getSignals({ symbol: 'uniquesym' }); // test normalization
    assert.ok(result.success);
    if (!result.success) return;
    for (const s of result.data) {
      assert.equal(s.symbol, 'UNIQUESYM');
    }
  });

  it('filters by direction', async () => {
    const result = await getSignals({ direction: 'SELL' });
    assert.ok(result.success);
    if (!result.success) return;
    for (const s of result.data) {
      assert.equal(s.direction, 'SELL');
    }
  });

  it('respects limit', async () => {
    const result = await getSignals({ limit: 2 });
    assert.ok(result.success);
    if (!result.success) return;
    assert.ok(result.data.length <= 2);
  });
});

// ── getSignal ────────────────────────────────────────────────────────

describe('getSignal', () => {
  it('returns signal by ID with decisions included', async () => {
    const created = await createSignal({
      symbol: 'TEST',
      direction: 'BUY',
      confidence: 0.5,
      source: `${TEST_PREFIX}getone`,
    });
    assert.ok(created.success);
    if (!created.success) return;

    const result = await getSignal(created.data.id);
    assert.ok(result.success);
    if (!result.success) return;
    assert.equal(result.data!.id, created.data.id);
    assert.ok(Array.isArray((result.data as any).decisions));
  });

  it('returns error for non-existent ID', async () => {
    const result = await getSignal('nonexistent-id-999');
    assert.equal(result.success, false);
  });

  it('returns error for empty ID', async () => {
    const result = await getSignal('  ');
    assert.equal(result.success, false);
  });
});
