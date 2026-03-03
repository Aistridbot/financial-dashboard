import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// ─── Helper ───────────────────────────────────────────────────
function readComponent(relPath: string): string {
  const fullPath = path.join(__dirname, '..', relPath);
  assert.ok(fs.existsSync(fullPath), `File should exist: ${relPath}`);
  return fs.readFileSync(fullPath, 'utf-8');
}

// ═══════════════════════════════════════════════════════════════
// 1. decision-card.tsx — structure & exports
// ═══════════════════════════════════════════════════════════════
describe('DecisionCard component', () => {
  let src: string;

  before(() => {
    src = readComponent('components/decisions/decision-card.tsx');
  });

  it('file exists and is a client component', () => {
    assert.ok(src.includes("'use client'"), 'Should be a client component');
  });

  it('exports DecisionCard function', () => {
    assert.ok(src.includes('export function DecisionCard'), 'Should export DecisionCard');
  });

  it('exports DecisionCardData interface', () => {
    assert.ok(src.includes('export interface DecisionCardData'), 'Should export DecisionCardData');
  });

  it('exports getStatusBadgeColor helper', () => {
    assert.ok(src.includes('export function getStatusBadgeColor'), 'Should export getStatusBadgeColor');
  });

  it('renders signal symbol in CardTitle', () => {
    assert.ok(src.includes('decision.signal.symbol'), 'Should display symbol');
  });

  it('shows status badge', () => {
    assert.ok(src.includes('decision.status'), 'Should display status');
    assert.ok(src.includes('getStatusBadgeColor'), 'Should color-code status');
  });

  it('shows direction badge', () => {
    assert.ok(src.includes('decision.signal.direction'), 'Should display direction');
  });

  it('shows confidence info', () => {
    assert.ok(src.includes('confidencePercent'), 'Should display confidence');
  });

  it('shows reasoning when present', () => {
    assert.ok(src.includes('decision.signal.reasoning'), 'Should display reasoning');
  });

  it('shows notes when present', () => {
    assert.ok(src.includes('decision.notes'), 'Should display notes');
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. decision-card.tsx — button visibility per status
// ═══════════════════════════════════════════════════════════════
describe('DecisionCard button visibility logic', () => {
  let src: string;

  before(() => {
    src = readComponent('components/decisions/decision-card.tsx');
  });

  it('PENDING items show approve and reject buttons', () => {
    assert.ok(src.includes("isPending"), 'Should check isPending');
    assert.ok(src.includes("data-testid=\"approve-btn\""), 'Should have approve button');
    assert.ok(src.includes("data-testid=\"reject-btn\""), 'Should have reject button');
    // Verify isPending drives the section
    assert.ok(src.includes("{isPending && ("), 'Should conditionally render pending actions');
  });

  it('APPROVED items show execute button', () => {
    assert.ok(src.includes("isApproved"), 'Should check isApproved');
    assert.ok(src.includes("data-testid=\"execute-btn\""), 'Should have execute button');
    assert.ok(src.includes("{isApproved && ("), 'Should conditionally render approved actions');
  });

  it('isPending is derived from PENDING status', () => {
    assert.ok(src.includes("decision.status === 'PENDING'"), 'isPending checks PENDING');
  });

  it('isApproved is derived from APPROVED status', () => {
    assert.ok(src.includes("decision.status === 'APPROVED'"), 'isApproved checks APPROVED');
  });

  it('REJECTED items have no action buttons (no isRejected block)', () => {
    // There should be no conditional block for REJECTED rendering buttons
    assert.ok(!src.includes("isRejected"), 'Should not have isRejected variable');
  });

  it('EXECUTED items have no action buttons (no isExecuted block)', () => {
    assert.ok(!src.includes("isExecuted"), 'Should not have isExecuted variable');
  });

  it('approve button calls onApprove callback', () => {
    assert.ok(src.includes('onApprove?.(decision.id)'), 'Should call onApprove');
  });

  it('reject button calls onReject callback', () => {
    assert.ok(src.includes('onReject?.(decision.id)'), 'Should call onReject');
  });

  it('execute button calls onExecute callback', () => {
    assert.ok(src.includes('onExecute?.(decision.id)'), 'Should call onExecute');
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. getStatusBadgeColor tests
// ═══════════════════════════════════════════════════════════════
describe('getStatusBadgeColor', () => {
  // Import the function directly
  let getStatusBadgeColor: (status: string) => string;

  before(async () => {
    const mod = await import('../components/decisions/decision-card');
    getStatusBadgeColor = mod.getStatusBadgeColor;
  });

  it('returns yellow for PENDING', () => {
    assert.ok(getStatusBadgeColor('PENDING').includes('yellow'));
  });

  it('returns green for APPROVED', () => {
    assert.ok(getStatusBadgeColor('APPROVED').includes('green'));
  });

  it('returns red for REJECTED', () => {
    assert.ok(getStatusBadgeColor('REJECTED').includes('red'));
  });

  it('returns blue for EXECUTED', () => {
    assert.ok(getStatusBadgeColor('EXECUTED').includes('blue'));
  });

  it('returns gray for unknown status', () => {
    assert.ok(getStatusBadgeColor('UNKNOWN').includes('gray'));
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. formatDecisionDate tests
// ═══════════════════════════════════════════════════════════════
describe('formatDecisionDate', () => {
  let formatDecisionDate: (dateStr: string | null) => string;

  before(async () => {
    const mod = await import('../components/decisions/decision-card');
    formatDecisionDate = mod.formatDecisionDate;
  });

  it('returns dash for null', () => {
    assert.equal(formatDecisionDate(null), '—');
  });

  it('formats ISO date string', () => {
    const result = formatDecisionDate('2026-01-15T10:00:00.000Z');
    assert.ok(result.includes('Jan'), `Should contain month abbreviation, got: ${result}`);
    assert.ok(result.includes('2026'), `Should contain year, got: ${result}`);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. decision-list.tsx — structure & exports
// ═══════════════════════════════════════════════════════════════
describe('DecisionList component', () => {
  let src: string;

  before(() => {
    src = readComponent('components/decisions/decision-list.tsx');
  });

  it('file exists and is a client component', () => {
    assert.ok(src.includes("'use client'"), 'Should be a client component');
  });

  it('exports DecisionList function', () => {
    assert.ok(src.includes('export function DecisionList'), 'Should export DecisionList');
  });

  it('exports STATUS_TABS constant', () => {
    assert.ok(src.includes('export const STATUS_TABS'), 'Should export STATUS_TABS');
  });

  it('exports filterByStatus function', () => {
    assert.ok(src.includes('export function filterByStatus'), 'Should export filterByStatus');
  });

  it('has status filter tabs with role=tablist', () => {
    assert.ok(src.includes('role="tablist"'), 'Should have tablist role');
  });

  it('includes All, Pending, Approved, Rejected, Executed tabs', () => {
    assert.ok(src.includes("label: 'All'"), 'Should have All tab');
    assert.ok(src.includes("label: 'Pending'"), 'Should have Pending tab');
    assert.ok(src.includes("label: 'Approved'"), 'Should have Approved tab');
    assert.ok(src.includes("label: 'Rejected'"), 'Should have Rejected tab');
    assert.ok(src.includes("label: 'Executed'"), 'Should have Executed tab');
  });

  it('renders DecisionCard components', () => {
    assert.ok(src.includes('<DecisionCard'), 'Should render DecisionCard');
  });

  it('includes DecisionDetailDialog', () => {
    assert.ok(src.includes('<DecisionDetailDialog'), 'Should include dialog');
  });

  it('calls approveDecision server action', () => {
    assert.ok(src.includes("approveDecision"), 'Should use approveDecision');
  });

  it('calls rejectDecision server action', () => {
    assert.ok(src.includes("rejectDecision"), 'Should use rejectDecision');
  });

  it('calls executeDecision server action', () => {
    assert.ok(src.includes("executeDecision"), 'Should use executeDecision');
  });

  it('shows empty state when no decisions match', () => {
    assert.ok(src.includes('data-testid="empty-message"'), 'Should have empty state');
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. filterByStatus tests
// ═══════════════════════════════════════════════════════════════
describe('filterByStatus', () => {
  let filterByStatus: (decisions: any[], status: string) => any[];

  const mockDecisions = [
    { id: '1', status: 'PENDING', signal: { symbol: 'AAPL' } },
    { id: '2', status: 'APPROVED', signal: { symbol: 'MSFT' } },
    { id: '3', status: 'REJECTED', signal: { symbol: 'GOOG' } },
    { id: '4', status: 'EXECUTED', signal: { symbol: 'TSLA' } },
    { id: '5', status: 'PENDING', signal: { symbol: 'NVDA' } },
  ];

  before(async () => {
    const mod = await import('../components/decisions/decision-list');
    filterByStatus = mod.filterByStatus;
  });

  it('returns all decisions when status is empty', () => {
    const result = filterByStatus(mockDecisions, '');
    assert.equal(result.length, 5);
  });

  it('filters PENDING decisions', () => {
    const result = filterByStatus(mockDecisions, 'PENDING');
    assert.equal(result.length, 2);
    assert.ok(result.every((d: any) => d.status === 'PENDING'));
  });

  it('filters APPROVED decisions', () => {
    const result = filterByStatus(mockDecisions, 'APPROVED');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '2');
  });

  it('filters REJECTED decisions', () => {
    const result = filterByStatus(mockDecisions, 'REJECTED');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '3');
  });

  it('filters EXECUTED decisions', () => {
    const result = filterByStatus(mockDecisions, 'EXECUTED');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '4');
  });

  it('returns empty array for non-matching status', () => {
    const result = filterByStatus(mockDecisions, 'CANCELLED');
    assert.equal(result.length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. decision-detail-dialog.tsx — structure & exports
// ═══════════════════════════════════════════════════════════════
describe('DecisionDetailDialog component', () => {
  let src: string;

  before(() => {
    src = readComponent('components/decisions/decision-detail-dialog.tsx');
  });

  it('file exists and is a client component', () => {
    assert.ok(src.includes("'use client'"), 'Should be a client component');
  });

  it('exports DecisionDetailDialog function', () => {
    assert.ok(src.includes('export function DecisionDetailDialog'), 'Should export DecisionDetailDialog');
  });

  it('exports DecisionAction type', () => {
    assert.ok(src.includes('export type DecisionAction'), 'Should export DecisionAction');
  });

  it('uses shadcn/ui Dialog', () => {
    assert.ok(src.includes('Dialog'), 'Should use Dialog component');
    assert.ok(src.includes('DialogContent'), 'Should use DialogContent');
  });

  it('has notes textarea input', () => {
    assert.ok(src.includes('data-testid="decision-notes-input"'), 'Should have notes input');
  });

  it('has confirm button', () => {
    assert.ok(src.includes('data-testid="dialog-confirm-btn"'), 'Should have confirm button');
  });

  it('has cancel button', () => {
    assert.ok(src.includes('Cancel'), 'Should have cancel button');
  });

  it('shows different text for approve vs reject', () => {
    assert.ok(src.includes('Confirm Approval'), 'Should show approval text');
    assert.ok(src.includes('Confirm Rejection'), 'Should show rejection text');
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. getActionTitle / getActionDescription tests
// ═══════════════════════════════════════════════════════════════
describe('Dialog helper functions', () => {
  let getActionTitle: (action: any) => string;
  let getActionDescription: (action: any, symbol?: string) => string;

  before(async () => {
    const mod = await import('../components/decisions/decision-detail-dialog');
    getActionTitle = mod.getActionTitle;
    getActionDescription = mod.getActionDescription;
  });

  it('getActionTitle returns correct title for approve', () => {
    assert.equal(getActionTitle('approve'), 'Approve Decision');
  });

  it('getActionTitle returns correct title for reject', () => {
    assert.equal(getActionTitle('reject'), 'Reject Decision');
  });

  it('getActionTitle returns fallback for null', () => {
    assert.equal(getActionTitle(null), 'Decision');
  });

  it('getActionDescription includes symbol for approve', () => {
    const desc = getActionDescription('approve', 'AAPL');
    assert.ok(desc.includes('AAPL'), 'Should contain symbol');
    assert.ok(desc.includes('Approve'), 'Should mention approve');
  });

  it('getActionDescription includes symbol for reject', () => {
    const desc = getActionDescription('reject', 'MSFT');
    assert.ok(desc.includes('MSFT'), 'Should contain symbol');
    assert.ok(desc.includes('Reject'), 'Should mention reject');
  });

  it('getActionDescription uses fallback when no symbol', () => {
    const desc = getActionDescription('approve');
    assert.ok(desc.includes('this signal'), 'Should use fallback text');
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. Decisions page (server component)
// ═══════════════════════════════════════════════════════════════
describe('Decisions page', () => {
  let src: string;

  before(() => {
    src = readComponent('app/dashboard/decisions/page.tsx');
  });

  it('is a server component (no "use client")', () => {
    assert.ok(!src.includes("'use client'"), 'Should be a server component');
  });

  it('imports getDecisions', () => {
    assert.ok(src.includes('getDecisions'), 'Should import getDecisions');
  });

  it('imports DecisionList', () => {
    assert.ok(src.includes('DecisionList'), 'Should import DecisionList');
  });

  it('renders DecisionList with decisions prop', () => {
    assert.ok(src.includes('<DecisionList'), 'Should render DecisionList');
    assert.ok(src.includes('decisions={decisions}'), 'Should pass decisions prop');
  });

  it('serializes dates for client component', () => {
    assert.ok(src.includes('toISOString'), 'Should serialize dates');
  });

  it('handles error state', () => {
    assert.ok(src.includes('!result.success'), 'Should handle error case');
  });
});

// ═══════════════════════════════════════════════════════════════
// 10. STATUS_TABS constant validation
// ═══════════════════════════════════════════════════════════════
describe('STATUS_TABS constant', () => {
  let STATUS_TABS: Array<{ value: string; label: string }>;

  before(async () => {
    const mod = await import('../components/decisions/decision-list');
    STATUS_TABS = mod.STATUS_TABS;
  });

  it('has 5 tabs', () => {
    assert.equal(STATUS_TABS.length, 5);
  });

  it('first tab is All with empty value', () => {
    assert.equal(STATUS_TABS[0].value, '');
    assert.equal(STATUS_TABS[0].label, 'All');
  });

  it('includes all four statuses', () => {
    const values = STATUS_TABS.map((t) => t.value);
    assert.ok(values.includes('PENDING'));
    assert.ok(values.includes('APPROVED'));
    assert.ok(values.includes('REJECTED'));
    assert.ok(values.includes('EXECUTED'));
  });
});
