'use server';

/**
 * Auto-generate signals from portfolio holdings.
 *
 * Fetches holdings for a portfolio, gets live/cached quotes,
 * runs the signal engine, and stores new signals with deduplication.
 */

import { prisma } from '@/lib/db';
import { getHoldings } from '@/lib/actions/holding';
import { refreshQuotes } from '@/lib/actions/quotes';
import { generateSignals } from '@/lib/signal-engine';
import type { HoldingForSignal, QuoteForSignal } from '@/lib/signal-engine';
import { getCachedQuote } from '@/lib/quote-cache';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface GenerateSignalsResult {
  generated: number;
  skippedDuplicates: number;
  errors: string[];
}

/**
 * Generate and store signals for a portfolio.
 *
 * Steps:
 * 1. Fetch holdings for the portfolio
 * 2. Refresh quotes for all held symbols
 * 3. Run signal engine on holdings + quotes
 * 4. Deduplicate: skip signals where an unexpired signal with same symbol+direction exists
 * 5. Store new signals in DB
 *
 * @param portfolioId - The portfolio to analyze
 * @param source - Optional source tag for generated signals (default: 'auto-generate')
 * @returns Count of generated and skipped signals
 */
export async function generateAndStoreSignals(
  portfolioId: string,
  source?: string
): Promise<ActionResult<GenerateSignalsResult>> {
  try {
    if (!portfolioId?.trim()) {
      return { success: false, error: 'Portfolio ID is required' };
    }

    const signalSource = source?.trim() || 'auto-generate';

    // 1. Fetch holdings
    const holdingsResult = await getHoldings(portfolioId);
    if (!holdingsResult.success) {
      return { success: false, error: `Failed to fetch holdings: ${holdingsResult.error}` };
    }

    const holdings = holdingsResult.data;
    if (holdings.length === 0) {
      return {
        success: true,
        data: { generated: 0, skippedDuplicates: 0, errors: ['No holdings found in portfolio'] },
      };
    }

    // 2. Refresh quotes for all symbols
    const symbols = holdings.map((h) => h.symbol);
    const quotesResult = await refreshQuotes(symbols);
    const quoteErrors: string[] = [];
    if (quotesResult.success && quotesResult.data.errors.length > 0) {
      quoteErrors.push(...quotesResult.data.errors);
    }

    // 3. Build signal engine inputs from cached quotes
    const holdingInputs: HoldingForSignal[] = holdings.map((h) => ({
      symbol: h.symbol,
      quantity: h.quantity,
      avgCostBasis: h.avgCostBasis,
    }));

    const quoteMap = new Map<string, QuoteForSignal>();
    for (const symbol of symbols) {
      const cached = getCachedQuote(symbol);
      if (cached) {
        quoteMap.set(symbol, {
          currentPrice: cached.price,
          previousClose: cached.price - cached.change, // Derive previous close from price and change
        });
      }
    }

    if (quoteMap.size === 0) {
      return {
        success: true,
        data: { generated: 0, skippedDuplicates: 0, errors: ['No quotes available for any holdings', ...quoteErrors] },
      };
    }

    // 4. Run signal engine
    const rawSignals = generateSignals(holdingInputs, quoteMap);

    // 5. Deduplicate and store
    let generated = 0;
    let skippedDuplicates = 0;
    const now = new Date();

    for (const sig of rawSignals) {
      // Check for existing unexpired signal with same symbol+direction
      const existing = await prisma.signal.findFirst({
        where: {
          symbol: sig.symbol,
          direction: sig.direction,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
      });

      if (existing) {
        skippedDuplicates++;
        continue;
      }

      // Calculate expiry: 24 hours from now
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await prisma.signal.create({
        data: {
          symbol: sig.symbol,
          direction: sig.direction,
          confidence: sig.confidence,
          source: signalSource,
          reasoning: sig.reasoning,
          expiresAt,
        },
      });
      generated++;
    }

    return {
      success: true,
      data: {
        generated,
        skippedDuplicates,
        errors: quoteErrors,
      },
    };
  } catch (error) {
    return { success: false, error: `Failed to generate signals: ${error}` };
  }
}
