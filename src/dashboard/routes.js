const { createApiError, sendApiError } = require('../api/errors');
const { RepositoryError } = require('../repositories/financialRepository');

function normalizePortfolioId(raw) {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw createApiError(400, 'INVALID_QUERY', 'Query parameter "portfolioId" must be a non-empty string.');
  }

  return raw.trim();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value) {
  return Number(value.toFixed(2));
}

function mapError(error) {
  if (error instanceof RepositoryError && error.code === 'NOT_FOUND') {
    return createApiError(404, 'NOT_FOUND', error.message, error.details);
  }

  if (error instanceof RepositoryError && error.code === 'VALIDATION_ERROR') {
    return createApiError(400, 'VALIDATION_ERROR', error.message, error.details);
  }

  return error;
}

function registerDashboardRoutes(app, repository, stockProvider) {
  app.get('/api/dashboard/summary', async (req, res) => {
    try {
      const portfolioId = normalizePortfolioId(req.query.portfolioId);

      repository.getPortfolioById(portfolioId);
      const holdings = repository.listHoldingsByPortfolio(portfolioId);

      let totalValue = 0;
      let investedValue = 0;
      let dayChange = 0;
      let totalGainLoss = 0;
      const warnings = [];

      for (const holding of holdings) {
        const quantity = toNumber(holding.quantity);
        const averageCost = toNumber(holding.averageCost);
        investedValue += quantity * averageCost;

        let quote;
        try {
          quote = await stockProvider.getQuote(holding.symbol);
        } catch (_error) {
          quote = null;
        }

        const hasQuote =
          quote &&
          typeof quote.symbol === 'string' &&
          quote.symbol.toUpperCase() === String(holding.symbol).toUpperCase() &&
          Number.isFinite(Number(quote.price));

        if (!hasQuote) {
          const fallbackPrice = averageCost;
          totalValue += quantity * fallbackPrice;
          warnings.push({
            code: 'QUOTE_UNAVAILABLE',
            symbol: holding.symbol,
            fallbackPrice,
            fallbackStrategy: 'USE_AVERAGE_COST',
          });
          continue;
        }

        const currentPrice = Number(quote.price);
        const previousClose = Number.isFinite(Number(quote.previousClose)) ? Number(quote.previousClose) : currentPrice;

        totalValue += quantity * currentPrice;
        dayChange += quantity * (currentPrice - previousClose);
        totalGainLoss += quantity * (currentPrice - averageCost);
      }

      const payload = {
        totalValue: round2(totalValue),
        investedValue: round2(investedValue),
        dayChange: round2(dayChange),
        totalGainLoss: round2(totalGainLoss),
        positionsCount: holdings.length,
      };

      if (warnings.length > 0) {
        payload.warnings = warnings;
      }

      return res.json(payload);
    } catch (error) {
      return sendApiError(res, mapError(error));
    }
  });
}

module.exports = {
  normalizePortfolioId,
  registerDashboardRoutes,
};
