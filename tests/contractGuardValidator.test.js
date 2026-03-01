const { assertValidPlannerPayload, assertValidSetupPayload } = require('../src/data/contractGuardValidator');

describe('contractGuardValidator', () => {
  it('validates planner payload against required keys and canonical repo', () => {
    const payload = {
      STATUS: 'done',
      REPO: '/Users/aistridbot/.openclaw/workspace/financial-dashboard',
      BRANCH: 'feature/mvp-financial-dashboard',
      STORIES_JSON: [
        { id: 'US-002', title: 'Story 1' },
        { id: 'US-003', title: 'Story 2' }
      ]
    };

    expect(assertValidPlannerPayload(payload)).toBe(payload);
  });

  it('rejects planner payload when STORIES_JSON has more than 3 items', () => {
    expect(() =>
      assertValidPlannerPayload({
        STATUS: 'done',
        REPO: '/Users/aistridbot/.openclaw/workspace/financial-dashboard',
        BRANCH: 'feature/mvp-financial-dashboard',
        STORIES_JSON: [{ id: 'US-002' }, { id: 'US-003' }, { id: 'US-004' }, { id: 'US-005' }]
      })
    ).toThrow('Invalid planner payload: "STORIES_JSON" must include at most 3 stories');
  });

  it('rejects planner payload with deterministic duplicate story id error', () => {
    expect(() =>
      assertValidPlannerPayload({
        STATUS: 'done',
        REPO: '/Users/aistridbot/.openclaw/workspace/financial-dashboard',
        BRANCH: 'feature/mvp-financial-dashboard',
        STORIES_JSON: [{ id: 'US-002' }, { id: 'US-002' }]
      })
    ).toThrow('Invalid planner payload: duplicate story id "US-002"');
  });

  it('rejects planner payload when canonical repo does not match contract', () => {
    expect(() =>
      assertValidPlannerPayload({
        STATUS: 'done',
        REPO: '/tmp/not-canonical',
        BRANCH: 'feature/mvp-financial-dashboard',
        STORIES_JSON: [{ id: 'US-002' }]
      })
    ).toThrow('Invalid planner payload: "REPO" must be "/Users/aistridbot/.openclaw/workspace/financial-dashboard"');
  });

  it('validates setup payload required keys', () => {
    const payload = {
      STATUS: 'done',
      BUILD_CMD: 'npm run build',
      TEST_CMD: 'npm test',
      CI_NOTES: 'none',
      BASELINE: 'PR262'
    };

    expect(assertValidSetupPayload(payload)).toBe(payload);
  });

  it('rejects setup payload when required key is missing', () => {
    expect(() =>
      assertValidSetupPayload({
        STATUS: 'done',
        BUILD_CMD: 'npm run build',
        TEST_CMD: 'npm test',
        CI_NOTES: 'none'
      })
    ).toThrow('Invalid setup payload: missing required key "BASELINE"');
  });
});
