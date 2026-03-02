/**
 * Tests for US-009: Portfolio tab — holdings table and summary cards.
 *
 * Validates component files, exports, props interfaces, and content structure.
 * Uses filesystem + content analysis (consistent with existing test patterns).
 */

import { describe, it } from "node:test"
import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as path from "node:path"

const componentsDir = path.join(__dirname, "..", "components", "portfolio")
const pageFile = path.join(__dirname, "..", "app", "dashboard", "portfolio", "page.tsx")

// ── Component file existence ────────────────────────────────────────────

describe("Portfolio component files", () => {
  it("components/portfolio/portfolio-summary.tsx exists", () => {
    assert.ok(fs.existsSync(path.join(componentsDir, "portfolio-summary.tsx")))
  })

  it("components/portfolio/holdings-table.tsx exists", () => {
    assert.ok(fs.existsSync(path.join(componentsDir, "holdings-table.tsx")))
  })
})

// ── PortfolioSummary component ──────────────────────────────────────────

describe("PortfolioSummary component", () => {
  const content = fs.readFileSync(
    path.join(componentsDir, "portfolio-summary.tsx"),
    "utf-8"
  )

  it("exports PortfolioSummary function", () => {
    assert.ok(content.includes("export function PortfolioSummary"))
  })

  it("exports PortfolioSummaryProps interface", () => {
    assert.ok(content.includes("export interface PortfolioSummaryProps"))
  })

  it("renders total value card", () => {
    assert.ok(content.includes("Total Value"))
    assert.ok(content.includes("total-value"))
  })

  it("renders gain/loss card", () => {
    assert.ok(content.includes("Total Gain/Loss") || content.includes("Gain/Loss"))
    assert.ok(content.includes("total-gain-loss"))
  })

  it("renders positions count card", () => {
    assert.ok(content.includes("Positions"))
    assert.ok(content.includes("positions-count"))
  })

  it("renders diversification score card", () => {
    assert.ok(content.includes("Diversification"))
    assert.ok(content.includes("diversification-score"))
  })

  it("includes concentration risk badge", () => {
    assert.ok(content.includes("concentration-risk-badge"))
  })

  it("uses shadcn/ui Card component", () => {
    assert.ok(content.includes("@/components/ui/card"))
  })

  it("uses shadcn/ui Badge component", () => {
    assert.ok(content.includes("@/components/ui/badge"))
  })

  it("accepts totalValue prop", () => {
    assert.ok(content.includes("totalValue"))
  })

  it("accepts totalGainLoss prop", () => {
    assert.ok(content.includes("totalGainLoss"))
  })

  it("accepts positionsCount prop", () => {
    assert.ok(content.includes("positionsCount"))
  })

  it("accepts diversificationScore prop", () => {
    assert.ok(content.includes("diversificationScore"))
  })

  it("accepts concentrationRisk prop", () => {
    assert.ok(content.includes("concentrationRisk"))
  })

  it("has grid layout for 4 cards", () => {
    assert.ok(content.includes("grid") && content.includes("lg:grid-cols-4"))
  })
})

// ── HoldingsTable component ─────────────────────────────────────────────

describe("HoldingsTable component", () => {
  const content = fs.readFileSync(
    path.join(componentsDir, "holdings-table.tsx"),
    "utf-8"
  )

  it("exports HoldingsTable function", () => {
    assert.ok(content.includes("export function HoldingsTable"))
  })

  it("exports HoldingRow interface", () => {
    assert.ok(content.includes("export interface HoldingRow"))
  })

  it("exports HoldingsTableProps interface", () => {
    assert.ok(content.includes("export interface HoldingsTableProps"))
  })

  it("uses shadcn/ui Table component", () => {
    assert.ok(content.includes("@/components/ui/table"))
  })

  it("shows Symbol column", () => {
    assert.ok(content.includes("Symbol"))
  })

  it("shows Quantity column", () => {
    assert.ok(content.includes("Quantity"))
  })

  it("shows Avg Cost column", () => {
    assert.ok(content.includes("Avg Cost"))
  })

  it("shows Current Value column", () => {
    assert.ok(content.includes("Current Value"))
  })

  it("shows Gain/Loss column", () => {
    assert.ok(content.includes("Gain/Loss"))
  })

  it("shows Concentration column", () => {
    assert.ok(content.includes("Concentration"))
  })

  it("renders empty state when no holdings", () => {
    assert.ok(content.includes("holdings-empty"))
    assert.ok(content.includes("No holdings"))
  })

  it("renders holding rows with symbol-based test ids", () => {
    assert.ok(content.includes("holding-row-"))
  })

  it("renders risk badge per holding", () => {
    assert.ok(content.includes("risk-badge-"))
  })

  it("HoldingRow includes concentrationPercent field", () => {
    assert.ok(content.includes("concentrationPercent"))
  })

  it("HoldingRow includes concentrationRisk field", () => {
    assert.ok(content.includes("concentrationRisk"))
  })
})

