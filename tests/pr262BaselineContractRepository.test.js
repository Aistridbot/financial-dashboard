const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  DEFAULT_PR262_BASELINE_CONTRACT_PATH,
  loadPr262BaselineContract
} = require('../src/data/pr262BaselineContractRepository');

describe('pr262BaselineContractRepository', () => {
  it('loads canonical PR262 baseline contract fixture', () => {
    const result = loadPr262BaselineContract();

    expect(result).toEqual({
      canonicalRepo: '/Users/aistridbot/.openclaw/workspace/financial-dashboard',
      maxStories: 3,
      planner: {
        requiredKeys: ['STATUS', 'REPO', 'BRANCH', 'STORIES_JSON']
      },
      setup: {
        requiredKeys: ['STATUS', 'BUILD_CMD', 'TEST_CMD', 'CI_NOTES', 'BASELINE']
      }
    });
    expect(DEFAULT_PR262_BASELINE_CONTRACT_PATH.endsWith(path.join('db', 'pr262-baseline-contract.json'))).toBe(true);
  });

  it('throws deterministic error when canonicalRepo is not the fixed canonical path', () => {
    const tempFile = path.join(os.tmpdir(), `pr262-baseline-invalid-repo-${Date.now()}.json`);
    fs.writeFileSync(
      tempFile,
      JSON.stringify({
        canonicalRepo: '/tmp/not-canonical',
        maxStories: 3,
        planner: { requiredKeys: ['STATUS', 'REPO', 'BRANCH', 'STORIES_JSON'] },
        setup: { requiredKeys: ['STATUS', 'BUILD_CMD', 'TEST_CMD', 'CI_NOTES', 'BASELINE'] }
      }),
      'utf8'
    );

    expect(() => loadPr262BaselineContract(tempFile)).toThrow(
      'Invalid PR262 baseline contract: "canonicalRepo" must be "/Users/aistridbot/.openclaw/workspace/financial-dashboard"'
    );
  });

  it('throws deterministic error when planner required keys diverge from contract', () => {
    const tempFile = path.join(os.tmpdir(), `pr262-baseline-invalid-planner-${Date.now()}.json`);
    fs.writeFileSync(
      tempFile,
      JSON.stringify({
        canonicalRepo: '/Users/aistridbot/.openclaw/workspace/financial-dashboard',
        maxStories: 3,
        planner: { requiredKeys: ['STATUS', 'REPO', 'BRANCH'] },
        setup: { requiredKeys: ['STATUS', 'BUILD_CMD', 'TEST_CMD', 'CI_NOTES', 'BASELINE'] }
      }),
      'utf8'
    );

    expect(() => loadPr262BaselineContract(tempFile)).toThrow(
      'Invalid PR262 baseline contract: "planner.requiredKeys" must be ["STATUS", "REPO", "BRANCH", "STORIES_JSON"]'
    );
  });

  it('throws deterministic error when setup required keys diverge from contract', () => {
    const tempFile = path.join(os.tmpdir(), `pr262-baseline-invalid-setup-${Date.now()}.json`);
    fs.writeFileSync(
      tempFile,
      JSON.stringify({
        canonicalRepo: '/Users/aistridbot/.openclaw/workspace/financial-dashboard',
        maxStories: 3,
        planner: { requiredKeys: ['STATUS', 'REPO', 'BRANCH', 'STORIES_JSON'] },
        setup: { requiredKeys: ['STATUS', 'BUILD_CMD', 'TEST_CMD', 'CI_NOTES', 'BASE'] }
      }),
      'utf8'
    );

    expect(() => loadPr262BaselineContract(tempFile)).toThrow(
      'Invalid PR262 baseline contract: "setup.requiredKeys" must be ["STATUS", "BUILD_CMD", "TEST_CMD", "CI_NOTES", "BASELINE"]'
    );
  });
});
