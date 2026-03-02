import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getExecutionLogs } from "@/lib/actions/execution-log"
import { ExecutionLogClient } from "@/components/execution-log/execution-log-client"

export default async function ExecutionLogPage() {
  const result = await getExecutionLogs()

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Execution Log</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading execution logs: {result.error}</p>
        </CardContent>
      </Card>
    )
  }

  // Serialize dates to ISO strings for client components
  const logs = result.data.map((log) => ({
    id: log.id,
    symbol: log.symbol,
    type: log.type,
    quantity: log.quantity,
    price: log.price,
    tobTaxRate: log.tobTaxRate,
    tobTaxAmount: log.tobTaxAmount,
    executedAt: log.executedAt.toISOString(),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution Log</CardTitle>
        <p className="text-muted-foreground">
          Track executed trades and TOB tax calculations for Belgian tax compliance.
        </p>
      </CardHeader>
      <CardContent>
        <ExecutionLogClient logs={logs} />
      </CardContent>
    </Card>
  )
}
