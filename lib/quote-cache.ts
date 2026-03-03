/**
 * Quote cache module.
 *
 * In-memory cache for stock quotes with staleness tracking.
 * Separated from server actions so non-async helpers can be exported.
 */

// ── Types ───────────────────────────────────────────────────────────────

export interface CachedQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  fetchedAt: number; // Unix ms timestamp
}

// ── Cache ───────────────────────────────────────────────────────────────

/** Stale threshold: quotes older than 5 minutes are considered stale */
export const STALE_THRESHOLD_MS = 5 * 60 * 1000;

// Use globalThis to survive Next.js dev hot-reload
const CACHE_KEY = "__quoteCache";

export function getCache(): Map<string, CachedQuote> {
  const g = globalThis as Record<string, unknown>;
  if (!g[CACHE_KEY]) {
    g[CACHE_KEY] = new Map<string, CachedQuote>();
  }
  return g[CACHE_KEY] as Map<string, CachedQuote>;
}

/**
 * Check if a cached quote is stale.
 */
export function isQuoteStale(quote: CachedQuote, now?: number): boolean {
  const currentTime = now ?? Date.now();
  return currentTime - quote.fetchedAt > STALE_THRESHOLD_MS;
}

/**
 * Get cached quote for a symbol (may be stale).
 */
export function getCachedQuote(symbol: string): CachedQuote | undefined {
  return getCache().get(symbol.trim().toUpperCase());
}

/**
 * Get all cached quotes as a record.
 */
export function getAllCachedQuotes(): Record<string, CachedQuote> {
  const result: Record<string, CachedQuote> = {};
  const cache = getCache();
  cache.forEach((quote, symbol) => {
    result[symbol] = quote;
  });
  return result;
}

/**
 * Clear the quote cache (for testing).
 */
export function clearQuoteCache(): void {
  getCache().clear();
}

/**
 * Build a currentPrices map from cached quotes, suitable for getHoldings().
 * Includes stale quotes as fallback values.
 *
 * @param symbols - Symbols to look up in cache
 * @returns Map of symbol → price (only for symbols with cached data)
 */
export function buildPriceMap(symbols: string[]): Record<string, number> {
  const cache = getCache();
  const prices: Record<string, number> = {};

  for (const symbol of symbols) {
    const normalized = symbol.trim().toUpperCase();
    const cached = cache.get(normalized);
    if (cached) {
      prices[normalized] = cached.price;
    }
  }

  return prices;
}

/**
 * Get staleness info for given symbols.
 * Returns a record of symbol → { isStale, fetchedAt } for symbols that have cached data.
 */
export function getQuoteStaleness(
  symbols: string[]
): Record<string, { isStale: boolean; fetchedAt: number }> {
  const cache = getCache();
  const now = Date.now();
  const result: Record<string, { isStale: boolean; fetchedAt: number }> = {};

  for (const symbol of symbols) {
    const normalized = symbol.trim().toUpperCase();
    const cached = cache.get(normalized);
    if (cached) {
      result[normalized] = {
        isStale: isQuoteStale(cached, now),
        fetchedAt: cached.fetchedAt,
      };
    }
  }

  return result;
}
