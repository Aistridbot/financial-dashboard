import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTransactionCSV } from "../lib/csv-parser";

describe("parseTransactionCSV", () => {
  // ── Valid data ──────────────────────────────────────────────────────

  it("parses a simple valid CSV", () => {
    const csv = `symbol,type,quantity,price,date,fees
AAPL,BUY,10,150.50,2025-01-15,4.99
MSFT,SELL,5,400.00,2025-02-01,2.50`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 2);
    assert.equal(result.errors.length, 0);

    const first = result.valid[0];
    assert.equal(first.symbol, "AAPL");
    assert.equal(first.type, "BUY");
    assert.equal(first.quantity, 10);
    assert.equal(first.price, 150.5);
    assert.equal(first.fees, 4.99);
    assert.equal(first.date.toISOString().slice(0, 10), "2025-01-15");

    const second = result.valid[1];
    assert.equal(second.symbol, "MSFT");
    assert.equal(second.type, "SELL");
    assert.equal(second.quantity, 5);
  });

  it("handles case-insensitive headers", () => {
    const csv = `Symbol,Type,Quantity,Price,Date
tsla,buy,3,200,2025-06-01`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 1);
    assert.equal(result.valid[0].symbol, "TSLA");
    assert.equal(result.valid[0].type, "BUY");
  });

  it("normalizes symbols to uppercase", () => {
    const csv = `symbol,type,quantity,price,date
aapl,BUY,1,100,2025-01-01`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid[0].symbol, "AAPL");
  });

  it("accepts type in any case", () => {
    const csv = `symbol,type,quantity,price,date
AAPL,buy,1,100,2025-01-01
MSFT,Sell,2,200,2025-01-02`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 2);
    assert.equal(result.valid[0].type, "BUY");
    assert.equal(result.valid[1].type, "SELL");
  });

  it("defaults fees to 0 when column missing", () => {
    const csv = `symbol,type,quantity,price,date
AAPL,BUY,10,150,2025-01-15`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid[0].fees, 0);
  });

  it("defaults fees to 0 when field is empty", () => {
    const csv = `symbol,type,quantity,price,date,fees
AAPL,BUY,10,150,2025-01-15,`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid[0].fees, 0);
  });

  it("handles quoted fields with commas", () => {
    const csv = `symbol,type,quantity,price,date
"AAPL",BUY,10,150.50,2025-01-15`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 1);
    assert.equal(result.valid[0].symbol, "AAPL");
  });

  it("handles Windows-style CRLF line endings", () => {
    const csv = "symbol,type,quantity,price,date\r\nAAPL,BUY,10,150,2025-01-15\r\nMSFT,BUY,5,400,2025-02-01\r\n";

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 2);
  });

  it("allows price of 0", () => {
    const csv = `symbol,type,quantity,price,date
AAPL,BUY,10,0,2025-01-15`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 1);
    assert.equal(result.valid[0].price, 0);
  });

  it("handles columns in different order", () => {
    const csv = `date,price,quantity,type,symbol,fees
2025-01-15,150,10,BUY,AAPL,5`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 1);
    assert.equal(result.valid[0].symbol, "AAPL");
    assert.equal(result.valid[0].price, 150);
    assert.equal(result.valid[0].fees, 5);
  });

  // ── Empty / edge cases ──────────────────────────────────────────────

  it("returns empty results for empty string", () => {
    const result = parseTransactionCSV("");
    assert.equal(result.valid.length, 0);
    assert.equal(result.errors.length, 0);
  });

  it("returns empty results for null-ish input", () => {
    const result = parseTransactionCSV(null as any);
    assert.equal(result.valid.length, 0);
    assert.equal(result.errors.length, 0);
  });

  it("returns empty results for whitespace-only input", () => {
    const result = parseTransactionCSV("   \n  \n  ");
    assert.equal(result.valid.length, 0);
    assert.equal(result.errors.length, 0);
  });

  it("returns empty valid for header-only CSV", () => {
    const result = parseTransactionCSV("symbol,type,quantity,price,date");
    assert.equal(result.valid.length, 0);
    assert.equal(result.errors.length, 0);
  });

  // ── Validation errors ───────────────────────────────────────────────

  it("errors on missing required columns in header", () => {
    const csv = `symbol,quantity
AAPL,10`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 0);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].row, 1);
    assert.ok(result.errors[0].message.includes("Missing required column"));
  });

  it("errors on missing symbol", () => {
    const csv = `symbol,type,quantity,price,date
,BUY,10,150,2025-01-15`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 0);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].row, 2);
    assert.ok(result.errors[0].message.includes("symbol"));
  });

  it("errors on invalid type", () => {
    const csv = `symbol,type,quantity,price,date
AAPL,HOLD,10,150,2025-01-15`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 0);
    assert.equal(result.errors[0].row, 2);
    assert.ok(result.errors[0].message.includes("Invalid type"));
  });

  it("errors on non-numeric quantity", () => {
    const csv = `symbol,type,quantity,price,date
AAPL,BUY,abc,150,2025-01-15`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 0);
    assert.equal(result.errors[0].row, 2);
    assert.ok(result.errors[0].message.includes("quantity"));
  });

  it("errors on zero quantity", () => {
    const csv = `symbol,type,quantity,price,date
AAPL,BUY,0,150,2025-01-15`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 0);
    assert.ok(result.errors[0].message.includes("quantity"));
  });

  it("errors on negative quantity", () => {
    const csv = `symbol,type,quantity,price,date
AAPL,BUY,-5,150,2025-01-15`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 0);
    assert.ok(result.errors[0].message.includes("quantity"));
  });

  it("errors on negative price", () => {
    const csv = `symbol,type,quantity,price,date
AAPL,BUY,10,-50,2025-01-15`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 0);
    assert.ok(result.errors[0].message.includes("price"));
  });

  it("errors on non-numeric price", () => {
    const csv = `symbol,type,quantity,price,date
AAPL,BUY,10,xyz,2025-01-15`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 0);
    assert.ok(result.errors[0].message.includes("price"));
  });

  it("errors on invalid date", () => {
    const csv = `symbol,type,quantity,price,date
AAPL,BUY,10,150,not-a-date`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 0);
    assert.ok(result.errors[0].message.includes("date"));
  });

  it("errors on missing date", () => {
    const csv = `symbol,type,quantity,price,date
AAPL,BUY,10,150,`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 0);
    assert.ok(result.errors[0].message.includes("date"));
  });

  it("errors on negative fees", () => {
    const csv = `symbol,type,quantity,price,date,fees
AAPL,BUY,10,150,2025-01-15,-5`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 0);
    assert.ok(result.errors[0].message.includes("fees"));
  });

  // ── Mixed valid and invalid ─────────────────────────────────────────

  it("separates valid rows from invalid rows", () => {
    const csv = `symbol,type,quantity,price,date,fees
AAPL,BUY,10,150.50,2025-01-15,4.99
,BUY,5,400,2025-02-01,2.50
GOOG,SELL,3,180.25,2025-03-01,1.00
TSLA,BUY,abc,200,2025-04-01,0`;

    const result = parseTransactionCSV(csv);
    assert.equal(result.valid.length, 2);
    assert.equal(result.errors.length, 2);
    assert.equal(result.valid[0].symbol, "AAPL");
    assert.equal(result.valid[1].symbol, "GOOG");
    assert.equal(result.errors[0].row, 3); // empty symbol
    assert.equal(result.errors[1].row, 5); // invalid quantity
  });
});
