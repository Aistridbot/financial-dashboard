/**
 * Tests for US-010: Portfolio tab — add transaction form and CSV upload.
 *
 * Tests cover:
 * - validateTransactionForm pure function (client-side validation)
 * - Component file existence and exports
 * - Integration with portfolio page
 */

import { describe, it } from "node:test"
import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as path from "node:path"

const ROOT = path.resolve(__dirname, "..")

// ─── File existence ─────────────────────────────────────────────────────

describe("US-010: File structure", () => {
  const requiredFiles = [
    "components/portfolio/add-transaction-form.tsx",
    "components/portfolio/csv-upload.tsx",
    "components/portfolio/portfolio-actions.tsx",
    "components/ui/select.tsx",
    "components/ui/dialog.tsx",
    "components/ui/label.tsx",
  ]

  for (const file of requiredFiles) {
    it(`${file} exists`, () => {
      assert.ok(fs.existsSync(path.join(ROOT, file)), `Missing: ${file}`)
    })
  }
})

// ─── AddTransactionForm component ───────────────────────────────────────

describe("US-010: AddTransactionForm component structure", () => {
  const filePath = path.join(ROOT, "components/portfolio/add-transaction-form.tsx")
  let content: string

  it("file loads", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.length > 0)
  })

  it("is a client component", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes('"use client"'))
  })

  it("exports AddTransactionForm", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("export function AddTransactionForm"))
  })

  it("exports validateTransactionForm", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("export function validateTransactionForm"))
  })

  it("exports FormErrors interface", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("export interface FormErrors"))
  })

  it("has symbol field", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes('id="txn-symbol"'))
  })

  it("has type field (Select)", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes('id="txn-type"'))
    assert.ok(content.includes("SelectItem"))
  })

  it("has quantity field", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes('id="txn-quantity"'))
  })

  it("has price field", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes('id="txn-price"'))
  })

  it("has date field", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes('id="txn-date"'))
  })

  it("has fees field", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes('id="txn-fees"'))
  })

  it("has BUY and SELL options", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes('value="BUY"'))
    assert.ok(content.includes('value="SELL"'))
  })

  it("calls createTransaction server action", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("createTransaction"))
  })

  it("has onSuccess callback prop", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("onSuccess"))
  })

  it("shows validation error messages with role=alert", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes('role="alert"'))
  })
})

// ─── validateTransactionForm (pure function) ────────────────────────────

describe("US-010: validateTransactionForm", () => {
  // Dynamic import to load the function
  let validateTransactionForm: (fields: {
    symbol: string; type: string; quantity: string;
    price: string; date: string; fees: string;
  }) => { symbol?: string; type?: string; quantity?: string; price?: string; date?: string; fees?: string }

  it("can be imported", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    validateTransactionForm = mod.validateTransactionForm
    assert.ok(typeof validateTransactionForm === "function")
  })

  it("returns empty object for valid input", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    validateTransactionForm = mod.validateTransactionForm
    const errors = validateTransactionForm({
      symbol: "AAPL", type: "BUY", quantity: "10",
      price: "150.50", date: "2024-01-15", fees: "5.00",
    })
    assert.deepStrictEqual(errors, {})
  })

  it("requires symbol", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    const errors = mod.validateTransactionForm({
      symbol: "", type: "BUY", quantity: "10",
      price: "150", date: "2024-01-15", fees: "",
    })
    assert.ok(errors.symbol)
    assert.ok(errors.symbol!.includes("required"))
  })

  it("requires symbol (whitespace only)", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    const errors = mod.validateTransactionForm({
      symbol: "   ", type: "BUY", quantity: "10",
      price: "150", date: "2024-01-15", fees: "",
    })
    assert.ok(errors.symbol)
  })

  it("requires type", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    const errors = mod.validateTransactionForm({
      symbol: "AAPL", type: "", quantity: "10",
      price: "150", date: "2024-01-15", fees: "",
    })
    assert.ok(errors.type)
  })

  it("rejects invalid type", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    const errors = mod.validateTransactionForm({
      symbol: "AAPL", type: "HOLD", quantity: "10",
      price: "150", date: "2024-01-15", fees: "",
    })
    assert.ok(errors.type)
  })

  it("requires positive quantity", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    const errors = mod.validateTransactionForm({
      symbol: "AAPL", type: "BUY", quantity: "0",
      price: "150", date: "2024-01-15", fees: "",
    })
    assert.ok(errors.quantity)
  })

  it("rejects negative quantity", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    const errors = mod.validateTransactionForm({
      symbol: "AAPL", type: "BUY", quantity: "-5",
      price: "150", date: "2024-01-15", fees: "",
    })
    assert.ok(errors.quantity)
  })

  it("rejects non-numeric quantity", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    const errors = mod.validateTransactionForm({
      symbol: "AAPL", type: "BUY", quantity: "abc",
      price: "150", date: "2024-01-15", fees: "",
    })
    assert.ok(errors.quantity)
  })

  it("requires non-negative price", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    const errors = mod.validateTransactionForm({
      symbol: "AAPL", type: "BUY", quantity: "10",
      price: "-1", date: "2024-01-15", fees: "",
    })
    assert.ok(errors.price)
  })

  it("allows zero price", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    const errors = mod.validateTransactionForm({
      symbol: "AAPL", type: "BUY", quantity: "10",
      price: "0", date: "2024-01-15", fees: "",
    })
    assert.strictEqual(errors.price, undefined)
  })

  it("requires empty price to be flagged", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    const errors = mod.validateTransactionForm({
      symbol: "AAPL", type: "BUY", quantity: "10",
      price: "", date: "2024-01-15", fees: "",
    })
    assert.ok(errors.price)
  })

  it("requires date", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    const errors = mod.validateTransactionForm({
      symbol: "AAPL", type: "BUY", quantity: "10",
      price: "150", date: "", fees: "",
    })
    assert.ok(errors.date)
  })

  it("allows empty fees", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    const errors = mod.validateTransactionForm({
      symbol: "AAPL", type: "BUY", quantity: "10",
      price: "150", date: "2024-01-15", fees: "",
    })
    assert.strictEqual(errors.fees, undefined)
  })

  it("rejects negative fees", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    const errors = mod.validateTransactionForm({
      symbol: "AAPL", type: "BUY", quantity: "10",
      price: "150", date: "2024-01-15", fees: "-3",
    })
    assert.ok(errors.fees)
  })

  it("rejects non-numeric fees", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    const errors = mod.validateTransactionForm({
      symbol: "AAPL", type: "BUY", quantity: "10",
      price: "150", date: "2024-01-15", fees: "abc",
    })
    assert.ok(errors.fees)
  })

  it("returns multiple errors at once", async () => {
    const mod = await import("../components/portfolio/add-transaction-form")
    const errors = mod.validateTransactionForm({
      symbol: "", type: "", quantity: "",
      price: "", date: "", fees: "",
    })
    assert.ok(errors.symbol)
    assert.ok(errors.type)
    assert.ok(errors.quantity)
    assert.ok(errors.price)
    assert.ok(errors.date)
    // fees is optional, so no error when empty
    assert.strictEqual(errors.fees, undefined)
  })
})

