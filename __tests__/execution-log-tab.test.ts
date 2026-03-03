import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

// --- Execution Table tests ---

describe('ExecutionTable component', () => {
  const tablePath = path.join(__dirname, '..', 'components', 'execution-log', 'execution-table.tsx');
  const tableSource = fs.readFileSync(tablePath, 'utf-8');

  it('file exists', () => {
    assert.ok(fs.existsSync(tablePath));
  });

  it('exports ExecutionTable component', () => {
    assert.ok(tableSource.includes('export function ExecutionTable'));
  });

  it('exports ExecutionLogRow interface', () => {
    assert.ok(tableSource.includes('export interface ExecutionLogRow'));
  });

  it('has Date column', () => {
    assert.ok(tableSource.includes('Date'));
  });

  it('has Symbol column', () => {
    assert.ok(tableSource.includes('Symbol'));
  });

  it('has Type column', () => {
    assert.ok(tableSource.includes('Type'));
  });

  it('has Quantity column', () => {
    assert.ok(tableSource.includes('Quantity'));
  });

  it('has Price column', () => {
    assert.ok(tableSource.includes('Price'));
  });

  it('has Total column', () => {
    assert.ok(tableSource.includes('Total'));
  });

  it('has TOB Rate column', () => {
    assert.ok(tableSource.includes('TOB Rate'));
  });

  it('has TOB Tax column', () => {
    assert.ok(tableSource.includes('TOB Tax'));
  });

  it('renders empty state when no logs', () => {
    assert.ok(tableSource.includes('No executed trades found'));
  });

  it('calculates total as quantity * price', () => {
    assert.ok(tableSource.includes('log.quantity * log.price'));
  });

  it('uses Table component from shadcn/ui', () => {
    assert.ok(tableSource.includes('from "@/components/ui/table"'));
  });

  it('uses Badge for type display', () => {
    assert.ok(tableSource.includes('Badge'));
  });
});

// --- Format functions ---

describe('formatCurrency', () => {
  // Dynamic import to test the actual function
  it('formats EUR values correctly', async () => {
    const { formatCurrency } = await import('../components/execution-log/execution-table');
    const result = formatCurrency(1234.56);
    // Should contain the number (locale formatting may vary)
    assert.ok(result.includes('1'));
    assert.ok(result.includes('234'));
    assert.ok(result.includes('56'));
  });

  it('formats zero correctly', async () => {
    const { formatCurrency } = await import('../components/execution-log/execution-table');
    const result = formatCurrency(0);
    assert.ok(result.includes('0'));
  });
});

describe('formatPercentage', () => {
  it('converts decimal to percentage string', async () => {
    const { formatPercentage } = await import('../components/execution-log/execution-table');
    assert.equal(formatPercentage(0.0035), '0.35%');
  });

  it('handles 1.32% TOB rate', async () => {
    const { formatPercentage } = await import('../components/execution-log/execution-table');
    assert.equal(formatPercentage(0.0132), '1.32%');
  });

  it('handles 0.12% TOB rate', async () => {
    const { formatPercentage } = await import('../components/execution-log/execution-table');
    assert.equal(formatPercentage(0.0012), '0.12%');
  });

  it('handles zero', async () => {
    const { formatPercentage } = await import('../components/execution-log/execution-table');
    assert.equal(formatPercentage(0), '0.00%');
  });
});

describe('formatDate', () => {
  it('formats ISO date string', async () => {
    const { formatDate } = await import('../components/execution-log/execution-table');
    const result = formatDate('2026-01-15T10:00:00.000Z');
    // Should contain day and year
    assert.ok(result.includes('15'));
    assert.ok(result.includes('2026'));
  });
});

describe('getTypeBadgeColor', () => {
  it('returns green for BUY', async () => {
    const { getTypeBadgeColor } = await import('../components/execution-log/execution-table');
    assert.ok(getTypeBadgeColor('BUY').includes('green'));
  });

  it('returns red for SELL', async () => {
    const { getTypeBadgeColor } = await import('../components/execution-log/execution-table');
    assert.ok(getTypeBadgeColor('SELL').includes('red'));
  });

  it('returns gray for unknown type', async () => {
    const { getTypeBadgeColor } = await import('../components/execution-log/execution-table');
    assert.ok(getTypeBadgeColor('UNKNOWN').includes('gray'));
  });
});

// --- Tax Summary tests ---

