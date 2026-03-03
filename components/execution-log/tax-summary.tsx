'use client';

/**
 * Tax summary card component.
 *
 * Displays year-to-date TOB tax summary:
 * - Total TOB tax paid (YTD)
 * - Number of executions
 * - Total traded volume
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface TaxSummaryData {
  totalTobTax: number
  executionCount: number
  totalVolume: number
  year: number
}

/**
 * Calculate tax summary from execution log entries.
 */
export function calculateTaxSummary(
  logs: Array<{
    quantity: number
    price: number
    tobTaxAmount: number
    executedAt: string
  }>,
  year?: number
): TaxSummaryData {
  const targetYear = year ?? new Date().getFullYear()

  const ytdLogs = logs.filter((log) => {
    const logYear = new Date(log.executedAt).getFullYear()
    return logYear === targetYear
  })

  const totalTobTax = ytdLogs.reduce((sum, log) => sum + log.tobTaxAmount, 0)
  const totalVolume = ytdLogs.reduce((sum, log) => sum + log.quantity * log.price, 0)

  return {
    totalTobTax: Math.round(totalTobTax * 100) / 100,
    executionCount: ytdLogs.length,
    totalVolume: Math.round(totalVolume * 100) / 100,
    year: targetYear,
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-BE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

interface TaxSummaryProps {
  summary: TaxSummaryData
}

export function TaxSummary({ summary }: TaxSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            YTD TOB Tax ({summary.year})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold" data-testid="total-tob-tax">
            {formatCurrency(summary.totalTobTax)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Executions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold" data-testid="execution-count">
            {summary.executionCount}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Traded Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold" data-testid="total-volume">
            {formatCurrency(summary.totalVolume)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
