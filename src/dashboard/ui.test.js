const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createApp } = require('../index');
const {
  formatCurrency,
  formatPercent,
  formatQuantity,
  formatTransactionDate,
  toSummaryViewModel,
} = require('./ui');

async function withServer(app, fn) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

test('format helpers keep currency and percentage formatting stable', () => {
  assert.equal(formatCurrency(1234.5, 'USD'), '$1,234.50');
  assert.equal(formatCurrency(-9.5, 'USD'), '-$9.50');
  assert.equal(formatPercent(0.1234), '+12.34%');
  assert.equal(formatPercent(-0.0349), '-3.49%');
  assert.equal(formatPercent(0), '0.00%');
});

test('transaction format helpers keep date and quantity deterministic', () => {
  assert.equal(formatQuantity(12), '12.0000');
  assert.equal(formatQuantity(1.23456), '1.2346');
  assert.equal(formatTransactionDate('2026-03-01T18:55:01.000Z'), '2026-03-01');
  assert.equal(formatTransactionDate('invalid-date'), 'Invalid date');
});

test('summary view model exposes formatted card values', () => {
  const model = toSummaryViewModel({
    totalValue: 1400,
    investedValue: 1000,
    dayChange: 25,
    totalGainLoss: 400,
    currency: 'USD',
  });

  assert.deepEqual(model, {
    totalValueText: '$1,400.00',
    investedValueText: '$1,000.00',
    dayChangeText: '$25.00',
    dayChangePercentText: '+2.50%',
    totalGainLossText: '$400.00',
    totalGainLossPercentText: '+40.00%',
  });
});

test('GET /dashboard renders summary cards and transactions table scaffolding', async () => {
  const app = createApp({ env: { STOCK_PROVIDER: 'stub' } });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/dashboard?portfolioId=p-1`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /<h1>Portfolio dashboard<\/h1>/);
    assert.match(html, /data-testid="dashboard-loading"/);
    assert.match(html, /Loading dashboard summary\.\.\./);
    assert.match(html, /data-testid="dashboard-error"/);
    assert.match(html, /Unable to load dashboard summary\./);

    assert.match(html, /data-testid="summary-card-total-value"/);
    assert.match(html, /data-testid="summary-card-invested"/);
    assert.match(html, /data-testid="summary-card-day-change"/);
    assert.match(html, /data-testid="summary-card-gain-loss"/);

    assert.match(html, /<h2>Total value<\/h2>/);
    assert.match(html, /<h2>Invested<\/h2>/);
    assert.match(html, /<h2>Day change<\/h2>/);
    assert.match(html, /<h2>Gain\/loss<\/h2>/);

    assert.match(html, /data-testid="portfolio-selector"/);
    assert.match(html, /data-testid="transactions-table"/);
    assert.match(html, /<th>Date<\/th>/);
    assert.match(html, /<th>Symbol<\/th>/);
    assert.match(html, /<th>Side<\/th>/);
    assert.match(html, /<th>Quantity<\/th>/);
    assert.match(html, /<th>Price<\/th>/);
    assert.match(html, /<th>Total<\/th>/);
    assert.match(html, /No transactions found for this portfolio\./);
  });
});

test('GET /dashboard.js exposes deterministic transaction loading and formatting flow', async () => {
  const app = createApp({ env: { STOCK_PROVIDER: 'stub' } });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/dashboard.js`);
    const source = await response.text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type').includes('application/javascript'), true);
    assert.match(source, /Missing portfolioId query parameter/);
    assert.match(source, /Unable to load dashboard summary\. Please retry\./);
    assert.match(source, /fetch\('\/api\/portfolios'\)/);
    assert.match(source, /fetch\('\/api\/portfolios\/' \+ encodeURIComponent\(selectedPortfolioId\) \+ '\/transactions'\)/);
    assert.match(source, /portfolioSelector\.addEventListener\('change'/);
    assert.match(source, /formatTransactionDate/);
    assert.match(source, /formatQuantity/);
  });
});
