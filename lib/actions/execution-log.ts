'use server';

import { prisma } from '@/lib/db';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ExecutionLogFilters = {
  symbol?: string;
  type?: 'BUY' | 'SELL';
  fromDate?: Date;
  toDate?: Date;
};

/**
 * Fetch execution logs with optional filters.
 * Includes related decision and signal data.
 */
export async function getExecutionLogs(filters?: ExecutionLogFilters) {
  try {
    const where: Record<string, unknown> = {};

    if (filters?.symbol) {
      where.symbol = filters.symbol.trim().toUpperCase();
    }
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.fromDate || filters?.toDate) {
      const executedAt: Record<string, Date> = {};
      if (filters.fromDate) executedAt.gte = filters.fromDate;
      if (filters.toDate) executedAt.lte = filters.toDate;
      where.executedAt = executedAt;
    }

    const logs = await prisma.executionLog.findMany({
      where,
      include: {
        decision: {
          include: {
            signal: true,
          },
        },
      },
      orderBy: { executedAt: 'desc' },
    });

    return { success: true as const, data: logs };
  } catch (error) {
    return { success: false as const, error: `Failed to fetch execution logs: ${error}` };
  }
}

/**
 * Fetch a single execution log by ID.
 * Includes related decision and signal data.
 */
export async function getExecutionLog(id: string) {
  try {
    if (!id?.trim()) {
      return { success: false as const, error: 'Execution log ID is required' };
    }

    const log = await prisma.executionLog.findUnique({
      where: { id },
      include: {
        decision: {
          include: {
            signal: true,
          },
        },
      },
    });

    if (!log) {
      return { success: false as const, error: `Execution log not found: ${id}` };
    }

    return { success: true as const, data: log };
  } catch (error) {
    return { success: false as const, error: `Failed to fetch execution log: ${error}` };
  }
}
