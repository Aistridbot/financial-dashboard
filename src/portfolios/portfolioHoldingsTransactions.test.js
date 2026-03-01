const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { migrateDatabase } = require('../db/migrate');
const { createApp } = require('../index');

function createTempDbPath(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'financial-dashboard-api-'));
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

function createTestApp(name) {
  const dbPath = createTempDbPath(name);
  migrateDatabase({ dbPath });
  return createApp({ env: { STOCK_PROVIDER: 'stub' }, dbPath });
}

test('POST transactions persists normalized buy/sell and holdings reflect derived updates', async () => {
  const app = createTestApp('holdings-transactions-create');

  await withServer(app, async (baseUrl) => {
    await requestJson(baseUrl, '/api/portfolios', {
      method: 'POST',
      body: { id: 'p-1', name: 'Main', baseCurrency: 'USD' },
    });

    const buy = await requestJson(baseUrl, '/api/portfolios/p-1/transactions', {
      method: 'POST',
      body: {
        id: 'txn-1',
        type: 'buy',
        symbol: ' aapl ',
        quantity: '2',
        price: '100.25',
        occurredAt: '2026-01-01T10:00:00.000Z',
      },
    });

    assert.equal(buy.status, 201);
    assert.equal(buy.body.type, 'BUY');
    assert.equal(buy.body.symbol, 'AAPL');
    assert.equal(buy.body.quantity, 2);
    assert.equal(buy.body.price, 100.25);
    assert.equal(buy.body.totalAmount, 200.5);

    const sell = await requestJson(baseUrl, '/api/portfolios/p-1/transactions', {
      method: 'POST',
      body: {
        id: 'txn-2',
        type: 'SELL',
        symbol: 'AAPL',
        quantity: '0.5',
        price: '120',
        occurredAt: '2026-01-02T10:00:00.000Z',
      },
    });

    assert.equal(sell.status, 201);
    assert.equal(sell.body.type, 'SELL');

    const holdings = await requestJson(baseUrl, '/api/portfolios/p-1/holdings');
    assert.equal(holdings.status, 200);
    assert.equal(holdings.body.items.length, 1);
    assert.equal(holdings.body.items[0].symbol, 'AAPL');
    assert.equal(holdings.body.items[0].quantity, 1.5);
    assert.equal(holdings.body.items[0].averageCost, 100.25);
  });
});

test('POST sell transaction rejects quantity over current position with 400 error code', async () => {
  const app = createTestApp('holdings-transactions-oversell');

  await withServer(app, async (baseUrl) => {
    await requestJson(baseUrl, '/api/portfolios', {
      method: 'POST',
      body: { id: 'p-2', name: 'Main', baseCurrency: 'USD' },
    });

    await requestJson(baseUrl, '/api/portfolios/p-2/transactions', {
      method: 'POST',
      body: {
        id: 'txn-buy',
        type: 'BUY',
        symbol: 'MSFT',
        quantity: 1,
        price: 50,
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
    });

    const oversell = await requestJson(baseUrl, '/api/portfolios/p-2/transactions', {
      method: 'POST',
      body: {
        id: 'txn-sell-too-much',
        type: 'SELL',
        symbol: 'MSFT',
        quantity: 2,
        price: 60,
        occurredAt: '2026-01-02T00:00:00.000Z',
      },
    });

    assert.equal(oversell.status, 400);
    assert.equal(oversell.body.error.code, 'INSUFFICIENT_QUANTITY');
    assert.equal(oversell.body.error.details.availableQuantity, 1);
  });
});

test('GET transactions returns newest-first ordering for table consumption', async () => {
  const app = createTestApp('holdings-transactions-order');

  await withServer(app, async (baseUrl) => {
    await requestJson(baseUrl, '/api/portfolios', {
      method: 'POST',
      body: { id: 'p-3', name: 'Main', baseCurrency: 'USD' },
    });

    await requestJson(baseUrl, '/api/portfolios/p-3/transactions', {
      method: 'POST',
      body: {
        id: 'txn-old',
        type: 'BUY',
        symbol: 'NVDA',
        quantity: 1,
        price: 80,
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
    });

    await requestJson(baseUrl, '/api/portfolios/p-3/transactions', {
      method: 'POST',
      body: {
        id: 'txn-new',
        type: 'BUY',
        symbol: 'NVDA',
        quantity: 1,
        price: 90,
        occurredAt: '2026-01-02T00:00:00.000Z',
      },
    });

    const list = await requestJson(baseUrl, '/api/portfolios/p-3/transactions');

    assert.equal(list.status, 200);
    assert.deepEqual(
      list.body.items.map((row) => row.id),
      ['txn-new', 'txn-old']
    );
  });
});
