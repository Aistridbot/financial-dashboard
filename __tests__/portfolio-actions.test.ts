/**
 * Tests for Portfolio CRUD server actions.
 *
 * Tests a full create → read → update → delete cycle plus edge cases.
 * Uses a real SQLite database (pushed fresh before tests).
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

// We import the actions directly — the 'use server' directive is a no-op
// outside Next.js runtime, so the functions work as regular async functions.
import {
  getPortfolios,
  getPortfolio,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
} from "../lib/actions/portfolio";

const prisma = new PrismaClient();

describe("Portfolio CRUD actions", () => {
  // Clean slate before each test suite run
  before(async () => {
    await prisma.transaction.deleteMany();
    await prisma.holding.deleteMany();
    await prisma.portfolio.deleteMany();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  let createdId: string;

  it("createPortfolio — creates a new portfolio", async () => {
    const result = await createPortfolio({ name: "Test Portfolio", baseCurrency: "USD" });
    assert.equal(result.success, true);
    if (!result.success) return; // type narrowing
    assert.equal(result.data.name, "Test Portfolio");
    assert.equal(result.data.baseCurrency, "USD");
    assert.ok(result.data.id);
    createdId = result.data.id;
  });

  it("createPortfolio — defaults baseCurrency to EUR", async () => {
    const result = await createPortfolio({ name: "Euro Portfolio" });
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.baseCurrency, "EUR");
    // Clean up
    await deletePortfolio(result.data.id);
  });

  it("createPortfolio — rejects empty name", async () => {
    const result = await createPortfolio({ name: "" });
    assert.equal(result.success, false);
    if (result.success) return;
    assert.match(result.error, /name is required/i);
  });

  it("createPortfolio — rejects whitespace-only name", async () => {
    const result = await createPortfolio({ name: "   " });
    assert.equal(result.success, false);
  });

  it("getPortfolios — returns all portfolios", async () => {
    const result = await getPortfolios();
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.ok(result.data.length >= 1);
    const found = result.data.find((p) => p.id === createdId);
    assert.ok(found, "Should find the created portfolio");
  });

  it("getPortfolio — returns a single portfolio with relations", async () => {
    const result = await getPortfolio(createdId);
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.id, createdId);
    assert.equal(result.data.name, "Test Portfolio");
    assert.ok(Array.isArray(result.data.holdings));
    assert.ok(Array.isArray(result.data.transactions));
  });

  it("getPortfolio — returns error for nonexistent ID", async () => {
    const result = await getPortfolio("nonexistent-id");
    assert.equal(result.success, false);
    if (result.success) return;
    assert.match(result.error, /not found/i);
  });

  it("updatePortfolio — updates name", async () => {
    const result = await updatePortfolio(createdId, { name: "Renamed Portfolio" });
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.name, "Renamed Portfolio");
  });

  it("updatePortfolio — updates baseCurrency", async () => {
    const result = await updatePortfolio(createdId, { baseCurrency: "GBP" });
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.baseCurrency, "GBP");
  });

  it("updatePortfolio — rejects empty name", async () => {
    const result = await updatePortfolio(createdId, { name: "" });
    assert.equal(result.success, false);
    if (result.success) return;
    assert.match(result.error, /cannot be empty/i);
  });

  it("updatePortfolio — returns error for nonexistent ID", async () => {
    const result = await updatePortfolio("nonexistent-id", { name: "X" });
    assert.equal(result.success, false);
    if (result.success) return;
    assert.match(result.error, /not found/i);
  });

  it("deletePortfolio — deletes the portfolio", async () => {
    const result = await deletePortfolio(createdId);
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.id, createdId);

    // Verify it's gone
    const check = await getPortfolio(createdId);
    assert.equal(check.success, false);
  });

  it("deletePortfolio — returns error for nonexistent ID", async () => {
    const result = await deletePortfolio("nonexistent-id");
    assert.equal(result.success, false);
    if (result.success) return;
    assert.match(result.error, /not found/i);
  });
});
