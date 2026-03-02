import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../lib/db';
import {
  getDecisions,
  createDecision,
  approveDecision,
  rejectDecision,
  executeDecision,
} from '../lib/actions/decision';

const TEST_PREFIX = 'dec-test-';

async function createTestSignal(suffix: string, direction = 'BUY') {
  return prisma.signal.create({
    data: {
      symbol: `TEST${suffix}`.toUpperCase(),
      direction,
      confidence: 0.8,
      source: `${TEST_PREFIX}${suffix}`,
      reasoning: 'Test signal',
    },
  });
}

async function cleanup() {
  // Delete decisions linked to test signals
  const testSignals = await prisma.signal.findMany({
    where: { source: { startsWith: TEST_PREFIX } },
  });
  const signalIds = testSignals.map((s) => s.id);
  if (signalIds.length > 0) {
    // Delete execution logs first (foreign key constraint)
    const decisions = await prisma.decisionQueueItem.findMany({
      where: { signalId: { in: signalIds } },
    });
    const decisionIds = decisions.map((d) => d.id);
    if (decisionIds.length > 0) {
      await prisma.executionLog.deleteMany({
        where: { decisionId: { in: decisionIds } },
      });
    }
    await prisma.decisionQueueItem.deleteMany({
      where: { signalId: { in: signalIds } },
    });
    await prisma.signal.deleteMany({
      where: { id: { in: signalIds } },
    });
  }
}

