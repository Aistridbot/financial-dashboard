"use client"

/**
 * Add Transaction Form component.
 *
 * Client component with form fields for manually adding a transaction:
 * symbol, type (BUY/SELL), quantity, price, date, fees.
 * Validates client-side before calling the createTransaction server action.
 */

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createTransaction } from "@/lib/actions/transaction"

export interface AddTransactionFormProps {
  portfolioId: string
  onSuccess?: () => void
}

export interface FormErrors {
  symbol?: string
  type?: string
  quantity?: string
  price?: string
  date?: string
  fees?: string
}

/**
 * Validate form fields client-side.
 * Returns an object with field-level errors, or empty object if valid.
 */
export function validateTransactionForm(fields: {
  symbol: string
  type: string
  quantity: string
  price: string
  date: string
  fees: string
}): FormErrors {
  const errors: FormErrors = {}

  if (!fields.symbol.trim()) {
    errors.symbol = "Symbol is required"
  }

  if (!fields.type || (fields.type !== "BUY" && fields.type !== "SELL")) {
    errors.type = "Transaction type is required"
  }

  const qty = parseFloat(fields.quantity)
  if (!fields.quantity || isNaN(qty) || qty <= 0) {
    errors.quantity = "Quantity must be a positive number"
  }

  const price = parseFloat(fields.price)
  if (fields.price === "" || isNaN(price) || price < 0) {
    errors.price = "Price must be a non-negative number"
  }

  if (!fields.date) {
    errors.date = "Date is required"
  }

  if (fields.fees !== "") {
    const feesNum = parseFloat(fields.fees)
    if (isNaN(feesNum) || feesNum < 0) {
      errors.fees = "Fees must be a non-negative number"
    }
  }

  return errors
}

export function AddTransactionForm({ portfolioId, onSuccess }: AddTransactionFormProps) {
  const [symbol, setSymbol] = useState("")
  const [type, setType] = useState<string>("")
  const [quantity, setQuantity] = useState("")
  const [price, setPrice] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [fees, setFees] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(false)

    // Client-side validation
    const validationErrors = validateTransactionForm({
      symbol, type, quantity, price, date, fees,
    })
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      const result = await createTransaction({
        portfolioId,
        symbol: symbol.trim().toUpperCase(),
        type: type as "BUY" | "SELL",
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        fees: fees ? parseFloat(fees) : undefined,
        occurredAt: new Date(date),
      })

      if (result.success) {
        setSubmitSuccess(true)
        // Reset form
        setSymbol("")
        setType("")
        setQuantity("")
        setPrice("")
        setDate(new Date().toISOString().split("T")[0])
        setFees("")
        setErrors({})
        onSuccess?.()
      } else {
        setSubmitError(result.error)
      }
    } catch (err) {
      setSubmitError(`Unexpected error: ${String(err)}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="add-transaction-form">
      <div className="grid grid-cols-2 gap-4">
        {/* Symbol */}
        <div className="space-y-2">
          <Label htmlFor="txn-symbol">Symbol</Label>
          <Input
            id="txn-symbol"
            placeholder="e.g. AAPL"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            aria-invalid={!!errors.symbol}
          />
          {errors.symbol && (
            <p className="text-sm text-red-600" role="alert">{errors.symbol}</p>
          )}
        </div>

        {/* Type */}
        <div className="space-y-2">
          <Label htmlFor="txn-type">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="txn-type" aria-invalid={!!errors.type}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUY">BUY</SelectItem>
              <SelectItem value="SELL">SELL</SelectItem>
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-sm text-red-600" role="alert">{errors.type}</p>
          )}
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="txn-quantity">Quantity</Label>
          <Input
            id="txn-quantity"
            type="number"
            step="any"
            min="0"
            placeholder="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-invalid={!!errors.quantity}
          />
          {errors.quantity && (
            <p className="text-sm text-red-600" role="alert">{errors.quantity}</p>
          )}
        </div>

        {/* Price */}
        <div className="space-y-2">
          <Label htmlFor="txn-price">Price</Label>
          <Input
            id="txn-price"
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-invalid={!!errors.price}
          />
          {errors.price && (
            <p className="text-sm text-red-600" role="alert">{errors.price}</p>
          )}
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="txn-date">Date</Label>
          <Input
            id="txn-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={!!errors.date}
          />
          {errors.date && (
            <p className="text-sm text-red-600" role="alert">{errors.date}</p>
          )}
        </div>

        {/* Fees */}
        <div className="space-y-2">
          <Label htmlFor="txn-fees">Fees (optional)</Label>
          <Input
            id="txn-fees"
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            value={fees}
            onChange={(e) => setFees(e.target.value)}
            aria-invalid={!!errors.fees}
          />
          {errors.fees && (
            <p className="text-sm text-red-600" role="alert">{errors.fees}</p>
          )}
        </div>
      </div>

      {submitError && (
        <p className="text-sm text-red-600" role="alert" data-testid="submit-error">
          {submitError}
        </p>
      )}

      {submitSuccess && (
        <p className="text-sm text-green-600" role="status" data-testid="submit-success">
          Transaction added successfully.
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Adding..." : "Add Transaction"}
      </Button>
    </form>
  )
}
