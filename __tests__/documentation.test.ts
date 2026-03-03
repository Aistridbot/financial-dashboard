import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

describe('US-020: Documentation and AI maintenance guide', () => {
  describe('docs/ARCHITECTURE.md', () => {
    const filePath = path.join(DOCS, 'ARCHITECTURE.md');

    it('exists', () => {
      assert.ok(fileExists(filePath), 'docs/ARCHITECTURE.md should exist');
    });

    it('contains system overview', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('System Overview') || content.includes('system overview'),
        'Should contain system overview section');
    });

    it('contains tech stack', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('Tech Stack') || content.includes('tech stack'),
        'Should contain tech stack section');
    });

    it('contains directory structure', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('Directory Structure') || content.includes('directory structure'),
        'Should contain directory structure section');
    });

    it('contains data flow', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('Data Flow') || content.includes('data flow'),
        'Should contain data flow section');
    });

    it('mentions key technologies', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('Next.js'), 'Should mention Next.js');
      assert.ok(content.includes('Prisma'), 'Should mention Prisma');
      assert.ok(content.includes('SQLite'), 'Should mention SQLite');
      assert.ok(content.includes('shadcn'), 'Should mention shadcn/ui');
      assert.ok(content.includes('Finnhub'), 'Should mention Finnhub');
    });

    it('has substantial content (>2000 chars)', () => {
      const content = readFile(filePath);
      assert.ok(content.length > 2000,
        `ARCHITECTURE.md should be substantial (got ${content.length} chars)`);
    });
  });

  describe('docs/DATABASE.md', () => {
    const filePath = path.join(DOCS, 'DATABASE.md');

    it('exists', () => {
      assert.ok(fileExists(filePath), 'docs/DATABASE.md should exist');
    });

    it('documents all Prisma models', () => {
      const content = readFile(filePath);
      const models = ['Portfolio', 'Holding', 'Transaction', 'Signal',
        'DecisionQueueItem', 'ExecutionLog', 'NewsItem'];
      for (const model of models) {
        assert.ok(content.includes(model),
          `Should document ${model} model`);
      }
    });

    it('includes field descriptions', () => {
      const content = readFile(filePath);
      // Check for common field patterns
      assert.ok(content.includes('symbol'), 'Should describe symbol field');
      assert.ok(content.includes('quantity'), 'Should describe quantity field');
      assert.ok(content.includes('avgCostBasis') || content.includes('avg'),
        'Should describe avgCostBasis field');
    });

    it('describes relationships', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('Relation') || content.includes('relation') || content.includes('1:N') || content.includes('one-to-many'),
        'Should describe model relationships');
    });

    it('has substantial content (>2000 chars)', () => {
      const content = readFile(filePath);
      assert.ok(content.length > 2000,
        `DATABASE.md should be substantial (got ${content.length} chars)`);
    });
  });

  describe('docs/API.md', () => {
    const filePath = path.join(DOCS, 'API.md');

    it('exists', () => {
      assert.ok(fileExists(filePath), 'docs/API.md should exist');
    });

    it('documents server actions', () => {
      const content = readFile(filePath);
      const actions = ['getPortfolios', 'createTransaction', 'getHoldings',
        'getSignals', 'getDecisions', 'getExecutionLogs', 'getNewsItems',
        'refreshQuotes', 'generateAndStoreSignals'];
      for (const action of actions) {
        assert.ok(content.includes(action),
          `Should document ${action} action`);
      }
    });

    it('includes parameter descriptions', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('Parameters') || content.includes('parameters'),
        'Should include parameter documentation');
    });

    it('includes return types', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('Returns') || content.includes('ActionResult'),
        'Should include return type documentation');
    });

    it('has substantial content (>3000 chars)', () => {
      const content = readFile(filePath);
      assert.ok(content.length > 3000,
        `API.md should be substantial (got ${content.length} chars)`);
    });
  });

  describe('docs/EXTENDING.md', () => {
    const filePath = path.join(DOCS, 'EXTENDING.md');

    it('exists', () => {
      assert.ok(fileExists(filePath), 'docs/EXTENDING.md should exist');
    });

    it('covers adding new tabs', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('Adding a New Tab') || content.includes('new tab'),
        'Should cover adding new tabs');
    });

    it('covers adding signal strategies', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('Signal Strateg') || content.includes('signal strateg'),
        'Should cover adding signal strategies');
    });

    it('covers adding tax regimes', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('Tax Regime') || content.includes('tax regime'),
        'Should cover adding tax regimes');
    });

    it('covers adding data sources', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('Data Source') || content.includes('data source'),
        'Should cover adding data sources');
    });

    it('has substantial content (>2000 chars)', () => {
      const content = readFile(filePath);
      assert.ok(content.length > 2000,
        `EXTENDING.md should be substantial (got ${content.length} chars)`);
    });
  });

  describe('docs/FINNHUB.md', () => {
    const filePath = path.join(DOCS, 'FINNHUB.md');

    it('exists', () => {
      assert.ok(fileExists(filePath), 'docs/FINNHUB.md should exist');
    });

    it('covers API setup', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('Setup') || content.includes('setup'),
        'Should cover API setup');
      assert.ok(content.includes('FINNHUB_API_KEY'),
        'Should mention FINNHUB_API_KEY');
    });

    it('covers rate limits', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('Rate Limit') || content.includes('rate limit'),
        'Should cover rate limits');
      assert.ok(content.includes('60'),
        'Should mention the 60 requests/minute limit');
    });

    it('covers mock mode', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('Mock Mode') || content.includes('mock mode') || content.includes('mock'),
        'Should cover mock mode');
    });

    it('has substantial content (>1500 chars)', () => {
      const content = readFile(filePath);
      assert.ok(content.length > 1500,
        `FINNHUB.md should be substantial (got ${content.length} chars)`);
    });
  });

  describe('README.md', () => {
    const filePath = path.join(ROOT, 'README.md');

    it('exists', () => {
      assert.ok(fileExists(filePath), 'README.md should exist');
    });

    it('contains setup instructions', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('npm install'), 'Should have npm install instruction');
      assert.ok(content.includes('prisma') || content.includes('db push'),
        'Should have database setup instructions');
    });

    it('documents environment variables', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('FINNHUB_API_KEY'),
        'Should document FINNHUB_API_KEY');
      assert.ok(content.includes('.env') || content.includes('env'),
        'Should mention .env configuration');
    });

    it('lists npm scripts', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('npm run dev') || content.includes('`dev`'),
        'Should list dev script');
      assert.ok(content.includes('npm run build') || content.includes('`build`'),
        'Should list build script');
      assert.ok(content.includes('npm test') || content.includes('`test`'),
        'Should list test script');
    });

    it('has substantial content (>1500 chars)', () => {
      const content = readFile(filePath);
      assert.ok(content.length > 1500,
        `README.md should be substantial (got ${content.length} chars)`);
    });
  });

  describe('.env.example', () => {
    const filePath = path.join(ROOT, '.env.example');

    it('exists', () => {
      assert.ok(fileExists(filePath), '.env.example should exist');
    });

    it('lists FINNHUB_API_KEY', () => {
      const content = readFile(filePath);
      assert.ok(content.includes('FINNHUB_API_KEY'),
        'Should list FINNHUB_API_KEY');
    });

    it('does not contain real credentials', () => {
      const content = readFile(filePath);
      // Should not contain anything that looks like a real API key
      const lines = content.split('\n').filter(l => !l.startsWith('#') && l.includes('='));
      for (const line of lines) {
        const value = line.split('=')[1]?.trim();
        // Values should be empty or placeholder
        assert.ok(!value || value.length < 30,
          `${line} should not contain a real credential`);
      }
    });

    it('has descriptive comments', () => {
      const content = readFile(filePath);
      const commentLines = content.split('\n').filter(l => l.startsWith('#'));
      assert.ok(commentLines.length >= 3,
        'Should have descriptive comments');
    });
  });
});
