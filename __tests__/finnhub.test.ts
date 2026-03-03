import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { FinnhubClient } from '../lib/finnhub';
import type { FinnhubQuote, FinnhubNewsItem } from '../lib/types/finnhub';

describe('FinnhubClient - mock mode', () => {
  let client: FinnhubClient;

  before(() => {
    // Ensure no API key so mock mode activates
    delete process.env.FINNHUB_API_KEY;
    client = new FinnhubClient({ apiKey: undefined });
  });

  it('should be in mock mode when no API key is provided', () => {
    assert.equal(client.isMockMode, true);
  });

  it('should not be in mock mode when API key is provided', () => {
    const liveClient = new FinnhubClient({ apiKey: 'test-key-123' });
    assert.equal(liveClient.isMockMode, false);
  });

  describe('getQuote', () => {
    it('should return a typed FinnhubQuote', async () => {
      const quote: FinnhubQuote = await client.getQuote('AAPL');
      assert.equal(quote.symbol, 'AAPL');
      assert.equal(typeof quote.price, 'number');
      assert.equal(typeof quote.change, 'number');
      assert.equal(typeof quote.changePercent, 'number');
      assert.equal(typeof quote.high, 'number');
      assert.equal(typeof quote.low, 'number');
      assert.equal(typeof quote.open, 'number');
      assert.equal(typeof quote.previousClose, 'number');
      assert.equal(typeof quote.timestamp, 'number');
    });

    it('should normalize symbol to uppercase', async () => {
      const quote = await client.getQuote('  aapl  ');
      assert.equal(quote.symbol, 'AAPL');
    });

    it('should return deterministic data for the same symbol', async () => {
      const quote1 = await client.getQuote('MSFT');
      const quote2 = await client.getQuote('MSFT');
      assert.deepStrictEqual(quote1, quote2);
    });

    it('should return different data for different symbols', async () => {
      const quoteA = await client.getQuote('AAPL');
      const quoteM = await client.getQuote('MSFT');
      assert.notEqual(quoteA.price, quoteM.price);
    });

    it('should have consistent price math (high > price > low)', async () => {
      const quote = await client.getQuote('GOOGL');
      assert.ok(quote.high >= quote.price, 'high should be >= price');
      assert.ok(quote.low <= quote.price, 'low should be <= price');
    });

    it('should have previousClose = price - change', async () => {
      const quote = await client.getQuote('TSLA');
      assert.equal(quote.previousClose, Math.round((quote.price - quote.change) * 100) / 100);
    });

    it('should have a fixed timestamp for determinism', async () => {
      const quote = await client.getQuote('NVDA');
      assert.equal(quote.timestamp, 1700000000);
    });
  });

  describe('getCompanyNews', () => {
    it('should return an array of FinnhubNewsItem', async () => {
      const news: FinnhubNewsItem[] = await client.getCompanyNews(
        'AAPL',
        '2024-01-01',
        '2024-01-31'
      );
      assert.ok(Array.isArray(news));
      assert.ok(news.length > 0);
    });

    it('should include the symbol in news items', async () => {
      const news = await client.getCompanyNews(
        'MSFT',
        '2024-01-01',
        '2024-01-31'
      );
      for (const item of news) {
        assert.equal(item.related, 'MSFT');
      }
    });

    it('should return typed news items with all required fields', async () => {
      const news = await client.getCompanyNews(
        'AAPL',
        '2024-01-01',
        '2024-01-31'
      );
      const item = news[0];
      assert.equal(typeof item.id, 'number');
      assert.equal(typeof item.headline, 'string');
      assert.equal(typeof item.summary, 'string');
      assert.equal(typeof item.source, 'string');
      assert.equal(typeof item.url, 'string');
      assert.equal(typeof item.category, 'string');
      assert.equal(typeof item.related, 'string');
      assert.equal(typeof item.datetime, 'number');
      assert.equal(typeof item.image, 'string');
    });

    it('should normalize symbol to uppercase', async () => {
      const news = await client.getCompanyNews(
        '  msft  ',
        '2024-01-01',
        '2024-01-31'
      );
      assert.equal(news[0].related, 'MSFT');
    });
  });

  describe('getMarketNews', () => {
    it('should return an array of news items', async () => {
      const news: FinnhubNewsItem[] = await client.getMarketNews();
      assert.ok(Array.isArray(news));
      assert.ok(news.length > 0);
    });

    it('should use the category in news items', async () => {
      const news = await client.getMarketNews('crypto');
      for (const item of news) {
        assert.equal(item.category, 'crypto');
      }
    });

    it('should default to general category', async () => {
      const news = await client.getMarketNews();
      assert.equal(news[0].category, 'general');
    });
  });

  describe('mapQuote', () => {
    it('should correctly map raw API response to FinnhubQuote', () => {
      const raw = { c: 150.25, d: 2.5, dp: 1.69, h: 152.0, l: 148.0, o: 149.0, pc: 147.75, t: 1700000000 };
      const quote = FinnhubClient.mapQuote('AAPL', raw);
      assert.equal(quote.symbol, 'AAPL');
      assert.equal(quote.price, 150.25);
      assert.equal(quote.change, 2.5);
      assert.equal(quote.changePercent, 1.69);
      assert.equal(quote.high, 152.0);
      assert.equal(quote.low, 148.0);
      assert.equal(quote.open, 149.0);
      assert.equal(quote.previousClose, 147.75);
      assert.equal(quote.timestamp, 1700000000);
    });
  });

  describe('mapNewsItem', () => {
    it('should pass through all fields from raw news item', () => {
      const raw = {
        id: 999,
        headline: 'Test headline',
        summary: 'Test summary',
        source: 'TestSource',
        url: 'https://example.com',
        category: 'general',
        related: 'AAPL,MSFT',
        datetime: 1700000000,
        image: 'https://example.com/img.jpg',
      };
      const item = FinnhubClient.mapNewsItem(raw);
      assert.deepStrictEqual(item, raw);
    });
  });
});