describe('Decision Actions', () => {
  before(async () => {
    await cleanup();
  });

  after(async () => {
    await cleanup();
  });

  describe('createDecision', () => {
    it('should create a PENDING decision linked to a signal', async () => {
      const signal = await createTestSignal('create1');
      const result = await createDecision(signal.id);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.status, 'PENDING');
        assert.equal(result.data.signalId, signal.id);
        assert.equal(result.data.decidedAt, null);
      }
    });

    it('should reject empty signal ID', async () => {
      const result = await createDecision('');
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error, /Signal ID is required/);
      }
    });

    it('should reject non-existent signal', async () => {
      const result = await createDecision('nonexistent-id');
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error, /Signal not found/);
      }
    });

    it('should reject duplicate pending decision for same signal', async () => {
      const signal = await createTestSignal('create-dup');
      await createDecision(signal.id);
      const result = await createDecision(signal.id);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error, /already has a pending decision/);
      }
    });
  });

  describe('approveDecision', () => {
    it('should approve a PENDING decision', async () => {
      const signal = await createTestSignal('approve1');
      const createResult = await createDecision(signal.id);
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      const result = await approveDecision(createResult.data.id, 'Looks good');
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.status, 'APPROVED');
        assert.equal(result.data.notes, 'Looks good');
        assert.notEqual(result.data.decidedAt, null);
      }
    });

    it('should approve without notes', async () => {
      const signal = await createTestSignal('approve-nonotes');
      const createResult = await createDecision(signal.id);
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      const result = await approveDecision(createResult.data.id);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.status, 'APPROVED');
        assert.equal(result.data.notes, null);
      }
    });

    it('should reject approving an already APPROVED decision', async () => {
      const signal = await createTestSignal('approve-twice');
      const createResult = await createDecision(signal.id);
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      await approveDecision(createResult.data.id);
      const result = await approveDecision(createResult.data.id);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error, /Invalid state transition/);
      }
    });

    it('should reject approving a REJECTED decision', async () => {
      const signal = await createTestSignal('approve-rejected');
      const createResult = await createDecision(signal.id);
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      await rejectDecision(createResult.data.id);
      const result = await approveDecision(createResult.data.id);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error, /Invalid state transition/);
      }
    });

    it('should reject empty decision ID', async () => {
      const result = await approveDecision('');
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error, /Decision ID is required/);
      }
    });

    it('should reject non-existent decision', async () => {
      const result = await approveDecision('nonexistent');
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error, /Decision not found/);
      }
    });
  });

  describe('rejectDecision', () => {
    it('should reject a PENDING decision', async () => {
      const signal = await createTestSignal('reject1');
      const createResult = await createDecision(signal.id);
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      const result = await rejectDecision(createResult.data.id, 'Too risky');
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.status, 'REJECTED');
        assert.equal(result.data.notes, 'Too risky');
        assert.notEqual(result.data.decidedAt, null);
      }
    });

    it('should reject rejecting an APPROVED decision', async () => {
      const signal = await createTestSignal('reject-approved');
      const createResult = await createDecision(signal.id);
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      await approveDecision(createResult.data.id);
      const result = await rejectDecision(createResult.data.id);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error, /Invalid state transition/);
      }
    });

    it('should reject rejecting an already REJECTED decision', async () => {
      const signal = await createTestSignal('reject-twice');
      const createResult = await createDecision(signal.id);
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      await rejectDecision(createResult.data.id);
      const result = await rejectDecision(createResult.data.id);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error, /Invalid state transition/);
      }
    });
  });

  describe('executeDecision', () => {
    it('should execute an APPROVED decision and create ExecutionLog', async () => {
      const signal = await createTestSignal('exec1', 'BUY');
      const createResult = await createDecision(signal.id);
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      await approveDecision(createResult.data.id);
      const result = await executeDecision(createResult.data.id);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.status, 'EXECUTED');
        // Verify execution log was created via direct DB query
        const execLogs = await prisma.executionLog.findMany({
          where: { decisionId: createResult.data.id },
        });
        assert.equal(execLogs.length, 1);
        assert.equal(execLogs[0].symbol, 'TESTEXEC1');
        assert.equal(execLogs[0].type, 'BUY');
      }
    });

    it('should set SELL type for SELL signals', async () => {
      const signal = await createTestSignal('exec-sell', 'SELL');
      const createResult = await createDecision(signal.id);
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      await approveDecision(createResult.data.id);
      const result = await executeDecision(createResult.data.id);
      assert.equal(result.success, true);
      if (result.success) {
        const execLogs = await prisma.executionLog.findMany({
          where: { decisionId: createResult.data.id },
        });
        assert.equal(execLogs[0].type, 'SELL');
      }
    });

    it('should reject executing a PENDING decision', async () => {
      const signal = await createTestSignal('exec-pending');
      const createResult = await createDecision(signal.id);
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      const result = await executeDecision(createResult.data.id);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error, /Invalid state transition/);
      }
    });

    it('should reject executing a REJECTED decision', async () => {
      const signal = await createTestSignal('exec-rejected');
      const createResult = await createDecision(signal.id);
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      await rejectDecision(createResult.data.id);
      const result = await executeDecision(createResult.data.id);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error, /Invalid state transition/);
      }
    });

    it('should reject executing an already EXECUTED decision', async () => {
      const signal = await createTestSignal('exec-twice');
      const createResult = await createDecision(signal.id);
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      await approveDecision(createResult.data.id);
      await executeDecision(createResult.data.id);
      const result = await executeDecision(createResult.data.id);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error, /Invalid state transition/);
      }
    });
  });

  describe('getDecisions', () => {
    it('should return all decisions', async () => {
      const result = await getDecisions();
      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(Array.isArray(result.data));
      }
    });

    it('should filter by status', async () => {
      const signal = await createTestSignal('filter-status');
      await createDecision(signal.id);

      const result = await getDecisions({ status: 'PENDING' });
      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.data.length > 0);
        assert.ok(result.data.every((d) => d.status === 'PENDING'));
      }
    });

    it('should filter by symbol', async () => {
      const signal = await createTestSignal('filter-sym');
      await createDecision(signal.id);

      const result = await getDecisions({ symbol: 'testfilter-sym' });
      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.data.length > 0);
        assert.ok(result.data.every((d: any) => d.signal.symbol === 'TESTFILTER-SYM'));
      }
    });

    it('should include signal and executions in results', async () => {
      const signal = await createTestSignal('filter-include');
      await createDecision(signal.id);

      const result = await getDecisions();
      assert.equal(result.success, true);
      if (result.success) {
        const item = result.data.find((d: any) => d.signalId === signal.id);
        assert.ok(item);
        // getDecisions includes signal and executions via Prisma include
        assert.ok((item as any).signal);
        assert.ok(Array.isArray((item as any).executions));
      }
    });
  });
});
