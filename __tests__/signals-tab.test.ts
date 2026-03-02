import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// ─── Pure function imports ───────────────────────────────────
import {
  getDirectionBadgeColor,
  formatSignalDate,
  type SignalCardData,
} from '../components/signals/signal-card';
import {
  validateConfidenceInput,
  DIRECTION_OPTIONS,
  type SignalFilterValues,
} from '../components/signals/signal-filters';
import { applySignalFilters } from '../components/signals/signal-list';

// ─── Helpers ─────────────────────────────────────────────────
const root = path.join(__dirname, '..');

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function fileContains(rel: string, text: string): boolean {
  const content = fs.readFileSync(path.join(root, rel), 'utf-8');
  return content.includes(text);
}

const sampleSignal: SignalCardData = {
  id: 'sig-1',
  symbol: 'AAPL',
  direction: 'BUY',
  confidence: 0.85,
  source: 'price-drop-strategy',
  reasoning: 'Stock dropped 12% — potential recovery play',
  createdAt: '2026-03-01T10:00:00.000Z',
  expiresAt: '2026-03-08T10:00:00.000Z',
};

// ─── File Structure Tests ────────────────────────────────────
describe('US-012: Signals tab file structure', () => {
  it('signal-card.tsx exists', () => {
    assert.ok(fileExists('components/signals/signal-card.tsx'));
  });

  it('signal-filters.tsx exists', () => {
    assert.ok(fileExists('components/signals/signal-filters.tsx'));
  });

  it('signal-list.tsx exists', () => {
    assert.ok(fileExists('components/signals/signal-list.tsx'));
  });

  it('signals page.tsx exists', () => {
    assert.ok(fileExists('app/dashboard/signals/page.tsx'));
  });

  it('decision-queue action exists', () => {
    assert.ok(fileExists('lib/actions/decision-queue.ts'));
  });
});

// ─── Signal Card Component Tests ─────────────────────────────
describe('US-012: signal-card.tsx structure', () => {
  it('exports SignalCard component', () => {
    assert.ok(fileContains('components/signals/signal-card.tsx', 'export function SignalCard'));
  });

  it('exports SignalCardData interface', () => {
    assert.ok(fileContains('components/signals/signal-card.tsx', 'export interface SignalCardData'));
  });

  it('exports getDirectionBadgeColor helper', () => {
    assert.ok(fileContains('components/signals/signal-card.tsx', 'export function getDirectionBadgeColor'));
  });

  it('renders symbol', () => {
    assert.ok(fileContains('components/signals/signal-card.tsx', 'signal.symbol'));
  });

  it('renders direction badge', () => {
    assert.ok(fileContains('components/signals/signal-card.tsx', 'signal.direction'));
  });

  it('renders confidence', () => {
    assert.ok(fileContains('components/signals/signal-card.tsx', 'confidencePercent'));
  });

  it('renders reasoning', () => {
    assert.ok(fileContains('components/signals/signal-card.tsx', 'signal.reasoning'));
  });

  it('renders created date', () => {
    assert.ok(fileContains('components/signals/signal-card.tsx', 'signal.createdAt'));
  });

  it('renders expiry date', () => {
    assert.ok(fileContains('components/signals/signal-card.tsx', 'signal.expiresAt'));
  });

  it('has Send to Decision Queue button', () => {
    assert.ok(fileContains('components/signals/signal-card.tsx', 'Send to Decision Queue'));
  });

  it('is a client component', () => {
    assert.ok(fileContains('components/signals/signal-card.tsx', "'use client'"));
  });
});

// ─── Direction Badge Color Tests ─────────────────────────────
describe('US-012: getDirectionBadgeColor', () => {
  it('returns green class for BUY', () => {
    const color = getDirectionBadgeColor('BUY');
    assert.ok(color.includes('green'), `Expected green for BUY, got: ${color}`);
  });

  it('returns red class for SELL', () => {
    const color = getDirectionBadgeColor('SELL');
    assert.ok(color.includes('red'), `Expected red for SELL, got: ${color}`);
  });

  it('returns gray class for HOLD', () => {
    const color = getDirectionBadgeColor('HOLD');
    assert.ok(color.includes('gray'), `Expected gray for HOLD, got: ${color}`);
  });

  it('returns default gray for unknown direction', () => {
    const color = getDirectionBadgeColor('UNKNOWN');
    assert.ok(color.includes('gray'), `Expected gray for unknown, got: ${color}`);
  });
});

