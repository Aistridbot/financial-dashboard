const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizePlannerOutput } = require('./plannerOutput');
const { buildExecutionPlan } = require('./runPipeline');

test('buildExecutionPlan consumes normalized planner payload fields', () => {
  const normalized = {
    ok: true,
    value: {
      repo: '/Users/aistridbot/.openclaw/workspace/financial-dashboard',
      branch: 'feature-dev',
      stories_json: [{ id: 'US-001' }],
    },
  };

  const plan = buildExecutionPlan(normalized, { maxStories: 3 });

  assert.equal(plan.repo, normalized.value.repo);
  assert.equal(plan.branch, normalized.value.branch);
  assert.deepEqual(plan.stories, [{ id: 'US-001', order: 0, status: 'pending' }]);
});

test('creates stories in declared order from repaired planner keys', () => {
  const rawPlannerOutput = [
    'STATUS: done',
    'STORIES_JSON: [{"id":"US-002"},{"id":"US-003"},{"id":"US-004"}]',
  ].join('\n');

  const normalized = normalizePlannerOutput(rawPlannerOutput, {
    defaultBranch: 'feature-dev',
  });

  assert.equal(normalized.ok, true);

  const plan = buildExecutionPlan(normalized, { maxStories: 3 });

  assert.deepEqual(
    plan.stories.map((story) => story.id),
    ['US-002', 'US-003', 'US-004']
  );
  assert.deepEqual(
    plan.stories.map((story) => story.order),
    [0, 1, 2]
  );
});

test('aborts before developer execution when stories exceed max', () => {
  const normalized = {
    ok: true,
    value: {
      repo: '/Users/aistridbot/.openclaw/workspace/financial-dashboard',
      branch: 'feature-dev',
      stories_json: [{ id: 'US-1' }, { id: 'US-2' }, { id: 'US-3' }, { id: 'US-4' }],
    },
  };

  assert.throws(
    () => buildExecutionPlan(normalized, { maxStories: 3 }),
    /exceeds configured max of 3\. Aborting before developer execution\./
  );
});

test('rejects non-normalized input to enforce single source of truth', () => {
  assert.throws(
    () => buildExecutionPlan('REPO: /tmp\nBRANCH: feature-dev\nSTORIES_JSON: []'),
    /must be normalized before orchestration/
  );
});
