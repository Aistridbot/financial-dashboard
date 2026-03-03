/**
 * Belgian TOB (Taks op Beursverrichtingen / Transaction Tax on Stock Exchange)
 *
 * Rates as of 2024:
 * - Stocks: 0.35% capped at €1,600
 * - Accumulating funds: 1.32% capped at €4,000
 * - Bonds/ETFs: 0.12% capped at €1,300
 *
 * Default instrument type is 'stock' if not specified.
 */

export type InstrumentType = 'stock' | 'accumulating_fund' | 'bond_etf';

export type TOBResult = {
  taxRate: number;
  taxAmount: number;
  cappedAt: number;
};

const TOB_RATES: Record<InstrumentType, { rate: number; cap: number }> = {
  stock: { rate: 0.0035, cap: 1600 },
  accumulating_fund: { rate: 0.0132, cap: 4000 },
  bond_etf: { rate: 0.0012, cap: 1300 },
};

/**
 * Calculate Belgian TOB tax for a transaction.
 *
 * @param type - Transaction type: 'BUY' or 'SELL' (both are taxed equally)
 * @param amount - Total transaction amount in EUR (quantity × price)
 * @param instrumentType - Type of instrument (defaults to 'stock')
 * @returns TOBResult with taxRate, taxAmount, and cap value
 */
export function calculateTOBTax(
  type: 'BUY' | 'SELL',
  amount: number,
  instrumentType?: InstrumentType
): TOBResult {
  const instrument = instrumentType ?? 'stock';
  const { rate, cap } = TOB_RATES[instrument];

  const rawTax = amount * rate;
  const taxAmount = Math.min(rawTax, cap);

  return {
    taxRate: rate,
    taxAmount: Math.round(taxAmount * 100) / 100, // Round to cents
    cappedAt: cap,
  };
}
