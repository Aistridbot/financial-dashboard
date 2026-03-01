const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createApp } = require('../index');
const { createStockProvider } = require('./provider');

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

async function getJson(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    body: await response.json(),
  };
}

test('GET /api/stocks/quote returns quote payload for valid symbol', async () => {
  const app = createApp({ env: { STOCK_PROVIDER: 'stub' } });

  await withServer(app, async (baseUrl) => {
    const response = await getJson(`${baseUrl}/api/stocks/quote?symbol=aapl`);

    assert.equal(response.status, 200);
    assert.equal(response.body.symbol, 'AAPL');
    assert.equal(response.body.currency, 'USD');
    assert.equal(typeof response.body.price, 'number');
    assert.equal(typeof response.body.asOf, 'string');
  });
});

test('GET /api/stocks/history returns ordered points for supported range', async () => {
  const app = createApp({ env: { STOCK_PROVIDER: 'stub' } });

  await withServer(app, async (baseUrl) => {
    const response = await getJson(`${baseUrl}/api/stocks/history?symbol=msft&range=5d`);

    assert.equal(response.status, 200);
    assert.equal(response.body.symbol, 'MSFT');
    assert.equal(response.body.range, '5D');
    assert.equal(response.body.points.length, 5);

    for (let index = 1; index < response.body.points.length; index += 1) {
      assert.ok(response.body.points[index - 1].at <= response.body.points[index].at);
    }
  });
});

test('stock endpoints return consistent error shape for validation failures', async () => {
  const app = createApp({ env: { STOCK_PROVIDER: 'stub' } });

  await withServer(app, async (baseUrl) => {
    const badSymbol = await getJson(`${baseUrl}/api/stocks/quote?symbol=!!!`);
    assert.equal(badSymbol.status, 400);
    assert.equal(badSymbol.body.error.code, 'INVALID_SYMBOL');
    assert.equal(typeof badSymbol.body.error.message, 'string');

    const badRange = await getJson(`${baseUrl}/api/stocks/history?symbol=AAPL&range=2y`);
    assert.equal(badRange.status, 400);
    assert.equal(badRange.body.error.code, 'INVALID_RANGE');
    assert.deepEqual(badRange.body.error.details.supportedRanges, ['1D', '5D', '1M', '6M', '1Y']);
  });
});

test('provider selection supports env-based adapter selection', () => {
  const stubProvider = createStockProvider({ env: { STOCK_PROVIDER: 'stub' } });
  assert.equal(typeof stubProvider.getQuote, 'function');

  assert.throws(
    () => createStockProvider({ env: { STOCK_PROVIDER: 'live' } }),
    /STOCK_API_BASE_URL and STOCK_API_KEY/
  );
});