// ─── formatSignalDate Tests ──────────────────────────────────
describe('US-012: formatSignalDate', () => {
  it('formats a valid ISO date', () => {
    const result = formatSignalDate('2026-03-01T10:00:00.000Z');
    assert.ok(result.includes('2026'), `Expected year in result: ${result}`);
    assert.ok(result.includes('Mar'), `Expected month in result: ${result}`);
  });

  it('returns dash for null', () => {
    assert.equal(formatSignalDate(null), '—');
  });
});

// ─── Signal Filters Component Tests ──────────────────────────
describe('US-012: signal-filters.tsx structure', () => {
  it('exports SignalFilters component', () => {
    assert.ok(fileContains('components/signals/signal-filters.tsx', 'export function SignalFilters'));
  });

  it('exports SignalFilterValues interface', () => {
    assert.ok(fileContains('components/signals/signal-filters.tsx', 'export interface SignalFilterValues'));
  });

  it('exports DIRECTION_OPTIONS', () => {
    assert.ok(fileContains('components/signals/signal-filters.tsx', 'export const DIRECTION_OPTIONS'));
  });

  it('has direction filter', () => {
    assert.ok(fileContains('components/signals/signal-filters.tsx', 'direction-filter'));
  });

  it('has confidence filter', () => {
    assert.ok(fileContains('components/signals/signal-filters.tsx', 'confidence-filter'));
  });

  it('is a client component', () => {
    assert.ok(fileContains('components/signals/signal-filters.tsx', "'use client'"));
  });
});

// ─── validateConfidenceInput Tests ───────────────────────────
describe('US-012: validateConfidenceInput', () => {
  it('parses valid number', () => {
    assert.equal(validateConfidenceInput('50'), 50);
  });

  it('clamps below 0 to 0', () => {
    assert.equal(validateConfidenceInput('-10'), 0);
  });

  it('clamps above 100 to 100', () => {
    assert.equal(validateConfidenceInput('150'), 100);
  });

  it('returns 0 for non-numeric input', () => {
    assert.equal(validateConfidenceInput('abc'), 0);
  });

  it('returns 0 for empty string', () => {
    assert.equal(validateConfidenceInput(''), 0);
  });

  it('handles boundary value 0', () => {
    assert.equal(validateConfidenceInput('0'), 0);
  });

  it('handles boundary value 100', () => {
    assert.equal(validateConfidenceInput('100'), 100);
  });
});

// ─── DIRECTION_OPTIONS Tests ─────────────────────────────────
describe('US-012: DIRECTION_OPTIONS', () => {
  it('has 4 options', () => {
    assert.equal(DIRECTION_OPTIONS.length, 4);
  });

  it('first option is All Directions with empty value', () => {
    assert.equal(DIRECTION_OPTIONS[0].value, '');
    assert.equal(DIRECTION_OPTIONS[0].label, 'All Directions');
  });

  it('includes BUY, SELL, HOLD', () => {
    const values = DIRECTION_OPTIONS.map((o) => o.value);
    assert.ok(values.includes('BUY'));
    assert.ok(values.includes('SELL'));
    assert.ok(values.includes('HOLD'));
  });
});

// ─── Signal List Component Tests ─────────────────────────────
describe('US-012: signal-list.tsx structure', () => {
  it('exports SignalList component', () => {
    assert.ok(fileContains('components/signals/signal-list.tsx', 'export function SignalList'));
  });

  it('exports applySignalFilters helper', () => {
    assert.ok(fileContains('components/signals/signal-list.tsx', 'export function applySignalFilters'));
  });

  it('imports SignalCard', () => {
    assert.ok(fileContains('components/signals/signal-list.tsx', 'SignalCard'));
  });

  it('imports SignalFilters', () => {
    assert.ok(fileContains('components/signals/signal-list.tsx', 'SignalFilters'));
  });

  it('imports sendToDecisionQueue', () => {
    assert.ok(fileContains('components/signals/signal-list.tsx', 'sendToDecisionQueue'));
  });

  it('is a client component', () => {
    assert.ok(fileContains('components/signals/signal-list.tsx', "'use client'"));
  });

  it('shows empty state message', () => {
    assert.ok(fileContains('components/signals/signal-list.tsx', 'No signals match'));
  });
});

