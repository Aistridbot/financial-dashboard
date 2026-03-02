'use client';

/**
 * Execution log filters component.
 *
 * Provides:
 * - Date range filter (from/to)
 * - Symbol search input
 */

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export interface ExecutionFilterValues {
  symbol: string
  fromDate: string
  toDate: string
}

interface ExecutionFiltersProps {
  onFilter: (filters: ExecutionFilterValues) => void
}

export function ExecutionFilters({ onFilter }: ExecutionFiltersProps) {
  const [symbol, setSymbol] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  function handleApply() {
    onFilter({ symbol, fromDate, toDate })
  }

  function handleClear() {
    setSymbol('')
    setFromDate('')
    setToDate('')
    onFilter({ symbol: '', fromDate: '', toDate: '' })
  }

  return (
    <div className="flex flex-wrap gap-4 mb-6 items-end">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="symbol-filter">Symbol</Label>
        <Input
          id="symbol-filter"
          placeholder="Search symbol..."
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="from-date">From Date</Label>
        <Input
          id="from-date"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="to-date">To Date</Label>
        <Input
          id="to-date"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="w-40"
        />
      </div>

      <Button onClick={handleApply} variant="default" size="sm">
        Apply
      </Button>
      <Button onClick={handleClear} variant="outline" size="sm">
        Clear
      </Button>
    </div>
  )
}

/**
 * Apply client-side filters to execution log entries.
 * Used for instant filtering without server round-trips.
 */
export function applyFilters<T extends { symbol: string; executedAt: string }>(
  logs: T[],
  filters: ExecutionFilterValues
): T[] {
  let filtered = logs

  if (filters.symbol.trim()) {
    const searchTerm = filters.symbol.trim().toUpperCase()
    filtered = filtered.filter((log) =>
      log.symbol.toUpperCase().includes(searchTerm)
    )
  }

  if (filters.fromDate) {
    const from = new Date(filters.fromDate)
    filtered = filtered.filter((log) => new Date(log.executedAt) >= from)
  }

  if (filters.toDate) {
    const to = new Date(filters.toDate)
    to.setHours(23, 59, 59, 999)
    filtered = filtered.filter((log) => new Date(log.executedAt) <= to)
  }

  return filtered
}
