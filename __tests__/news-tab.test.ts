import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ── Sentiment Tests ─────────────────────────────────────────────────────

describe('lib/sentiment.ts', () => {
  let scoreSentiment: typeof import('../lib/sentiment').scoreSentiment;
  let getSentimentBadgeColor: typeof import('../lib/sentiment').getSentimentBadgeColor;

  before(async () => {
    const mod = await import('../lib/sentiment');
    scoreSentiment = mod.scoreSentiment;
    getSentimentBadgeColor = mod.getSentimentBadgeColor;
  });

  describe('scoreSentiment', () => {
    it('returns NEUTRAL for empty headline', () => {
      const result = scoreSentiment('');
      assert.equal(result.label, 'NEUTRAL');
      assert.equal(result.score, 0);
    });

    it('returns POSITIVE for positive headline', () => {
      const result = scoreSentiment('Stock surges on strong earnings growth');
      assert.equal(result.label, 'POSITIVE');
      assert.ok(result.score > 0, `Expected positive score, got ${result.score}`);
    });

    it('returns NEGATIVE for negative headline', () => {
      const result = scoreSentiment('Markets crash as losses mount in selloff');
      assert.equal(result.label, 'NEGATIVE');
      assert.ok(result.score < 0, `Expected negative score, got ${result.score}`);
    });

    it('returns NEUTRAL for neutral headline', () => {
      const result = scoreSentiment('Company announces new product launch date');
      assert.equal(result.label, 'NEUTRAL');
      assert.equal(result.score, 0);
    });

    it('uses Finnhub sentiment when provided', () => {
      const result = scoreSentiment('Some headline', null, 0.8);
      assert.equal(result.label, 'POSITIVE');
      assert.equal(result.score, 0.8);
    });

    it('uses Finnhub negative sentiment', () => {
      const result = scoreSentiment('Some headline', null, -0.5);
      assert.equal(result.label, 'NEGATIVE');
      assert.equal(result.score, -0.5);
    });

    it('uses Finnhub neutral sentiment near zero', () => {
      const result = scoreSentiment('Some headline', null, 0.05);
      assert.equal(result.label, 'NEUTRAL');
      assert.equal(result.score, 0.05);
    });

    it('clamps Finnhub sentiment to -1..1 range', () => {
      const result = scoreSentiment('Headline', null, 5.0);
      assert.equal(result.score, 1);
      const result2 = scoreSentiment('Headline', null, -3.0);
      assert.equal(result2.score, -1);
    });

    it('considers summary text for scoring', () => {
      const result = scoreSentiment(
        'Company reports results',
        'Revenue growth exceeded expectations with record profits and strong gains'
      );
      assert.equal(result.label, 'POSITIVE');
    });

    it('headline words have more weight than summary words', () => {
      // Headline: 2 negative words (crash, losses) → 4 negative points
      // Summary: 1 positive word (growth) → 1 positive point
      const result = scoreSentiment(
        'Markets crash with heavy losses',
        'Despite some growth in tech sector'
      );
      assert.equal(result.label, 'NEGATIVE');
    });

    it('ignores Finnhub sentiment when NaN', () => {
      const result = scoreSentiment('Stock surges on earnings beat', null, NaN);
      assert.equal(result.label, 'POSITIVE');
    });

    it('score is between -1 and 1', () => {
      const result = scoreSentiment('Rally gains surge rise upgrade beat strong growth profit');
      assert.ok(result.score >= -1 && result.score <= 1);
    });
  });

  describe('getSentimentBadgeColor', () => {
    it('returns green for POSITIVE', () => {
      const color = getSentimentBadgeColor('POSITIVE');
      assert.ok(color.includes('green'), `Expected green class, got ${color}`);
    });

    it('returns red for NEGATIVE', () => {
      const color = getSentimentBadgeColor('NEGATIVE');
      assert.ok(color.includes('red'), `Expected red class, got ${color}`);
    });

    it('returns gray for NEUTRAL', () => {
      const color = getSentimentBadgeColor('NEUTRAL');
      assert.ok(color.includes('gray'), `Expected gray class, got ${color}`);
    });
  });
});

// ── News Actions Tests ─────────────────────────────────────────────────

