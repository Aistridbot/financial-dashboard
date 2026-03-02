import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDecisions } from "@/lib/actions/decision"
import { DecisionList } from "@/components/decisions/decision-list"
import type { DecisionCardData } from "@/components/decisions/decision-card"

export default async function DecisionQueuePage() {
  const result = await getDecisions()

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Decision Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Failed to load decisions: {result.error}</p>
        </CardContent>
      </Card>
    )
  }

  // Serialize dates for client component
  const decisions: DecisionCardData[] = result.data.map((d: any) => ({
    id: d.id,
    status: d.status,
    notes: d.notes,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    decidedAt: d.decidedAt instanceof Date ? d.decidedAt.toISOString() : d.decidedAt ?? null,
    signal: {
      symbol: d.signal.symbol,
      direction: d.signal.direction,
      confidence: d.signal.confidence,
      source: d.signal.source,
      reasoning: d.signal.reasoning,
    },
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decision Queue</CardTitle>
        <p className="text-muted-foreground text-sm">
          Review and approve pending investment decisions before execution.
        </p>
      </CardHeader>
      <CardContent>
        <DecisionList decisions={decisions} />
      </CardContent>
    </Card>
  )
}
