import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getNews } from "@/lib/actions/news"
import { getPortfolios } from "@/lib/actions/portfolio"
import { NewsFeed } from "@/components/news/news-feed"
import { prisma } from "@/lib/db"

export default async function NewsPage() {
  const newsResult = await getNews();

  if (!newsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>News</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading news: {newsResult.error}</p>
        </CardContent>
      </Card>
    )
  }

  // Get unique symbols from holdings across all portfolios
  const holdings = await prisma.holding.findMany({
    select: { symbol: true },
    distinct: ['symbol'],
    orderBy: { symbol: 'asc' },
  });
  const symbols = holdings.map((h) => h.symbol);

  // Serialize dates to ISO strings for client component
  const items = newsResult.data.map((item) => ({
    id: item.id,
    symbol: item.symbol,
    headline: item.headline,
    summary: item.summary,
    url: item.url,
    source: item.source,
    sentiment: item.sentiment,
    sentimentScore: item.sentimentScore,
    publishedAt: item.publishedAt.toISOString(),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>News</CardTitle>
        <p className="text-muted-foreground">
          Latest market news from Finnhub with sentiment analysis.
        </p>
      </CardHeader>
      <CardContent>
        <NewsFeed items={items} symbols={symbols} />
      </CardContent>
    </Card>
  )
}