// ── Concentration risk badge colors ─────────────────────────────────────

describe("Concentration risk badge colors", () => {
  // Check both components for correct color mapping
  const summaryContent = fs.readFileSync(
    path.join(componentsDir, "portfolio-summary.tsx"),
    "utf-8"
  )
  const tableContent = fs.readFileSync(
    path.join(componentsDir, "holdings-table.tsx"),
    "utf-8"
  )

  for (const content of [summaryContent, tableContent]) {
    const fileName = content.includes("PortfolioSummary")
      ? "portfolio-summary"
      : "holdings-table"

    it(`${fileName} maps LOW to green`, () => {
      assert.ok(
        content.includes('"LOW"') && content.includes("green"),
        `${fileName} should map LOW to green`
      )
    })

    it(`${fileName} maps MEDIUM to yellow`, () => {
      assert.ok(
        content.includes('"MEDIUM"') && content.includes("yellow"),
        `${fileName} should map MEDIUM to yellow`
      )
    })

    it(`${fileName} maps HIGH to red`, () => {
      assert.ok(
        content.includes('"HIGH"') && content.includes("red"),
        `${fileName} should map HIGH to red`
      )
    })
  }
})

// ── Portfolio page integration ──────────────────────────────────────────

describe("Portfolio page integration", () => {
  const content = fs.readFileSync(pageFile, "utf-8")

  it("page.tsx is a server component (no 'use client')", () => {
    assert.ok(!content.includes("'use client'") && !content.includes('"use client"'))
  })

  it("imports PortfolioSummary", () => {
    assert.ok(content.includes("PortfolioSummary"))
    assert.ok(content.includes("components/portfolio/portfolio-summary"))
  })

  it("imports HoldingsTable", () => {
    assert.ok(content.includes("HoldingsTable"))
    assert.ok(content.includes("components/portfolio/holdings-table"))
  })

  it("imports getPortfolios server action", () => {
    assert.ok(content.includes("getPortfolios"))
    assert.ok(content.includes("lib/actions/portfolio"))
  })

  it("imports getHoldings server action", () => {
    assert.ok(content.includes("getHoldings"))
    assert.ok(content.includes("lib/actions/holding"))
  })

  it("imports calculatePortfolioRisk from risk.ts", () => {
    assert.ok(content.includes("calculatePortfolioRisk"))
    assert.ok(content.includes("lib/risk"))
  })

  it("imports calculateConcentration from risk.ts", () => {
    assert.ok(content.includes("calculateConcentration"))
  })

  it("passes totalValue to PortfolioSummary", () => {
    assert.ok(content.includes("totalValue={"))
  })

  it("passes totalGainLoss to PortfolioSummary", () => {
    assert.ok(content.includes("totalGainLoss={"))
  })

  it("passes positionsCount to PortfolioSummary", () => {
    assert.ok(content.includes("positionsCount={"))
  })

  it("passes diversificationScore to PortfolioSummary", () => {
    assert.ok(content.includes("diversificationScore={"))
  })

  it("passes concentrationRisk to PortfolioSummary", () => {
    assert.ok(content.includes("concentrationRisk={"))
  })

  it("passes holdings to HoldingsTable", () => {
    assert.ok(content.includes("holdings={"))
  })

  it("handles empty portfolio state", () => {
    assert.ok(content.includes("No portfolios found") || content.includes("Create a portfolio"))
  })

  it("is an async function (server component with data fetching)", () => {
    assert.ok(content.includes("async function PortfolioPage"))
  })

  it("uses default export for Next.js page", () => {
    assert.ok(content.includes("export default"))
  })
})

// ── Risk calculation logic integration ──────────────────────────────────

describe("Risk logic integration in portfolio page", () => {
  const content = fs.readFileSync(pageFile, "utf-8")

  it("builds HoldingInput array from fetched holdings", () => {
    assert.ok(content.includes("HoldingInput"))
  })

  it("computes per-holding concentration risk", () => {
    assert.ok(
      content.includes("getHoldingConcentrationRisk") ||
      content.includes("concentrationRisk")
    )
  })

  it("uses same thresholds as risk.ts (>40 HIGH, >25 MEDIUM)", () => {
    // The page should define or reuse the same threshold logic
    assert.ok(content.includes("40") && content.includes("25"))
  })
})
