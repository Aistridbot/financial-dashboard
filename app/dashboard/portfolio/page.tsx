/**
 * Portfolio tab page.
 *
 * Server component that fetches holdings and risk data,
 * then renders summary cards and holdings table.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PortfolioSummary } from "@/components/portfolio/portfolio-summary"
import { HoldingsTable, type HoldingRow } from "@/components/portfolio/holdings-table"
import { PortfolioActions } from "@/components/portfolio/portfolio-actions"
import { getPortfolios } from "@/lib/actions/portfolio"
import { getHoldings, type HoldingWithComputed } from "@/lib/actions/holding"
import {
  calculatePortfolioRisk,
  calculateConcentration,
  type HoldingInput,
  type ConcentrationRisk,
} from "@/lib/risk"

/**
 * Determine concentration risk for a single holding based on its percentage.
 * Uses same thresholds as portfolio-level risk: >40% HIGH, >25% MEDIUM, else LOW.
 */
function getHoldingConcentrationRisk(percentage: number): ConcentrationRisk {
  if (percentage > 40) return "HIGH"
  if (percentage > 25) return "MEDIUM"
  return "LOW"
}

export default async function PortfolioPage() {
  // Fetch the first portfolio (default view)
  const portfoliosResult = await getPortfolios()

  if (!portfoliosResult.success || portfoliosResult.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No portfolios found. Create a portfolio and add transactions to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  const portfolio = portfoliosResult.data[0]
  const holdingsResult = await getHoldings(portfolio.id)

  if (!holdingsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio — {portfolio.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Error loading holdings: {holdingsResult.error}</p>
        </CardContent>
      </Card>
    )
  }

  const holdings = holdingsResult.data

  // Build risk inputs from holdings
  const holdingInputs: HoldingInput[] = holdings.map((h) => ({
    symbol: h.symbol,
    quantity: h.quantity,
    avgCostBasis: h.avgCostBasis,
    currentPrice: h.currentValue != null ? h.currentValue / h.quantity : undefined,
  }))

  const risk = calculatePortfolioRisk(holdingInputs)
  const concentration = calculateConcentration(holdingInputs)
  const concentrationMap = new Map(concentration.map((c) => [c.symbol, c.percentage]))

  // Calculate total gain/loss from holdings
  const totalGainLoss = holdings.reduce((sum, h) => sum + (h.gainLoss ?? 0), 0)

  // Build table rows
  const holdingRows: HoldingRow[] = holdings.map((h) => {
    const concPercent = concentrationMap.get(h.symbol) ?? 0
    return {
      symbol: h.symbol,
      quantity: h.quantity,
      avgCostBasis: h.avgCostBasis,
      currentValue: h.currentValue,
      gainLoss: h.gainLoss,
      gainLossPercent: h.gainLossPercent,
      concentrationPercent: concPercent,
      concentrationRisk: getHoldingConcentrationRisk(concPercent),
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{portfolio.name}</h2>
          <p className="text-muted-foreground">
            Overview of your holdings and portfolio risk metrics.
          </p>
        </div>
        <PortfolioActions portfolioId={portfolio.id} />
      </div>

      <PortfolioSummary
        totalValue={risk.totalValue}
        totalGainLoss={totalGainLoss}
        positionsCount={holdings.length}
        diversificationScore={risk.diversificationScore}
        concentrationRisk={risk.concentrationRisk}
      />

      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <HoldingsTable holdings={holdingRows} />
        </CardContent>
      </Card>
    </div>
  )
}
