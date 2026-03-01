# Financial Dashboard MVP

Professional financial analysis dashboard MVP with:
- Stock data API endpoints
- Portfolio / holdings / transactions APIs
- Dashboard summary cards + transactions table + create transaction form
- End-to-end integration coverage

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
```

## Database lifecycle (local)

Run migrations:

```bash
npm run migrate
```

Seed deterministic demo data:

```bash
npm run seed
```

> Optional: set `FINANCIAL_DB_PATH` to override the default SQLite location (`.data/financial.db`).

## Run the app

Development mode:

```bash
npm run dev
```

Production-style start:

```bash
npm run start
```

Dashboard URL:
- `http://localhost:3000/dashboard`

## Quality and verification commands

Typecheck:

```bash
npm run typecheck
```

Build:

```bash
npm run build
```

Tests:

```bash
npm test
```

Guarded local/CI sequence (build -> test -> typecheck):

```bash
npm run verify:guarded
```

## Implemented API routes and behavior

### Stock data

- `GET /api/stocks/quote?symbol=AAPL`
  - Returns quote payload:
    - `symbol`, `name`, `price`, `previousClose`, `change`, `changePercent`, `asOf`
  - Validation errors use: `{ "error": { "code", "message", "details?" } }`

- `GET /api/stocks/history?symbol=AAPL&range=1M`
  - Supported ranges: `1D`, `5D`, `1M`, `6M`, `1Y`
  - Returns history payload:
    - `symbol`, `range`, `points[]` where each point has `date`, `open`, `high`, `low`, `close`, `volume`

### Portfolios

- `GET /api/portfolios`
- `POST /api/portfolios`
  - Body: `{ "name": "Core", "baseCurrency": "USD" }`
- `GET /api/portfolios/:id`
- `PATCH /api/portfolios/:id`
  - Allowed fields: `name`, `baseCurrency`
- `DELETE /api/portfolios/:id` (returns `204` on success)

### Holdings and transactions

- `GET /api/portfolios/:id/holdings`
- `GET /api/portfolios/:id/transactions`
- `POST /api/portfolios/:id/transactions`
  - Body: `{ "symbol", "type", "quantity", "price", "occurredAt" }`
  - `type` supports `BUY`/`SELL`
  - Server computes and persists derived position updates atomically

### Dashboard summary

- `GET /api/dashboard/summary?portfolioId=<id>`
  - Returns:
    - `portfolioId`, `totalValue`, `investedValue`, `dayChange`, `totalGainLoss`, `positionsCount`
    - optional `warnings[]` when quote fallbacks are used

## Implemented dashboard UI features

- `/dashboard` renders:
  - Summary cards: total value, invested value, day change, gain/loss
  - Portfolio selector
  - Transactions table (date, symbol, side, quantity, price, total)
  - Create transaction form with validation feedback
- `/dashboard.js` client flow:
  - Loads portfolios
  - Loads summary + transactions for selected portfolio
  - Submits transactions and refreshes summary/table on success

## PR review checklist

See [docs/PR_CHECKLIST.md](docs/PR_CHECKLIST.md) for mechanically verifiable MVP checks.
