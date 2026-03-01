function createLiveStockProvider(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || global.fetch;
  const baseUrl = env.STOCK_API_BASE_URL;
  const apiKey = env.STOCK_API_KEY;

  if (!fetchImpl) {
    throw new Error('Live stock provider requires global fetch support.');
  }

  if (!baseUrl || !apiKey) {
    throw new Error('Live stock provider requires STOCK_API_BASE_URL and STOCK_API_KEY.');
  }

  async function fetchJson(pathname, params) {
    const url = new URL(pathname, baseUrl);
    Object.entries({ ...params, token: apiKey }).forEach(([key, value]) => {
      if (value != null && value !== '') url.searchParams.set(key, String(value));
    });

    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new Error(`Live stock provider request failed with status ${response.status}`);
    }
    return response.json();
  }

  return {
    async getQuote(symbol) {
      const payload = await fetchJson('/quote', { symbol });
      return {
        symbol: payload.symbol || symbol,
        price: Number(payload.price),
        currency: payload.currency || 'USD',
        asOf: payload.asOf || new Date().toISOString(),
      };
    },

    async getHistory(symbol, range) {
      const payload = await fetchJson('/history', { symbol, range });
      return {
        symbol: payload.symbol || symbol,
        range,
        currency: payload.currency || 'USD',
        points: Array.isArray(payload.points) ? payload.points : [],
      };
    },
  };
}

module.exports = { createLiveStockProvider };
