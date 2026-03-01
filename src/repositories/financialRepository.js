const { openDatabase } = require('../db/connection');

class RepositoryError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    this.details = details;
  }
}

function createFinancialRepository(options = {}) {
  const dbPath = options.dbPath;

  function withDb(fn) {
    const db = openDatabase({ dbPath });
    try {
      return fn(db);
    } finally {
      db.close();
    }
  }

  function normalizeRequiredText(value, fieldName) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new RepositoryError('VALIDATION_ERROR', `${fieldName} must be a non-empty string`, { field: fieldName });
    }
    return value.trim();
  }

  function normalizeSymbol(value, fieldName = 'symbol') {
    return normalizeRequiredText(value, fieldName).toUpperCase();
  }

  function normalizeCurrency(value, fieldName = 'baseCurrency') {
    return normalizeRequiredText(value, fieldName).toUpperCase();
  }

  function normalizeNumber(value, fieldName) {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      throw new RepositoryError('VALIDATION_ERROR', `${fieldName} must be a valid number`, { field: fieldName, value });
    }
    if (parsed < 0) {
      throw new RepositoryError('VALIDATION_ERROR', `${fieldName} must be >= 0`, { field: fieldName, value: parsed });
    }
    return parsed;
  }

  function normalizeDate(value, fieldName) {
    const iso = new Date(value).toISOString();
    if (iso === 'Invalid Date') {
      throw new RepositoryError('VALIDATION_ERROR', `${fieldName} must be a valid date`, { field: fieldName, value });
    }
    return iso;
  }

  function normalizeOptionalDate(value, fieldName) {
    if (value === undefined || value === null) return new Date().toISOString();
    return normalizeDate(value, fieldName);
  }

  function mapSqliteError(error, fallbackMessage) {
    const message = error && error.message ? error.message : '';
    if (message.includes('FOREIGN KEY constraint failed')) {
      return new RepositoryError('FK_VIOLATION', fallbackMessage, { cause: message });
    }
    return error;
  }

  /**
   * createPortfolio({ id, name, baseCurrency, createdAt? })
   */
  function createPortfolio(input) {
    const id = normalizeRequiredText(input.id, 'id');
    const name = normalizeRequiredText(input.name, 'name');
    const baseCurrency = normalizeCurrency(input.baseCurrency, 'baseCurrency');
    const createdAt = normalizeOptionalDate(input.createdAt, 'createdAt');

    return withDb((db) => {
      db.prepare('INSERT INTO portfolios (id, name, base_currency, created_at) VALUES (?, ?, ?, ?)').run(
        id,
        name,
        baseCurrency,
        createdAt
      );
      return { id, name, baseCurrency, createdAt };
    });
  }

  /**
   * listPortfolios()
   */
  function listPortfolios() {
    return withDb((db) =>
      db
        .prepare('SELECT id, name, base_currency AS baseCurrency, created_at AS createdAt FROM portfolios ORDER BY created_at, id')
        .all()
    );
  }

  /**
   * getPortfolioById(id)
   */
  function getPortfolioById(id) {
    const normalizedId = normalizeRequiredText(id, 'id');
    return withDb((db) => {
      const portfolio = db
        .prepare('SELECT id, name, base_currency AS baseCurrency, created_at AS createdAt FROM portfolios WHERE id = ?')
        .get(normalizedId);

      if (!portfolio) {
        throw new RepositoryError('NOT_FOUND', `portfolio not found: ${normalizedId}`, { id: normalizedId });
      }
      return portfolio;
    });
  }

  /**
   * updatePortfolio(id, { name?, baseCurrency? })
   */
  function updatePortfolio(id, updates) {
    const normalizedId = normalizeRequiredText(id, 'id');
    if (!updates || typeof updates !== 'object') {
      throw new RepositoryError('VALIDATION_ERROR', 'updates must be an object', { field: 'updates' });
    }

    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(normalizeRequiredText(updates.name, 'name'));
    }

    if (updates.baseCurrency !== undefined) {
      fields.push('base_currency = ?');
      values.push(normalizeCurrency(updates.baseCurrency, 'baseCurrency'));
    }

    if (fields.length === 0) {
      throw new RepositoryError('VALIDATION_ERROR', 'no updatable fields provided', { field: 'updates' });
    }

    return withDb((db) => {
      const result = db.prepare(`UPDATE portfolios SET ${fields.join(', ')} WHERE id = ?`).run(...values, normalizedId);
      if (result.changes === 0) {
        throw new RepositoryError('NOT_FOUND', `portfolio not found: ${normalizedId}`, { id: normalizedId });
      }
      return db
        .prepare('SELECT id, name, base_currency AS baseCurrency, created_at AS createdAt FROM portfolios WHERE id = ?')
        .get(normalizedId);
    });
  }

  /**
   * deletePortfolio(id)
   */
  function deletePortfolio(id) {
    const normalizedId = normalizeRequiredText(id, 'id');
    return withDb((db) => {
      const result = db.prepare('DELETE FROM portfolios WHERE id = ?').run(normalizedId);
      if (result.changes === 0) {
        throw new RepositoryError('NOT_FOUND', `portfolio not found: ${normalizedId}`, { id: normalizedId });
      }
      return { deleted: true, id: normalizedId };
    });
  }

  /**
   * createHolding({ id, portfolioId, symbol, quantity, averageCost, createdAt? })
   */
  function createHolding(input) {
    const id = normalizeRequiredText(input.id, 'id');
    const portfolioId = normalizeRequiredText(input.portfolioId, 'portfolioId');
    const symbol = normalizeSymbol(input.symbol, 'symbol');
    const quantity = normalizeNumber(input.quantity, 'quantity');
    const averageCost = normalizeNumber(input.averageCost, 'averageCost');
    const createdAt = normalizeOptionalDate(input.createdAt, 'createdAt');

    return withDb((db) => {
      try {
        db.prepare(
          'INSERT INTO holdings (id, portfolio_id, symbol, quantity, average_cost, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(id, portfolioId, symbol, quantity, averageCost, createdAt);
      } catch (error) {
        throw mapSqliteError(error, `portfolio does not exist: ${portfolioId}`);
      }

      return { id, portfolioId, symbol, quantity, averageCost, createdAt };
    });
  }

  /**
   * listHoldingsByPortfolio(portfolioId)
   */
  function listHoldingsByPortfolio(portfolioId) {
    const normalizedPortfolioId = normalizeRequiredText(portfolioId, 'portfolioId');
    return withDb((db) =>
      db
        .prepare(
          'SELECT id, portfolio_id AS portfolioId, symbol, quantity, average_cost AS averageCost, created_at AS createdAt FROM holdings WHERE portfolio_id = ? ORDER BY created_at, id'
        )
        .all(normalizedPortfolioId)
    );
  }

  /**
   * createTransaction({ id, portfolioId, holdingId?, type, symbol?, quantity?, price?, totalAmount, occurredAt, createdAt? })
   */
  function createTransaction(input) {
    const id = normalizeRequiredText(input.id, 'id');
    const portfolioId = normalizeRequiredText(input.portfolioId, 'portfolioId');
    const holdingId = input.holdingId === undefined || input.holdingId === null
      ? null
      : normalizeRequiredText(input.holdingId, 'holdingId');
    const type = normalizeRequiredText(input.type, 'type').toUpperCase();
    const symbol = input.symbol === undefined || input.symbol === null ? null : normalizeSymbol(input.symbol, 'symbol');
    const quantity = input.quantity === undefined || input.quantity === null ? null : normalizeNumber(input.quantity, 'quantity');
    const price = input.price === undefined || input.price === null ? null : normalizeNumber(input.price, 'price');
    const totalAmount = normalizeNumber(input.totalAmount, 'totalAmount');
    const occurredAt = normalizeDate(input.occurredAt, 'occurredAt');
    const createdAt = normalizeOptionalDate(input.createdAt, 'createdAt');

    return withDb((db) => {
      try {
        db.prepare(
          `INSERT INTO transactions (
            id, portfolio_id, holding_id, type, symbol, quantity, price, total_amount, occurred_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(id, portfolioId, holdingId, type, symbol, quantity, price, totalAmount, occurredAt, createdAt);
      } catch (error) {
        throw mapSqliteError(error, 'portfolioId and holdingId must reference existing rows');
      }

      return { id, portfolioId, holdingId, type, symbol, quantity, price, totalAmount, occurredAt, createdAt };
    });
  }

  /**
   * listTransactionsByPortfolio(portfolioId)
   */
  function listTransactionsByPortfolio(portfolioId) {
    const normalizedPortfolioId = normalizeRequiredText(portfolioId, 'portfolioId');
    return withDb((db) =>
      db
        .prepare(
          `SELECT
            id,
            portfolio_id AS portfolioId,
            holding_id AS holdingId,
            type,
            symbol,
            quantity,
            price,
            total_amount AS totalAmount,
            occurred_at AS occurredAt,
            created_at AS createdAt
          FROM transactions
          WHERE portfolio_id = ?
          ORDER BY occurred_at, id`
        )
        .all(normalizedPortfolioId)
    );
  }

  return {
    createPortfolio,
    listPortfolios,
    getPortfolioById,
    updatePortfolio,
    deletePortfolio,
    createHolding,
    listHoldingsByPortfolio,
    createTransaction,
    listTransactionsByPortfolio,
  };
}

module.exports = {
  RepositoryError,
  createFinancialRepository,
};
