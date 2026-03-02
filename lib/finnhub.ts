/**
 * Finnhub API client with rate limiting and mock fallback.
 *
 * Usage:
 *   const client = new FinnhubClient(); // uses FINNHUB_API_KEY env var
 *   const quote = await client.getQuote('AAPL');
 *   const news = await client.getCompanyNews('AAPL', '2024-01-01', '2024-01-31');
 *
 * When FINNHUB_API_KEY is not set, the client returns deterministic mock data.
 */

import type {
  FinnhubConfig,
  FinnhubQuote,
  FinnhubQuoteRaw,
  FinnhubNewsItem,
  FinnhubNewsItemRaw,
} from '@/lib/types/finnhub';

const DEFAULT_BASE_URL = 'https://finnhub.io/api/v1';
const DEFAULT_MAX_RPM = 60;

/**
 * Simple sliding-window rate limiter.
 * Tracks timestamps of recent calls and delays if limit is hit.
 */
class RateLimiter {
  private timestamps: number[] = [];
  private maxPerMinute: number;

  constructor(maxPerMinute: number) {
    this.maxPerMinute = maxPerMinute;
  }

  /**
   * Wait until a request slot is available.
   * Returns immediately if under the limit.
   */
  async acquire(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60_000;

    // Remove timestamps outside the 1-minute window
    this.timestamps = this.timestamps.filter((t) => t > windowStart);

    if (this.timestamps.length >= this.maxPerMinute) {
      // Wait until the oldest timestamp falls out of the window
      const oldest = this.timestamps[0];
      const waitMs = oldest + 60_000 - now + 10; // +10ms buffer
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      // Recurse to re-check after waiting
      return this.acquire();
    }

    this.timestamps.push(Date.now());
  }

  /** Current count of requests in the sliding window (for testing) */
  get currentCount(): number {
    const windowStart = Date.now() - 60_000;
    this.timestamps = this.timestamps.filter((t) => t > windowStart);
    return this.timestamps.length;
  }

  /** Reset the limiter (for testing) */
  reset(): void {
    this.timestamps = [];
  }
}

export class FinnhubClient {
  private apiKey: string | undefined;
  private baseUrl: string;
  private rateLimiter: RateLimiter;
  readonly isMockMode: boolean;

  constructor(config?: FinnhubConfig) {
    this.apiKey = config?.apiKey ?? process.env.FINNHUB_API_KEY ?? undefined;
    this.baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL;
    this.rateLimiter = new RateLimiter(
      config?.maxRequestsPerMinute ?? DEFAULT_MAX_RPM
    );
    this.isMockMode = !this.apiKey;
  }

  /**
   * Fetch a stock quote for a given symbol.
   */
  async getQuote(symbol: string): Promise<FinnhubQuote> {
    const normalizedSymbol = symbol.trim().toUpperCase();

    if (this.isMockMode) {
      return FinnhubClient.mockQuote(normalizedSymbol);
    }

    await this.rateLimiter.acquire();
    const url = `${this.baseUrl}/quote?symbol=${encodeURIComponent(normalizedSymbol)}&token=${this.apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(
        `Finnhub API error: ${res.status} ${res.statusText}`
      );
    }

    const raw: FinnhubQuoteRaw = await res.json();
    return FinnhubClient.mapQuote(normalizedSymbol, raw);
  }

  /**
   * Fetch company news for a given symbol within a date range.
   * @param symbol - Ticker symbol
   * @param from - Start date (YYYY-MM-DD)
   * @param to - End date (YYYY-MM-DD)
   */
  async getCompanyNews(
    symbol: string,
    from: string,
    to: string
  ): Promise<FinnhubNewsItem[]> {
    const normalizedSymbol = symbol.trim().toUpperCase();

    if (this.isMockMode) {
      return FinnhubClient.mockCompanyNews(normalizedSymbol);
    }

    await this.rateLimiter.acquire();
    const url = `${this.baseUrl}/company-news?symbol=${encodeURIComponent(normalizedSymbol)}&from=${from}&to=${to}&token=${this.apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(
        `Finnhub API error: ${res.status} ${res.statusText}`
      );
    }

    const raw: FinnhubNewsItemRaw[] = await res.json();
    return raw.map(FinnhubClient.mapNewsItem);
  }

