# Server Actions API Reference

All server actions are located in `lib/actions/` and use the `'use server'` directive. They return a typed `ActionResult<T>` discriminated union:

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

## Portfolio Actions (`lib/actions/portfolio.ts`)

### `getPortfolios()`
Fetch all portfolios with their holdings and transactions.

- **Parameters:** none
- **Returns:** `ActionResult<PortfolioWithRelations[]>`
- **Error handling:** Catches all exceptions, returns `{ success: false, error: message }`

### `getPortfolio(id: string)`
Fetch a single portfolio by ID with all relations.

- **Parameters:** `id` — Portfolio ID (required, non-empty)
- **Returns:** `ActionResult<PortfolioWithRelations>`
- **Errors:** Empty ID, portfolio not found

### `createPortfolio(input: CreatePortfolioInput)`
Create a new portfolio.

- **Parameters:**
  - `name` — Portfolio name (required, non-empty after trim)
  - `baseCurrency` — Optional, defaults to `"EUR"`
- **Returns:** `ActionResult<Portfolio>`
- **Errors:** Empty/whitespace name

### `updatePortfolio(id: string, input: UpdatePortfolioInput)`
Update portfolio fields.

- **Parameters:**
  - `id` — Portfolio ID (required)
  - `name` — Optional new name (rejected if empty after trim)
  - `baseCurrency` — Optional new currency
- **Returns:** `ActionResult<Portfolio>`
- **Errors:** Empty ID, empty name, portfolio not found

### `deletePortfolio(id: string)`
Delete a portfolio and all related data (cascade).

- **Parameters:** `id` — Portfolio ID (required)
- **Returns:** `ActionResult<{ deleted: true }>`
- **Errors:** Empty ID, portfolio not found

---

## Transaction Actions (`lib/actions/transaction.ts`)

### `getTransactions(portfolioId: string)`
Fetch all transactions for a portfolio, ordered by `occurredAt` descending.

- **Parameters:** `portfolioId` (required)
- **Returns:** `ActionResult<Transaction[]>`

### `createTransaction(input: CreateTransactionInput)`
Create a transaction and atomically update the corresponding holding.

- **Parameters:**
  - `portfolioId` — Portfolio ID (required)
  - `symbol` — Ticker (normalized: trimmed, uppercased)
  - `type` — `"BUY"` or `"SELL"`
  - `quantity` — Number of shares (must be > 0)
  - `price` — Price per share (must be > 0)
  - `fees` — Optional, defaults to 0
  - `occurredAt` — Optional, defaults to now
- **Returns:** `ActionResult<Transaction>`
- **Errors:** Invalid inputs, insufficient shares for SELL
- **Side effects:** Creates/updates Holding record atomically via `prisma.$transaction`

---

## Holding Actions (`lib/actions/holding.ts`)

### `getHoldings(portfolioId: string, currentPrices?: Record<string, number>)`
Fetch holdings with optional computed fields.

- **Parameters:**
  - `portfolioId` (required)
  - `currentPrices` — Optional map of `symbol → currentPrice` for computing `currentValue`, `gainLoss`, `gainLossPercent`
- **Returns:** `ActionResult<HoldingWithComputed[]>`
- **Computed fields (when `currentPrices` provided):**
  - `currentValue` — quantity × currentPrice
  - `gainLoss` — currentValue - (quantity × avgCostBasis)
  - `gainLossPercent` — gainLoss / investedValue × 100

---

## Import Actions (`lib/actions/import.ts`)

### `importTransactions(portfolioId: string, csvString: string)`
Parse CSV and bulk-import transactions into a portfolio.

- **Parameters:**
  - `portfolioId` (required)
  - `csvString` — CSV content with columns: symbol, type, quantity, price, date
- **Returns:** `ActionResult<ImportResult>`
  - `imported` — Number of successfully imported transactions
  - `errors` — Parse errors from CSV
  - `transactionErrors` — Errors from individual transaction creation
- **Reuses** `createTransaction` for each row (ensures holding consistency)

---

## Signal Actions (`lib/actions/signal.ts`)

### `getSignals(filters?: SignalFilters)`
Fetch signals with optional filters.

- **Parameters (all optional):**
  - `symbol` — Filter by ticker
  - `direction` — `"BUY"`, `"SELL"`, or `"HOLD"`
  - `source` — Filter by strategy source
  - `limit` — Max results (default: 100)
- **Returns:** `ActionResult<Signal[]>`

### `createSignal(input: CreateSignalInput)`
Create a new signal.

- **Parameters:**
  - `symbol` — Ticker (normalized)
  - `direction` — `"BUY"`, `"SELL"`, or `"HOLD"`
  - `confidence` — 0.0–1.0
  - `source` — Strategy identifier
  - `reasoning` — Optional explanation
  - `expiresAt` — Optional expiration date
- **Returns:** `ActionResult<Signal>`

### `deleteSignal(id: string)`
Delete a signal by ID.

- **Returns:** `ActionResult<{ deleted: true }>`

---

## Generate Signals Actions (`lib/actions/generate-signals.ts`)

### `generateAndStoreSignals(portfolioId: string, source?: string)`
Auto-generate signals from portfolio holdings.

- **Parameters:**
  - `portfolioId` (required)
  - `source` — Optional source prefix for testing
- **Returns:** `ActionResult<GenerateSignalsResult>`
  - `generated` — Number of new signals created
  - `skippedDuplicates` — Skipped due to existing unexpired signal with same symbol+direction
  - `errors` — Any errors encountered
