const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const readUtf8 = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

test('README includes exact install/migrate/seed/run/test/typecheck commands', () => {
  const readme = readUtf8('README.md');

  const requiredCommands = [
    'npm install',
    'npm run migrate',
    'npm run seed',
    'npm run dev',
    'npm run start',
    'npm test',
    'npm run typecheck',
    'npm run verify:guarded',
  ];

  for (const command of requiredCommands) {
    assert.match(readme, new RegExp(command.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')));
  }
});

test('README documents implemented API routes and dashboard UI features', () => {
  const readme = readUtf8('README.md');

  const requiredRouteDocs = [
    'GET /api/stocks/quote?symbol=AAPL',
    'GET /api/stocks/history?symbol=AAPL&range=1M',
    'GET /api/portfolios',
    'POST /api/portfolios',
    'GET /api/portfolios/:id/holdings',
    'POST /api/portfolios/:id/transactions',
    'GET /api/dashboard/summary?portfolioId=<id>',
    '/dashboard',
    '/dashboard.js',
  ];

  for (const docItem of requiredRouteDocs) {
    assert.match(readme, new RegExp(docItem.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')));
  }

  assert.match(readme, /error": \{ "code", "message", "details\?" \}/);
});

test('PR checklist exists and includes mechanically verifiable MVP items', () => {
  const checklist = readUtf8('docs/PR_CHECKLIST.md');

  assert.match(checklist, /npm run verify:guarded/);
  assert.match(checklist, /build -> test -> typecheck/);
  assert.match(checklist, /GET \/api\/stocks\/quote\?symbol=AAPL/);
  assert.match(checklist, /GET \/api\/dashboard\/summary\?portfolioId=<id>/);
  assert.match(checklist, /Creating a transaction from the form refreshes both summary cards and table/);
});

test('guarded verification script enforces build, test, typecheck order', () => {
  const packageJson = JSON.parse(readUtf8('package.json'));

  assert.equal(
    packageJson.scripts['verify:guarded'],
    'npm run build && npm test && npm run typecheck'
  );
});
