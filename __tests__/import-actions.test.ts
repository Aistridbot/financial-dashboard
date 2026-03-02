import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/db";
import { importTransactions } from "../lib/actions/import";

const TEST_PREFIX = "import-test-";

async function createTestPortfolio(id: string, name: string) {
  return prisma.portfolio.create({
    data: { id, name, baseCurrency: "EUR" },
  });
}

describe("importTransactions", () => {
  const portfolioId = `${TEST_PREFIX}portfolio-1`;

  before(async () => {
    // Clean up any leftover test data
    await prisma.transaction.deleteMany({
      where: { portfolioId: { startsWith: TEST_PREFIX } },
    });
    await prisma.holding.deleteMany({
      where: { portfolioId: { startsWith: TEST_PREFIX } },
    });
    await prisma.portfolio.deleteMany({
      where: { id: { startsWith: TEST_PREFIX } },
    });

    await createTestPortfolio(portfolioId, "Import Test Portfolio");
  });

  after(async () => {
    await prisma.transaction.deleteMany({
      where: { portfolioId: { startsWith: TEST_PREFIX } },
    });
    await prisma.holding.deleteMany({
      where: { portfolioId: { startsWith: TEST_PREFIX } },
    });
    await prisma.portfolio.deleteMany({
      where: { id: { startsWith: TEST_PREFIX } },
    });
  });

  it("imports valid CSV transactions", async () => {
    const csv = `symbol,type,quantity,price,date,fees
AAPL,BUY,10,150,2025-01-15,5
MSFT,BUY,5,400,2025-02-01,3`;

    const result = await importTransactions(portfolioId, csv);
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.imported, 2);
    assert.equal(result.data.errors.length, 0);
    assert.equal(result.data.transactionErrors.length, 0);
  });

  it("returns parse errors for invalid rows", async () => {
    const csv = `symbol,type,quantity,price,date
GOOG,BUY,2,180,2025-03-01
,SELL,5,400,2025-02-01`;

    const result = await importTransactions(portfolioId, csv);
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.imported, 1);
    assert.equal(result.data.errors.length, 1);
  });

  it("handles empty CSV", async () => {
    const result = await importTransactions(portfolioId, "");
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.imported, 0);
  });

  it("fails for missing portfolio ID", async () => {
    const result = await importTransactions("", "symbol,type,quantity,price,date\nAAPL,BUY,1,100,2025-01-01");
    assert.equal(result.success, false);
    if (result.success) return;
    assert.ok(result.error.includes("Portfolio ID is required"));
  });

  it("fails for non-existent portfolio", async () => {
    const result = await importTransactions(
      "non-existent-portfolio-xyz",
      "symbol,type,quantity,price,date\nAAPL,BUY,1,100,2025-01-01"
    );
    assert.equal(result.success, false);
    if (result.success) return;
    assert.ok(result.error.includes("Portfolio not found"));
  });

  it("reports transaction-level errors (e.g., selling more than held)", async () => {
    const csv = `symbol,type,quantity,price,date
NVDA,SELL,9999,500,2025-06-01`;

    const result = await importTransactions(portfolioId, csv);
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.imported, 0);
    assert.equal(result.data.transactionErrors.length, 1);
    assert.ok(result.data.transactionErrors[0].message.includes("Insufficient"));
  });
});
