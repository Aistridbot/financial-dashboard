/**
 * Position calculation utilities.
 *
 * Pure functions for portfolio math — no database dependencies.
 */

/**
 * Calculate the weighted average cost basis after a new BUY.
 *
 * Formula: ((existingQty * existingAvg) + (newQty * newPrice)) / (existingQty + newQty)
 *
 * @param existingQuantity - Current holding quantity (may be 0 for new positions)
 * @param existingAvgCost  - Current average cost basis (ignored when existingQuantity is 0)
 * @param newQuantity      - Quantity being purchased
 * @param newPrice         - Price per share of the new purchase
 * @returns Updated average cost basis
 */
export function calculateAvgCostBasis(
  existingQuantity: number,
  existingAvgCost: number,
  newQuantity: number,
  newPrice: number
): number {
  if (newQuantity <= 0) {
    throw new Error("New quantity must be positive");
  }
  const totalQuantity = existingQuantity + newQuantity;
  if (totalQuantity === 0) return 0;

  const totalCost =
    existingQuantity * existingAvgCost + newQuantity * newPrice;
  return totalCost / totalQuantity;
}

/**
 * Calculate the current market value of a position.
 *
 * @param quantity     - Number of shares held
 * @param currentPrice - Current market price per share
 * @returns Position market value
 */
export function calculatePositionValue(
  quantity: number,
  currentPrice: number
): number {
  return quantity * currentPrice;
}

/**
 * Calculate unrealised gain/loss for a position.
 *
 * @param quantity     - Number of shares held
 * @param avgCostBasis - Average cost per share
 * @param currentPrice - Current market price per share
 * @returns Object with absolute gain/loss and percentage
 */
export function calculateGainLoss(
  quantity: number,
  avgCostBasis: number,
  currentPrice: number
): { gainLoss: number; gainLossPercent: number } {
  const costBasis = quantity * avgCostBasis;
  const currentValue = quantity * currentPrice;
  const gainLoss = currentValue - costBasis;
  const gainLossPercent = costBasis === 0 ? 0 : (gainLoss / costBasis) * 100;
  return { gainLoss, gainLossPercent };
}
