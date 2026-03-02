import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PortfolioPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Manage your investment portfolios, track holdings, and import transactions via CSV.
        </p>
      </CardContent>
    </Card>
  )
}
