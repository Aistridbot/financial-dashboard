const { openDatabase } = require('./connection');

const MIGRATIONS = [
  {
    version: 1,
    name: 'create_financial_core_tables',
    sql: `
      CREATE TABLE IF NOT EXISTS portfolios (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        base_currency TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS holdings (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity >= 0),
        average_cost REAL NOT NULL CHECK (average_cost >= 0),
        created_at TEXT NOT NULL,
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL,
        holding_id TEXT,
        type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL')),
        symbol TEXT,
        quantity REAL CHECK (quantity >= 0),
        price REAL CHECK (price >= 0),
        total_amount REAL NOT NULL,
        occurred_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
        FOREIGN KEY (holding_id) REFERENCES holdings(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_holdings_portfolio_id ON holdings(portfolio_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_id ON transactions(portfolio_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_holding_id ON transactions(holding_id);
    `,
  },
];

function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

function migrateDatabase(options = {}) {
  const db = openDatabase(options);
  ensureMigrationsTable(db);

  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all();
  const appliedVersions = new Set(appliedRows.map((row) => row.version));

  db.exec('BEGIN');
  try {
    for (const migration of MIGRATIONS) {
      if (appliedVersions.has(migration.version)) continue;
      db.exec(migration.sql);
      db.prepare(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
      ).run(migration.version, migration.name, '2024-01-01T00:00:00.000Z');
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    db.close();
    throw error;
  }

  const currentVersion = db.prepare('SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations').get().version;
  db.close();

  return {
    version: currentVersion,
    totalMigrations: MIGRATIONS.length,
  };
}

if (require.main === module) {
  const result = migrateDatabase();
  // eslint-disable-next-line no-console
  console.log(`Schema migrated to version ${result.version}`);
}

module.exports = {
  MIGRATIONS,
  migrateDatabase,
};
