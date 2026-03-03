'use client';

/**
 * Client wrapper for execution log tab.
 *
 * Manages filter state and passes filtered data to child components.
 */

import { useState, useMemo } from 'react'
import { ExecutionTable, type ExecutionLogRow } from './execution-table'
import { TaxSummary, calculateTaxSummary } from './tax-summary'
import { ExecutionFilters, applyFilters, type ExecutionFilterValues } from './execution-filters'

interface ExecutionLogClientProps {
  logs: ExecutionLogRow[]
}

export function ExecutionLogClient({ logs }: ExecutionLogClientProps) {
  const [filters, setFilters] = useState<ExecutionFilterValues>({
    symbol: '',
    fromDate: '',
    toDate: '',
  })

  const filteredLogs = useMemo(() => applyFilters(logs, filters), [logs, filters])

  // Tax summary always computed on ALL logs (YTD, not filtered)
  const taxSummary = useMemo(() => calculateTaxSummary(logs), [logs])

  return (
    <div>
      <TaxSummary summary={taxSummary} />
      <ExecutionFilters onFilter={setFilters} />
      <ExecutionTable logs={filteredLogs} />
    </div>
  )
}
