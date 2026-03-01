const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { migrateDatabase } = require('./migrate');
const { seedDatabase, DEMO_FIXTURE } = require('./seed');

function createTempDbPath(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'financial-dashboard-'));
  return path.join(dir, `${name}.db`);
}

test('migration creates required tables, foreign keys, indexes and version baseline', () => {
  const dbPath = createTempDbPath('migrate');

  const result = migrateDatabase({ dbPath });
  assert.equal(result.version, 1);

  const db = new DatabaseSync(dbPath);

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => row.name);

  assert.deepEqual(
    tables.filter((name) => ['holdings', 'portfolios', 'schema_migrations', 'transactions'].includes(name)),
    ['holdings', 'portfolios', 'schema_migrations', 'transactions']
  );

  const holdingFks = db.prepare('PRAGMA foreign_key_list(holdings)').all();
  assert.equal(holdingFks.length, 1);
  assert.equal(holdingFks[0].table, 'portfolios');
  assert.equal(holdingFks[0].from, 'portfolio_id');

  const transactionFks = db.prepare('PRAGMA foreign_key_list(transactions)').all();
  assert.equal(transactionFks.length, 2);
  assert.ok(transactionFks.some((fk) => fk.table === 'portfolios' && fk.from === 'portfolio_id'));
  assert.ok(transactionFks.some((fk) => fk.table === 'holdings' && fk.from === 'holding_id'));

  const indexes = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name")
    .all()
    .map((row) => row.name);

  assert.ok(indexes.includes('idx_holdings_portfolio_id'));
  assert.ok(indexes.includes('idx_transactions_portfolio_id'));
  assert.ok(indexes.includes('idx_transactions_holding_id'));

  const migrationVersion = db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get().version;
  assert.equal(migrationVersion, 1);
  db.close();
});

test('seed inserts deterministic sample portfolio, holding and transactions', () => {
  const dbPath = createTempDbPath('seed');

  const counts = seedDatabase({ dbPath });
  assert.deepEqual(counts, { portfolios: 1, holdings: 1, transactions: 2 });

  const db = new DatabaseSync(dbPath);

  const portfolio = db.prepare('SELECT * FROM portfolios WHERE id = ?').get(DEMO_FIXTURE.portfolio.id);
  assert.equal(portfolio.name, DEMO_FIXTURE.portfolio.name);
  assert.equal(portfolio.base_currency, 'USD');

  const holding = db.prepare('SELECT * FROM holdings WHERE id = ?').get(DEMO_FIXTURE.holdings[0].id);
  assert.equal(holding.symbol, 'AAPL');
  assert.equal(holding.portfolio_id, DEMO_FIXTURE.portfolio.id);

  const transactions = db
    .prepare('SELECT id, type, total_amount FROM transactions ORDER BY occurred_at')
    .all()
    .map((row) => ({ ...row }));
  assert.deepEqual(transactions, [
    { id: 'txn-deposit-001', type: 'DEPOSIT', total_amount: 5000 },
    { id: 'txn-buy-aapl-001', type: 'BUY', total_amount: 1502.5 },
  ]);

  db.close();
});
