const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { DEFAULT_CANONICAL_REPO } = require('./plannerOutput');
const { runAutoRepairPipeline } = require('./autoRepairPipeline');

test('RUN #17 integration: planner output missing keys auto-repairs and reaches PR handoff', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'run17-planner-missing-keys.txt');
  const rawPlannerOutput = fs.readFileSync(fixturePath, 'utf8');

  const result = runAutoRepairPipeline(rawPlannerOutput, {
    defaultBranch: 'feature-dev',
    maxStories: 3,
    repairedStoriesJson: JSON.stringify([
      { id: 'US-010', title: 'First repaired story' },
      { id: 'US-011', title: 'Second repaired story' },
    ]),
  });

  assert.equal(result.ok, true);
  assert.equal(result.stage, 'pr-preparation');

  assert.equal(result.artifacts.repo, DEFAULT_CANONICAL_REPO);
  assert.equal(result.artifacts.branch, 'feature-dev');

  assert.deepEqual(
    result.artifacts.stories.map((story) => ({ id: story.id, order: story.order })),
    [
      { id: 'US-010', order: 0 },
      { id: 'US-011', order: 1 },
    ]
  );

  assert.equal(result.artifacts.verification.status, 'passed');
  assert.equal(result.artifacts.prPreparation.status, 'pr-ready');
  assert.equal(result.artifacts.prPreparation.repo, DEFAULT_CANONICAL_REPO);
  assert.equal(result.artifacts.prPreparation.branch, 'feature-dev');
});
