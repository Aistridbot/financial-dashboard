const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createApp } = require('../index');
const {
  formatCurrency,
  formatPercent,
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

test('GET /dashboard renders summary cards with deterministic selectors and semantic headings', async () => {
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
  });
});

test('GET /dashboard.js exposes deterministic loading and error state messages', async () => {
  const app = createApp({ env: { STOCK_PROVIDER: 'stub' } });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/dashboard.js`);
    const source = await response.text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type').includes('application/javascript'), true);
    assert.match(source, /Missing portfolioId query parameter/);
    assert.match(source, /Unable to load dashboard summary\. Please retry\./);
    assert.match(source, /summary-value-total-value/);
    assert.match(source, /summary-value-gain-loss-percent/);
  });
});