describe('TaxSummary component', () => {
  const summaryPath = path.join(__dirname, '..', 'components', 'execution-log', 'tax-summary.tsx');
  const summarySource = fs.readFileSync(summaryPath, 'utf-8');

  it('file exists', () => {
    assert.ok(fs.existsSync(summaryPath));
  });

  it('exports TaxSummary component', () => {
    assert.ok(summarySource.includes('export function TaxSummary'));
  });

  it('exports calculateTaxSummary function', () => {
    assert.ok(summarySource.includes('export function calculateTaxSummary'));
  });

  it('exports TaxSummaryData interface', () => {
    assert.ok(summarySource.includes('export interface TaxSummaryData'));
  });

  it('shows YTD TOB Tax', () => {
    assert.ok(summarySource.includes('YTD TOB Tax'));
  });

  it('shows Total Executions', () => {
    assert.ok(summarySource.includes('Total Executions'));
  });

  it('shows Total Traded Volume', () => {
    assert.ok(summarySource.includes('Total Traded Volume'));
  });

  it('has data-testid for total-tob-tax', () => {
    assert.ok(summarySource.includes('data-testid="total-tob-tax"'));
  });

  it('has data-testid for execution-count', () => {
    assert.ok(summarySource.includes('data-testid="execution-count"'));
  });

  it('has data-testid for total-volume', () => {
    assert.ok(summarySource.includes('data-testid="total-volume"'));
  });
});

describe('calculateTaxSummary', () => {
  it('calculates totals from logs', async () => {
    const { calculateTaxSummary } = await import('../components/execution-log/tax-summary');
    const logs = [
      { quantity: 10, price: 100, tobTaxAmount: 3.5, executedAt: '2026-02-01T00:00:00Z' },
      { quantity: 5, price: 200, tobTaxAmount: 3.5, executedAt: '2026-06-15T00:00:00Z' },
    ];

    const result = calculateTaxSummary(logs, 2026);
    assert.equal(result.totalTobTax, 7);
    assert.equal(result.executionCount, 2);
    assert.equal(result.totalVolume, 2000); // 10*100 + 5*200
    assert.equal(result.year, 2026);
  });

  it('filters by year', async () => {
    const { calculateTaxSummary } = await import('../components/execution-log/tax-summary');
    const logs = [
      { quantity: 10, price: 100, tobTaxAmount: 3.5, executedAt: '2025-02-01T00:00:00Z' },
      { quantity: 5, price: 200, tobTaxAmount: 7.0, executedAt: '2026-06-15T00:00:00Z' },
    ];

    const result = calculateTaxSummary(logs, 2026);
    assert.equal(result.totalTobTax, 7);
    assert.equal(result.executionCount, 1);
    assert.equal(result.totalVolume, 1000);
  });

  it('returns zeros for empty logs', async () => {
    const { calculateTaxSummary } = await import('../components/execution-log/tax-summary');
    const result = calculateTaxSummary([], 2026);
    assert.equal(result.totalTobTax, 0);
    assert.equal(result.executionCount, 0);
    assert.equal(result.totalVolume, 0);
  });

  it('rounds totals to cents', async () => {
    const { calculateTaxSummary } = await import('../components/execution-log/tax-summary');
    const logs = [
      { quantity: 3, price: 33.33, tobTaxAmount: 0.35, executedAt: '2026-01-01T00:00:00Z' },
      { quantity: 7, price: 14.29, tobTaxAmount: 0.35, executedAt: '2026-01-02T00:00:00Z' },
    ];

    const result = calculateTaxSummary(logs, 2026);
    // totalTobTax: 0.70
    assert.equal(result.totalTobTax, 0.7);
    // totalVolume: 3*33.33 + 7*14.29 = 99.99 + 100.03 = 200.02
    assert.equal(result.totalVolume, 200.02);
  });

  it('defaults to current year if not specified', async () => {
    const { calculateTaxSummary } = await import('../components/execution-log/tax-summary');
    const currentYear = new Date().getFullYear();
    const logs = [
      { quantity: 1, price: 100, tobTaxAmount: 0.35, executedAt: new Date().toISOString() },
    ];

    const result = calculateTaxSummary(logs);
    assert.equal(result.year, currentYear);
    assert.equal(result.executionCount, 1);
  });
});

// --- Execution Filters tests ---

describe('ExecutionFilters component', () => {
  const filtersPath = path.join(__dirname, '..', 'components', 'execution-log', 'execution-filters.tsx');
  const filtersSource = fs.readFileSync(filtersPath, 'utf-8');

  it('file exists', () => {
    assert.ok(fs.existsSync(filtersPath));
  });

  it('exports ExecutionFilters component', () => {
    assert.ok(filtersSource.includes('export function ExecutionFilters'));
  });

  it('exports applyFilters function', () => {
    assert.ok(filtersSource.includes('export function applyFilters'));
  });

  it('exports ExecutionFilterValues interface', () => {
    assert.ok(filtersSource.includes('export interface ExecutionFilterValues'));
  });

  it('has symbol filter input', () => {
    assert.ok(filtersSource.includes('symbol-filter'));
  });

  it('has from date input', () => {
    assert.ok(filtersSource.includes('from-date'));
  });

  it('has to date input', () => {
    assert.ok(filtersSource.includes('to-date'));
  });

  it('has Apply button', () => {
    assert.ok(filtersSource.includes('Apply'));
  });

  it('has Clear button', () => {
    assert.ok(filtersSource.includes('Clear'));
  });
});

