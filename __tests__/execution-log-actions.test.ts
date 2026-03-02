import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../lib/db';
import { getExecutionLogs, getExecutionLog } from '../lib/actions/execution-log';

const TEST_PREFIX = 'exlog-test-';

// Test helpers
async function createTestSignal(suffix: string) {
  return prisma.signal.create({
    data: {
      id: `${TEST_PREFIX}signal-${suffix}`,
      symbol: `TST${suffix}`.toUpperCase(),
      direction: 'BUY',
      confidence: 0.8,
      source: `${TEST_PREFIX}source`,
      reasoning: 'Test signal',
    },
  });
}

async function createTestDecisionAndExecution(
  suffix: string,
  overrides?: { symbol?: string; type?: string; quantity?: number; price?: number; tobTaxAmount?: number; tobTaxRate?: number; executedAt?: Date }
) {
  const signal = await createTestSignal(suffix);
  const decision = await prisma.decisionQueueItem.create({
    data: {
      id: `${TEST_PREFIX}decision-${suffix}`,
      signalId: signal.id,
      status: 'EXECUTED',
    },
  });
  const log = await prisma.executionLog.create({
    data: {
      id: `${TEST_PREFIX}log-${suffix}`,
      decisionId: decision.id,
      symbol: overrides?.symbol ?? signal.symbol,
      type: overrides?.type ?? 'BUY',
      quantity: overrides?.quantity ?? 100,
      price: overrides?.price ?? 50,
      fees: 0,
      tobTaxAmount: overrides?.tobTaxAmount ?? 17.5,
      tobTaxRate: overrides?.tobTaxRate ?? 0.0035,
      executedAt: overrides?.executedAt ?? new Date(),
    },
  });
  return { signal, decision, log };
}

describe('execution-log actions', () => {
  before(async () => {
    // Clean up any leftover test data
    await prisma.executionLog.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
    await prisma.decisionQueueItem.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
    await prisma.signal.deleteMany({ where: { source: { startsWith: TEST_PREFIX } } });
  });

  after(async () => {
    await prisma.executionLog.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
    await prisma.decisionQueueItem.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
    await prisma.signal.deleteMany({ where: { source: { startsWith: TEST_PREFIX } } });
  });

  describe('getExecutionLogs', () => {
    it('returns all execution logs', async () => {
      await createTestDecisionAndExecution('all1');
      await createTestDecisionAndExecution('all2');

      const result = await getExecutionLogs();
      assert.equal(result.success, true);
      if (result.success) {
        // Should include at least our 2 test logs
        const testLogs = result.data.filter((l: any) => l.id.startsWith(TEST_PREFIX));
        assert.ok(testLogs.length >= 2);
      }
    });

    it('filters by symbol', async () => {
      await createTestDecisionAndExecution('sym1', { symbol: 'AAPL' });
      await createTestDecisionAndExecution('sym2', { symbol: 'GOOG' });

      const result = await getExecutionLogs({ symbol: 'aapl' }); // test normalization
      assert.equal(result.success, true);
      if (result.success) {
        const filtered = result.data.filter((l: any) => l.id.startsWith(TEST_PREFIX));
        assert.ok(filtered.every((l: any) => l.symbol === 'AAPL'));
      }
    });

    it('filters by type', async () => {
      await createTestDecisionAndExecution('type1', { type: 'BUY' });
      await createTestDecisionAndExecution('type2', { type: 'SELL' });

      const result = await getExecutionLogs({ type: 'SELL' });
      assert.equal(result.success, true);
      if (result.success) {
        const filtered = result.data.filter((l: any) => l.id.startsWith(TEST_PREFIX));
        assert.ok(filtered.every((l: any) => l.type === 'SELL'));
      }
    });

    it('includes related decision and signal data', async () => {
      await createTestDecisionAndExecution('rel1');

      const result = await getExecutionLogs();
      assert.equal(result.success, true);
      if (result.success) {
        const testLog = result.data.find((l: any) => l.id === `${TEST_PREFIX}log-rel1`);
        assert.ok(testLog);
        assert.ok((testLog as any).decision);
        assert.ok((testLog as any).decision.signal);
      }
    });

    it('returns empty array when no logs match', async () => {
      const result = await getExecutionLogs({ symbol: 'NONEXISTENT999' });
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.length, 0);
      }
    });
  });

  describe('getExecutionLog', () => {
    it('returns a single execution log by ID', async () => {
      const { log } = await createTestDecisionAndExecution('single1');

      const result = await getExecutionLog(log.id);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.id, log.id);
        assert.equal(result.data.symbol, log.symbol);
        assert.equal(result.data.tobTaxAmount, log.tobTaxAmount);
        assert.equal(result.data.tobTaxRate, log.tobTaxRate);
      }
    });

    it('includes related decision and signal', async () => {
      const { log, decision, signal } = await createTestDecisionAndExecution('single2');

      const result = await getExecutionLog(log.id);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal((result.data as any).decision.id, decision.id);
        assert.equal((result.data as any).decision.signal.id, signal.id);
      }
    });

    it('returns error for empty ID', async () => {
      const result = await getExecutionLog('');
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.includes('required'));
      }
    });

    it('returns error for non-existent ID', async () => {
      const result = await getExecutionLog('nonexistent-id-12345');
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.includes('not found'));
      }
    });
  });
});