- **Flow:** Holdings → refresh quotes → signal engine → dedup → store with 24h expiry

---

## Decision Queue Actions (`lib/actions/decision-queue.ts`)

### `sendToDecisionQueue(signalId: string)`
Create a decision queue item from a signal.

- **Parameters:** `signalId` (required)
- **Returns:** `ActionResult<DecisionQueueItem>`
- **Errors:** Signal not found, signal already queued (duplicate PENDING check)

---

## Decision Actions (`lib/actions/decision.ts`)

### `getDecisions(filters?: DecisionFilters)`
Fetch decisions with optional filters, includes related signal.

- **Parameters (all optional):**
  - `status` — Filter by status
  - `symbol` — Filter by signal symbol
- **Returns:** `ActionResult<DecisionQueueItem[]>` (with nested signal)

### `approveDecision(id: string, notes?: string)`
Move a decision from PENDING to APPROVED.

- **Parameters:** `id`, optional `notes`
- **Returns:** `ActionResult<DecisionQueueItem>`
- **Errors:** Invalid transition (must be PENDING)

### `rejectDecision(id: string, notes?: string)`
Move a decision from PENDING to REJECTED.

- **Parameters:** `id`, optional `notes`
- **Returns:** `ActionResult<DecisionQueueItem>`
- **Errors:** Invalid transition (must be PENDING)

### `executeDecision(id: string, executionData: ExecutionInput)`
Execute an approved decision — creates an ExecutionLog with TOB tax.

- **Parameters:**
  - `id` — Decision ID
  - `executionData`:
    - `quantity` — Shares to execute
    - `price` — Execution price
    - `fees` — Optional broker fees
    - `instrumentType` — Optional: `"stock"`, `"accumulating_fund"`, or `"bond_etf"` (default: `"stock"`)
- **Returns:** `ActionResult<ExecutionLog>`
- **Side effects:** Calls `calculateTOBTax`, stores tax amount/rate on execution log, transitions status to EXECUTED
- **Errors:** Invalid transition (must be APPROVED)

---

## Execution Log Actions (`lib/actions/execution-log.ts`)

### `getExecutionLogs(filters?: ExecutionLogFilters)`
Fetch execution logs with optional filters, includes related decision and signal.

- **Parameters (all optional):**
  - `symbol` — Filter by ticker
  - `type` — `"BUY"` or `"SELL"`
  - `fromDate` — Start date filter
  - `toDate` — End date filter
- **Returns:** `ActionResult<ExecutionLog[]>` (with nested decision → signal)

---

## News Actions (`lib/actions/news.ts`)

### `fetchAndStoreNews(symbols: string[])`
Fetch news from Finnhub, score sentiment, and store in database.

- **Parameters:** `symbols` — Array of ticker symbols (at least one required)
- **Returns:** `ActionResult<NewsItem[]>`
- **Side effects:** Fetches from Finnhub API, deduplicates by URL+symbol, stores with sentiment score

### `getNewsItems(filters?: NewsFilters)`
Fetch stored news items with optional filters.

- **Parameters (all optional):**
  - `symbol` — Filter by ticker
  - `sentiment` — `"POSITIVE"`, `"NEGATIVE"`, or `"NEUTRAL"`
  - `fromDate` — Start date
  - `toDate` — End date
- **Returns:** `ActionResult<NewsItem[]>`

---

## Quote Actions (`lib/actions/quotes.ts`)

### `refreshQuotes(symbols: string[])`
Fetch live quotes from Finnhub and update the in-memory cache.

- **Parameters:** `symbols` — Array of ticker symbols
- **Returns:** `ActionResult<QuoteResult>`
  - `quotes` — Map of `symbol → CachedQuote`
  - `errors` — Any fetch errors

### `getCachedQuotes(symbols: string[])`
Get quotes from the in-memory cache without hitting the API.

- **Parameters:** `symbols` — Array of ticker symbols
- **Returns:** `ActionResult<Record<string, CachedQuote | null>>`

---

## Pure Library Functions

These are not server actions but important business logic:

| Module | Function | Description |
|--------|----------|-------------|
| `lib/calculations.ts` | `calculateAvgCostBasis(existing, newQty, newPrice)` | Weighted average cost basis |
| `lib/calculations.ts` | `calculatePositionValue(qty, price)` | Position market value |
| `lib/calculations.ts` | `calculateGainLoss(qty, avgCost, currentPrice)` | Unrealized gain/loss |
| `lib/risk.ts` | `calculateConcentration(holdings)` | Position concentration percentages |
| `lib/risk.ts` | `calculateDiversificationScore(holdings)` | Shannon entropy-based score (0–100) |
| `lib/risk.ts` | `calculatePortfolioRisk(holdings)` | Full risk assessment |
| `lib/tob-tax.ts` | `calculateTOBTax(type, amount, instrumentType?)` | Belgian transaction tax |
| `lib/sentiment.ts` | `scoreSentiment(headline, summary?, finnhubScore?)` | Keyword-based sentiment |
| `lib/signal-engine.ts` | `generateSignals(holdings, quotes, strategies?)` | Strategy-based signal generation |
| `lib/csv-parser.ts` | `parseTransactionCSV(csvString)` | Parse CSV to transaction objects |
| `lib/quote-cache.ts` | `getCachedQuote(symbol)` / `isQuoteStale(quote)` | In-memory quote cache |
