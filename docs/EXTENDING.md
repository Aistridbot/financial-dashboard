# Extending the Dashboard

This guide explains how to add new functionality to the Financial Dashboard. The system is designed to be modular — each feature area is self-contained with its own server actions, components, and tests.

## Adding a New Tab

### 1. Create the page

Create a new directory under `app/dashboard/`:

```
app/dashboard/your-tab/
└── page.tsx
```

```typescript
// app/dashboard/your-tab/page.tsx
import { YourComponent } from '@/components/your-tab/your-component';

export default async function YourTabPage() {
  // Fetch data via server actions (this is a server component)
  const result = await getYourData();

  if (!result.success) {
    return <div>Error: {result.error}</div>;
  }

  return <YourComponent data={result.data} />;
}
```

### 2. Register the tab in the dashboard layout

Edit `app/dashboard/layout.tsx` and add your tab to the `tabs` array:

```typescript
const tabs = [
  { label: 'Portfolio', href: '/dashboard/portfolio' },
  { label: 'Signals', href: '/dashboard/signals' },
  // ... existing tabs
  { label: 'Your Tab', href: '/dashboard/your-tab' },
];
```

### 3. Create components

Create `components/your-tab/` with your UI components. Follow the existing pattern:

- **Server component** for the page (data fetching)
- **Client components** (`"use client"`) for interactive parts (forms, filters)
- Export pure filter/validation functions for testability

### 4. Add server actions

Create `lib/actions/your-feature.ts`:

```typescript
'use server';

import { prisma } from '@/lib/db';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getYourData(): Promise<ActionResult<YourType[]>> {
  try {
    const data = await prisma.yourModel.findMany();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
```

### 5. Write tests

Create `__tests__/your-feature.test.ts`:

```typescript
import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

describe('Your Feature', () => {
  it('should do the thing', async () => {
    // Test logic
  });
});
```

Run: `npm test`

---

## Adding a New Signal Strategy

Signal strategies are pure functions in `lib/signal-engine.ts`.

### 1. Define the strategy

```typescript
// In lib/signal-engine.ts (or a new file)
export const myCustomStrategy: SignalStrategy = (holding, quote) => {
  // Your logic here
  const shouldSignal = /* your condition */;

  if (!shouldSignal) return null; // Abstain

  return {
    symbol: holding.symbol,
    direction: 'BUY', // or 'SELL' or 'HOLD'
    confidence: 0.75,  // 0.0 to 1.0
    reasoning: 'Explanation of why this signal was generated',
    source: 'my-custom-strategy',
  };
};
```

### 2. Register the strategy

Add it to `DEFAULT_STRATEGIES` in `lib/signal-engine.ts`:

```typescript
export const DEFAULT_STRATEGIES: SignalStrategy[] = [
  priceDropBuyStrategy,
  priceRiseSellStrategy,
  myCustomStrategy,       // ← add here
  defaultHoldStrategy,    // Keep this last (fallback)
];
```

### 3. Strategy interface

```typescript
interface HoldingForSignal {
  symbol: string;
  quantity: number;
  avgCostBasis: number;
}

interface QuoteForSignal {
  currentPrice: number;
  previousClose: number;
}

// Return GeneratedSignal or null to abstain
type SignalStrategy = (
  holding: HoldingForSignal,
  quote: QuoteForSignal
) => GeneratedSignal | null;
```

### Tips

- Return `null` to abstain — the engine will try the next strategy
- The highest-confidence signal wins when multiple strategies fire
- Keep `defaultHoldStrategy` last as a fallback
- Use descriptive `source` names for filtering/debugging

---

## Adding a New Tax Regime

The Belgian TOB tax is in `lib/tob-tax.ts`. To add another tax regime:

### 1. Create a new tax module

