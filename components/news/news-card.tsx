'use client';

/**
 * News card component displaying a single news item with sentiment badge.
 *
 * Shows headline, source, date, sentiment indicator, and summary snippet.
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getSentimentBadgeColor, type SentimentLabel } from "@/lib/sentiment"

export interface NewsItemRow {
  id: string;
  symbol: string;
  headline: string;
  summary: string | null;
  url: string;
  source: string;
  sentiment: string;
  sentimentScore: number | null;
  publishedAt: string; // ISO string
}

interface NewsCardProps {
  item: NewsItemRow;
}

/**
 * Format a date string for display.
 */
export function formatNewsDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NewsCard({ item }: NewsCardProps) {
  const sentimentLabel = item.sentiment as SentimentLabel;
  const badgeColor = getSentimentBadgeColor(sentimentLabel);

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sm hover:underline flex-1"
          >
            {item.headline}
          </a>
          <Badge className={badgeColor} variant="outline">
            {sentimentLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span>{item.source}</span>
          <span>•</span>
          <span>{formatNewsDate(item.publishedAt)}</span>
          <span>•</span>
          <Badge variant="secondary" className="text-xs">
            {item.symbol}
          </Badge>
        </div>
      </CardHeader>
      {item.summary && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {item.summary}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
