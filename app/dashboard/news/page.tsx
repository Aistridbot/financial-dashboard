import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>News</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Latest market news from Finnhub with sentiment analysis.
        </p>
      </CardContent>
    </Card>
  )
}
