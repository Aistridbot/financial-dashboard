const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { migrateDatabase } = require('../db/migrate');
const { createApp } = require('../index');

function createTempDbPath(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'financial-dashboard-integration-'));
  return path.join(dir, `${name}.db`);
}

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

async function requestJson(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method || 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : null;

  return { status: response.status, body };
}

function createIntegrationApp(name, stockProvider) {
  const dbPath = createTempDbPath(name);
  migrateDatabase({ dbPath });
  return createApp({ dbPath, stockProvider, env: { STOCK_PROVIDER: 'stub' } });
}

test('integration: full portfolio lifecycle from API writes to dashboard reads', async () => {
  const stockProvider = {
    async getQuote(symbol) {
      const map = {
        AAPL: { symbol: 'AAPL', price: 120, previousClose: 118, currency: 'USD', asOf: '2026-01-03T00:00:00.000Z' },
        MSFT: { symbol: 'MSFT', price: 210, previousClose: 205, currency: 'USD', asOf: '2026-01-03T00:00:00.000Z' },
      };
      return map[symbol] || null;
    },
  };

  const app = createIntegrationApp('mvp-happy-path', stockProvider);

  await withServer(app, async (baseUrl) => {
    const portfolio = await requestJson(baseUrl, '/api/portfolios', {
      method: 'POST',
      body: { id: 'portfolio-1', name: 'Main portfolio', baseCurrency: 'USD' },
    });
    assert.equal(portfolio.status, 201);

    const buyAapl = await requestJson(baseUrl, '/api/portfolios/portfolio-1/transactions', {
      method: 'POST',
      body: {
        id: 'txn-1',
        type: 'BUY',
        symbol: 'AAPL',
        quantity: 10,
        price: 100,
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
    });
    assert.equal(buyAapl.status, 201);

    const buyMsft = await requestJson(baseUrl, '/api/portfolios/portfolio-1/transactions', {
      method: 'POST',
      body: {
        id: 'txn-2',
        type: 'BUY',
        symbol: 'MSFT',
        quantity: 5,
        price: 200,
        occurredAt: '2026-01-02T00:00:00.000Z',
      },
    });
    assert.equal(buyMsft.status, 201);

    const sellAapl = await requestJson(baseUrl, '/api/portfolios/portfolio-1/transactions', {
      method: 'POST',
      body: {
        id: 'txn-3',
        type: 'SELL',
        symbol: 'AAPL',
        quantity: 2,
        price: 110,
        occurredAt: '2026-01-03T00:00:00.000Z',
      },
    });
    assert.equal(sellAapl.status, 201);

    const holdings = await requestJson(baseUrl, '/api/portfolios/portfolio-1/holdings');
    assert.equal(holdings.status, 200);
    assert.equal(holdings.body.items.length, 2);
    assert.deepEqual(
      holdings.body.items.map(({ symbol, quantity, averageCost }) => ({ symbol, quantity, averageCost })),
      [
        { symbol: 'AAPL', quantity: 8, averageCost: 100 },
        { symbol: 'MSFT', quantity: 5, averageCost: 200 },
      ],
    );

    const summary = await requestJson(baseUrl, '/api/dashboard/summary?portfolioId=portfolio-1');
    assert.equal(summary.status, 200);
    assert.equal(summary.body.totalValue, 2010);
    assert.equal(summary.body.investedValue, 1800);
    assert.equal(summary.body.dayChange, 41);
    assert.equal(summary.body.totalGainLoss, 210);
    assert.equal(summary.body.positionsCount, 2);

    const transactions = await requestJson(baseUrl, '/api/portfolios/portfolio-1/transactions');
    assert.equal(transactions.status, 200);
    assert.equal(transactions.body.items.length, 3);
    assert.equal(transactions.body.items[0].id, 'txn-3');

    const dashboardPage = await fetch(`${baseUrl}/dashboard?portfolioId=portfolio-1`);
    assert.equal(dashboardPage.status, 200);
    const dashboardHtml = await dashboardPage.text();
    assert.match(dashboardHtml, /data-testid="dashboard-summary"/);
    assert.match(dashboardHtml, /data-testid="transactions-table"/);

    const dashboardScript = await fetch(`${baseUrl}/dashboard.js`);
    assert.equal(dashboardScript.status, 200);
    const scriptText = await dashboardScript.text();
    assert.match(scriptText, /\/api\/dashboard\/summary\?portfolioId=/);
    assert.match(scriptText, /\/api\/portfolios\/.+\/transactions/);
  });
});

test('integration: guarded failures for invalid transaction and unknown symbol/portfolio', async () => {
  const app = createIntegrationApp('mvp-failures', {
    async getQuote(symbol) {
      return { symbol, price: 100, previousClose: 99, currency: 'USD', asOf: '2026-01-03T00:00:00.000Z' };
    },
  });

  await withServer(app, async (baseUrl) => {
    const create = await requestJson(baseUrl, '/api/portfolios', {
      method: 'POST',
      body: { id: 'portfolio-2', name: 'Validation portfolio', baseCurrency: 'USD' },
    });
    assert.equal(create.status, 201);

    const invalidQuantity = await requestJson(baseUrl, '/api/portfolios/portfolio-2/transactions', {
      method: 'POST',
      body: {
        id: 'txn-invalid-1',
        type: 'BUY',
        symbol: 'AAPL',
        quantity: 0,
        price: 50,
        occurredAt: '2026-01-03T00:00:00.000Z',
      },
    });
    assert.equal(invalidQuantity.status, 400);
    assert.equal(invalidQuantity.body.error.code, 'VALIDATION_ERROR');

    const invalidType = await requestJson(baseUrl, '/api/portfolios/portfolio-2/transactions', {
      method: 'POST',
      body: {
        id: 'txn-invalid-2',
        type: 'HOLD',
        symbol: 'AAPL',
        quantity: 1,
        price: 50,
        occurredAt: '2026-01-03T00:00:00.000Z',
      },
    });
    assert.equal(invalidType.status, 400);
    assert.equal(invalidType.body.error.code, 'VALIDATION_ERROR');

    const unknownPortfolioDetail = await requestJson(baseUrl, '/api/portfolios/portfolio-missing');
    assert.equal(unknownPortfolioDetail.status, 404);
    assert.equal(unknownPortfolioDetail.body.error.code, 'NOT_FOUND');

    const unknownPortfolioSummary = await requestJson(baseUrl, '/api/dashboard/summary?portfolioId=portfolio-missing');
    assert.equal(unknownPortfolioSummary.status, 404);
    assert.equal(unknownPortfolioSummary.body.error.code, 'NOT_FOUND');

    const unknownSymbolQuote = await requestJson(baseUrl, '/api/stocks/quote?symbol=***');
    assert.equal(unknownSymbolQuote.status, 400);
    assert.equal(unknownSymbolQuote.body.error.code, 'INVALID_SYMBOL');
  });
});
