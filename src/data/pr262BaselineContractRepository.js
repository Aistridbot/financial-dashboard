const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_PR262_BASELINE_CONTRACT_PATH = path.resolve(__dirname, '../../db/pr262-baseline-contract.json');
const REQUIRED_PLANNER_KEYS = ['STATUS', 'REPO', 'BRANCH', 'STORIES_JSON'];
const REQUIRED_SETUP_KEYS = ['STATUS', 'BUILD_CMD', 'TEST_CMD', 'CI_NOTES', 'BASELINE'];

/**
 * @typedef {{ requiredKeys: string[] }} ContractSection
 * @typedef {{
 *   canonicalRepo: string,
 *   maxStories: number,
 *   planner: ContractSection,
 *   setup: ContractSection
 * }} Pr262BaselineContract
 */

/**
 * @param {unknown} sectionValue
 * @param {string} sectionName
 * @param {readonly string[]} requiredKeys
 */
function assertValidContractSection(sectionValue, sectionName, requiredKeys) {
  if (!sectionValue || typeof sectionValue !== 'object') {
    throw new Error(`Invalid PR262 baseline contract: "${sectionName}" must be an object`);
  }

  const objectSection = /** @type {Record<string, unknown>} */ (sectionValue);
  if (!Array.isArray(objectSection.requiredKeys)) {
    throw new Error(
      `Invalid PR262 baseline contract: "${sectionName}.requiredKeys" must be [${requiredKeys.map((key) => `"${key}"`).join(', ')}]`
    );
  }

  if (objectSection.requiredKeys.length !== requiredKeys.length) {
    throw new Error(
      `Invalid PR262 baseline contract: "${sectionName}.requiredKeys" must be [${requiredKeys.map((key) => `"${key}"`).join(', ')}]`
    );
  }

  for (let index = 0; index < requiredKeys.length; index += 1) {
    if (objectSection.requiredKeys[index] !== requiredKeys[index]) {
      throw new Error(
        `Invalid PR262 baseline contract: "${sectionName}.requiredKeys" must be [${requiredKeys.map((key) => `"${key}"`).join(', ')}]`
      );
    }
  }
}

/**
 * @param {unknown} value
 * @returns {asserts value is Pr262BaselineContract}
 */
function assertValidPr262BaselineContract(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid PR262 baseline contract: expected object payload');
  }

  const objectValue = /** @type {Record<string, unknown>} */ (value);

  if (objectValue.canonicalRepo !== '/Users/aistridbot/.openclaw/workspace/financial-dashboard') {
    throw new Error(
      'Invalid PR262 baseline contract: "canonicalRepo" must be "/Users/aistridbot/.openclaw/workspace/financial-dashboard"'
    );
  }

  if (objectValue.maxStories !== 3) {
    throw new Error('Invalid PR262 baseline contract: "maxStories" must be 3');
  }

  assertValidContractSection(objectValue.planner, 'planner', REQUIRED_PLANNER_KEYS);
  assertValidContractSection(objectValue.setup, 'setup', REQUIRED_SETUP_KEYS);
}

/**
 * @param {string} [dataPath]
 * @returns {Pr262BaselineContract}
 */
function loadPr262BaselineContract(dataPath = DEFAULT_PR262_BASELINE_CONTRACT_PATH) {
  const raw = fs.readFileSync(dataPath, 'utf8');
  /** @type {unknown} */
  const parsed = JSON.parse(raw);

  assertValidPr262BaselineContract(parsed);

  return {
    canonicalRepo: parsed.canonicalRepo,
    maxStories: parsed.maxStories,
    planner: {
      requiredKeys: [...parsed.planner.requiredKeys]
    },
    setup: {
      requiredKeys: [...parsed.setup.requiredKeys]
    }
  };
}

module.exports = {
  DEFAULT_PR262_BASELINE_CONTRACT_PATH,
  REQUIRED_PLANNER_KEYS,
  REQUIRED_SETUP_KEYS,
  assertValidPr262BaselineContract,
  loadPr262BaselineContract
};
