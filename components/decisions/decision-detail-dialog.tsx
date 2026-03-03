'use client';

/**
 * Decision detail dialog component.
 *
 * Allows users to add notes when approving or rejecting a decision.
 * Uses shadcn/ui Dialog for the modal overlay.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export type DecisionAction = 'approve' | 'reject'

interface DecisionDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: DecisionAction | null
  decisionId: string | null
  symbol?: string
  onConfirm: (id: string, action: DecisionAction, notes: string) => void
  isLoading?: boolean
}

export function getActionTitle(action: DecisionAction | null): string {
  if (action === 'approve') return 'Approve Decision'
  if (action === 'reject') return 'Reject Decision'
  return 'Decision'
}

export function getActionDescription(action: DecisionAction | null, symbol?: string): string {
  const sym = symbol || 'this signal'
  if (action === 'approve') return `Approve the decision for ${sym}. Add optional notes below.`
  if (action === 'reject') return `Reject the decision for ${sym}. Add optional notes below.`
  return ''
}

export function DecisionDetailDialog({
  open,
  onOpenChange,
  action,
  decisionId,
  symbol,
  onConfirm,
  isLoading,
}: DecisionDetailDialogProps) {
  const [notes, setNotes] = useState('')

  function handleConfirm() {
    if (!decisionId || !action) return
    onConfirm(decisionId, action, notes)
    setNotes('')
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) setNotes('')
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="decision-detail-dialog">
        <DialogHeader>
          <DialogTitle>{getActionTitle(action)}</DialogTitle>
          <DialogDescription>
            {getActionDescription(action, symbol)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="decision-notes">Notes (optional)</Label>
          <textarea
            id="decision-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add your reasoning..."
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-testid="decision-notes-input"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={action === 'reject' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isLoading}
            data-testid="dialog-confirm-btn"
          >
            {isLoading ? 'Processing...' : action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
