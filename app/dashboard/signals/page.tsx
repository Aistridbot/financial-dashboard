/**
 * Signals tab page.
 *
 * Server component that fetches signals and passes them to the client-side SignalList.
 * Includes a Generate Signals button that triggers portfolio analysis.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SignalList } from "@/components/signals/signal-list"
import { GenerateSignalsButton } from "@/components/signals/generate-signals-button"
import { getSignals } from "@/lib/actions/signal"
import { getPortfolios } from "@/lib/actions/portfolio"
import type { SignalCardData } from "@/components/signals/signal-card"

export default async function SignalsPage() {
  const result = await getSignals()
  const portfoliosResult = await getPortfolios()

  const signals: SignalCardData[] = result.success
    ? result.data.map((s) => ({
        id: s.id,
        symbol: s.symbol,
        direction: s.direction,
        confidence: s.confidence,
        source: s.source,
        reasoning: s.reasoning,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt?.toISOString() ?? null,
      }))
    : []

  // Use first portfolio as default for signal generation
  const defaultPortfolioId = portfoliosResult.success && portfoliosResult.data.length > 0
    ? portfoliosResult.data[0].id
    : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Signals</CardTitle>
            <p className="text-muted-foreground text-sm">
              View AI-generated trading signals and market analysis.
            </p>
          </div>
          {defaultPortfolioId && (
            <GenerateSignalsButton portfolioId={defaultPortfolioId} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!result.success && (
          <p className="text-red-500 mb-4">Error loading signals: {result.error}</p>
        )}
        <SignalList signals={signals} />
      </CardContent>
    </Card>
  )
}
