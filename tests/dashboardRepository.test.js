const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { DEFAULT_DATA_PATH, loadDashboardData } = require('../src/data/dashboardRepository');

describe('dashboardRepository', () => {
  it('loads stable dashboard data shape from local schema file', () => {
    const result = loadDashboardData();

    expect(result).toEqual({
      revenue: 125000,
      expenses: 82000,
      netIncome: 43000,
      currency: 'EUR',
      period: '2026-Q1'
    });
    expect(DEFAULT_DATA_PATH.endsWith(path.join('db', 'dashboard-data.json'))).toBe(true);
  });

  it('throws deterministic error when a required field is missing', () => {
    const tempFile = path.join(os.tmpdir(), `dashboard-invalid-${Date.now()}.json`);
    fs.writeFileSync(tempFile, JSON.stringify({ revenue: 10, expenses: 8 }), 'utf8');

    expect(() => loadDashboardData(tempFile)).toThrow(
      'Invalid dashboard data: missing required field "netIncome"'
    );
  });
});
