'use server';

import { prisma } from '@/lib/db';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface SignalFilters {
  symbol?: string;
  direction?: 'BUY' | 'SELL' | 'HOLD';
  source?: string;
  limit?: number;
}

export interface CreateSignalInput {
  symbol: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  source: string;
  reasoning?: string;
  expiresAt?: Date;
}

export async function getSignals(
  filters?: SignalFilters
): Promise<ActionResult<Awaited<ReturnType<typeof prisma.signal.findMany>>>> {
  try {
    const where: Record<string, unknown> = {};
    if (filters?.symbol) where.symbol = filters.symbol.trim().toUpperCase();
    if (filters?.direction) where.direction = filters.direction;
    if (filters?.source) where.source = filters.source;

    const signals = await prisma.signal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 100,
    });
    return { success: true, data: signals };
  } catch (error) {
    return { success: false, error: `Failed to fetch signals: ${error}` };
  }
}

export async function createSignal(
  input: CreateSignalInput
): Promise<ActionResult<Awaited<ReturnType<typeof prisma.signal.create>>>> {
  try {
    const symbol = input.symbol?.trim().toUpperCase();
    if (!symbol) {
      return { success: false, error: 'Symbol is required' };
    }
    if (!['BUY', 'SELL', 'HOLD'].includes(input.direction)) {
      return { success: false, error: 'Direction must be BUY, SELL, or HOLD' };
    }
    if (input.confidence < 0 || input.confidence > 1) {
      return { success: false, error: 'Confidence must be between 0.0 and 1.0' };
    }
    if (!input.source?.trim()) {
      return { success: false, error: 'Source is required' };
    }

    const signal = await prisma.signal.create({
      data: {
        symbol,
        direction: input.direction,
        confidence: input.confidence,
        source: input.source.trim(),
        reasoning: input.reasoning ?? null,
        expiresAt: input.expiresAt ?? null,
      },
    });
    return { success: true, data: signal };
  } catch (error) {
    return { success: false, error: `Failed to create signal: ${error}` };
  }
}

export async function getSignal(
  id: string
): Promise<ActionResult<Awaited<ReturnType<typeof prisma.signal.findUnique>>>> {
  try {
    if (!id?.trim()) {
      return { success: false, error: 'Signal ID is required' };
    }
    const signal = await prisma.signal.findUnique({
      where: { id },
      include: { decisions: true },
    });
    if (!signal) {
      return { success: false, error: `Signal not found: ${id}` };
    }
    return { success: true, data: signal };
  } catch (error) {
    return { success: false, error: `Failed to fetch signal: ${error}` };
  }
}
