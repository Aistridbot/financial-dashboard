/**
 * Signal generation engine with extensible strategy pattern.
 *
 * Strategies are functions that evaluate a holding + quote and optionally
 * return a signal recommendation. The engine runs all strategies for each
 * holding and picks the highest-confidence result.
 */

export interface HoldingForSignal {
  symbol: string;
  quantity: number;
  avgCostBasis: number;
}

export interface QuoteForSignal {
  currentPrice: number;
  previousClose: number;
}

export interface GeneratedSignal {
  symbol: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  source: string;
}

/**
 * A strategy function evaluates one holding against its quote and
 * optionally returns a signal. Return null to abstain.
 */
export type SignalStrategy = (
  holding: HoldingForSignal,
  quote: QuoteForSignal
) => GeneratedSignal | null;

// ── Built-in strategies ──────────────────────────────────────────────

/**
 * Price-drop BUY strategy: if price dropped >5% from previous close,
 * emit a BUY signal. Confidence scales with the magnitude of the drop.
 */
export const priceDropBuyStrategy: SignalStrategy = (holding, quote) => {
  if (quote.previousClose <= 0) return null;
  const changePercent =
    ((quote.currentPrice - quote.previousClose) / quote.previousClose) * 100;

  if (changePercent < -5) {
    const magnitude = Math.abs(changePercent);
    // Confidence: map 5-20% drop to 0.5-1.0 range
    const confidence = Math.min(1, 0.5 + (magnitude - 5) / 30);
    return {
      symbol: holding.symbol,
      direction: 'BUY',
      confidence: Math.round(confidence * 100) / 100,
      reasoning: `Price dropped ${magnitude.toFixed(1)}% from previous close ($${quote.previousClose.toFixed(2)} → $${quote.currentPrice.toFixed(2)}). Potential buying opportunity.`,
      source: 'price-drop-strategy',
    };
  }
  return null;
};

/**
 * Price-rise SELL strategy: if price rose >10% from previous close,
 * emit a SELL signal. Confidence scales with the magnitude of the rise.
 */
export const priceRiseSellStrategy: SignalStrategy = (holding, quote) => {
  if (quote.previousClose <= 0) return null;
  const changePercent =
    ((quote.currentPrice - quote.previousClose) / quote.previousClose) * 100;

  if (changePercent > 10) {
    const magnitude = changePercent;
    // Confidence: map 10-30% rise to 0.5-1.0 range
    const confidence = Math.min(1, 0.5 + (magnitude - 10) / 40);
    return {
      symbol: holding.symbol,
      direction: 'SELL',
      confidence: Math.round(confidence * 100) / 100,
      reasoning: `Price rose ${magnitude.toFixed(1)}% from previous close ($${quote.previousClose.toFixed(2)} → $${quote.currentPrice.toFixed(2)}). Consider taking profits.`,
      source: 'price-rise-strategy',
    };
  }
  return null;
};

/**
 * Default HOLD strategy: always returns HOLD with low confidence.
 * Acts as a fallback when no other strategy fires.
 */
export const defaultHoldStrategy: SignalStrategy = (holding, quote) => {
  const changePercent =
    quote.previousClose > 0
      ? ((quote.currentPrice - quote.previousClose) / quote.previousClose) * 100
      : 0;
  return {
    symbol: holding.symbol,
    direction: 'HOLD',
    confidence: 0.3,
    reasoning: `Price change ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}% is within normal range. No action recommended.`,
    source: 'default-hold-strategy',
  };
};

/** The default set of strategies used when none are provided. */
export const DEFAULT_STRATEGIES: SignalStrategy[] = [
  priceDropBuyStrategy,
  priceRiseSellStrategy,
  defaultHoldStrategy,
];

/**
 * Generate signals for a set of holdings given their current quotes.
 *
 * @param holdings - Array of holdings to evaluate
 * @param quotes   - Map of symbol → quote data
 * @param strategies - Optional array of strategy functions (defaults to built-in set)
 * @returns Array of generated signals (one per holding that has a matching quote)
 */
export function generateSignals(
  holdings: HoldingForSignal[],
  quotes: Map<string, QuoteForSignal>,
  strategies: SignalStrategy[] = DEFAULT_STRATEGIES
): GeneratedSignal[] {
  const signals: GeneratedSignal[] = [];

  for (const holding of holdings) {
    const quote = quotes.get(holding.symbol);
    if (!quote) continue;

    // Run all strategies, collect non-null results
    const candidates: GeneratedSignal[] = [];
    for (const strategy of strategies) {
      const result = strategy(holding, quote);
      if (result) candidates.push(result);
    }

    if (candidates.length === 0) continue;

    // Pick the highest-confidence signal
    candidates.sort((a, b) => b.confidence - a.confidence);
    signals.push(candidates[0]);
  }

  return signals;
}