  /**
   * Fetch general market news.
   * @param category - News category: "general", "forex", "crypto", "merger"
   */
  async getMarketNews(
    category: string = 'general'
  ): Promise<FinnhubNewsItem[]> {
    if (this.isMockMode) {
      return FinnhubClient.mockMarketNews(category);
    }

    await this.rateLimiter.acquire();
    const url = `${this.baseUrl}/news?category=${encodeURIComponent(category)}&token=${this.apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(
        `Finnhub API error: ${res.status} ${res.statusText}`
      );
    }

    const raw: FinnhubNewsItemRaw[] = await res.json();
    return raw.map(FinnhubClient.mapNewsItem);
  }

  // --- Mapping helpers ---

  static mapQuote(symbol: string, raw: FinnhubQuoteRaw): FinnhubQuote {
    return {
      symbol,
      price: raw.c,
      change: raw.d,
      changePercent: raw.dp,
      high: raw.h,
      low: raw.l,
      open: raw.o,
      previousClose: raw.pc,
      timestamp: raw.t,
    };
  }

  static mapNewsItem(raw: FinnhubNewsItemRaw): FinnhubNewsItem {
    return {
      id: raw.id,
      headline: raw.headline,
      summary: raw.summary,
      source: raw.source,
      url: raw.url,
      category: raw.category,
      related: raw.related,
      datetime: raw.datetime,
      image: raw.image,
    };
  }

  // --- Mock data (deterministic) ---

  static mockQuote(symbol: string): FinnhubQuote {
    // Deterministic: seed price from symbol chars
    const seed = symbol
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const price = Math.round((seed * 1.37 + 50) * 100) / 100;
    const change = Math.round((seed % 7 - 3) * 100) / 100;
    const changePercent =
      Math.round((change / (price - change)) * 10000) / 100;

    return {
      symbol,
      price,
      change,
      changePercent,
      high: Math.round((price + Math.abs(change) + 1.5) * 100) / 100,
      low: Math.round((price - Math.abs(change) - 0.8) * 100) / 100,
      open: Math.round((price - change * 0.5) * 100) / 100,
      previousClose: Math.round((price - change) * 100) / 100,
      timestamp: 1700000000, // fixed timestamp for determinism
    };
  }

  static mockCompanyNews(symbol: string): FinnhubNewsItem[] {
    return [
      {
        id: 1001,
        headline: `${symbol} reports strong quarterly earnings`,
        summary: `${symbol} exceeded analyst expectations with robust revenue growth.`,
        source: 'MockFinancialNews',
        url: `https://example.com/news/${symbol.toLowerCase()}-earnings`,
        category: 'company',
        related: symbol,
        datetime: 1700000000,
        image: `https://example.com/images/${symbol.toLowerCase()}.jpg`,
      },
      {
        id: 1002,
        headline: `Analysts upgrade ${symbol} to buy`,
        summary: `Multiple analysts have upgraded ${symbol} following strong performance.`,
        source: 'MockAnalystDaily',
        url: `https://example.com/news/${symbol.toLowerCase()}-upgrade`,
        category: 'company',
        related: symbol,
        datetime: 1699990000,
        image: '',
      },
    ];
  }

  static mockMarketNews(category: string): FinnhubNewsItem[] {
    return [
      {
        id: 2001,
        headline: 'Markets rally on positive economic data',
        summary:
          'Global markets saw broad gains as employment and GDP figures beat forecasts.',
        source: 'MockMarketWatch',
        url: 'https://example.com/news/market-rally',
        category,
        related: '',
        datetime: 1700000000,
        image: 'https://example.com/images/market.jpg',
      },
      {
        id: 2002,
        headline: 'Central bank holds rates steady',
        summary:
          'The central bank announced no changes to interest rates, in line with expectations.',
        source: 'MockEconomist',
        url: 'https://example.com/news/rates-hold',
        category,
        related: '',
        datetime: 1699990000,
        image: '',
      },
    ];
  }
}
