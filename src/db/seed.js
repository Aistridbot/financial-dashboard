const { openDatabase } = require('./connection');
const { migrateDatabase } = require('./migrate');

const DEMO_FIXTURE = {
  portfolio: {
    id: 'portfolio-demo-001',
    name: 'Demo Growth Portfolio',
    base_currency: 'USD',
    created_at: '2024-01-15T09:30:00.000Z',
  },
  holdings: [
    {
      id: 'holding-aapl-001',
      portfolio_id: 'portfolio-demo-001',
      symbol: 'AAPL',
      quantity: 10,
      average_cost: 150.25,
      created_at: '2024-01-15T09:35:00.000Z',
    },
  ],
  transactions: [
    {
      id: 'txn-deposit-001',
      portfolio_id: 'portfolio-demo-001',
      holding_id: null,
      type: 'DEPOSIT',
      symbol: null,
      quantity: null,
      price: null,
      total_amount: 5000,
      occurred_at: '2024-01-15T09:31:00.000Z',
      created_at: '2024-01-15T09:31:00.000Z',
    },
    {
      id: 'txn-buy-aapl-001',
      portfolio_id: 'portfolio-demo-001',
      holding_id: 'holding-aapl-001',
      type: 'BUY',
      symbol: 'AAPL',
      quantity: 10,
      price: 150.25,
      total_amount: 1502.5,
      occurred_at: '2024-01-15T09:36:00.000Z',
      created_at: '2024-01-15T09:36:00.000Z',
    },
  ],
};

function seedDatabase(options = {}) {
  migrateDatabase(options);
  const db = openDatabase(options);

  db.exec('BEGIN');
  try {
    db.prepare(
      `INSERT OR REPLACE INTO portfolios (id, name, base_currency, created_at)
       VALUES (?, ?, ?, ?)`
    ).run(
      DEMO_FIXTURE.portfolio.id,
      DEMO_FIXTURE.portfolio.name,
      DEMO_FIXTURE.portfolio.base_currency,
      DEMO_FIXTURE.portfolio.created_at
    );

    const insertHolding = db.prepare(
      `INSERT OR REPLACE INTO holdings (id, portfolio_id, symbol, quantity, average_cost, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    for (const holding of DEMO_FIXTURE.holdings) {
      insertHolding.run(
        holding.id,
        holding.portfolio_id,
        holding.symbol,
        holding.quantity,
        holding.average_cost,
        holding.created_at
      );
    }

    const insertTransaction = db.prepare(
      `INSERT OR REPLACE INTO transactions
       (id, portfolio_id, holding_id, type, symbol, quantity, price, total_amount, occurred_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const transaction of DEMO_FIXTURE.transactions) {
      insertTransaction.run(
        transaction.id,
        transaction.portfolio_id,
        transaction.holding_id,
        transaction.type,
        transaction.symbol,
        transaction.quantity,
        transaction.price,
        transaction.total_amount,
        transaction.occurred_at,
        transaction.created_at
      );
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    db.close();
    throw error;
  }

  const counts = {
    portfolios: db.prepare('SELECT COUNT(*) AS count FROM portfolios').get().count,
    holdings: db.prepare('SELECT COUNT(*) AS count FROM holdings').get().count,
    transactions: db.prepare('SELECT COUNT(*) AS count FROM transactions').get().count,
  };
  db.close();
  return counts;
}

if (require.main === module) {
  const counts = seedDatabase();
  // eslint-disable-next-line no-console
  console.log(`Seed complete: ${JSON.stringify(counts)}`);
}

module.exports = {
  DEMO_FIXTURE,
  seedDatabase,
};
