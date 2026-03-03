import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "..");

describe("US-002: Prisma schema and database setup", () => {
  it("prisma/schema.prisma exists", () => {
    const schemaPath = join(ROOT, "prisma", "schema.prisma");
    assert.ok(existsSync(schemaPath), "schema.prisma should exist");
  });

  it("schema uses SQLite provider", () => {
    const schema = readFileSync(
      join(ROOT, "prisma", "schema.prisma"),
      "utf-8"
    );
    assert.ok(schema.includes('provider = "sqlite"'), "Should use SQLite");
    assert.ok(
      schema.includes("file:../.data/financial.db"),
      "Should point to .data/financial.db"
    );
  });

  it("schema defines all 7 required models", () => {
    const schema = readFileSync(
      join(ROOT, "prisma", "schema.prisma"),
      "utf-8"
    );
    const requiredModels = [
      "Portfolio",
      "Holding",
      "Transaction",
      "Signal",
      "DecisionQueueItem",
      "ExecutionLog",
      "NewsItem",
    ];
    for (const model of requiredModels) {
      assert.ok(
        schema.includes(`model ${model} {`),
        `Schema should define model ${model}`
      );
    }
  });

  it("Portfolio model has required fields", () => {
    const schema = readFileSync(
      join(ROOT, "prisma", "schema.prisma"),
      "utf-8"
    );
    const portfolioBlock = extractModel(schema, "Portfolio");
    assert.ok(portfolioBlock.includes("name"), "Portfolio needs name");
    assert.ok(
      portfolioBlock.includes("baseCurrency"),
      "Portfolio needs baseCurrency"
    );
    assert.ok(
      portfolioBlock.includes("createdAt"),
      "Portfolio needs createdAt"
    );
    assert.ok(
      portfolioBlock.includes("updatedAt"),
      "Portfolio needs updatedAt"
    );
  });

  it("Transaction model has type field for BUY/SELL", () => {
    const schema = readFileSync(
      join(ROOT, "prisma", "schema.prisma"),
      "utf-8"
    );
    const block = extractModel(schema, "Transaction");
    assert.ok(block.includes("type"), "Transaction needs type field");
    assert.ok(block.includes("fees"), "Transaction needs fees field");
    assert.ok(
      block.includes("occurredAt"),
      "Transaction needs occurredAt field"
    );
  });

  it("ExecutionLog has TOB tax fields", () => {
    const schema = readFileSync(
      join(ROOT, "prisma", "schema.prisma"),
      "utf-8"
    );
    const block = extractModel(schema, "ExecutionLog");
    assert.ok(
      block.includes("tobTaxAmount"),
      "ExecutionLog needs tobTaxAmount"
    );
    assert.ok(block.includes("tobTaxRate"), "ExecutionLog needs tobTaxRate");
  });

  it("NewsItem has sentiment fields", () => {
    const schema = readFileSync(
      join(ROOT, "prisma", "schema.prisma"),
      "utf-8"
    );
    const block = extractModel(schema, "NewsItem");
    assert.ok(block.includes("sentiment"), "NewsItem needs sentiment");
    assert.ok(
      block.includes("sentimentScore"),
      "NewsItem needs sentimentScore"
    );
  });

  it("lib/db.ts exists and exports prisma", async () => {
    const dbPath = join(ROOT, "lib", "db.ts");
    assert.ok(existsSync(dbPath), "lib/db.ts should exist");
    const content = readFileSync(dbPath, "utf-8");
    assert.ok(
      content.includes("PrismaClient"),
      "Should import PrismaClient"
    );
    assert.ok(
      content.includes("export const prisma"),
      "Should export prisma instance"
    );
    assert.ok(
      content.includes("export default prisma"),
      "Should have default export"
    );
  });

  it("lib/db.ts uses singleton pattern", () => {
    const content = readFileSync(join(ROOT, "lib", "db.ts"), "utf-8");
    assert.ok(
      content.includes("globalThis") || content.includes("global"),
      "Should use global singleton pattern"
    );
  });

  it("package.json has migrate and db:push scripts", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf-8")
    );
    assert.ok(pkg.scripts.migrate, "Should have migrate script");
    assert.ok(pkg.scripts["db:push"], "Should have db:push script");
    assert.ok(
      pkg.scripts.migrate.includes("prisma migrate"),
      "migrate should run prisma migrate"
    );
    assert.ok(
      pkg.scripts["db:push"].includes("prisma db push"),
      "db:push should run prisma db push"
    );
  });

  it("SQLite database file was created", () => {
    const dbFile = join(ROOT, ".data", "financial.db");
    assert.ok(existsSync(dbFile), ".data/financial.db should exist");
  });

  it("Prisma client was generated", () => {
    const clientPath = join(
      ROOT,
      "node_modules",
      ".prisma",
      "client",
      "index.js"
    );
    assert.ok(existsSync(clientPath), "Generated Prisma client should exist");
  });
});

/** Extract a model block from the schema string */
function extractModel(schema: string, name: string): string {
  const regex = new RegExp(`model ${name} \\{[^}]+\\}`, "s");
  const match = schema.match(regex);
  return match ? match[0] : "";
}
