'use client';

/**
 * Decision list component.
 *
 * Renders a filterable list of decision cards with status tabs.
 * Manages approve/reject/execute interactions via the decision detail dialog.
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { DecisionCard, type DecisionCardData } from './decision-card'
import { DecisionDetailDialog, type DecisionAction } from './decision-detail-dialog'
import { approveDecision, rejectDecision, executeDecision } from '@/lib/actions/decision'

export const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXECUTED', label: 'Executed' },
]

export function filterByStatus(decisions: DecisionCardData[], status: string): DecisionCardData[] {
  if (!status) return decisions
  return decisions.filter((d) => d.status === status)
}

interface DecisionListProps {
  decisions: DecisionCardData[]
}

export function DecisionList({ decisions }: DecisionListProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<DecisionAction | null>(null)
  const [dialogDecisionId, setDialogDecisionId] = useState<string | null>(null)
  const [dialogSymbol, setDialogSymbol] = useState<string | undefined>(undefined)

  const filteredDecisions = useMemo(
    () => filterByStatus(decisions, activeTab),
    [decisions, activeTab]
  )

  function openDialog(id: string, action: DecisionAction) {
    const decision = decisions.find((d) => d.id === id)
    setDialogDecisionId(id)
    setDialogAction(action)
    setDialogSymbol(decision?.signal.symbol)
    setDialogOpen(true)
  }

  async function handleDialogConfirm(id: string, action: DecisionAction, notes: string) {
    setIsLoading(true)
    try {
      const result = action === 'approve'
        ? await approveDecision(id, notes || undefined)
        : await rejectDecision(id, notes || undefined)

      if (!result.success) {
        alert(result.error)
      } else {
        setDialogOpen(false)
        router.refresh()
      }
    } catch {
      alert(`Failed to ${action} decision`)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleExecute(id: string) {
    setIsLoading(true)
    try {
      const result = await executeDecision(id)
      if (!result.success) {
        alert(result.error)
      } else {
        router.refresh()
      }
    } catch {
      alert('Failed to execute decision')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div data-testid="decision-list">
      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6" data-testid="status-tabs" role="tablist">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            data-testid={`tab-${tab.value || 'all'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Decision cards */}
      {filteredDecisions.length === 0 ? (
        <p className="text-muted-foreground text-center py-8" data-testid="empty-message">
          No decisions match the current filter.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDecisions.map((decision) => (
            <DecisionCard
              key={decision.id}
              decision={decision}
              onApprove={(id) => openDialog(id, 'approve')}
              onReject={(id) => openDialog(id, 'reject')}
              onExecute={handleExecute}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-4">
        Showing {filteredDecisions.length} of {decisions.length} decisions
      </p>

      {/* Approve/Reject dialog */}
      <DecisionDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={dialogAction}
        decisionId={dialogDecisionId}
        symbol={dialogSymbol}
        onConfirm={handleDialogConfirm}
        isLoading={isLoading}
      />
    </div>
  )
}
