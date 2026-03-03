'use client';

/**
 * News filters component.
 *
 * Provides:
 * - Symbol filter (from portfolio holdings)
 * - Sentiment filter (POSITIVE, NEGATIVE, NEUTRAL)
 * - Date range filter (from/to)
 */

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export interface NewsFilterValues {
  symbol: string;
  sentiment: string;
  fromDate: string;
  toDate: string;
}

interface NewsFiltersProps {
  symbols: string[];
  onFilter: (filters: NewsFilterValues) => void;
}

const SENTIMENT_OPTIONS = ['All', 'POSITIVE', 'NEGATIVE', 'NEUTRAL'] as const;

export function NewsFilters({ symbols, onFilter }: NewsFiltersProps) {
  const [symbol, setSymbol] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  function handleApply() {
    onFilter({ symbol, sentiment, fromDate, toDate });
  }

  function handleClear() {
    setSymbol('');
    setSentiment('');
    setFromDate('');
    setToDate('');
    onFilter({ symbol: '', sentiment: '', fromDate: '', toDate: '' });
  }

  return (
    <div className="flex flex-wrap gap-4 mb-6 items-end">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="news-symbol-filter">Symbol</Label>
        <select
          id="news-symbol-filter"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm w-40"
        >
          <option value="">All Symbols</option>
          {symbols.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="news-sentiment-filter">Sentiment</Label>
        <select
          id="news-sentiment-filter"
          value={sentiment}
          onChange={(e) => setSentiment(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm w-40"
        >
          {SENTIMENT_OPTIONS.map((opt) => (
            <option key={opt} value={opt === 'All' ? '' : opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="news-from-date">From Date</Label>
        <Input
          id="news-from-date"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="news-to-date">To Date</Label>
        <Input
          id="news-to-date"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="w-40"
        />
      </div>

      <Button onClick={handleApply} variant="default" size="sm">
        Apply
      </Button>
      <Button onClick={handleClear} variant="outline" size="sm">
        Clear
      </Button>
    </div>
  );
}

/**
 * Apply client-side filters to news items.
 * Pure function for testability.
 */
export function applyNewsFilters<T extends { symbol: string; sentiment: string; publishedAt: string }>(
  items: T[],
  filters: NewsFilterValues
): T[] {
  let filtered = items;

  if (filters.symbol.trim()) {
    const searchTerm = filters.symbol.trim().toUpperCase();
    filtered = filtered.filter((item) =>
      item.symbol.toUpperCase() === searchTerm
    );
  }

  if (filters.sentiment.trim()) {
    filtered = filtered.filter((item) =>
      item.sentiment === filters.sentiment
    );
  }

  if (filters.fromDate) {
    const from = new Date(filters.fromDate);
    filtered = filtered.filter((item) => new Date(item.publishedAt) >= from);
  }

  if (filters.toDate) {
    const to = new Date(filters.toDate);
    to.setHours(23, 59, 59, 999);
    filtered = filtered.filter((item) => new Date(item.publishedAt) <= to);
  }

  return filtered;
}
