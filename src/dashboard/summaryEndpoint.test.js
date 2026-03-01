const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { migrateDatabase } = require('../db/migrate');
const { createApp } = require('../index');

function createTempDbPath(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'financial-dashboard-summary-'));
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

function createSummaryTestApp(name, stockProvider) {
  const dbPath = createTempDbPath(name);
  migrateDatabase({ dbPath });
  return createApp({ dbPath, stockProvider, env: { STOCK_PROVIDER: 'stub' } });
}

test('GET /api/dashboard/summary aggregates values deterministically with stubbed provider', async () => {
  const quoteMap = {
    AAPL: { symbol: 'AAPL', price: 130, previousClose: 125, currency: 'USD', asOf: '2026-01-02T00:00:00.000Z' },
    MSFT: { symbol: 'MSFT', price: 200, previousClose: 195, currency: 'USD', asOf: '2026-01-02T00:00:00.000Z' },
  };
  const stockProvider = {
    async getQuote(symbol) {
      return quoteMap[symbol];
    },
  };

  const app = createSummaryTestApp('summary-deterministic', stockProvider);

  await withServer(app, async (baseUrl) => {
    await requestJson(baseUrl, '/api/portfolios', {
      method: 'POST',
      body: { id: 'p-1', name: 'Main', baseCurrency: 'USD' },
    });

    await requestJson(baseUrl, '/api/portfolios/p-1/transactions', {
      method: 'POST',
      body: {
        id: 'txn-1',
        type: 'BUY',
        symbol: 'AAPL',
        quantity: 2,
        price: 100,
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
    });

    await requestJson(baseUrl, '/api/portfolios/p-1/transactions', {
      method: 'POST',
      body: {
        id: 'txn-2',
        type: 'BUY',
        symbol: 'MSFT',
        quantity: 1,
        price: 150,
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
    });

    const summary = await requestJson(baseUrl, '/api/dashboard/summary?portfolioId=p-1');

    assert.equal(summary.status, 200);
    assert.equal(summary.body.totalValue, 460);
    assert.equal(summary.body.investedValue, 350);
    assert.equal(summary.body.dayChange, 15);
    assert.equal(summary.body.totalGainLoss, 110);
    assert.equal(summary.body.positionsCount, 2);
    assert.equal(summary.body.warnings, undefined);
  });
});

test('GET /api/dashboard/summary returns fallback warning metadata when quote is unavailable', async () => {
  const stockProvider = {
    async getQuote(symbol) {
      if (symbol === 'AAPL') {
        return { symbol: 'AAPL', price: 110, previousClose: 109, currency: 'USD', asOf: '2026-01-02T00:00:00.000Z' };
      }
      return null;
    },
  };

  const app = createSummaryTestApp('summary-fallback', stockProvider);

  await withServer(app, async (baseUrl) => {
    await requestJson(baseUrl, '/api/portfolios', {
      method: 'POST',
      body: { id: 'p-2', name: 'Main', baseCurrency: 'USD' },
    });

    await requestJson(baseUrl, '/api/portfolios/p-2/transactions', {
      method: 'POST',
      body: {
        id: 'txn-1',
        type: 'BUY',
        symbol: 'AAPL',
        quantity: 1,
        price: 100,
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
    });

    await requestJson(baseUrl, '/api/portfolios/p-2/transactions', {
      method: 'POST',
      body: {
        id: 'txn-2',
        type: 'BUY',
        symbol: 'NVDA',
        quantity: 2,
        price: 50,
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
    });

    const summary = await requestJson(baseUrl, '/api/dashboard/summary?portfolioId=p-2');

    assert.equal(summary.status, 200);
    assert.equal(summary.body.totalValue, 210);
    assert.equal(summary.body.investedValue, 200);
    assert.equal(summary.body.dayChange, 1);
    assert.equal(summary.body.totalGainLoss, 10);
    assert.equal(summary.body.positionsCount, 2);
    assert.equal(summary.body.warnings.length, 1);
    assert.deepEqual(summary.body.warnings[0], {
      code: 'QUOTE_UNAVAILABLE',
      symbol: 'NVDA',
      fallbackPrice: 50,
      fallbackStrategy: 'USE_AVERAGE_COST',
    });
  });
});

test('GET /api/dashboard/summary returns 400 for invalid query and 404 for unknown portfolio', async () => {
  const app = createSummaryTestApp('summary-errors', {
    async getQuote() {
      return { symbol: 'AAPL', price: 100, previousClose: 99 };
    },
  });

  await withServer(app, async (baseUrl) => {
    const invalid = await requestJson(baseUrl, '/api/dashboard/summary');
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, 'INVALID_QUERY');

    const unknown = await requestJson(baseUrl, '/api/dashboard/summary?portfolioId=missing');
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.error.code, 'NOT_FOUND');
  });
});