describe('applyFilters', () => {
  const sampleLogs = [
    { symbol: 'AAPL', executedAt: '2026-01-15T10:00:00Z', type: 'BUY' },
    { symbol: 'GOOGL', executedAt: '2026-02-20T10:00:00Z', type: 'SELL' },
    { symbol: 'AAPL', executedAt: '2026-03-01T10:00:00Z', type: 'SELL' },
    { symbol: 'MSFT', executedAt: '2025-12-01T10:00:00Z', type: 'BUY' },
  ];

  it('returns all logs when no filters applied', async () => {
    const { applyFilters } = await import('../components/execution-log/execution-filters');
    const result = applyFilters(sampleLogs, { symbol: '', fromDate: '', toDate: '' });
    assert.equal(result.length, 4);
  });

  it('filters by symbol (case-insensitive)', async () => {
    const { applyFilters } = await import('../components/execution-log/execution-filters');
    const result = applyFilters(sampleLogs, { symbol: 'aapl', fromDate: '', toDate: '' });
    assert.equal(result.length, 2);
    assert.ok(result.every((r) => r.symbol === 'AAPL'));
  });

  it('filters by partial symbol match', async () => {
    const { applyFilters } = await import('../components/execution-log/execution-filters');
    const result = applyFilters(sampleLogs, { symbol: 'GOO', fromDate: '', toDate: '' });
    assert.equal(result.length, 1);
    assert.equal(result[0].symbol, 'GOOGL');
  });

  it('filters by fromDate', async () => {
    const { applyFilters } = await import('../components/execution-log/execution-filters');
    const result = applyFilters(sampleLogs, { symbol: '', fromDate: '2026-02-01', toDate: '' });
    assert.equal(result.length, 2); // GOOGL Feb and AAPL Mar
  });

  it('filters by toDate', async () => {
    const { applyFilters } = await import('../components/execution-log/execution-filters');
    const result = applyFilters(sampleLogs, { symbol: '', fromDate: '', toDate: '2026-01-31' });
    assert.equal(result.length, 2); // AAPL Jan and MSFT Dec 2025
  });

  it('combines symbol and date filters', async () => {
    const { applyFilters } = await import('../components/execution-log/execution-filters');
    const result = applyFilters(sampleLogs, { symbol: 'AAPL', fromDate: '2026-02-01', toDate: '' });
    assert.equal(result.length, 1);
    assert.equal(result[0].executedAt, '2026-03-01T10:00:00Z');
  });

  it('returns empty for no matches', async () => {
    const { applyFilters } = await import('../components/execution-log/execution-filters');
    const result = applyFilters(sampleLogs, { symbol: 'TSLA', fromDate: '', toDate: '' });
    assert.equal(result.length, 0);
  });

  it('ignores whitespace-only symbol', async () => {
    const { applyFilters } = await import('../components/execution-log/execution-filters');
    const result = applyFilters(sampleLogs, { symbol: '   ', fromDate: '', toDate: '' });
    assert.equal(result.length, 4);
  });
});

// --- Execution Log Client tests ---

describe('ExecutionLogClient component', () => {
  const clientPath = path.join(__dirname, '..', 'components', 'execution-log', 'execution-log-client.tsx');
  const clientSource = fs.readFileSync(clientPath, 'utf-8');

  it('file exists', () => {
    assert.ok(fs.existsSync(clientPath));
  });

  it('exports ExecutionLogClient component', () => {
    assert.ok(clientSource.includes('export function ExecutionLogClient'));
  });

  it('renders TaxSummary', () => {
    assert.ok(clientSource.includes('TaxSummary'));
  });

  it('renders ExecutionFilters', () => {
    assert.ok(clientSource.includes('ExecutionFilters'));
  });

  it('renders ExecutionTable', () => {
    assert.ok(clientSource.includes('ExecutionTable'));
  });

  it('uses applyFilters for client-side filtering', () => {
    assert.ok(clientSource.includes('applyFilters'));
  });

  it('computes tax summary on all logs (not filtered)', () => {
    // The taxSummary useMemo depends on [logs], not [filteredLogs]
    assert.ok(clientSource.includes('calculateTaxSummary(logs)'));
  });
});

// --- Page tests ---

describe('ExecutionLog page', () => {
  const pagePath = path.join(__dirname, '..', 'app', 'dashboard', 'execution-log', 'page.tsx');
  const pageSource = fs.readFileSync(pagePath, 'utf-8');

  it('file exists', () => {
    assert.ok(fs.existsSync(pagePath));
  });

  it('is an async server component', () => {
    assert.ok(pageSource.includes('async'));
    assert.ok(pageSource.includes('export default'));
  });

  it('calls getExecutionLogs', () => {
    assert.ok(pageSource.includes('getExecutionLogs'));
  });

  it('renders ExecutionLogClient', () => {
    assert.ok(pageSource.includes('ExecutionLogClient'));
  });

  it('handles error state', () => {
    assert.ok(pageSource.includes('Error loading'));
  });

  it('serializes dates to ISO strings', () => {
    assert.ok(pageSource.includes('toISOString'));
  });

  it('passes tobTaxRate and tobTaxAmount to client', () => {
    assert.ok(pageSource.includes('tobTaxRate'));
    assert.ok(pageSource.includes('tobTaxAmount'));
  });
});
