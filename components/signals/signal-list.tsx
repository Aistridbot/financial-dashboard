'use client';

/**
 * Signal list component.
 *
 * Renders a filterable list of signal cards.
 * Manages filter state and "Send to Decision Queue" interactions.
 */

import { useState, useMemo } from 'react'
import { SignalCard, type SignalCardData } from './signal-card'
import { SignalFilters, type SignalFilterValues } from './signal-filters'
import { sendToDecisionQueue } from '@/lib/actions/decision-queue'

interface SignalListProps {
  signals: SignalCardData[]
}

export function applySignalFilters(
  signals: SignalCardData[],
  filters: SignalFilterValues
): SignalCardData[] {
  return signals.filter((s) => {
    if (filters.direction && s.direction !== filters.direction) return false
    if (s.confidence * 100 < filters.minConfidence) return false
    return true
  })
}

export function SignalList({ signals }: SignalListProps) {
  const [filters, setFilters] = useState<SignalFilterValues>({
    direction: '',
    minConfidence: 0,
  })
  const [sendingId, setSendingId] = useState<string | null>(null)

  const filteredSignals = useMemo(
    () => applySignalFilters(signals, filters),
    [signals, filters]
  )

  async function handleSendToQueue(signalId: string) {
    setSendingId(signalId)
    try {
      const result = await sendToDecisionQueue(signalId)
      if (!result.success) {
        alert(result.error)
      }
    } catch {
      alert('Failed to send to decision queue')
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div data-testid="signal-list">
      <SignalFilters filters={filters} onFiltersChange={setFilters} />

      {filteredSignals.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No signals match the current filters.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSignals.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onSendToQueue={handleSendToQueue}
              isSending={sendingId === signal.id}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-4">
        Showing {filteredSignals.length} of {signals.length} signals
      </p>
    </div>
  )
}
