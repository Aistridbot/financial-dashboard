const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_CANONICAL_REPO,
  normalizePlannerOutput,
} = require('./plannerOutput');

test('normalizes missing repo and branch with deterministic defaults', () => {
  const result = normalizePlannerOutput('STORIES_JSON: [{"id":"US-1"}]', {
    defaultBranch: 'feature-dev',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    repo: DEFAULT_CANONICAL_REPO,
    branch: 'feature-dev',
    stories_json: [{ id: 'US-1' }],
  });
});

test('forces canonical repo when planner output repo is non-canonical', () => {
  const result = normalizePlannerOutput(
    'REPO: /tmp/other\nBRANCH: release\nSTORIES_JSON: []',
    { defaultBranch: 'feature-dev' }
  );

  assert.equal(result.ok, true);
  assert.equal(result.value.repo, DEFAULT_CANONICAL_REPO);
  assert.equal(result.value.branch, 'release');
  assert.deepEqual(result.value.stories_json, []);
});

test('returns machine-readable failure when stories_json is missing', () => {
  const result = normalizePlannerOutput('REPO: /tmp/other\nBRANCH: release', {
    defaultBranch: 'feature-dev',
  });

  assert.deepEqual(result, {
    ok: false,
    error: {
      code: 'INVALID_PLANNER_OUTPUT',
      field: 'stories_json',
      reason: 'Missing required stories_json field',
    },
  });
});

test('uses repaired stories_json fallback when planner omits field', () => {
  const result = normalizePlannerOutput('STATUS: done', {
    defaultBranch: 'feature-dev',
    repairedStoriesJson: '[{"id":"US-003"},{"id":"US-004"}]',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    repo: DEFAULT_CANONICAL_REPO,
    branch: 'feature-dev',
    stories_json: [{ id: 'US-003' }, { id: 'US-004' }],
  });
});

test('returns machine-readable failure when stories_json is invalid JSON', () => {
  const result = normalizePlannerOutput('STORIES_JSON: {not-json}', {
    defaultBranch: 'feature-dev',
  });

  assert.deepEqual(result, {
    ok: false,
    error: {
      code: 'INVALID_PLANNER_OUTPUT',
      field: 'stories_json',
      reason: 'stories_json must be valid JSON',
    },
  });
});

test('returns machine-readable failure when stories_json is not an array', () => {
  const result = normalizePlannerOutput('STORIES_JSON: {"id":"US-1"}', {
    defaultBranch: 'feature-dev',
  });

  assert.deepEqual(result, {
    ok: false,
    error: {
      code: 'INVALID_PLANNER_OUTPUT',
      field: 'stories_json',
      reason: 'stories_json must decode to an array',
    },
  });
});
