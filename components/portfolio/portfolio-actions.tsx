"use client"

/**
 * Portfolio Actions component.
 *
 * Client component wrapper that contains the Add Transaction form
 * and CSV Upload, with Dialog-based UI. Triggers page refresh on success
 * via Next.js router.refresh().
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AddTransactionForm } from "@/components/portfolio/add-transaction-form"
import { CsvUpload } from "@/components/portfolio/csv-upload"

export interface PortfolioActionsProps {
  portfolioId: string
}

export function PortfolioActions({ portfolioId }: PortfolioActionsProps) {
  const router = useRouter()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)

  function handleTransactionSuccess() {
    router.refresh()
    setAddDialogOpen(false)
  }

  function handleCsvSuccess() {
    router.refresh()
    setCsvDialogOpen(false)
  }

  return (
    <div className="flex gap-2" data-testid="portfolio-actions">
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="default" size="sm">
            Add Transaction
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <AddTransactionForm
            portfolioId={portfolioId}
            onSuccess={handleTransactionSuccess}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Import CSV
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Transactions from CSV</DialogTitle>
          </DialogHeader>
          <CsvUpload
            portfolioId={portfolioId}
            onSuccess={handleCsvSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
