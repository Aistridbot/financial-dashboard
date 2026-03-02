'use server';

import { prisma } from '@/lib/db';
import { calculateTOBTax } from '@/lib/tob-tax';
import type { InstrumentType } from '@/lib/tob-tax';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['EXECUTED'],
  REJECTED: [],
  EXECUTED: [],
};

export type DecisionFilters = {
  status?: string;
  symbol?: string;
};

export async function getDecisions(filters?: DecisionFilters) {
  try {
    const where: Record<string, unknown> = {};
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.symbol) {
      // Filter by signal's symbol
      where.signal = { symbol: filters.symbol.trim().toUpperCase() };
    }

    const decisions = await prisma.decisionQueueItem.findMany({
      where,
      include: {
        signal: true,
        executions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true as const, data: decisions };
  } catch (error) {
    return { success: false as const, error: `Failed to fetch decisions: ${error}` };
  }
}

export async function createDecision(signalId: string): Promise<ActionResult<Awaited<ReturnType<typeof prisma.decisionQueueItem.create>>>> {
  try {
    if (!signalId?.trim()) {
      return { success: false, error: 'Signal ID is required' };
    }

    const signal = await prisma.signal.findUnique({ where: { id: signalId } });
    if (!signal) {
      return { success: false, error: `Signal not found: ${signalId}` };
    }

    // Check for existing PENDING decision for this signal
    const existing = await prisma.decisionQueueItem.findFirst({
      where: { signalId, status: 'PENDING' },
    });
    if (existing) {
      return { success: false, error: 'Signal already has a pending decision' };
    }

    const item = await prisma.decisionQueueItem.create({
      data: { signalId },
      include: { signal: true },
    });
    return { success: true, data: item };
  } catch (error) {
    return { success: false, error: `Failed to create decision: ${error}` };
  }
}

export async function approveDecision(
  id: string,
  notes?: string
): Promise<ActionResult<Awaited<ReturnType<typeof prisma.decisionQueueItem.update>>>> {
  try {
    if (!id?.trim()) {
      return { success: false, error: 'Decision ID is required' };
    }

    const decision = await prisma.decisionQueueItem.findUnique({ where: { id } });
    if (!decision) {
      return { success: false, error: `Decision not found: ${id}` };
    }

    if (!VALID_TRANSITIONS[decision.status]?.includes('APPROVED')) {
      return {
        success: false,
        error: `Invalid state transition: cannot approve a ${decision.status} decision`,
      };
    }

    const updated = await prisma.decisionQueueItem.update({
      where: { id },
      data: {
        status: 'APPROVED',
        notes: notes || null,
        decidedAt: new Date(),
      },
      include: { signal: true },
    });
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: `Failed to approve decision: ${error}` };
  }
}

export async function rejectDecision(
  id: string,
  notes?: string
): Promise<ActionResult<Awaited<ReturnType<typeof prisma.decisionQueueItem.update>>>> {
  try {
    if (!id?.trim()) {
      return { success: false, error: 'Decision ID is required' };
    }

    const decision = await prisma.decisionQueueItem.findUnique({ where: { id } });
    if (!decision) {
      return { success: false, error: `Decision not found: ${id}` };
    }

    if (!VALID_TRANSITIONS[decision.status]?.includes('REJECTED')) {
      return {
        success: false,
        error: `Invalid state transition: cannot reject a ${decision.status} decision`,
      };
    }

    const updated = await prisma.decisionQueueItem.update({
      where: { id },
      data: {
        status: 'REJECTED',
        notes: notes || null,
        decidedAt: new Date(),
      },
      include: { signal: true },
    });
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: `Failed to reject decision: ${error}` };
  }
}

export async function executeDecision(
  id: string
): Promise<ActionResult<Awaited<ReturnType<typeof prisma.decisionQueueItem.update>>>> {
  try {
    if (!id?.trim()) {
      return { success: false, error: 'Decision ID is required' };
    }

    const decision = await prisma.decisionQueueItem.findUnique({
      where: { id },
      include: { signal: true },
    });
    if (!decision) {
      return { success: false, error: `Decision not found: ${id}` };
    }

    if (!VALID_TRANSITIONS[decision.status]?.includes('EXECUTED')) {
      return {
        success: false,
        error: `Invalid state transition: cannot execute a ${decision.status} decision`,
      };
    }

    // Execute in a transaction: create ExecutionLog + update status
    const updated = await prisma.$transaction(async (tx) => {
      const txType = decision.signal.direction === 'SELL' ? 'SELL' as const : 'BUY' as const;
      const quantity = 0; // Placeholder — actual quantity set during real execution
      const price = 0; // Placeholder — actual price set during real execution
      const amount = quantity * price;

      // Calculate Belgian TOB tax (defaults to stock rate)
      const tob = calculateTOBTax(txType, amount);

      // Create ExecutionLog entry
      await tx.executionLog.create({
        data: {
          decisionId: id,
          symbol: decision.signal.symbol,
          type: txType,
          quantity,
          price,
          fees: 0,
          tobTaxAmount: tob.taxAmount,
          tobTaxRate: tob.taxRate,
          executedAt: new Date(),
        },
      });

      // Update decision status
      return tx.decisionQueueItem.update({
        where: { id },
        data: { status: 'EXECUTED' },
        include: { signal: true, executions: true },
      });
    });

    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: `Failed to execute decision: ${error}` };
  }
}
