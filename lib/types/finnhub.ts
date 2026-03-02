/**
 * Finnhub API response types.
 *
 * These types match the Finnhub REST API v1 response shapes.
 * See: https://finnhub.io/docs/api
 */

/** Stock quote response from /quote endpoint */
export interface FinnhubQuote {
  /** Ticker symbol (added by client, not in raw API response) */
  symbol: string;
  /** Current price */
  price: number;
  /** Change from previous close */
  change: number;
  /** Percent change from previous close */
  changePercent: number;
  /** Day high */
  high: number;
  /** Day low */
  low: number;
  /** Open price */
  open: number;
  /** Previous close price */
  previousClose: number;
  /** Timestamp (unix seconds) */
  timestamp: number;
}

/** Raw Finnhub /quote API response shape */
export interface FinnhubQuoteRaw {
  /** Current price */
  c: number;
  /** Change */
  d: number;
  /** Percent change */
  dp: number;
  /** High price of the day */
  h: number;
  /** Low price of the day */
  l: number;
  /** Open price of the day */
  o: number;
  /** Previous close price */
  pc: number;
  /** Timestamp */
  t: number;
}

/** News item from /company-news or /news endpoint */
export interface FinnhubNewsItem {
  /** News ID */
  id: number;
  /** Headline */
  headline: string;
  /** Summary/description */
  summary: string;
  /** Source name */
  source: string;
  /** URL to full article */
  url: string;
  /** Category (for market news) or related symbol */
  category: string;
  /** Related ticker symbols (comma-separated) */
  related: string;
  /** Publication datetime (unix seconds) */
  datetime: number;
  /** Image URL */
  image: string;
}

/** Raw Finnhub news API response item */
export interface FinnhubNewsItemRaw {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  category: string;
  related: string;
  datetime: number;
  image: string;
}

/** Finnhub client configuration */
export interface FinnhubConfig {
  /** API key. If empty/undefined, client operates in mock mode. */
  apiKey?: string;
  /** Base URL override (for testing) */
  baseUrl?: string;
  /** Max requests per minute (default: 60) */
  maxRequestsPerMinute?: number;
}