describe('lib/actions/news.ts', () => {
  let fetchAndStoreNews: typeof import('../lib/actions/news').fetchAndStoreNews;
  let getNews: typeof import('../lib/actions/news').getNews;
  let prisma: typeof import('../lib/db').prisma;

  before(async () => {
    const mod = await import('../lib/actions/news');
    fetchAndStoreNews = mod.fetchAndStoreNews;
    getNews = mod.getNews;
    const db = await import('../lib/db');
    prisma = db.prisma;
  });

  after(async () => {
    // Clean up test data
    await prisma.newsItem.deleteMany({
      where: { source: { startsWith: 'Mock' } },
    });
  });

  it('fetchAndStoreNews returns error for empty symbols', async () => {
    const result = await fetchAndStoreNews([]);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.includes('symbol'));
    }
  });

  it('fetchAndStoreNews stores news items from mock client', async () => {
    const result = await fetchAndStoreNews(['AAPL']);
    assert.equal(result.success, true);
    if (result.success) {
      assert.ok(result.data.length > 0, 'Expected at least one news item');
      const item = result.data[0];
      assert.equal(item.symbol, 'AAPL');
      assert.ok(item.headline.length > 0);
      assert.ok(item.source.length > 0);
      assert.ok(['POSITIVE', 'NEGATIVE', 'NEUTRAL'].includes(item.sentiment));
    }
  });

  it('fetchAndStoreNews handles multiple symbols', async () => {
    const result = await fetchAndStoreNews(['MSFT', 'GOOG']);
    assert.equal(result.success, true);
    if (result.success) {
      const symbols = Array.from(new Set(result.data.map((i) => i.symbol)));
      assert.ok(symbols.includes('MSFT'));
      assert.ok(symbols.includes('GOOG'));
    }
  });

  it('fetchAndStoreNews avoids duplicate entries', async () => {
    const result1 = await fetchAndStoreNews(['TSLA']);
    assert.equal(result1.success, true);
    const count1 = result1.success ? result1.data.length : 0;

    const result2 = await fetchAndStoreNews(['TSLA']);
    assert.equal(result2.success, true);
    const count2 = result2.success ? result2.data.length : 0;

    assert.equal(count1, count2, 'Second fetch should return same count (no duplicates)');
  });

  it('getNews returns all stored items', async () => {
    const result = await getNews();
    assert.equal(result.success, true);
    if (result.success) {
      assert.ok(result.data.length > 0);
    }
  });

  it('getNews filters by symbol', async () => {
    await fetchAndStoreNews(['AAPL']);
    const result = await getNews({ symbol: 'AAPL' });
    assert.equal(result.success, true);
    if (result.success) {
      assert.ok(result.data.length > 0);
      assert.ok(result.data.every((item) => item.symbol === 'AAPL'));
    }
  });

  it('getNews filters by sentiment', async () => {
    const result = await getNews({ sentiment: 'POSITIVE' });
    assert.equal(result.success, true);
    if (result.success) {
      assert.ok(result.data.every((item) => item.sentiment === 'POSITIVE'));
    }
  });
});

// ── News Card Tests ─────────────────────────────────────────────────────

describe('components/news/news-card.tsx', () => {
  const filePath = join(__dirname, '..', 'components', 'news', 'news-card.tsx');

  it('file exists', () => {
    assert.ok(existsSync(filePath), 'news-card.tsx should exist');
  });

  it('is a client component', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("'use client'"), 'Should have use client directive');
  });

  it('exports NewsCard', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('export function NewsCard'), 'Should export NewsCard');
  });

  it('exports NewsItemRow type', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('export interface NewsItemRow'), 'Should export NewsItemRow');
  });

  it('exports formatNewsDate', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('export function formatNewsDate'), 'Should export formatNewsDate');
  });

  it('renders headline', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('item.headline'), 'Should render headline');
  });

  it('renders source', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('item.source'), 'Should render source');
  });

  it('renders date', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('item.publishedAt') || content.includes('formatNewsDate'), 'Should render date');
  });

  it('renders sentiment badge', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('sentimentLabel') || content.includes('sentiment'), 'Should render sentiment badge');
    assert.ok(content.includes('Badge'), 'Should use Badge component');
  });

  it('renders summary', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('item.summary'), 'Should render summary');
  });

  it('uses getSentimentBadgeColor', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('getSentimentBadgeColor'), 'Should use badge color helper');
  });
});

describe('formatNewsDate', () => {
  let formatNewsDate: typeof import('../components/news/news-card').formatNewsDate;

  before(async () => {
    const mod = await import('../components/news/news-card');
    formatNewsDate = mod.formatNewsDate;
  });

  it('formats ISO date string', () => {
    const result = formatNewsDate('2024-06-15T10:30:00.000Z');
    assert.ok(result.includes('2024'), 'Should include year');
    assert.ok(result.includes('Jun') || result.includes('15'), 'Should include month or day');
  });
});

// ── News Filters Tests ──────────────────────────────────────────────────

