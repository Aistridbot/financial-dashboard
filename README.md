# Financial Dashboard

A personal investment decision dashboard built with Next.js, Prisma/SQLite, shadcn/ui, and Finnhub API.

## Features

| Tab | Description |
|-----|-------------|
| **Portfolio** | Manual transaction entry, CSV import, holdings table with live quotes, risk indicators |
| **Signals** | AI-generated trading signals from portfolio analysis with strategy pattern |
| **Decision Queue** | Approval workflow: review signals → approve/reject → execute |
| **Execution Log** | Trade execution history with Belgian TOB tax tracking |
| **News** | Finnhub company news feed with keyword-based sentiment analysis |

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
# Install dependencies
npm install

# Set up environment (optional — works without API key in mock mode)
cp .env.example .env.local
# Edit .env.local and add your Finnhub API key (optional)

# Initialize the database
npx prisma db push

# Seed with demo data (optional)
npm run db:seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) in your browser.

## Environment Variables

Create a `.env.local` file in the project root (see `.env.example` for reference):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FINNHUB_API_KEY` | No | — | Finnhub API key for live market data. Without it, the app uses deterministic mock data. |
| `DATABASE_URL` | No | `file:../.data/financial.db` | SQLite database path (set in `prisma/schema.prisma`) |

> **Note:** The dashboard works fully without any environment variables. Mock mode provides deterministic data for development and testing.

## npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Start development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `lint` | `next lint` | Run ESLint |
| `typecheck` | `tsc --noEmit` | TypeScript type checking |
| `test` | `tsx --test __tests__/**/*.test.ts` | Run all tests |
| `verify:guarded` | `npm run build && npm test && npm run typecheck` | Full CI-style verification |
| `migrate` | `prisma migrate dev` | Create and apply database migration |
| `db:push` | `prisma db push` | Push schema to database (dev) |
| `db:generate` | `prisma generate` | Regenerate Prisma client |
| `db:studio` | `prisma studio` | Open Prisma database GUI |
| `db:seed` | `tsx prisma/seed.ts` | Seed database with demo data |

## Project Structure

```
├── app/dashboard/          # Next.js App Router pages (5 tabs)
├── components/             # React components organized by feature
│   ├── ui/                 # shadcn/ui primitives
│   ├── portfolio/          # Portfolio tab components
│   ├── signals/            # Signals tab components
│   ├── decisions/          # Decision Queue components
│   ├── execution-log/      # Execution Log components
│   └── news/               # News tab components
├── lib/                    # Business logic and utilities
│   ├── actions/            # Server actions ('use server')
│   ├── types/              # TypeScript type definitions
│   └── *.ts                # Pure functions (calculations, risk, tax, etc.)
├── prisma/                 # Database schema and seed data
├── __tests__/              # All test files
└── docs/                   # Documentation
```

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) — System design, tech stack, data flow
- [Database Schema](docs/DATABASE.md) — All Prisma models with field descriptions
- [API Reference](docs/API.md) — Server actions with parameters and return types
- [Extending Guide](docs/EXTENDING.md) — How to add tabs, strategies, tax regimes, data sources
- [Finnhub Integration](docs/FINNHUB.md) — API setup, rate limits, mock mode

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5
- **Database:** SQLite via Prisma ORM 5
- **UI:** shadcn/ui + Radix UI + Tailwind CSS 3
- **Market Data:** Finnhub API (with mock fallback)
- **Testing:** node:test + tsx
