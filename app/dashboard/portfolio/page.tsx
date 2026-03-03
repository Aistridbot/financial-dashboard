/**
 * Portfolio tab page.
 *
 * Server component that fetches holdings with live quote data,
 * then renders summary cards, holdings table, and refresh controls.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PortfolioSummary } from "@/components/portfolio/portfolio-summary"
import { HoldingsTable, type HoldingRow } from "@/components/portfolio/holdings-table"
import { PortfolioActions } from "@/components/portfolio/portfolio-actions"
import { RefreshQuotesButton } from "@/components/portfolio/refresh-quotes-button"
import { getPortfolios } from "@/lib/actions/portfolio"
import { getHoldings, type HoldingWithComputed } from "@/lib/actions/holding"
import { buildPriceMap, getQuoteStaleness } from "@/lib/quote-cache"
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

  // Get holding symbols first (without prices) to build price map
  const rawHoldingsResult = await getHoldings(portfolio.id)

  if (!rawHoldingsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio — {portfolio.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Error loading holdings: {rawHoldingsResult.error}</p>
        </CardContent>
      </Card>
    )
  }

  const symbols = rawHoldingsResult.data.map((h) => h.symbol)

  // Build price map from cached quotes and re-fetch holdings with prices
  const currentPrices = buildPriceMap(symbols)
  const holdingsResult = await getHoldings(portfolio.id, currentPrices)

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

  // Get staleness info for warning indicators
  const staleness = getQuoteStaleness(symbols)

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

  // Check if any quotes are stale or missing
  const hasStaleQuotes = symbols.some((s) => {
    const info = staleness[s]
    return !info || info.isStale
  })

  // Build table rows
  const holdingRows: HoldingRow[] = holdings.map((h) => {
    const concPercent = concentrationMap.get(h.symbol) ?? 0
    const quoteInfo = staleness[h.symbol]
    return {
      symbol: h.symbol,
      quantity: h.quantity,
      avgCostBasis: h.avgCostBasis,
      currentValue: h.currentValue,
      gainLoss: h.gainLoss,
      gainLossPercent: h.gainLossPercent,
      concentrationPercent: concPercent,
      concentrationRisk: getHoldingConcentrationRisk(concPercent),
      quoteStale: quoteInfo ? quoteInfo.isStale : undefined,
      quoteMissing: !quoteInfo,
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
        <div className="flex items-center gap-2">
          <RefreshQuotesButton symbols={symbols} />
          <PortfolioActions portfolioId={portfolio.id} />
        </div>
      </div>

      {hasStaleQuotes && (
        <div
          className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2"
          data-testid="stale-quotes-warning"
        >
          ⚠ Some quotes are missing or stale. Click &quot;Refresh Quotes&quot; to update prices.
        </div>
      )}

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
