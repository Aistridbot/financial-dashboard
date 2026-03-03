# Finnhub API Integration

## Overview

The dashboard uses [Finnhub](https://finnhub.io/) for real-time stock quotes and company news. The client (`lib/finnhub.ts`) supports both live API mode and a deterministic mock mode for development without an API key.

## Setup

### 1. Get an API key

1. Create a free account at [finnhub.io](https://finnhub.io/)
2. Copy your API key from the dashboard

### 2. Configure the environment

Create `.env.local` in the project root:

```bash
FINNHUB_API_KEY=your_api_key_here
```

### 3. Verify

The client auto-detects the key. When set, it makes real API calls. When unset, it falls back to mock mode automatically.

## Mock Mode

When `FINNHUB_API_KEY` is not set (or empty), the `FinnhubClient` enters mock mode:

- `client.isMockMode` returns `true`
- All methods return deterministic data derived from the symbol string
- Mock quotes use character codes to generate consistent prices
- Mock news returns synthetic headlines with realistic structure
- No network requests are made

This allows full development and testing without an API key or internet connection.

### How mock data works

```typescript
const client = new FinnhubClient(); // No API key
console.log(client.isMockMode); // true

const quote = await client.getQuote('AAPL');
// Returns deterministic quote based on 'AAPL' character codes
// Same input always produces the same output
```

## Rate Limits

### Free Tier (default)
- **60 API calls per minute**
- The client has a built-in `RateLimiter` class that enforces this
- If the limit is hit, requests are automatically delayed (not rejected)

### Rate Limiter Configuration

```typescript
// Default: 60 requests per minute
const client = new FinnhubClient();

// Custom limit (e.g., paid plan with higher quota)
const client = new FinnhubClient({
  maxRequestsPerMinute: 300,
});
```

### Rate Limiter Behavior

- Uses a sliding-window algorithm (tracks timestamps of recent requests)
- When the window is full, `acquire()` waits until the oldest request ages out
- Thread-safe within a single Node.js process
- Resets across server restarts

## API Endpoints Used

### Quote (`/quote`)

Fetches current price data for a symbol.

```typescript
const quote = await client.getQuote('AAPL');
// Returns: FinnhubQuote
// { symbol, currentPrice, previousClose, change, percentChange, high, low, open, timestamp }
```

**Mapped fields:**
| Finnhub Raw | Our Type | Description |
|-------------|----------|-------------|
| `c` | `currentPrice` | Current price |
| `pc` | `previousClose` | Previous close |
| `d` | `change` | Dollar change |
| `dp` | `percentChange` | Percent change |
| `h` | `high` | Day high |
| `l` | `low` | Day low |
| `o` | `open` | Day open |
| `t` | `timestamp` | Unix timestamp |

### Company News (`/company-news`)

Fetches news articles for a symbol within a date range.

```typescript
const news = await client.getCompanyNews('AAPL', '2024-01-01', '2024-01-31');
// Returns: FinnhubNewsItem[]
// { id, headline, summary, url, source, datetime, image, category, related }
```

## Switching to Production

### From mock to live

1. Set `FINNHUB_API_KEY` in `.env.local`
2. Restart the Next.js dev server
3. The client auto-switches — no code changes needed

### Upgrading to paid tier

1. Upgrade your Finnhub plan
2. Update the rate limit if desired:
   ```typescript
   // In lib/finnhub.ts constructor or via config
   const client = new FinnhubClient({
     maxRequestsPerMinute: 300, // Paid tier limit
   });
   ```

### Using a different base URL (e.g., proxy)

```typescript
const client = new FinnhubClient({
  baseUrl: 'https://your-proxy.example.com/finnhub/v1',
});
```

## Quote Caching

Quotes are cached in-memory via `lib/quote-cache.ts`:

- Cache uses `globalThis` pattern (persists across dev hot-reload)
- Staleness threshold: **5 minutes** (`isQuoteStale()`)
- Cache stores: `{ price, previousClose, timestamp }`
- `refreshQuotes` action fetches from Finnhub and updates the cache
- `buildPriceMap(symbols)` converts cached quotes to a `Record<string, number>` for holding computations

## Type Definitions

All Finnhub types are in `lib/types/finnhub.ts`:

- `FinnhubConfig` — Client configuration
- `FinnhubQuoteRaw` — Raw API response
- `FinnhubQuote` — Mapped/cleaned quote
- `FinnhubNewsItemRaw` — Raw news API response
- `FinnhubNewsItem` — Mapped/cleaned news item

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| All data looks fake/deterministic | Mock mode active | Set `FINNHUB_API_KEY` in `.env.local` |
| 429 Too Many Requests | Rate limit exceeded | Built-in limiter handles this; reduce concurrent calls if needed |
| Empty quotes (all zeros) | Invalid symbol | Verify the symbol exists on Finnhub |
| No news returned | No recent news for symbol | Try a larger date range or a more active stock |
| API key not recognized | Wrong key format | Check for trailing whitespace in `.env.local` |
