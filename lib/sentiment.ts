/**
 * Simple sentiment scoring for news headlines and summaries.
 *
 * If Finnhub provides a sentiment score, that takes priority.
 * Otherwise, a basic keyword-based approach is used to classify
 * headlines as POSITIVE, NEGATIVE, or NEUTRAL.
 */

export type SentimentLabel = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export interface SentimentResult {
  label: SentimentLabel;
  score: number; // -1.0 to 1.0
}

const POSITIVE_WORDS = [
  'rally', 'gain', 'gains', 'surge', 'surges', 'rise', 'rises', 'rising',
  'up', 'upgrade', 'upgraded', 'upgrades', 'beat', 'beats', 'strong',
  'growth', 'profit', 'profits', 'record', 'high', 'boost', 'boosted',
  'positive', 'optimistic', 'outperform', 'bullish', 'buy', 'success',
  'exceed', 'exceeded', 'exceeds', 'earnings', 'revenue', 'breakout',
  'recovery', 'rebound', 'soar', 'soars', 'jump', 'jumps',
];

const NEGATIVE_WORDS = [
  'fall', 'falls', 'drop', 'drops', 'decline', 'declines', 'declining',
  'down', 'downgrade', 'downgraded', 'downgrades', 'miss', 'misses',
  'weak', 'loss', 'losses', 'low', 'crash', 'crashed', 'plunge',
  'plunges', 'negative', 'pessimistic', 'underperform', 'bearish',
  'sell', 'selloff', 'warning', 'risk', 'debt', 'layoff', 'layoffs',
  'cut', 'cuts', 'recession', 'slump', 'tumble', 'tumbles',
];

/**
 * Score sentiment from a headline and optional summary text.
 *
 * @param headline - News headline
 * @param summary - Optional summary text (weighted less than headline)
 * @param finnhubSentiment - Optional pre-computed sentiment from Finnhub
 * @returns SentimentResult with label and numeric score
 */
export function scoreSentiment(
  headline: string,
  summary?: string | null,
  finnhubSentiment?: number | null
): SentimentResult {
  // If Finnhub provides a sentiment score, use it directly
  if (finnhubSentiment != null && !isNaN(finnhubSentiment)) {
    const score = Math.max(-1, Math.min(1, finnhubSentiment));
    return {
      label: score > 0.1 ? 'POSITIVE' : score < -0.1 ? 'NEGATIVE' : 'NEUTRAL',
      score,
    };
  }

  // Keyword-based scoring
  const headlineWords = tokenize(headline);
  const summaryWords = summary ? tokenize(summary) : [];

  let positiveCount = 0;
  let negativeCount = 0;

  // Headline words count double
  for (const word of headlineWords) {
    if (POSITIVE_WORDS.includes(word)) positiveCount += 2;
    if (NEGATIVE_WORDS.includes(word)) negativeCount += 2;
  }

  // Summary words count once
  for (const word of summaryWords) {
    if (POSITIVE_WORDS.includes(word)) positiveCount += 1;
    if (NEGATIVE_WORDS.includes(word)) negativeCount += 1;
  }

  const total = positiveCount + negativeCount;
  if (total === 0) {
    return { label: 'NEUTRAL', score: 0 };
  }

  // Score from -1 to 1
  const score =
    Math.round(((positiveCount - negativeCount) / total) * 100) / 100;

  return {
    label: score > 0 ? 'POSITIVE' : score < 0 ? 'NEGATIVE' : 'NEUTRAL',
    score,
  };
}

/**
 * Get the badge color for a sentiment label.
 */
export function getSentimentBadgeColor(label: SentimentLabel): string {
  switch (label) {
    case 'POSITIVE':
      return 'bg-green-100 text-green-800';
    case 'NEGATIVE':
      return 'bg-red-100 text-red-800';
    case 'NEUTRAL':
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/** Tokenize text into lowercase words */
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
}
