'use client';

/**
 * News feed component - scrollable list of news cards with filters.
 *
 * Uses client-side filtering for instant response.
 */

import { useState, useMemo } from 'react'
import { NewsCard, type NewsItemRow } from './news-card'
import { NewsFilters, applyNewsFilters, type NewsFilterValues } from './news-filters'

interface NewsFeedProps {
  items: NewsItemRow[];
  symbols: string[];
}

export function NewsFeed({ items, symbols }: NewsFeedProps) {
  const [filters, setFilters] = useState<NewsFilterValues>({
    symbol: '',
    sentiment: '',
    fromDate: '',
    toDate: '',
  });

  const filteredItems = useMemo(
    () => applyNewsFilters(items, filters),
    [items, filters]
  );

  return (
    <div>
      <NewsFilters symbols={symbols} onFilter={setFilters} />

      <div className="max-h-[600px] overflow-y-auto space-y-2 pr-2">
        {filteredItems.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            No news items found. Try adjusting your filters or fetching news for your holdings.
          </p>
        ) : (
          filteredItems.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Showing {filteredItems.length} of {items.length} news items
      </p>
    </div>
  );
}
