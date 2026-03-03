'use client';

/**
 * Signal filter controls.
 *
 * Provides:
 * - Direction dropdown: ALL, BUY, SELL, HOLD
 * - Confidence minimum input (0-100)
 */

export interface SignalFilterValues {
  direction: string // '' (all) | 'BUY' | 'SELL' | 'HOLD'
  minConfidence: number // 0-100
}

interface SignalFiltersProps {
  filters: SignalFilterValues
  onFiltersChange: (filters: SignalFilterValues) => void
}

export const DIRECTION_OPTIONS = [
  { value: '', label: 'All Directions' },
  { value: 'BUY', label: 'BUY' },
  { value: 'SELL', label: 'SELL' },
  { value: 'HOLD', label: 'HOLD' },
]

export function validateConfidenceInput(value: string): number {
  const num = parseInt(value, 10)
  if (isNaN(num)) return 0
  if (num < 0) return 0
  if (num > 100) return 100
  return num
}

export function SignalFilters({ filters, onFiltersChange }: SignalFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 items-end mb-6" data-testid="signal-filters">
      {/* Direction filter */}
      <div className="space-y-1">
        <label htmlFor="direction-filter" className="text-sm font-medium">
          Direction
        </label>
        <select
          id="direction-filter"
          value={filters.direction}
          onChange={(e) => onFiltersChange({ ...filters, direction: e.target.value })}
          className="flex h-9 w-[160px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {DIRECTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Confidence threshold */}
      <div className="space-y-1">
        <label htmlFor="confidence-filter" className="text-sm font-medium">
          Min Confidence (%)
        </label>
        <input
          id="confidence-filter"
          type="number"
          min={0}
          max={100}
          value={filters.minConfidence}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              minConfidence: validateConfidenceInput(e.target.value),
            })
          }
          className="flex h-9 w-[120px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    </div>
  )
}
