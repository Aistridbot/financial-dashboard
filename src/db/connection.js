const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function resolveDbPath(overridePath) {
  if (overridePath) return overridePath;
  if (process.env.FINANCIAL_DB_PATH) return process.env.FINANCIAL_DB_PATH;
  return path.resolve(process.cwd(), '.data', 'financial.db');
}

function openDatabase(options = {}) {
  const dbPath = resolveDbPath(options.dbPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

module.exports = {
  openDatabase,
  resolveDbPath,
};