// ─── CsvUpload component ───────────────────────────────────────────────

describe("US-010: CsvUpload component structure", () => {
  const filePath = path.join(ROOT, "components/portfolio/csv-upload.tsx")
  let content: string

  it("file loads", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.length > 0)
  })

  it("is a client component", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes('"use client"'))
  })

  it("exports CsvUpload", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("export function CsvUpload"))
  })

  it("exports CsvUploadProps interface", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("export interface CsvUploadProps"))
  })

  it("has file input with CSV accept", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes('type="file"'))
    assert.ok(content.includes(".csv"))
  })

  it("calls importTransactions", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("importTransactions"))
  })

  it("displays success count", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("csv-success-count"))
    assert.ok(content.includes("imported"))
  })

  it("displays error list", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("csv-error-list"))
  })

  it("has onSuccess callback", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("onSuccess"))
  })

  it("validates file type", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes('.endsWith(".csv")') || content.includes("text/csv"))
  })

  it("shows CSV format hint", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("CSV format"))
  })
})

// ─── PortfolioActions wrapper ───────────────────────────────────────────

describe("US-010: PortfolioActions wrapper", () => {
  const filePath = path.join(ROOT, "components/portfolio/portfolio-actions.tsx")
  let content: string

  it("file loads", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.length > 0)
  })

  it("is a client component", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes('"use client"'))
  })

  it("exports PortfolioActions", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("export function PortfolioActions"))
  })

  it("uses Dialog for Add Transaction", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("Add Transaction"))
    assert.ok(content.includes("Dialog"))
  })

  it("uses Dialog for CSV Import", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("Import CSV"))
  })

  it("calls router.refresh on success", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("router.refresh()"))
  })

  it("renders AddTransactionForm", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("AddTransactionForm"))
  })

  it("renders CsvUpload", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("CsvUpload"))
  })

  it("passes portfolioId to both components", () => {
    content = fs.readFileSync(filePath, "utf-8")
    const matches = content.match(/portfolioId={portfolioId}/g)
    assert.ok(matches && matches.length >= 2, "portfolioId should be passed to both sub-components")
  })
})

// ─── Portfolio page integration ─────────────────────────────────────────

describe("US-010: Portfolio page integration", () => {
  const filePath = path.join(ROOT, "app/dashboard/portfolio/page.tsx")
  let content: string

  it("imports PortfolioActions", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("PortfolioActions"))
  })

  it("renders PortfolioActions with portfolioId", () => {
    content = fs.readFileSync(filePath, "utf-8")
    assert.ok(content.includes("<PortfolioActions"))
    assert.ok(content.includes("portfolioId={portfolio.id}"))
  })
})
