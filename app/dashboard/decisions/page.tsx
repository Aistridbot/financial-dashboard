import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DecisionQueuePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Decision Queue</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Review and approve pending investment decisions before execution.
        </p>
      </CardContent>
    </Card>
  )
}
