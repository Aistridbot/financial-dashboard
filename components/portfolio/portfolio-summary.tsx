/**
 * Portfolio summary cards component.
 *
 * Displays key portfolio metrics in a grid of cards:
 * - Total portfolio value
 * - Total gain/loss (with color coding)
 * - Number of positions
 * - Diversification score (with concentration risk badge)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ConcentrationRisk } from "@/lib/risk"

export interface PortfolioSummaryProps {
  totalValue: number
  totalGainLoss: number
  positionsCount: number
  diversificationScore: number
  concentrationRisk: ConcentrationRisk
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value)
}

function getRiskBadgeColor(risk: ConcentrationRisk): string {
  switch (risk) {
    case "LOW":
      return "bg-green-100 text-green-800 border-green-200"
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "HIGH":
      return "bg-red-100 text-red-800 border-red-200"
  }
}

export function PortfolioSummary({
  totalValue,
  totalGainLoss,
  positionsCount,
  diversificationScore,
  concentrationRisk,
}: PortfolioSummaryProps) {
  const gainLossColor = totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
  const gainLossSign = totalGainLoss >= 0 ? "+" : ""

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="portfolio-summary">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="total-value">
            {formatCurrency(totalValue)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${gainLossColor}`} data-testid="total-gain-loss">
            {gainLossSign}{formatCurrency(totalGainLoss)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="positions-count">
            {positionsCount}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Diversification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" data-testid="diversification-score">
              {diversificationScore}
            </span>
            <span className="text-sm text-muted-foreground">/100</span>
            <Badge
              className={getRiskBadgeColor(concentrationRisk)}
              data-testid="concentration-risk-badge"
            >
              {concentrationRisk}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
