import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignalsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Signals</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          View AI-generated trading signals and market analysis.
        </p>
      </CardContent>
    </Card>
  )
}
