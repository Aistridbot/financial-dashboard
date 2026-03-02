'use server';

import { prisma } from '@/lib/db';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function sendToDecisionQueue(
  signalId: string
): Promise<ActionResult<Awaited<ReturnType<typeof prisma.decisionQueueItem.create>>>> {
  try {
    if (!signalId?.trim()) {
      return { success: false, error: 'Signal ID is required' };
    }

    const signal = await prisma.signal.findUnique({ where: { id: signalId } });
    if (!signal) {
      return { success: false, error: `Signal not found: ${signalId}` };
    }

    // Check if already queued
    const existing = await prisma.decisionQueueItem.findFirst({
      where: { signalId, status: 'PENDING' },
    });
    if (existing) {
      return { success: false, error: 'Signal is already in the decision queue' };
    }

    const item = await prisma.decisionQueueItem.create({
      data: { signalId },
    });
    return { success: true, data: item };
  } catch (error) {
    return { success: false, error: `Failed to add to decision queue: ${error}` };
  }
}
