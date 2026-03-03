'use client';

/**
 * Decision card component.
 *
 * Displays a single decision queue item with:
 * - Linked signal info (symbol, direction, confidence)
 * - Status badge (color-coded)
 * - Conditional action buttons based on status:
 *   - PENDING: Approve / Reject
 *   - APPROVED: Execute
 *   - REJECTED / EXECUTED: no buttons
 * - Notes (if any)
 * - Timestamps (created, decided)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export interface DecisionSignalData {
  symbol: string
  direction: string
  confidence: number
  source: string
  reasoning: string | null
}

export interface DecisionCardData {
  id: string
  status: string // PENDING | APPROVED | REJECTED | EXECUTED
  notes: string | null
  createdAt: string // ISO date
  decidedAt: string | null // ISO date
  signal: DecisionSignalData
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'PENDING': return 'bg-yellow-500 hover:bg-yellow-600 text-white'
    case 'APPROVED': return 'bg-green-500 hover:bg-green-600 text-white'
    case 'REJECTED': return 'bg-red-500 hover:bg-red-600 text-white'
    case 'EXECUTED': return 'bg-blue-500 hover:bg-blue-600 text-white'
    default: return 'bg-gray-300 text-gray-700'
  }
}

export function getDirectionBadgeColor(direction: string): string {
  switch (direction) {
    case 'BUY': return 'bg-green-500 hover:bg-green-600 text-white'
    case 'SELL': return 'bg-red-500 hover:bg-red-600 text-white'
    case 'HOLD': return 'bg-gray-400 hover:bg-gray-500 text-white'
    default: return 'bg-gray-300 text-gray-700'
  }
}

export function formatDecisionDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface DecisionCardProps {
  decision: DecisionCardData
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onExecute?: (id: string) => void
  isLoading?: boolean
}

export function DecisionCard({ decision, onApprove, onReject, onExecute, isLoading }: DecisionCardProps) {
  const confidencePercent = Math.round(decision.signal.confidence * 100)
  const isPending = decision.status === 'PENDING'
  const isApproved = decision.status === 'APPROVED'

  return (
    <Card data-testid={`decision-card-${decision.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">{decision.signal.symbol}</CardTitle>
          <div className="flex gap-2">
            <Badge className={getDirectionBadgeColor(decision.signal.direction)}>
              {decision.signal.direction}
            </Badge>
            <Badge className={getStatusBadgeColor(decision.status)}>
              {decision.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Confidence */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-medium">{confidencePercent}%</span>
        </div>

        {/* Signal reasoning */}
        {decision.signal.reasoning && (
          <p className="text-sm text-muted-foreground">{decision.signal.reasoning}</p>
        )}

        {/* Source */}
        <div className="text-xs text-muted-foreground">
          Source: {decision.signal.source}
        </div>

        {/* Notes */}
        {decision.notes && (
          <div className="text-sm border-l-2 border-muted pl-3">
            <span className="font-medium">Notes:</span> {decision.notes}
          </div>
        )}

        {/* Dates */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Created: {formatDecisionDate(decision.createdAt)}</span>
          <span>Decided: {formatDecisionDate(decision.decidedAt)}</span>
        </div>

        {/* Action buttons — conditional on status */}
        {isPending && (
          <div className="flex gap-2" data-testid="pending-actions">
            <Button
              variant="default"
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => onApprove?.(decision.id)}
              disabled={isLoading}
              data-testid="approve-btn"
            >
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => onReject?.(decision.id)}
              disabled={isLoading}
              data-testid="reject-btn"
            >
              Reject
            </Button>
          </div>
        )}

        {isApproved && (
          <div data-testid="approved-actions">
            <Button
              variant="default"
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => onExecute?.(decision.id)}
              disabled={isLoading}
              data-testid="execute-btn"
            >
              Execute
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
