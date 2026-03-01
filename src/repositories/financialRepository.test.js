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

test('buy transactions update/create holdings atomically and normalize numeric fields', () => {
  const repo = setupRepository('buy-holding-updates');
  repo.createPortfolio({ id: 'p1', name: 'Main', baseCurrency: 'usd' });

  const firstBuy = repo.createTransaction({
    id: 't1',
    portfolioId: 'p1',
    type: 'buy',
    symbol: ' aapl ',
    quantity: '2',
    price: '150.5',
    occurredAt: '2026-01-01T10:00:00Z',
  });

  assert.equal(firstBuy.type, 'BUY');
  assert.equal(firstBuy.symbol, 'AAPL');
  assert.equal(firstBuy.quantity, 2);
  assert.equal(firstBuy.price, 150.5);
  assert.equal(firstBuy.totalAmount, 301);
  assert.ok(firstBuy.holdingId);

  const secondBuy = repo.createTransaction({
    id: 't2',
    portfolioId: 'p1',
    type: 'BUY',
    symbol: 'AAPL',
    quantity: 1,
    price: 120,
    totalAmount: '120',
    occurredAt: '2026-01-02T10:00:00Z',
  });

  assert.equal(secondBuy.holdingId, firstBuy.holdingId);
  assert.equal(secondBuy.totalAmount, 120);

  const holdings = repo.listHoldingsByPortfolio('p1');
  assert.equal(holdings.length, 1);
  assert.equal(holdings[0].symbol, 'AAPL');
  assert.equal(holdings[0].quantity, 3);
  assert.equal(holdings[0].averageCost, 140.33333333333334);
});

test('sell transactions reduce holdings and reject oversells with stable error code', () => {
  const repo = setupRepository('sell-rules');
  repo.createPortfolio({ id: 'p1', name: 'Main', baseCurrency: 'USD' });

  repo.createTransaction({
    id: 'buy-1',
    portfolioId: 'p1',
    type: 'BUY',
    symbol: 'MSFT',
    quantity: 4,
    price: 100,
    occurredAt: '2026-01-01T00:00:00.000Z',
  });

  const sell = repo.createTransaction({
    id: 'sell-1',
    portfolioId: 'p1',
    type: 'SELL',
    symbol: 'msft',
    quantity: '1.5',
    price: '110',
    occurredAt: '2026-01-02T00:00:00.000Z',
  });

  assert.equal(sell.type, 'SELL');
  assert.equal(sell.quantity, 1.5);
  assert.equal(sell.totalAmount, 165);

  const holdingsAfterSell = repo.listHoldingsByPortfolio('p1');
  assert.equal(holdingsAfterSell.length, 1);
  assert.equal(holdingsAfterSell[0].quantity, 2.5);
  assert.equal(holdingsAfterSell[0].averageCost, 100);

  assert.throws(
    () =>
      repo.createTransaction({
        id: 'sell-2',
        portfolioId: 'p1',
        type: 'SELL',
        symbol: 'MSFT',
        quantity: 9,
        price: 112,
        occurredAt: '2026-01-03T00:00:00.000Z',
      }),
    (error) => error && error.code === 'INSUFFICIENT_QUANTITY'
  );
});

test('transaction list is newest-first for deterministic UI consumption', () => {
  const repo = setupRepository('txn-ordering');
  repo.createPortfolio({ id: 'p1', name: 'Main', baseCurrency: 'USD' });

  repo.createTransaction({
    id: 'older',
    portfolioId: 'p1',
    type: 'BUY',
    symbol: 'NVDA',
    quantity: 1,
    price: 90,
    occurredAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  repo.createTransaction({
    id: 'newer',
    portfolioId: 'p1',
    type: 'BUY',
    symbol: 'NVDA',
    quantity: 1,
    price: 95,
    occurredAt: '2026-01-02T00:00:00.000Z',
    createdAt: '2026-01-02T00:00:00.000Z',
  });

  const txns = repo.listTransactionsByPortfolio('p1');
  assert.equal(txns.length, 2);
  assert.deepEqual(
    txns.map((row) => row.id),
    ['newer', 'older']
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
    type: 'DEPOSIT',
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
