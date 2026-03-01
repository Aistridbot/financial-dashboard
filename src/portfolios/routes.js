const { RepositoryError } = require('../repositories/financialRepository');
const { createApiError, sendApiError } = require('../api/errors');

const ALLOWED_PORTFOLIO_UPDATE_FIELDS = ['name', 'baseCurrency'];

function mapRepositoryError(error) {
  if (error instanceof RepositoryError) {
    if (error.code === 'NOT_FOUND') {
      return createApiError(404, 'NOT_FOUND', error.message, error.details);
    }

    if (error.code === 'VALIDATION_ERROR') {
      return createApiError(400, 'VALIDATION_ERROR', error.message, error.details);
    }
  }

  return error;
}

function parseCreateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createApiError(400, 'VALIDATION_ERROR', 'Request body must be a JSON object.');
  }

  return {
    id: body.id,
    name: body.name,
    baseCurrency: body.baseCurrency,
    createdAt: body.createdAt,
  };
}

function parseUpdateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createApiError(400, 'VALIDATION_ERROR', 'Request body must be a JSON object.');
  }

  const keys = Object.keys(body);
  const unknownFields = keys.filter((key) => !ALLOWED_PORTFOLIO_UPDATE_FIELDS.includes(key));
  if (unknownFields.length > 0) {
    throw createApiError(400, 'UNKNOWN_FIELDS', 'Request body contains unknown fields.', {
      allowedFields: ALLOWED_PORTFOLIO_UPDATE_FIELDS,
      unknownFields,
    });
  }

  return {
    name: body.name,
    baseCurrency: body.baseCurrency,
  };
}

function registerPortfolioRoutes(app, repository) {
  app.get('/api/portfolios', (req, res) => {
    try {
      return res.json({ items: repository.listPortfolios() });
    } catch (error) {
      return sendApiError(res, mapRepositoryError(error));
    }
  });

  app.post('/api/portfolios', (req, res) => {
    try {
      const portfolio = repository.createPortfolio(parseCreateBody(req.body));
      return res.status(201).json(portfolio);
    } catch (error) {
      return sendApiError(res, mapRepositoryError(error));
    }
  });

  app.get('/api/portfolios/:id', (req, res) => {
    try {
      return res.json(repository.getPortfolioById(req.params.id));
    } catch (error) {
      return sendApiError(res, mapRepositoryError(error));
    }
  });

  app.patch('/api/portfolios/:id', (req, res) => {
    try {
      const updates = parseUpdateBody(req.body);
      return res.json(repository.updatePortfolio(req.params.id, updates));
    } catch (error) {
      return sendApiError(res, mapRepositoryError(error));
    }
  });

  // Explicit delete contract: 204 No Content when deleted, 404 when id does not exist.
  app.delete('/api/portfolios/:id', (req, res) => {
    try {
      repository.deletePortfolio(req.params.id);
      return res.status(204).send();
    } catch (error) {
      return sendApiError(res, mapRepositoryError(error));
    }
  });
}

module.exports = {
  ALLOWED_PORTFOLIO_UPDATE_FIELDS,
  registerPortfolioRoutes,
};