describe('components/news/news-filters.tsx', () => {
  const filePath = join(__dirname, '..', 'components', 'news', 'news-filters.tsx');

  it('file exists', () => {
    assert.ok(existsSync(filePath), 'news-filters.tsx should exist');
  });

  it('is a client component', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("'use client'"));
  });

  it('exports NewsFilters component', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('export function NewsFilters'));
  });

  it('exports NewsFilterValues type', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('export interface NewsFilterValues'));
  });

  it('exports applyNewsFilters function', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('export function applyNewsFilters'));
  });

  it('has symbol filter', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('news-symbol-filter') || content.includes('symbol'));
  });

  it('has sentiment filter', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('sentiment'));
  });

  it('has date range filters', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('fromDate') && content.includes('toDate'));
  });
});

describe('applyNewsFilters', () => {
  let applyNewsFilters: typeof import('../components/news/news-filters').applyNewsFilters;

  before(async () => {
    const mod = await import('../components/news/news-filters');
    applyNewsFilters = mod.applyNewsFilters;
  });

  const sampleItems = [
    { symbol: 'AAPL', sentiment: 'POSITIVE', publishedAt: '2024-06-15T10:00:00Z' },
    { symbol: 'MSFT', sentiment: 'NEGATIVE', publishedAt: '2024-06-14T10:00:00Z' },
    { symbol: 'AAPL', sentiment: 'NEUTRAL', publishedAt: '2024-06-13T10:00:00Z' },
    { symbol: 'GOOG', sentiment: 'POSITIVE', publishedAt: '2024-06-10T10:00:00Z' },
  ];

  const emptyFilters = { symbol: '', sentiment: '', fromDate: '', toDate: '' };

  it('returns all items with empty filters', () => {
    const result = applyNewsFilters(sampleItems, emptyFilters);
    assert.equal(result.length, 4);
  });

  it('filters by symbol', () => {
    const result = applyNewsFilters(sampleItems, { ...emptyFilters, symbol: 'AAPL' });
    assert.equal(result.length, 2);
    assert.ok(result.every((i) => i.symbol === 'AAPL'));
  });

  it('filters by sentiment', () => {
    const result = applyNewsFilters(sampleItems, { ...emptyFilters, sentiment: 'POSITIVE' });
    assert.equal(result.length, 2);
    assert.ok(result.every((i) => i.sentiment === 'POSITIVE'));
  });

  it('filters by from date', () => {
    const result = applyNewsFilters(sampleItems, { ...emptyFilters, fromDate: '2024-06-14' });
    assert.equal(result.length, 2);
  });

  it('filters by to date', () => {
    const result = applyNewsFilters(sampleItems, { ...emptyFilters, toDate: '2024-06-13' });
    assert.equal(result.length, 2);
  });

  it('combines symbol and sentiment filters', () => {
    const result = applyNewsFilters(sampleItems, { ...emptyFilters, symbol: 'AAPL', sentiment: 'POSITIVE' });
    assert.equal(result.length, 1);
    assert.equal(result[0].symbol, 'AAPL');
    assert.equal(result[0].sentiment, 'POSITIVE');
  });

  it('returns empty for non-matching filters', () => {
    const result = applyNewsFilters(sampleItems, { ...emptyFilters, symbol: 'NOPE' });
    assert.equal(result.length, 0);
  });
});

// ── News Feed Tests ─────────────────────────────────────────────────────

describe('components/news/news-feed.tsx', () => {
  const filePath = join(__dirname, '..', 'components', 'news', 'news-feed.tsx');

  it('file exists', () => {
    assert.ok(existsSync(filePath), 'news-feed.tsx should exist');
  });

  it('is a client component', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("'use client'"));
  });

  it('exports NewsFeed', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('export function NewsFeed'));
  });

  it('uses NewsCard', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('NewsCard'));
  });

  it('uses NewsFilters', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('NewsFilters'));
  });

  it('has scrollable container', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('overflow-y-auto') || content.includes('overflow-auto'));
  });

  it('has empty state message', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('No news') || content.includes('no news'));
  });

  it('shows item count', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('filteredItems.length'));
  });
});

// ── News Page Tests ─────────────────────────────────────────────────────

describe('app/dashboard/news/page.tsx', () => {
  const filePath = join(__dirname, '..', 'app', 'dashboard', 'news', 'page.tsx');

  it('file exists', () => {
    assert.ok(existsSync(filePath), 'page.tsx should exist');
  });

  it('is an async server component', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('async function') || content.includes('async'));
  });

  it('imports getNews', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('getNews'));
  });

  it('imports NewsFeed', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('NewsFeed'));
  });

  it('serializes dates to ISO strings', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('toISOString'));
  });

  it('has error state handling', () => {
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('text-destructive') || content.includes('Error'));
  });
});
