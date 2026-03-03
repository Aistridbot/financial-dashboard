# Database Schema Documentation

## Overview

The application uses SQLite via Prisma ORM. The database file is stored at `.data/financial.db` (gitignored). Schema is defined in `prisma/schema.prisma`.

## Models

### Portfolio

The top-level entity representing an investment portfolio.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String | `cuid()` | Unique identifier |
| `name` | String | — | Portfolio name (e.g., "Tech Growth") |
| `baseCurrency` | String | `"EUR"` | Base currency for valuations |
| `createdAt` | DateTime | `now()` | Creation timestamp |
| `updatedAt` | DateTime | auto | Last update timestamp |

**Relations:**
- `holdings` → Holding[] (one-to-many, cascade delete)
- `transactions` → Transaction[] (one-to-many, cascade delete)

---

### Holding

Represents a current position in a security within a portfolio. Holdings are managed indirectly — they are created/updated atomically when transactions are recorded.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String | `cuid()` | Unique identifier |
| `portfolioId` | String | — | FK to Portfolio |
| `symbol` | String | — | Ticker symbol (normalized: trimmed, uppercase) |
| `quantity` | Float | — | Number of shares held |
| `avgCostBasis` | Float | — | Weighted average purchase price per share |
| `createdAt` | DateTime | `now()` | Creation timestamp |
| `updatedAt` | DateTime | auto | Last update timestamp |

**Relations:**
- `portfolio` → Portfolio (many-to-one, cascade delete)

**Indexes:** `portfolioId`, `symbol`

---

### Transaction

A buy or sell action recorded against a portfolio. Creating a transaction atomically updates the corresponding Holding.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String | `cuid()` | Unique identifier |
| `portfolioId` | String | — | FK to Portfolio |
| `symbol` | String | — | Ticker symbol (normalized) |
| `type` | String | — | `"BUY"` or `"SELL"` |
| `quantity` | Float | — | Number of shares |
| `price` | Float | — | Price per share at time of transaction |
| `fees` | Float | `0` | Transaction fees |
| `occurredAt` | DateTime | — | When the transaction occurred |
| `createdAt` | DateTime | `now()` | Record creation timestamp |

**Relations:**
- `portfolio` → Portfolio (many-to-one, cascade delete)

**Indexes:** `portfolioId`, `symbol`

---

### Signal

An AI-generated trading signal recommending an action on a security.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String | `cuid()` | Unique identifier |
| `symbol` | String | — | Ticker symbol |
| `direction` | String | — | `"BUY"`, `"SELL"`, or `"HOLD"` |
| `confidence` | Float | — | Confidence score (0.0–1.0) |
| `source` | String | — | Strategy that generated the signal (e.g., `"price-drop-strategy"`) |
| `reasoning` | String? | — | Human-readable explanation |
| `createdAt` | DateTime | `now()` | Creation timestamp |
| `expiresAt` | DateTime? | — | Expiration (null = never expires) |

**Relations:**
- `decisions` → DecisionQueueItem[] (one-to-many, cascade delete)

**Indexes:** `symbol`

---

### DecisionQueueItem

An approval workflow item that tracks a signal through the decision process.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String | `cuid()` | Unique identifier |
| `signalId` | String | — | FK to Signal |
| `status` | String | `"PENDING"` | Workflow status: `PENDING` → `APPROVED`/`REJECTED` → `EXECUTED` |
| `notes` | String? | — | Decision notes from the user |
| `decidedAt` | DateTime? | — | When the decision was made |
| `createdAt` | DateTime | `now()` | Creation timestamp |
| `updatedAt` | DateTime | auto | Last update timestamp |

**State Machine Transitions:**
```
PENDING → APPROVED
PENDING → REJECTED
APPROVED → EXECUTED
REJECTED → (terminal)
EXECUTED → (terminal)
```

**Relations:**
- `signal` → Signal (many-to-one, cascade delete)
- `executions` → ExecutionLog[] (one-to-many, cascade delete)

**Indexes:** `signalId`, `status`

---

### ExecutionLog

Records the actual execution of an approved trade, including Belgian TOB tax calculations.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String | `cuid()` | Unique identifier |
| `decisionId` | String | — | FK to DecisionQueueItem |
| `symbol` | String | — | Ticker symbol |
| `type` | String | — | `"BUY"` or `"SELL"` |
| `quantity` | Float | — | Shares executed |
| `price` | Float | — | Execution price per share |
| `fees` | Float | `0` | Broker fees |
| `tobTaxAmount` | Float | `0` | Calculated Belgian TOB tax amount (EUR) |
| `tobTaxRate` | Float | `0` | TOB tax rate applied |
| `executedAt` | DateTime | — | Execution timestamp |
| `createdAt` | DateTime | `now()` | Record creation timestamp |

**Relations:**
- `decision` → DecisionQueueItem (many-to-one, cascade delete)

**Indexes:** `decisionId`, `symbol`

---

### NewsItem

A news article fetched from Finnhub with sentiment analysis.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | String | `cuid()` | Unique identifier |
| `symbol` | String | — | Related ticker symbol |
| `headline` | String | — | Article headline |
| `summary` | String? | — | Article summary/snippet |
| `url` | String | — | Link to full article |
| `source` | String | — | News source name |
| `sentiment` | String | `"NEUTRAL"` | `"POSITIVE"`, `"NEGATIVE"`, or `"NEUTRAL"` |
| `sentimentScore` | Float? | — | Numeric sentiment score (-1.0 to 1.0) |
| `publishedAt` | DateTime | — | Publication timestamp |
| `createdAt` | DateTime | `now()` | Record creation timestamp |

**Indexes:** `symbol`, `publishedAt`

**Deduplication:** News items are deduplicated by `url + symbol` on insert to avoid duplicates when re-fetching.

## Entity Relationship Diagram

```
Portfolio ──┬── 1:N ── Holding
             └── 1:N ── Transaction

Signal ──── 1:N ── DecisionQueueItem ──── 1:N ── ExecutionLog

NewsItem (standalone, linked by symbol convention)
```

## Database Commands

```bash
npx prisma db push      # Push schema to database (dev)
npx prisma migrate dev  # Create and apply migration
npx prisma generate     # Regenerate Prisma client
npx prisma studio       # Open database GUI
npm run db:seed          # Run seed script (tsx prisma/seed.ts)
```
