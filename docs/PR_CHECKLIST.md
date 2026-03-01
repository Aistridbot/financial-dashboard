# PR Checklist — Financial Dashboard MVP

Use this checklist to verify MVP scope quickly and reproducibly.

## 1) Environment and startup

- [ ] Install dependencies: `npm install`
- [ ] Run migrations: `npm run migrate`
- [ ] Seed demo data: `npm run seed`
- [ ] Start app: `npm run dev`
- [ ] Open `http://localhost:3000/dashboard`

## 2) Guarded quality gate

- [ ] Run guarded sequence: `npm run verify:guarded`
- [ ] Confirm command order is build -> test -> typecheck
- [ ] Confirm exit code is zero

## 3) API verification (mechanical)

### Stocks
- [ ] `GET /api/stocks/quote?symbol=AAPL` returns 200 with fields: `symbol`, `price`, `previousClose`, `changePercent`
- [ ] `GET /api/stocks/history?symbol=AAPL&range=1M` returns 200 with `points[]`
- [ ] Invalid quote symbol (for example `symbol=??`) returns 400 with `{ error: { code, message } }`

### Portfolios
- [ ] `POST /api/portfolios` creates a portfolio (201)
- [ ] `GET /api/portfolios` lists created portfolio
- [ ] `PATCH /api/portfolios/:id` updates only allowed fields (`name`, `baseCurrency`)
- [ ] `DELETE /api/portfolios/:id` returns 204

### Holdings / transactions
- [ ] `POST /api/portfolios/:id/transactions` with `BUY` adds/increases holding
- [ ] `POST /api/portfolios/:id/transactions` with `SELL` reduces holding
- [ ] Oversell is rejected with 400 and stable error code
- [ ] `GET /api/portfolios/:id/transactions` returns newest-first ordering

### Dashboard summary
- [ ] `GET /api/dashboard/summary?portfolioId=<id>` returns 200 with:
  - `totalValue`, `investedValue`, `dayChange`, `totalGainLoss`, `positionsCount`
- [ ] Unknown portfolio id returns 404

## 4) Dashboard UI verification

- [ ] `/dashboard` shows summary cards
- [ ] Portfolio selector loads options
- [ ] Transactions table shows required columns: date, symbol, side, quantity, price, total
- [ ] Creating a transaction from the form refreshes both summary cards and table
- [ ] Validation errors are displayed for invalid form inputs

## 5) Test artifacts

- [ ] `npm test` passes locally
- [ ] Integration suite (`src/integration/mvpFlow.integration.test.js`) passes
- [ ] Documentation guard tests (`src/docs/prReadiness.test.js`) pass

## 6) Files to review in this story

- `README.md`
- `docs/PR_CHECKLIST.md`
- `package.json` (`verify:guarded` script)
- `src/docs/prReadiness.test.js`
