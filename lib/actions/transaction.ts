"use server";

/**
 * Transaction server actions.
 *
 * Creating a transaction atomically updates the corresponding Holding
 * using Prisma interactive transactions.
 */

import { prisma } from "@/lib/db";
import { calculateAvgCostBasis } from "@/lib/calculations";
import type { Transaction } from "@prisma/client";

// ── Types ───────────────────────────────────────────────────────────────

export type CreateTransactionInput = {
  portfolioId: string;
  symbol: string;
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  fees?: number;
  occurredAt?: Date;
};

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── Actions ─────────────────────────────────────────────────────────────

/**
 * Get all transactions for a portfolio, newest first.
 */
export async function getTransactions(
  portfolioId: string
): Promise<ActionResult<Transaction[]>> {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { portfolioId },
      orderBy: { occurredAt: "desc" },
    });
    return { success: true, data: transactions };
  } catch (e) {
    return {
      success: false,
      error: `Failed to fetch transactions: ${String(e)}`,
    };
  }
}

/**
 * Create a transaction and atomically update the corresponding Holding.
 *
 * - BUY: upsert holding, increase quantity, recalculate avgCostBasis
 * - SELL: decrease holding quantity, reject if insufficient shares
 */
export async function createTransaction(
  data: CreateTransactionInput
): Promise<ActionResult<Transaction>> {
  try {
    // ── Input validation ──────────────────────────────────────────────
    if (!data.portfolioId) {
      return { success: false, error: "Portfolio ID is required" };
    }
    if (!data.symbol || data.symbol.trim().length === 0) {
      return { success: false, error: "Symbol is required" };
    }
    if (data.type !== "BUY" && data.type !== "SELL") {
      return { success: false, error: "Type must be BUY or SELL" };
    }
    if (!data.quantity || data.quantity <= 0) {
      return { success: false, error: "Quantity must be positive" };
    }
    if (data.price == null || data.price < 0) {
      return { success: false, error: "Price must be non-negative" };
    }

    const symbol = data.symbol.trim().toUpperCase();
    const fees = data.fees ?? 0;
    const occurredAt = data.occurredAt ?? new Date();

    // ── Atomic transaction ────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // Verify portfolio exists
      const portfolio = await tx.portfolio.findUnique({
        where: { id: data.portfolioId },
      });
      if (!portfolio) {
        throw new Error(`Portfolio not found: ${data.portfolioId}`);
      }

      // Find existing holding for this symbol
      const existingHolding = await tx.holding.findFirst({
        where: { portfolioId: data.portfolioId, symbol },
      });

      if (data.type === "BUY") {
        const existingQty = existingHolding?.quantity ?? 0;
        const existingAvg = existingHolding?.avgCostBasis ?? 0;
        const newAvgCost = calculateAvgCostBasis(
          existingQty,
          existingAvg,
          data.quantity,
          data.price
        );

        if (existingHolding) {
          await tx.holding.update({
            where: { id: existingHolding.id },
            data: {
              quantity: existingQty + data.quantity,
              avgCostBasis: newAvgCost,
            },
          });
        } else {
          await tx.holding.create({
            data: {
              portfolioId: data.portfolioId,
              symbol,
              quantity: data.quantity,
              avgCostBasis: data.price,
            },
          });
        }
      } else {
        // SELL
        if (!existingHolding || existingHolding.quantity < data.quantity) {
          const available = existingHolding?.quantity ?? 0;
          throw new Error(
            `Insufficient shares: want to sell ${data.quantity} ${symbol} but only hold ${available}`
          );
        }

        const newQty = existingHolding.quantity - data.quantity;
        if (newQty === 0) {
          // Position fully closed — remove the holding
          await tx.holding.delete({ where: { id: existingHolding.id } });
        } else {
          await tx.holding.update({
            where: { id: existingHolding.id },
            data: { quantity: newQty },
            // avgCostBasis stays the same on SELL
          });
        }
      }

      // Create the transaction record
      const transaction = await tx.transaction.create({
        data: {
          portfolioId: data.portfolioId,
          symbol,
          type: data.type,
          quantity: data.quantity,
          price: data.price,
          fees,
          occurredAt,
        },
      });

      return transaction;
    });

    return { success: true, data: result };
  } catch (e) {
    return {
      success: false,
      error: `Failed to create transaction: ${String(e)}`,
    };
  }
}