// ─── applySignalFilters Tests ────────────────────────────────
describe('US-012: applySignalFilters', () => {
  const signals: SignalCardData[] = [
    { ...sampleSignal, id: 's1', direction: 'BUY', confidence: 0.9 },
    { ...sampleSignal, id: 's2', direction: 'SELL', confidence: 0.7 },
    { ...sampleSignal, id: 's3', direction: 'HOLD', confidence: 0.3 },
    { ...sampleSignal, id: 's4', direction: 'BUY', confidence: 0.5 },
  ];

  it('returns all signals with no filters', () => {
    const result = applySignalFilters(signals, { direction: '', minConfidence: 0 });
    assert.equal(result.length, 4);
  });

  it('filters by direction BUY', () => {
    const result = applySignalFilters(signals, { direction: 'BUY', minConfidence: 0 });
    assert.equal(result.length, 2);
    assert.ok(result.every((s) => s.direction === 'BUY'));
  });

  it('filters by direction SELL', () => {
    const result = applySignalFilters(signals, { direction: 'SELL', minConfidence: 0 });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 's2');
  });

  it('filters by direction HOLD', () => {
    const result = applySignalFilters(signals, { direction: 'HOLD', minConfidence: 0 });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 's3');
  });

  it('filters by minimum confidence', () => {
    const result = applySignalFilters(signals, { direction: '', minConfidence: 60 });
    assert.equal(result.length, 2);
    assert.ok(result.every((s) => s.confidence >= 0.6));
  });

  it('combines direction and confidence filters', () => {
    const result = applySignalFilters(signals, { direction: 'BUY', minConfidence: 80 });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 's1');
  });

  it('returns empty array when nothing matches', () => {
    const result = applySignalFilters(signals, { direction: 'SELL', minConfidence: 90 });
    assert.equal(result.length, 0);
  });

  it('handles empty signals array', () => {
    const result = applySignalFilters([], { direction: 'BUY', minConfidence: 0 });
    assert.equal(result.length, 0);
  });

  it('confidence 0 includes all', () => {
    const result = applySignalFilters(signals, { direction: '', minConfidence: 0 });
    assert.equal(result.length, 4);
  });

  it('confidence 100 only includes 100% confidence', () => {
    const result = applySignalFilters(signals, { direction: '', minConfidence: 100 });
    assert.equal(result.length, 0); // none are at exactly 100%
  });
});

// ─── Signals Page Tests ──────────────────────────────────────
describe('US-012: signals page integration', () => {
  it('page imports SignalList', () => {
    assert.ok(fileContains('app/dashboard/signals/page.tsx', 'SignalList'));
  });

  it('page imports getSignals action', () => {
    assert.ok(fileContains('app/dashboard/signals/page.tsx', 'getSignals'));
  });

  it('page is async server component', () => {
    assert.ok(fileContains('app/dashboard/signals/page.tsx', 'async function'));
  });

  it('page maps signal dates to ISO strings', () => {
    assert.ok(fileContains('app/dashboard/signals/page.tsx', 'toISOString'));
  });

  it('page handles error state', () => {
    assert.ok(fileContains('app/dashboard/signals/page.tsx', 'result.success'));
  });
});

// ─── Decision Queue Action Tests ─────────────────────────────
describe('US-012: decision-queue action structure', () => {
  it('exports sendToDecisionQueue', () => {
    assert.ok(fileContains('lib/actions/decision-queue.ts', 'export async function sendToDecisionQueue'));
  });

  it('has use server directive', () => {
    assert.ok(fileContains('lib/actions/decision-queue.ts', "'use server'"));
  });

  it('validates signal ID', () => {
    assert.ok(fileContains('lib/actions/decision-queue.ts', 'Signal ID is required'));
  });

  it('checks for duplicate pending items', () => {
    assert.ok(fileContains('lib/actions/decision-queue.ts', 'already in the decision queue'));
  });
});
