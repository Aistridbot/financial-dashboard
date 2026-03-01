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

test('POST /api/portfolios creates portfolio with validated name and 201 payload', async () => {
  const app = createTestApp('portfolios-create');

  await withServer(app, async (baseUrl) => {
    const created = await requestJson(baseUrl, '/api/portfolios', {
      method: 'POST',
      body: {
        id: 'p-001',
        name: '  Retirement  ',
        baseCurrency: 'usd',
      },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.id, 'p-001');
    assert.equal(created.body.name, 'Retirement');
    assert.equal(created.body.baseCurrency, 'USD');

    const invalid = await requestJson(baseUrl, '/api/portfolios', {
      method: 'POST',
      body: {
        id: 'p-002',
        name: '   ',
        baseCurrency: 'USD',
      },
    });

    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
  });
});

test('GET /api/portfolios and GET /api/portfolios/:id return list/detail payloads', async () => {
  const app = createTestApp('portfolios-list-detail');

  await withServer(app, async (baseUrl) => {
    await requestJson(baseUrl, '/api/portfolios', {
      method: 'POST',
      body: { id: 'p-100', name: 'Main', baseCurrency: 'EUR' },
    });

    await requestJson(baseUrl, '/api/portfolios', {
      method: 'POST',
      body: { id: 'p-101', name: 'Satellite', baseCurrency: 'USD' },
    });

    const list = await requestJson(baseUrl, '/api/portfolios');
    assert.equal(list.status, 200);
    assert.equal(Array.isArray(list.body.items), true);
    assert.equal(list.body.items.length, 2);

    const detail = await requestJson(baseUrl, '/api/portfolios/p-100');
    assert.equal(detail.status, 200);
    assert.equal(detail.body.id, 'p-100');
    assert.equal(detail.body.name, 'Main');

    const missing = await requestJson(baseUrl, '/api/portfolios/missing-id');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error.code, 'NOT_FOUND');
  });
});

test('PATCH /api/portfolios/:id updates allowed fields and rejects unknown fields', async () => {
  const app = createTestApp('portfolios-update');

  await withServer(app, async (baseUrl) => {
    await requestJson(baseUrl, '/api/portfolios', {
      method: 'POST',
      body: { id: 'p-201', name: 'Income', baseCurrency: 'USD' },
    });

    const updated = await requestJson(baseUrl, '/api/portfolios/p-201', {
      method: 'PATCH',
      body: { name: 'Income Updated', baseCurrency: 'eur' },
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.name, 'Income Updated');
    assert.equal(updated.body.baseCurrency, 'EUR');

    const unknownField = await requestJson(baseUrl, '/api/portfolios/p-201', {
      method: 'PATCH',
      body: { nickname: 'Nope' },
    });

    assert.equal(unknownField.status, 400);
    assert.equal(unknownField.body.error.code, 'UNKNOWN_FIELDS');
    assert.deepEqual(unknownField.body.error.details.allowedFields, ['name', 'baseCurrency']);
  });
});

test('DELETE /api/portfolios/:id uses explicit status and missing-id behavior', async () => {
  const app = createTestApp('portfolios-delete');

  await withServer(app, async (baseUrl) => {
    await requestJson(baseUrl, '/api/portfolios', {
      method: 'POST',
      body: { id: 'p-301', name: 'Tactical', baseCurrency: 'USD' },
    });

    const deleted = await requestJson(baseUrl, '/api/portfolios/p-301', {
      method: 'DELETE',
    });

    assert.equal(deleted.status, 204);
    assert.equal(deleted.body, null);

    const missing = await requestJson(baseUrl, '/api/portfolios/p-301', {
      method: 'DELETE',
    });

    assert.equal(missing.status, 404);
    assert.equal(missing.body.error.code, 'NOT_FOUND');
  });
});
