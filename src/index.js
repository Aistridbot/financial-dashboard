const express = require('express');
const { createStockProvider } = require('./stocks/provider');
const { registerStockRoutes } = require('./stocks/routes');

function createApp(options = {}) {
  const app = express();
  const stockProvider = options.stockProvider || createStockProvider({ env: options.env || process.env });

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/', (_req, res) => res.send('Financial Dashboard API'));
  registerStockRoutes(app, stockProvider);

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server on ${port}`));
}

module.exports = { createApp };
