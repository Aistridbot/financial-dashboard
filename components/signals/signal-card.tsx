'use client';

/**
 * Signal card component.
 *
 * Displays a single AI trading signal with:
 * - Symbol and direction badge (color-coded: green BUY, red SELL, gray HOLD)
 * - Confidence bar (0-100%)
 * - Reasoning text
 * - Created date and expiry date
 * - "Send to Decision Queue" button
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export interface SignalCardData {
  id: string
  symbol: string
  direction: string // BUY | SELL | HOLD
  confidence: number // 0.0 to 1.0
  source: string
  reasoning: string | null
  createdAt: string // ISO date string
  expiresAt: string | null // ISO date string
}

export function getDirectionBadgeColor(direction: string): string {
  switch (direction) {
    case 'BUY': return 'bg-green-500 hover:bg-green-600 text-white'
    case 'SELL': return 'bg-red-500 hover:bg-red-600 text-white'
    case 'HOLD': return 'bg-gray-400 hover:bg-gray-500 text-white'
    default: return 'bg-gray-300 text-gray-700'
  }
}

export function formatSignalDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface SignalCardProps {
  signal: SignalCardData
  onSendToQueue?: (signalId: string) => void
  isSending?: boolean
}

export function SignalCard({ signal, onSendToQueue, isSending }: SignalCardProps) {
  const confidencePercent = Math.round(signal.confidence * 100)

  return (
    <Card data-testid={`signal-card-${signal.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">{signal.symbol}</CardTitle>
          <Badge className={getDirectionBadgeColor(signal.direction)}>
            {signal.direction}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Confidence bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-medium">{confidencePercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={confidencePercent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>

        {/* Reasoning */}
        {signal.reasoning && (
          <p className="text-sm text-muted-foreground">{signal.reasoning}</p>
        )}

        {/* Dates */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Created: {formatSignalDate(signal.createdAt)}</span>
          <span>Expires: {formatSignalDate(signal.expiresAt)}</span>
        </div>

        {/* Source */}
        <div className="text-xs text-muted-foreground">
          Source: {signal.source}
        </div>

        {/* Send to Decision Queue button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onSendToQueue?.(signal.id)}
          disabled={isSending}
        >
          {isSending ? 'Sending...' : 'Send to Decision Queue'}
        </Button>
      </CardContent>
    </Card>
  )
}
