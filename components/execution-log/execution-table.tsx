'use client';

/**
 * Execution log table component.
 *
 * Displays executed trades with columns:
 * - Date, Symbol, Type (BUY/SELL), Quantity, Price, Total, TOB Tax Rate, TOB Tax Amount
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

export interface ExecutionLogRow {
  id: string
  symbol: string
  type: string // BUY | SELL
  quantity: number
  price: number
  tobTaxRate: number
  tobTaxAmount: number
  executedAt: string // ISO date
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-BE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-BE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function getTypeBadgeColor(type: string): string {
  switch (type) {
    case 'BUY': return 'bg-green-500 hover:bg-green-600 text-white'
    case 'SELL': return 'bg-red-500 hover:bg-red-600 text-white'
    default: return 'bg-gray-300 text-gray-700'
  }
}

interface ExecutionTableProps {
  logs: ExecutionLogRow[]
}

export function ExecutionTable({ logs }: ExecutionTableProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground" data-testid="empty-state">
        No executed trades found.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">TOB Rate</TableHead>
            <TableHead className="text-right">TOB Tax</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const total = log.quantity * log.price
            return (
              <TableRow key={log.id} data-testid={`execution-row-${log.id}`}>
                <TableCell>{formatDate(log.executedAt)}</TableCell>
                <TableCell className="font-medium">{log.symbol}</TableCell>
                <TableCell>
                  <Badge className={getTypeBadgeColor(log.type)}>
                    {log.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{log.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(log.price)}</TableCell>
                <TableCell className="text-right">{formatCurrency(total)}</TableCell>
                <TableCell className="text-right">{formatPercentage(log.tobTaxRate)}</TableCell>
                <TableCell className="text-right">{formatCurrency(log.tobTaxAmount)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
