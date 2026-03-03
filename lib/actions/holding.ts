"use server";

/**
 * Holding server actions.
 *
 * Holdings are managed indirectly through transactions (see transaction.ts).
 * This module provides read-only access with computed fields.
 */

import { prisma } from "@/lib/db";
import { calculatePositionValue, calculateGainLoss } from "@/lib/calculations";
import type { Holding } from "@prisma/client";

// ── Types ───────────────────────────────────────────────────────────────

export type HoldingWithComputed = Holding & {
  currentValue: number | null;
  gainLoss: number | null;
  gainLossPercent: number | null;
};

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── Actions ─────────────────────────────────────────────────────────────

/**
 * Get all holdings for a portfolio with computed fields.
 *
 * `currentValue`, `gainLoss`, and `gainLossPercent` are null until
 * a live price feed is integrated. The calculation functions are wired
 * up and ready — just supply a real `currentPrice`.
 *
 * @param portfolioId - The portfolio to fetch holdings for
 * @param currentPrices - Optional map of symbol → current price for live calculations
 */
export async function getHoldings(
  portfolioId: string,
  currentPrices?: Record<string, number>
): Promise<ActionResult<HoldingWithComputed[]>> {
  try {
    const holdings = await prisma.holding.findMany({
      where: { portfolioId },
      orderBy: { symbol: "asc" },
    });

    const enriched: HoldingWithComputed[] = holdings.map((h) => {
      const price = currentPrices?.[h.symbol];
      if (price != null) {
        const currentValue = calculatePositionValue(h.quantity, price);
        const { gainLoss, gainLossPercent } = calculateGainLoss(
          h.quantity,
          h.avgCostBasis,
          price
        );
        return { ...h, currentValue, gainLoss, gainLossPercent };
      }
      return { ...h, currentValue: null, gainLoss: null, gainLossPercent: null };
    });

    return { success: true, data: enriched };
  } catch (e) {
    return {
      success: false,
      error: `Failed to fetch holdings: ${String(e)}`,
    };
  }
}
