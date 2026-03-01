const { createStubStockProvider, SUPPORTED_RANGES } = require('./providers/stubProvider');
const { createLiveStockProvider } = require('./providers/liveProvider');

function createStockProvider(options = {}) {
  const env = options.env || process.env;
  const providerName = (env.STOCK_PROVIDER || 'stub').trim().toLowerCase();

  if (providerName === 'live') {
    return createLiveStockProvider({ env, fetchImpl: options.fetchImpl });
  }

  return createStubStockProvider();
}

module.exports = {
  createStockProvider,
  SUPPORTED_RANGES,
};
