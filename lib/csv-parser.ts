/**
 * CSV parser for portfolio transaction imports.
 *
 * Parses standard CSV with a header row into typed transaction rows.
 * No external dependencies — uses simple split-based parsing.
 *
 * Supported columns (case-insensitive):
 *   symbol   — ticker symbol (required)
 *   type     — BUY or SELL (required)
 *   quantity — number of shares (required, must be positive)
 *   price    — price per share (required, must be non-negative)
 *   date     — transaction date (required, must be parseable by Date)
 *   fees     — transaction fees (optional, defaults to 0)
 */

// ── Types ───────────────────────────────────────────────────────────────

export type ParsedTransaction = {
  symbol: string;
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  date: Date;
  fees: number;
};

export type ParseError = {
  row: number;
  message: string;
};

export type ParseResult = {
  valid: ParsedTransaction[];
  errors: ParseError[];
};

// ── Column mapping ──────────────────────────────────────────────────────

const REQUIRED_COLUMNS = ["symbol", "type", "quantity", "price", "date"] as const;
const ALL_COLUMNS = [...REQUIRED_COLUMNS, "fees"] as const;

type ColumnName = (typeof ALL_COLUMNS)[number];

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Split a single CSV line on commas, respecting quoted fields.
 * Handles fields wrapped in double quotes (e.g. "Hello, World").
 */
function splitCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parse a CSV string of portfolio transactions.
 *
 * First row must be a header containing at least the required columns.
 * Returns valid parsed rows and any per-row errors.
 */
export function parseTransactionCSV(csvString: string): ParseResult {
  const valid: ParsedTransaction[] = [];
  const errors: ParseError[] = [];

  if (!csvString || csvString.trim().length === 0) {
    return { valid, errors };
  }

  const lines = csvString
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { valid, errors };
  }

  // ── Parse header ────────────────────────────────────────────────────
  const headerFields = splitCSVLine(lines[0]).map((h) => h.toLowerCase());
  const columnIndex: Partial<Record<ColumnName, number>> = {};

  for (const col of ALL_COLUMNS) {
    const idx = headerFields.indexOf(col);
    if (idx !== -1) {
      columnIndex[col] = idx;
    }
  }

  // Check all required columns are present
  const missingCols = REQUIRED_COLUMNS.filter((c) => columnIndex[c] == null);
  if (missingCols.length > 0) {
    errors.push({
      row: 1,
      message: `Missing required column(s): ${missingCols.join(", ")}`,
    });
    return { valid, errors };
  }

  // ── Parse data rows ─────────────────────────────────────────────────
  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1; // 1-indexed, accounting for header
    const fields = splitCSVLine(lines[i]);

    try {
      // Symbol
      const symbol = fields[columnIndex.symbol!]?.trim();
      if (!symbol) {
        errors.push({ row: rowNum, message: "Missing symbol" });
        continue;
      }

      // Type
      const rawType = fields[columnIndex.type!]?.trim().toUpperCase();
      if (rawType !== "BUY" && rawType !== "SELL") {
        errors.push({
          row: rowNum,
          message: `Invalid type "${fields[columnIndex.type!]?.trim() ?? ""}" — must be BUY or SELL`,
        });
        continue;
      }

      // Quantity
      const rawQty = fields[columnIndex.quantity!]?.trim();
      const quantity = Number(rawQty);
      if (!rawQty || isNaN(quantity) || quantity <= 0) {
        errors.push({
          row: rowNum,
          message: `Invalid quantity "${rawQty ?? ""}" — must be a positive number`,
        });
        continue;
      }

      // Price
      const rawPrice = fields[columnIndex.price!]?.trim();
      const price = Number(rawPrice);
      if (!rawPrice || isNaN(price) || price < 0) {
        errors.push({
          row: rowNum,
          message: `Invalid price "${rawPrice ?? ""}" — must be a non-negative number`,
        });
        continue;
      }

      // Date
      const rawDate = fields[columnIndex.date!]?.trim();
      if (!rawDate) {
        errors.push({ row: rowNum, message: "Missing date" });
        continue;
      }
      const date = new Date(rawDate);
      if (isNaN(date.getTime())) {
        errors.push({
          row: rowNum,
          message: `Invalid date "${rawDate}" — must be a parseable date string`,
        });
        continue;
      }

      // Fees (optional)
      let fees = 0;
      if (columnIndex.fees != null) {
        const rawFees = fields[columnIndex.fees]?.trim();
        if (rawFees && rawFees.length > 0) {
          const parsedFees = Number(rawFees);
          if (isNaN(parsedFees) || parsedFees < 0) {
            errors.push({
              row: rowNum,
              message: `Invalid fees "${rawFees}" — must be a non-negative number`,
            });
            continue;
          }
          fees = parsedFees;
        }
      }

      valid.push({
        symbol: symbol.toUpperCase(),
        type: rawType as "BUY" | "SELL",
        quantity,
        price,
        date,
        fees,
      });
    } catch (e) {
      errors.push({
        row: rowNum,
        message: `Unexpected error: ${String(e)}`,
      });
    }
  }

  return { valid, errors };
}
