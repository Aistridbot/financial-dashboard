"use client"

/**
 * CSV Upload component.
 *
 * Client component that accepts a CSV file, reads it,
 * calls the importTransactions server action, and displays results.
 */

import { useState, useRef, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { importTransactions, type ImportResult } from "@/lib/actions/import"

export interface CsvUploadProps {
  portfolioId: string
  onSuccess?: () => void
}

export function CsvUpload({ portfolioId, onSuccess }: CsvUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setError("Please select a CSV file.")
      setResult(null)
      return
    }

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const csvString = await file.text()

      if (!csvString.trim()) {
        setError("The CSV file is empty.")
        setUploading(false)
        return
      }

      const importResult = await importTransactions(portfolioId, csvString)

      if (importResult.success) {
        setResult(importResult.data)
        if (importResult.data.imported > 0) {
          onSuccess?.()
        }
      } else {
        setError(importResult.error)
      }
    } catch (err) {
      setError(`Upload failed: ${String(err)}`)
    } finally {
      setUploading(false)
      // Reset file input so the same file can be re-uploaded
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const totalErrors = (result?.errors?.length ?? 0) + (result?.transactionErrors?.length ?? 0)

  return (
    <div className="space-y-4" data-testid="csv-upload">
      <div className="space-y-2">
        <Label htmlFor="csv-file">Upload CSV</Label>
        <Input
          id="csv-file"
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <p className="text-xs text-muted-foreground">
          CSV format: symbol, type (BUY/SELL), quantity, price, date (YYYY-MM-DD), fees (optional)
        </p>
      </div>

      {uploading && (
        <p className="text-sm text-muted-foreground" role="status">
          Importing transactions…
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert" data-testid="csv-error">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-2" data-testid="csv-result">
          <p className="text-sm text-green-600" data-testid="csv-success-count">
            Successfully imported {result.imported} transaction{result.imported !== 1 ? "s" : ""}.
          </p>

          {totalErrors > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-600" data-testid="csv-error-count">
                {totalErrors} error{totalErrors !== 1 ? "s" : ""} encountered:
              </p>
              <ul className="text-sm text-red-600 list-disc list-inside" data-testid="csv-error-list">
                {result.errors.map((err, i) => (
                  <li key={`parse-${i}`}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
                {result.transactionErrors.map((err, i) => (
                  <li key={`txn-${i}`}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
