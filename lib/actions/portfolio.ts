"use server";

/**
 * Portfolio CRUD server actions.
 *
 * All functions are server actions (marked with 'use server' directive).
 * They return typed responses with proper error handling.
 */

import { prisma } from "@/lib/db";
import type { Portfolio } from "@prisma/client";

// ── Types ───────────────────────────────────────────────────────────────

export type PortfolioWithRelations = Portfolio & {
  holdings: { id: string; symbol: string; quantity: number; avgCostBasis: number }[];
  transactions: { id: string; symbol: string; type: string; quantity: number; price: number }[];
};

export type CreatePortfolioInput = {
  name: string;
  baseCurrency?: string;
};

export type UpdatePortfolioInput = {
  name?: string;
  baseCurrency?: string;
};

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── Actions ─────────────────────────────────────────────────────────────

/**
 * Get all portfolios (without relations for list views).
 */
export async function getPortfolios(): Promise<ActionResult<Portfolio[]>> {
  try {
    const portfolios = await prisma.portfolio.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: portfolios };
  } catch (e) {
    return { success: false, error: `Failed to fetch portfolios: ${String(e)}` };
  }
}

/**
 * Get a single portfolio by ID, including holdings and transactions.
 */
export async function getPortfolio(
  id: string
): Promise<ActionResult<PortfolioWithRelations>> {
  try {
    const portfolio = await prisma.portfolio.findUnique({
      where: { id },
      include: {
        holdings: {
          select: { id: true, symbol: true, quantity: true, avgCostBasis: true },
        },
        transactions: {
          select: { id: true, symbol: true, type: true, quantity: true, price: true },
          orderBy: { occurredAt: "desc" },
        },
      },
    });
    if (!portfolio) {
      return { success: false, error: `Portfolio not found: ${id}` };
    }
    return { success: true, data: portfolio };
  } catch (e) {
    return { success: false, error: `Failed to fetch portfolio: ${String(e)}` };
  }
}

/**
 * Create a new portfolio.
 */
export async function createPortfolio(
  data: CreatePortfolioInput
): Promise<ActionResult<Portfolio>> {
  try {
    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: "Portfolio name is required" };
    }
    const portfolio = await prisma.portfolio.create({
      data: {
        name: data.name.trim(),
        baseCurrency: data.baseCurrency ?? "EUR",
      },
    });
    return { success: true, data: portfolio };
  } catch (e) {
    return { success: false, error: `Failed to create portfolio: ${String(e)}` };
  }
}

/**
 * Update an existing portfolio.
 */
export async function updatePortfolio(
  id: string,
  data: UpdatePortfolioInput
): Promise<ActionResult<Portfolio>> {
  try {
    // Check existence first for a clear error message
    const existing = await prisma.portfolio.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: `Portfolio not found: ${id}` };
    }

    const updateData: Record<string, string> = {};
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        return { success: false, error: "Portfolio name cannot be empty" };
      }
      updateData.name = data.name.trim();
    }
    if (data.baseCurrency !== undefined) {
      updateData.baseCurrency = data.baseCurrency;
    }

    const portfolio = await prisma.portfolio.update({
      where: { id },
      data: updateData,
    });
    return { success: true, data: portfolio };
  } catch (e) {
    return { success: false, error: `Failed to update portfolio: ${String(e)}` };
  }
}

/**
 * Delete a portfolio and all related holdings/transactions (cascade).
 */
export async function deletePortfolio(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const existing = await prisma.portfolio.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: `Portfolio not found: ${id}` };
    }

    await prisma.portfolio.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: `Failed to delete portfolio: ${String(e)}` };
  }
}
