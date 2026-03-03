"use server";

/**
 * Quote refresh server actions.
 *
 * Fetches live quotes from Finnhub (or mock data when no API key is set),
 * caches them in the quote-cache module, and returns results.
 */

import { FinnhubClient } from "@/lib/finnhub";
import type { FinnhubQuote } from "@/lib/types/finnhub";
import { getCache, type CachedQuote } from "@/lib/quote-cache";

// ── Types ───────────────────────────────────────────────────────────────

export interface QuoteResult {
  quotes: Record<string, CachedQuote>;
  errors: string[];
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── Actions ─────────────────────────────────────────────────────────────

/**
 * Refresh quotes for the given symbols.
 *
 * Fetches current prices from Finnhub for each symbol, updates the in-memory cache,
 * and returns the results. Symbols that fail to fetch are reported in the errors array
 * but don't prevent other symbols from being fetched.
 *
 * @param symbols - Array of ticker symbols to refresh
 * @returns QuoteResult with fetched quotes and any errors
 */
export async function refreshQuotes(
  symbols: string[]
): Promise<ActionResult<QuoteResult>> {
  try {
    const client = new FinnhubClient();
    const cache = getCache();
    const quotes: Record<string, CachedQuote> = {};
    const errors: string[] = [];

    const normalizedSymbols = symbols.map((s) => s.trim().toUpperCase());
    const uniqueSymbols = Array.from(new Set(normalizedSymbols));

    for (const symbol of uniqueSymbols) {
      try {
        const finnhubQuote: FinnhubQuote = await client.getQuote(symbol);
        const cached: CachedQuote = {
          symbol,
          price: finnhubQuote.price,
          change: finnhubQuote.change,
          changePercent: finnhubQuote.changePercent,
          fetchedAt: Date.now(),
        };
        cache.set(symbol, cached);
        quotes[symbol] = cached;
      } catch (err) {
        errors.push(`Failed to fetch quote for ${symbol}: ${String(err)}`);
        // Keep existing cached value if available (fallback)
      }
    }

    return { success: true, data: { quotes, errors } };
  } catch (e) {
    return {
      success: false,
      error: `Failed to refresh quotes: ${String(e)}`,
    };
  }
}
