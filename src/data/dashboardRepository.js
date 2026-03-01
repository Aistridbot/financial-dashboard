const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_DATA_PATH = path.resolve(__dirname, '../../db/dashboard-data.json');

/**
 * @typedef {{
 *   revenue: number,
 *   expenses: number,
 *   netIncome: number,
 *   currency?: string,
 *   period?: string
 * }} DashboardData
 */

/**
 * @param {unknown} value
 * @returns {asserts value is DashboardData}
 */
function assertValidDashboardData(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid dashboard data: expected object payload');
  }

  const objectValue = /** @type {Record<string, unknown>} */ (value);
  const requiredFields = ['revenue', 'expenses', 'netIncome'];
  for (const field of requiredFields) {
    if (!(field in objectValue)) {
      throw new Error(`Invalid dashboard data: missing required field "${field}"`);
    }

    const numericValue = objectValue[field];
    if (typeof numericValue !== 'number' || !Number.isFinite(numericValue)) {
      throw new Error(`Invalid dashboard data: field "${field}" must be a finite number`);
    }
  }
}

/**
 * @param {string} [dataPath]
 * @returns {DashboardData}
 */
function loadDashboardData(dataPath = DEFAULT_DATA_PATH) {
  const raw = fs.readFileSync(dataPath, 'utf8');
  /** @type {unknown} */
  const parsed = JSON.parse(raw);

  assertValidDashboardData(parsed);

  return {
    revenue: parsed.revenue,
    expenses: parsed.expenses,
    netIncome: parsed.netIncome,
    currency: parsed.currency,
    period: parsed.period
  };
}

module.exports = {
  DEFAULT_DATA_PATH,
  loadDashboardData,
  assertValidDashboardData
};
