const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { migrateDatabase } = require('../db/migrate');
const { createFinancialRepository } = require('./financialRepository');

function createTempDbPath(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'financial-dashboard-repo-'));
  return path.join(dir, `${name}.db`);
}

function setupRepository(name = 'repo') {
  const dbPath = createTempDbPath(name);
  migrateDatabase({ dbPath });
  return createFinancialRepository({ dbPath });
}

test('portfolio CRUD works with normalized values and not-found errors', () => {
  const repo = setupRepository('portfolio-crud');

  const created = repo.createPortfolio({
    id: 'portfolio-001',
    name: ' Core Portfolio ',
    baseCurrency: ' usd ',
    createdAt: '2026-01-01T10:00:00.000Z',
  });
  assert.deepEqual(created, {
    id: 'portfolio-001',
    name: 'Core Portfolio',
    baseCurrency: 'USD',
    createdAt: '2026-01-01T10:00:00.000Z',
  });

  const listed = repo.listPortfolios();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].baseCurrency, 'USD');

  const fetched = repo.getPortfolioById('portfolio-001');
  assert.equal(fetched.name, 'Core Portfolio');

  const updated = repo.updatePortfolio('portfolio-001', { name: 'Growth', baseCurrency: 'eur' });
  assert.equal(updated.name, 'Growth');
  assert.equal(updated.baseCurrency, 'EUR');

  const deleted = repo.deletePortfolio('portfolio-001');
  assert.deepEqual(deleted, { deleted: true, id: 'portfolio-001' });

  assert.throws(() => repo.getPortfolioById('portfolio-001'), (error) => error && error.code === 'NOT_FOUND');
  assert.throws(() => repo.deletePortfolio('portfolio-001'), (error) => error && error.code === 'NOT_FOUND');
});

test('holding and transaction methods normalize numbers/symbols and validate values', () => {
  const repo = setupRepository('holding-txn');
  repo.createPortfolio({ id: 'p1', name: 'Main', baseCurrency: 'usd' });

  const holding = repo.createHolding({
    id: 'h1',
    portfolioId: 'p1',
    symbol: ' aapl ',
    quantity: '10.5',
    averageCost: '150.25',
    createdAt: '2026-01-05',
  });

  assert.equal(holding.symbol, 'AAPL');
  assert.equal(holding.quantity, 10.5);
  assert.equal(holding.averageCost, 150.25);

  const buy = repo.createTransaction({
    id: 't1',
    portfolioId: 'p1',
    holdingId: 'h1',
    type: 'buy',
    symbol: 'aapl',
    quantity: '2',
    price: '151.1',
    totalAmount: '302.2',
    occurredAt: '2026-01-06T09:30:00Z',
  });

  assert.equal(buy.type, 'BUY');
  assert.equal(buy.quantity, 2);
  assert.equal(buy.price, 151.1);

  const txns = repo.listTransactionsByPortfolio('p1');
  assert.equal(txns.length, 1);
  assert.equal(txns[0].symbol, 'AAPL');

  const holdings = repo.listHoldingsByPortfolio('p1');
  assert.equal(holdings.length, 1);
  assert.equal(holdings[0].symbol, 'AAPL');

  assert.throws(
    () => repo.createHolding({ id: 'h2', portfolioId: 'p1', symbol: 'TSLA', quantity: 'nope', averageCost: 1 }),
    (error) => error && error.code === 'VALIDATION_ERROR'
  );

  assert.throws(
    () => repo.createTransaction({
      id: 't2',
      portfolioId: 'p1',
      type: 'BUY',
      symbol: 'TSLA',
      quantity: '-1',
      price: 1,
      totalAmount: 1,
      occurredAt: '2026-01-07',
    }),
    (error) => error && error.code === 'VALIDATION_ERROR'
  );
});

test('repository returns FK_VIOLATION and delete cascades to holdings + transactions', () => {
  const repo = setupRepository('fk-cascade');
  repo.createPortfolio({ id: 'p1', name: 'Main', baseCurrency: 'USD' });
  repo.createHolding({ id: 'h1', portfolioId: 'p1', symbol: 'MSFT', quantity: 4, averageCost: 100 });
  repo.createTransaction({
    id: 't1',
    portfolioId: 'p1',
    holdingId: 'h1',
    type: 'BUY',
    symbol: 'MSFT',
    quantity: 4,
    price: 100,
    totalAmount: 400,
    occurredAt: '2026-01-03T00:00:00.000Z',
  });

  assert.throws(
    () => repo.createHolding({ id: 'bad-holding', portfolioId: 'missing', symbol: 'NVDA', quantity: 1, averageCost: 1 }),
    (error) => error && error.code === 'FK_VIOLATION'
  );

  assert.throws(
    () =>
      repo.createTransaction({
        id: 'bad-txn',
        portfolioId: 'missing',
        type: 'DEPOSIT',
        totalAmount: 100,
        occurredAt: '2026-01-01T00:00:00.000Z',
      }),
    (error) => error && error.code === 'FK_VIOLATION'
  );

  repo.deletePortfolio('p1');
  assert.deepEqual(repo.listHoldingsByPortfolio('p1'), []);
  assert.deepEqual(repo.listTransactionsByPortfolio('p1'), []);
});
