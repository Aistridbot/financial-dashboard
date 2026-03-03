/**
 * Risk indicator calculations for portfolio holdings.
 *
 * Pure functions — no database dependencies. Operates on holdings with
 * quantity and avgCostBasis (or currentPrice if available).
 */

export interface HoldingInput {
  symbol: string;
  quantity: number;
  avgCostBasis: number;
  currentPrice?: number;
}

export interface ConcentrationEntry {
  symbol: string;
  percentage: number;
}

export type ConcentrationRisk = "LOW" | "MEDIUM" | "HIGH";

export interface PortfolioRiskResult {
  totalValue: number;
  largestPosition: ConcentrationEntry;
  concentrationRisk: ConcentrationRisk;
  diversificationScore: number;
}

/**
 * Calculate position concentration as percentage of total portfolio value.
 *
 * Uses currentPrice if provided, otherwise falls back to avgCostBasis.
 *
 * @param holdings - Array of holdings with quantity and price info
 * @returns Array of { symbol, percentage } sorted by percentage descending
 */
export function calculateConcentration(
  holdings: HoldingInput[]
): ConcentrationEntry[] {
  if (holdings.length === 0) return [];

  const values = holdings.map((h) => ({
    symbol: h.symbol,
    value: h.quantity * (h.currentPrice ?? h.avgCostBasis),
  }));

  const totalValue = values.reduce((sum, v) => sum + v.value, 0);

  if (totalValue === 0) {
    return holdings.map((h) => ({ symbol: h.symbol, percentage: 0 }));
  }

  return values
    .map((v) => ({
      symbol: v.symbol,
      percentage: (v.value / totalValue) * 100,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

/**
 * Calculate a diversification score from 0-100.
 *
 * Factors:
 * - Position count: more positions = higher base score
 * - Distribution evenness: measured via normalised entropy (Shannon)
 *
 * Score = positionCountScore * 0.4 + evennessScore * 0.6
 *
 * @param holdings - Array of holdings
 * @returns Score between 0 and 100
 */
export function calculateDiversificationScore(
  holdings: HoldingInput[]
): number {
  if (holdings.length === 0) return 0;
  if (holdings.length === 1) return 10; // Single position = minimal diversification

  const concentration = calculateConcentration(holdings);
  const n = concentration.length;

  // Position count score: asymptotic approach to 100
  // 2 positions → ~33, 5 → ~63, 10 → ~82, 20 → ~93
  const positionCountScore = Math.min(100, (1 - 1 / n) * 100);

  // Evenness via normalised Shannon entropy
  const maxEntropy = Math.log(n);
  let entropy = 0;
  for (const entry of concentration) {
    const p = entry.percentage / 100;
    if (p > 0) {
      entropy -= p * Math.log(p);
    }
  }
  const evennessScore = maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;

  const score = positionCountScore * 0.4 + evennessScore * 0.6;
  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Calculate overall portfolio risk metrics.
 *
 * @param holdings - Array of holdings
 * @returns Risk summary with totalValue, largestPosition, concentrationRisk, diversificationScore
 */
export function calculatePortfolioRisk(
  holdings: HoldingInput[]
): PortfolioRiskResult {
  if (holdings.length === 0) {
    return {
      totalValue: 0,
      largestPosition: { symbol: "", percentage: 0 },
      concentrationRisk: "LOW",
      diversificationScore: 0,
    };
  }

  const concentration = calculateConcentration(holdings);
  const totalValue = holdings.reduce(
    (sum, h) => sum + h.quantity * (h.currentPrice ?? h.avgCostBasis),
    0
  );

  const largestPosition = concentration[0]; // Already sorted descending

  let concentrationRisk: ConcentrationRisk = "LOW";
  if (largestPosition.percentage > 40) {
    concentrationRisk = "HIGH";
  } else if (largestPosition.percentage > 25) {
    concentrationRisk = "MEDIUM";
  }

  const diversificationScore = calculateDiversificationScore(holdings);

  return {
    totalValue,
    largestPosition,
    concentrationRisk,
    diversificationScore,
  };
}
