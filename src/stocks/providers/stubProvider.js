const SUPPORTED_RANGES = Object.freeze(['1D', '5D', '1M', '6M', '1Y']);

function hashSymbol(symbol) {
  return [...symbol].reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function normalizeSymbol(symbol) {
  return String(symbol || '').trim().toUpperCase();
}

function rangeToPoints(range) {
  switch (range) {
    case '1D':
      return 1;
    case '5D':
      return 5;
    case '1M':
      return 30;
    case '6M':
      return 26;
    case '1Y':
      return 52;
    default:
      return 0;
  }
}

function createStubStockProvider() {
  return {
    getQuote(symbol) {
      const normalized = normalizeSymbol(symbol);
      const base = hashSymbol(normalized);
      const price = Number((50 + (base % 350) + ((base % 100) / 100)).toFixed(2));
      return {
        symbol: normalized,
        price,
        currency: 'USD',
        asOf: new Date().toISOString(),
      };
    },

    getHistory(symbol, range) {
      const normalized = normalizeSymbol(symbol);
      const points = rangeToPoints(range);
      const seed = hashSymbol(normalized) % 40;
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const data = [];

      for (let index = points - 1; index >= 0; index -= 1) {
        const at = new Date(now - index * dayMs).toISOString();
        const price = Number((100 + seed + (points - index) * 0.75).toFixed(2));
        data.push({ at, price });
      }

      return {
        symbol: normalized,
        range,
        currency: 'USD',
        points: data,
      };
    },
  };
}

module.exports = {
  SUPPORTED_RANGES,
  createStubStockProvider,
};
