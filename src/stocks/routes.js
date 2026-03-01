const { SUPPORTED_RANGES } = require('./provider');
const { createApiError, sendApiError } = require('../api/errors');

const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.-]{0,9}$/;

function normalizeSymbol(raw) {
  const symbol = String(raw || '').trim().toUpperCase();
  if (!symbol || !SYMBOL_PATTERN.test(symbol)) {
    throw createApiError(400, 'INVALID_SYMBOL', 'Query parameter "symbol" must be a valid ticker symbol.');
  }
  return symbol;
}

function normalizeRange(raw) {
  const range = String(raw || '').trim().toUpperCase();
  if (!SUPPORTED_RANGES.includes(range)) {
    throw createApiError(400, 'INVALID_RANGE', 'Query parameter "range" is unsupported.', {
      supportedRanges: SUPPORTED_RANGES,
    });
  }
  return range;
}

function registerStockRoutes(app, stockProvider) {
  app.get('/api/stocks/quote', async (req, res) => {
    try {
      const symbol = normalizeSymbol(req.query.symbol);
      const quote = await stockProvider.getQuote(symbol);
      return res.json({
        symbol: quote.symbol,
        price: quote.price,
        currency: quote.currency,
        asOf: quote.asOf,
      });
    } catch (error) {
      return sendApiError(res, error);
    }
  });

  app.get('/api/stocks/history', async (req, res) => {
    try {
      const symbol = normalizeSymbol(req.query.symbol);
      const range = normalizeRange(req.query.range);
      const history = await stockProvider.getHistory(symbol, range);
      return res.json({
        symbol: history.symbol,
        range: history.range,
        currency: history.currency,
        points: history.points,
      });
    } catch (error) {
      return sendApiError(res, error);
    }
  });
}

module.exports = {
  createApiError,
  sendApiError,
  registerStockRoutes,
  normalizeSymbol,
  normalizeRange,
  SUPPORTED_RANGES,
};
