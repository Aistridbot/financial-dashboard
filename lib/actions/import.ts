"use server";

/**
 * CSV import server action.
 *
 * Parses a CSV string and bulk-creates transactions for a portfolio.
 * Uses the existing createTransaction action to ensure holdings stay consistent.
 */

import { prisma } from "@/lib/db";
import { parseTransactionCSV, type ParsedTransaction, type ParseError } from "@/lib/csv-parser";
import { createTransaction } from "@/lib/actions/transaction";

// ── Types ───────────────────────────────────────────────────────────────

export type ImportResult = {
  imported: number;
  errors: ParseError[];
  transactionErrors: { row: number; message: string }[];
};

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── Action ──────────────────────────────────────────────────────────────

/**
 * Import transactions from a CSV string into a portfolio.
 *
 * 1. Validates the portfolio exists
 * 2. Parses the CSV
 * 3. Creates each valid transaction (sequentially to maintain holding consistency)
 * 4. Returns count of imported rows plus any parse/creation errors
 */
export async function importTransactions(
  portfolioId: string,
  csvString: string
): Promise<ActionResult<ImportResult>> {
  try {
    if (!portfolioId) {
      return { success: false, error: "Portfolio ID is required" };
    }

    // Verify portfolio exists
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });
    if (!portfolio) {
      return { success: false, error: `Portfolio not found: ${portfolioId}` };
    }

    // Parse CSV
    const { valid, errors } = parseTransactionCSV(csvString);

    if (valid.length === 0 && errors.length === 0) {
      return {
        success: true,
        data: { imported: 0, errors: [], transactionErrors: [] },
      };
    }

    // Create transactions sequentially (order matters for holding calculations)
    let imported = 0;
    const transactionErrors: { row: number; message: string }[] = [];

    for (let i = 0; i < valid.length; i++) {
      const row = valid[i];
      const result = await createTransaction({
        portfolioId,
        symbol: row.symbol,
        type: row.type,
        quantity: row.quantity,
        price: row.price,
        fees: row.fees,
        occurredAt: row.date,
      });

      if (result.success) {
        imported++;
      } else {
        transactionErrors.push({
          row: i + 1, // 1-indexed within valid rows
          message: result.error,
        });
      }
    }

    return {
      success: true,
      data: { imported, errors, transactionErrors },
    };
  } catch (e) {
    return {
      success: false,
      error: `Import failed: ${String(e)}`,
    };
  }
}
