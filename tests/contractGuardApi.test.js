const request = require('supertest');
const app = require('../src/app');

const CANONICAL_REPO = '/Users/aistridbot/.openclaw/workspace/financial-dashboard';

describe('POST /contracts/planner/validate', () => {
  const validPlannerPayload = {
    STATUS: 'done',
    REPO: CANONICAL_REPO,
    BRANCH: 'feature/mvp-financial-dashboard',
    STORIES_JSON: [{ id: 'US-001' }, { id: 'US-002' }, { id: 'US-003' }]
  };

  it('returns success for a valid planner payload', async () => {
    const response = await request(app)
      .post('/contracts/planner/validate')
      .send(validPlannerPayload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ valid: true });
  });

  it('returns deterministic 4xx for missing required key', async () => {
    const { BRANCH, ...payloadMissingBranch } = validPlannerPayload;
    void BRANCH;

    const response = await request(app)
      .post('/contracts/planner/validate')
      .send(payloadMissingBranch);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      valid: false,
      error: 'Invalid planner payload: missing required key "BRANCH"'
    });
  });

  it('returns deterministic 4xx for non-canonical repo path', async () => {
    const response = await request(app)
      .post('/contracts/planner/validate')
      .send({ ...validPlannerPayload, REPO: '/tmp/not-canonical' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      valid: false,
      error: `Invalid planner payload: "REPO" must be "${CANONICAL_REPO}"`
    });
  });

  it('returns deterministic 4xx for duplicate story id', async () => {
    const response = await request(app)
      .post('/contracts/planner/validate')
      .send({
        ...validPlannerPayload,
        STORIES_JSON: [{ id: 'US-001' }, { id: 'US-001' }]
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      valid: false,
      error: 'Invalid planner payload: duplicate story id "US-001"'
    });
  });

  it('returns deterministic 4xx when stories exceed max limit', async () => {
    const response = await request(app)
      .post('/contracts/planner/validate')
      .send({
        ...validPlannerPayload,
        STORIES_JSON: [{ id: 'US-001' }, { id: 'US-002' }, { id: 'US-003' }, { id: 'US-004' }]
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      valid: false,
      error: 'Invalid planner payload: "STORIES_JSON" must include at most 3 stories'
    });
  });
});

describe('POST /contracts/setup/validate', () => {
  const validSetupPayload = {
    STATUS: 'done',
    BUILD_CMD: 'npm run build',
    TEST_CMD: 'npm test',
    CI_NOTES: 'all checks green',
    BASELINE: 'PR262'
  };

  it('returns success for a valid setup payload', async () => {
    const response = await request(app)
      .post('/contracts/setup/validate')
      .send(validSetupPayload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ valid: true });
  });

  it('returns deterministic 4xx for missing required key', async () => {
    const { TEST_CMD, ...payloadMissingTestCmd } = validSetupPayload;
    void TEST_CMD;

    const response = await request(app)
      .post('/contracts/setup/validate')
      .send(payloadMissingTestCmd);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      valid: false,
      error: 'Invalid setup payload: missing required key "TEST_CMD"'
    });
  });
});
