const { randomUUID } = require('node:crypto');
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

  function normalizePositiveNumber(value, fieldName) {
    const parsed = normalizeNumber(value, fieldName);
    if (parsed <= 0) {
      throw new RepositoryError('VALIDATION_ERROR', `${fieldName} must be > 0`, { field: fieldName, value: parsed });
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

  function listPortfolios() {
    return withDb((db) =>
      db
        .prepare('SELECT id, name, base_currency AS baseCurrency, created_at AS createdAt FROM portfolios ORDER BY created_at, id')
        .all()
    );
  }

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

  function listHoldingsByPortfolio(portfolioId) {
    const normalizedPortfolioId = normalizeRequiredText(portfolioId, 'portfolioId');
    return withDb((db) =>
      db
        .prepare(
          'SELECT id, portfolio_id AS portfolioId, symbol, quantity, average_cost AS averageCost, created_at AS createdAt FROM holdings WHERE portfolio_id = ? ORDER BY symbol, created_at, id'
        )
        .all(normalizedPortfolioId)
    );
  }

  function createTransaction(input) {
    const id = normalizeRequiredText(input.id, 'id');
    const portfolioId = normalizeRequiredText(input.portfolioId, 'portfolioId');
    const type = normalizeRequiredText(input.type, 'type').toUpperCase();
    const occurredAt = normalizeDate(input.occurredAt, 'occurredAt');
    const createdAt = normalizeOptionalDate(input.createdAt, 'createdAt');

    return withDb((db) => {
      if (type === 'BUY' || type === 'SELL') {
        const symbol = normalizeSymbol(input.symbol, 'symbol');
        const quantity = normalizePositiveNumber(input.quantity, 'quantity');
        const price = normalizePositiveNumber(input.price, 'price');
        const totalAmount =
          input.totalAmount === undefined || input.totalAmount === null
            ? Number((quantity * price).toFixed(8))
            : normalizeNumber(input.totalAmount, 'totalAmount');

        db.exec('BEGIN');
        try {
          const existingHolding = db
            .prepare(
              'SELECT id, quantity, average_cost AS averageCost FROM holdings WHERE portfolio_id = ? AND symbol = ? ORDER BY created_at, id LIMIT 1'
            )
            .get(portfolioId, symbol);

          let holdingId;
          if (type === 'BUY') {
            if (existingHolding) {
              const currentQuantity = Number(existingHolding.quantity);
              const currentAverageCost = Number(existingHolding.averageCost);
              const newQuantity = currentQuantity + quantity;
              const newAverageCost = ((currentQuantity * currentAverageCost) + (quantity * price)) / newQuantity;

              db.prepare('UPDATE holdings SET quantity = ?, average_cost = ? WHERE id = ?').run(
                newQuantity,
                newAverageCost,
                existingHolding.id
              );
              holdingId = existingHolding.id;
            } else {
              holdingId = randomUUID();
              db.prepare(
                'INSERT INTO holdings (id, portfolio_id, symbol, quantity, average_cost, created_at) VALUES (?, ?, ?, ?, ?, ?)'
              ).run(holdingId, portfolioId, symbol, quantity, price, createdAt);
            }
          } else {
            if (!existingHolding || Number(existingHolding.quantity) < quantity) {
              throw new RepositoryError('INSUFFICIENT_QUANTITY', `sell quantity exceeds current holding for ${symbol}`, {
                symbol,
                availableQuantity: existingHolding ? Number(existingHolding.quantity) : 0,
                requestedQuantity: quantity,
              });
            }

            const remainingQuantity = Number(existingHolding.quantity) - quantity;
            db.prepare('UPDATE holdings SET quantity = ? WHERE id = ?').run(remainingQuantity, existingHolding.id);
            holdingId = existingHolding.id;
          }

          db.prepare(
            `INSERT INTO transactions (
              id, portfolio_id, holding_id, type, symbol, quantity, price, total_amount, occurred_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(id, portfolioId, holdingId, type, symbol, quantity, price, totalAmount, occurredAt, createdAt);

          db.exec('COMMIT');

          return { id, portfolioId, holdingId, type, symbol, quantity, price, totalAmount, occurredAt, createdAt };
        } catch (error) {
          db.exec('ROLLBACK');
          if (error instanceof RepositoryError) {
            throw error;
          }
          throw mapSqliteError(error, `portfolio does not exist: ${portfolioId}`);
        }
      }

      const holdingId =
        input.holdingId === undefined || input.holdingId === null
          ? null
          : normalizeRequiredText(input.holdingId, 'holdingId');
      const symbol = input.symbol === undefined || input.symbol === null ? null : normalizeSymbol(input.symbol, 'symbol');
      const quantity =
        input.quantity === undefined || input.quantity === null ? null : normalizePositiveNumber(input.quantity, 'quantity');
      const price = input.price === undefined || input.price === null ? null : normalizePositiveNumber(input.price, 'price');
      const totalAmount = normalizeNumber(input.totalAmount, 'totalAmount');

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
          ORDER BY occurred_at DESC, created_at DESC, id DESC`
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