```typescript
// lib/your-tax.ts

export type YourInstrumentType = 'stock' | 'bond' | 'fund';

export type YourTaxResult = {
  taxRate: number;
  taxAmount: number;
  // Add regime-specific fields
};

const TAX_RATES: Record<YourInstrumentType, { rate: number; cap?: number }> = {
  stock: { rate: 0.001 },
  bond: { rate: 0.002 },
  fund: { rate: 0.003, cap: 5000 },
};

export function calculateYourTax(
  type: 'BUY' | 'SELL',
  amount: number,
  instrumentType?: YourInstrumentType
): YourTaxResult {
  const instrument = instrumentType ?? 'stock';
  const { rate, cap } = TAX_RATES[instrument];
  const rawTax = amount * rate;
  const taxAmount = cap ? Math.min(rawTax, cap) : rawTax;

  return {
    taxRate: rate,
    taxAmount: Math.round(taxAmount * 100) / 100,
  };
}
```

### 2. Integrate with execution

In `lib/actions/decision.ts`, the `executeDecision` function calls `calculateTOBTax`. To support multiple regimes:

1. Add a `taxRegime` field to the execution input
2. Route to the appropriate tax calculator based on the regime
3. Store the regime identifier on the ExecutionLog (may need a schema migration)

### 3. Update the Prisma schema

If needed, add fields to `ExecutionLog`:

```prisma
model ExecutionLog {
  // ... existing fields
  taxRegime     String    @default("TOB_BE")
  // Add regime-specific fields as needed
}
```

Run `npx prisma db push` or `npx prisma migrate dev` to apply.

---

## Adding a New Data Source

### Replacing or Supplementing Finnhub

The Finnhub client is in `lib/finnhub.ts`. To add an alternative data source:

### 1. Create the client

```typescript
// lib/your-api.ts

export interface YourApiConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class YourApiClient {
  private apiKey: string | undefined;
  readonly isMockMode: boolean;

  constructor(config?: YourApiConfig) {
    this.apiKey = config?.apiKey ?? process.env.YOUR_API_KEY ?? undefined;
    this.isMockMode = !this.apiKey;
  }

  async getQuote(symbol: string): Promise<YourQuoteType> {
    if (this.isMockMode) return this.mockQuote(symbol);
    // Real API call
  }

  private mockQuote(symbol: string): YourQuoteType {
    // Deterministic mock data for development
  }
}
```

### 2. Add types

Create `lib/types/your-api.ts` with typed interfaces for all API responses.

### 3. Integration points

- **Quotes**: Update `lib/actions/quotes.ts` to use your new client
- **News**: Update `lib/actions/news.ts` if the source provides news
- **Quote cache**: The cache in `lib/quote-cache.ts` is source-agnostic — it just stores `{ price, previousClose, timestamp }`

### 4. Environment variables

Add your API key to `.env.example`:

```bash
YOUR_API_KEY=           # Optional: your-api.com API key
```

---

## Adding a New Prisma Model

### 1. Define the model

Add to `prisma/schema.prisma`:

```prisma
model YourModel {
  id        String   @id @default(cuid())
  // ... fields
  createdAt DateTime @default(now())

  @@index([yourField])
}
```

### 2. Apply the migration

```bash
npx prisma db push      # Quick dev push
# or
npx prisma migrate dev  # Creates a migration file
```

### 3. Create server actions

Follow the pattern in `lib/actions/` — use `ActionResult<T>`, handle errors, normalize inputs.

### 4. Update seed data

Add seed records to `prisma/seed.ts` using deterministic IDs prefixed with `seed-`.

---

## Testing Conventions

- All tests live in `__tests__/`
- Use `node:test` (`describe`, `it`) and `node:assert/strict`
- Run with `npm test` (tsx --test)
- Test isolation: prefix test IDs with a unique string, clean up with `deleteMany` on that prefix
- Server actions can be tested directly — `'use server'` is a no-op when imported outside Next.js
- Extract pure functions for unit testing (no DB mocking needed)
- Component structure tests: use `fs.existsSync` + `readFileSync` to verify file content
