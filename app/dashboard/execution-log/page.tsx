import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ExecutionLogPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution Log</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Track executed trades and TOB tax calculations for Belgian tax compliance.
        </p>
      </CardContent>
    </Card>
  )
}
