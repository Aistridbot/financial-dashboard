/**
 * Holdings table component.
 *
 * Displays portfolio holdings in a table with:
 * - Symbol, quantity, average cost, current value, gain/loss, concentration %
 * - Color-coded concentration risk badge per holding
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { ConcentrationRisk } from "@/lib/risk"

export interface HoldingRow {
  symbol: string
  quantity: number
  avgCostBasis: number
  currentValue: number | null
  gainLoss: number | null
  gainLossPercent: number | null
  concentrationPercent: number
  concentrationRisk: ConcentrationRisk
}

export interface HoldingsTableProps {
  holdings: HoldingRow[]
}

function formatCurrency(value: number | null): string {
  if (value == null) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number | null): string {
  if (value == null) return "—"
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
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

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground" data-testid="holdings-empty">
        No holdings yet. Add transactions to see your portfolio.
      </div>
    )
  }

  return (
    <div className="rounded-md border" data-testid="holdings-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Avg Cost</TableHead>
            <TableHead className="text-right">Current Value</TableHead>
            <TableHead className="text-right">Gain/Loss</TableHead>
            <TableHead className="text-right">Concentration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((holding) => {
            const gainLossColor =
              holding.gainLoss != null
                ? holding.gainLoss >= 0
                  ? "text-green-600"
                  : "text-red-600"
                : ""

            return (
              <TableRow key={holding.symbol} data-testid={`holding-row-${holding.symbol}`}>
                <TableCell className="font-medium">{holding.symbol}</TableCell>
                <TableCell className="text-right">{holding.quantity.toFixed(2)}</TableCell>
                <TableCell className="text-right">{formatCurrency(holding.avgCostBasis)}</TableCell>
                <TableCell className="text-right">{formatCurrency(holding.currentValue)}</TableCell>
                <TableCell className={`text-right ${gainLossColor}`}>
                  <div>
                    {formatCurrency(holding.gainLoss)}
                    {holding.gainLossPercent != null && (
                      <span className="text-xs ml-1">
                        ({formatPercent(holding.gainLossPercent)})
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span>{holding.concentrationPercent.toFixed(1)}%</span>
                    <Badge
                      className={getRiskBadgeColor(holding.concentrationRisk)}
                      data-testid={`risk-badge-${holding.symbol}`}
                    >
                      {holding.concentrationRisk}
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
