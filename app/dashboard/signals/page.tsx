/**
 * Signals tab page.
 *
 * Server component that fetches signals and passes them to the client-side SignalList.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SignalList } from "@/components/signals/signal-list"
import { getSignals } from "@/lib/actions/signal"
import type { SignalCardData } from "@/components/signals/signal-card"

export default async function SignalsPage() {
  const result = await getSignals()

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signals</CardTitle>
        <p className="text-muted-foreground text-sm">
          View AI-generated trading signals and market analysis.
        </p>
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
