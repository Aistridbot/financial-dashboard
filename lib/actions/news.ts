'use server';

import { prisma } from '@/lib/db';
import { FinnhubClient } from '@/lib/finnhub';
import { scoreSentiment } from '@/lib/sentiment';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type NewsFilters = {
  symbol?: string;
  sentiment?: string;
  fromDate?: Date;
  toDate?: Date;
};

/**
 * Fetch news from Finnhub for given symbols, score sentiment, and store in DB.
 * Returns the stored NewsItem records.
 */
export async function fetchAndStoreNews(symbols: string[]) {
  try {
    if (!symbols || symbols.length === 0) {
      return { success: false, error: 'At least one symbol is required' } as ActionResult<never>;
    }

    const client = new FinnhubClient();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromStr = thirtyDaysAgo.toISOString().split('T')[0];
    const toStr = now.toISOString().split('T')[0];

    const allItems: Array<{
      symbol: string;
      headline: string;
      summary: string | null;
      url: string;
      source: string;
      sentiment: string;
      sentimentScore: number;
      publishedAt: Date;
    }> = [];

    for (const symbol of symbols) {
      const normalized = symbol.trim().toUpperCase();
      const newsItems = await client.getCompanyNews(normalized, fromStr, toStr);

      for (const item of newsItems) {
        const sentimentResult = scoreSentiment(item.headline, item.summary);

        allItems.push({
          symbol: normalized,
          headline: item.headline,
          summary: item.summary || null,
          url: item.url,
          source: item.source,
          sentiment: sentimentResult.label,
          sentimentScore: sentimentResult.score,
          publishedAt: new Date(item.datetime * 1000),
        });
      }
    }

    // Upsert by checking existing URL to avoid duplicates
    const stored = [];
    for (const item of allItems) {
      const existing = await prisma.newsItem.findFirst({
        where: { url: item.url, symbol: item.symbol },
      });

      if (!existing) {
        const created = await prisma.newsItem.create({ data: item });
        stored.push(created);
      } else {
        stored.push(existing);
      }
    }

    return { success: true, data: stored } as ActionResult<typeof stored>;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch news',
    } as ActionResult<never>;
  }
}

/**
 * Get stored news items with optional filters.
 */
export async function getNews(filters?: NewsFilters) {
  try {
    const where: Record<string, unknown> = {};

    if (filters?.symbol) {
      where.symbol = filters.symbol.trim().toUpperCase();
    }
    if (filters?.sentiment) {
      where.sentiment = filters.sentiment;
    }
    if (filters?.fromDate || filters?.toDate) {
      const dateFilter: Record<string, Date> = {};
      if (filters.fromDate) dateFilter.gte = filters.fromDate;
      if (filters.toDate) dateFilter.lte = filters.toDate;
      where.publishedAt = dateFilter;
    }

    const items = await prisma.newsItem.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
    });

    return { success: true, data: items } as ActionResult<typeof items>;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get news',
    } as ActionResult<never>;
  }
}
