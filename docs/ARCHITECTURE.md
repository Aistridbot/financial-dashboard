# Architecture Overview

## System Overview

The Financial Dashboard is a personal investment decision support tool built as a monolithic Next.js application. It helps investors track portfolios, evaluate AI-generated trading signals, manage an approval workflow, log executions with Belgian TOB tax calculations, and monitor market news with sentiment analysis.

The system operates in a request-response model: the user interacts with a tabbed dashboard UI, which calls server actions that read/write to a local SQLite database and optionally fetch live data from the Finnhub API.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 14.x |
| Language | TypeScript | 5.x |
| Database | SQLite via Prisma ORM | Prisma 5.x |
| UI Components | shadcn/ui + Radix UI | latest |
| Styling | Tailwind CSS | 3.x |
| Market Data | Finnhub API | v1 |
| Testing | node:test + tsx | Node 20+ |

## Directory Structure

```
financial-dashboard/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page (redirects to dashboard)
│   └── dashboard/
│       ├── layout.tsx          # Dashboard shell with tab navigation (client component)
│       ├── page.tsx            # Dashboard root (redirects to portfolio)
│       ├── portfolio/
│       │   └── page.tsx        # Portfolio tab (server component)
│       ├── signals/
│       │   └── page.tsx        # Signals tab (server component)
│       ├── decisions/
│       │   └── page.tsx        # Decision Queue tab (server component)
│       ├── execution-log/
│       │   └── page.tsx        # Execution Log tab (server component)
│       └── news/
│           └── page.tsx        # News tab (server component)
├── components/
│   ├── ui/                     # shadcn/ui primitives (button, card, table, etc.)
│   ├── portfolio/              # Portfolio tab components
│   ├── signals/                # Signals tab components
│   ├── decisions/              # Decision Queue components
│   ├── execution-log/          # Execution Log components
│   └── news/                   # News tab components
├── lib/
│   ├── db.ts                   # Prisma client singleton
│   ├── calculations.ts         # Pure position math (avg cost, gain/loss)
│   ├── csv-parser.ts           # CSV transaction parser
│   ├── finnhub.ts              # Finnhub API client with mock mode
│   ├── quote-cache.ts          # In-memory quote cache (globalThis)
│   ├── risk.ts                 # Portfolio risk calculations
│   ├── sentiment.ts            # News sentiment scoring
│   ├── signal-engine.ts        # Signal generation strategies
│   ├── tob-tax.ts              # Belgian TOB tax calculator
│   ├── utils.ts                # General utilities (cn, etc.)
│   ├── types/
│   │   └── finnhub.ts          # Finnhub API type definitions
│   └── actions/                # Server actions ('use server')
│       ├── portfolio.ts        # Portfolio CRUD
│       ├── transaction.ts      # Transaction creation with atomic holding updates
│       ├── holding.ts          # Holdings read with computed fields
│       ├── import.ts           # CSV import
│       ├── signal.ts           # Signal CRUD
│       ├── generate-signals.ts # Auto-generate signals from portfolio
│       ├── decision-queue.ts   # Send signal to decision queue
│       ├── decision.ts         # Approval workflow + execution
│       ├── execution-log.ts    # Execution log queries
│       ├── news.ts             # News fetch + sentiment storage
│       └── quotes.ts           # Live quote refresh
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Deterministic seed data
├── __tests__/                  # All test files
├── .data/                      # SQLite database (gitignored)
└── docs/                       # This documentation
```

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (User)                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Dashboard Shell (Tab Navigation)        │   │
│  │  ┌──────┬────────┬──────────┬─────────┬──────┐  │   │
│  │  │Portf.│Signals │Decisions │Exec Log │ News │  │   │
│  └──┴──────┴────────┴──────────┴─────────┴──────┘  │   │
└──────────────────────┬──────────────────────────────────┘
                       │ Server Actions (RPC)
                       ▼
┌──────────────────────────────────────────────────────────┐
│               Next.js Server (App Router)                 │
│                                                           │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │ lib/actions │  │ lib/*.ts   │  │ lib/finnhub.ts   │   │
│  │ (server     │  │ (pure      │  │ (API client +    │   │
│  │  actions)   │──│  functions) │  │  rate limiter)   │   │
│  └──────┬─────┘  └────────────┘  └────────┬─────────┘   │
│         │                                  │              │
│         ▼                                  ▼              │
│  ┌─────────────┐                ┌──────────────────┐     │
│  │ Prisma ORM  │                │ Finnhub REST API │     │
│  │ (lib/db.ts) │                │ (finnhub.io/v1)  │     │
│  └──────┬──────┘                └──────────────────┘     │
│         │                                                 │
│         ▼                                                 │
│  ┌─────────────┐                                         │
│  │   SQLite    │                                         │
│  │ .data/*.db  │                                         │
│  └─────────────┘                                         │
└──────────────────────────────────────────────────────────┘
```

### Key Data Flows

1. **Portfolio → Holdings**: Creating a transaction atomically updates the corresponding holding (quantity, avg cost basis) via `prisma.$transaction`.

2. **Quote Refresh**: Finnhub quotes are fetched on-demand, cached in-memory (globalThis pattern, 5-min staleness), and used to compute holding current values.

3. **Signal Generation**: Holdings + live quotes → signal engine (strategy pattern) → dedup check → stored signals with 24h expiry.

4. **Decision Workflow**: Signal → Decision Queue (PENDING) → APPROVED/REJECTED → EXECUTED (creates ExecutionLog with TOB tax).

5. **News Pipeline**: Finnhub company news → sentiment scoring (keyword-based + Finnhub override) → deduplicated storage by URL+symbol.

## Key Architectural Patterns

### Server/Client Component Split
- **Server components** (default): Tab pages that fetch data directly from the database
- **Client components** (`"use client"`): Interactive forms, filters, buttons that need browser state
- Dashboard layout is a client component (uses `usePathname` for active tab)

### ActionResult Pattern
All server actions return a discriminated union:
```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### Pure Function Extraction
Business logic (calculations, risk, tax, sentiment, signal strategies) lives in pure functions in `lib/` — no database dependencies, easy to test.

### Singleton Patterns
- PrismaClient uses `globalThis` to survive Next.js dev hot-reload
- Quote cache uses the same `globalThis` pattern
