const { loadPr262BaselineContract } = require('./pr262BaselineContractRepository');

/**
 * @typedef {{ id: string }} PlannerStory
 * @typedef {{ [key: string]: unknown, REPO: string, STORIES_JSON: PlannerStory[] }} PlannerPayload
 * @typedef {{ [key: string]: unknown }} SetupPayload
 */

/**
 * @param {unknown} payload
 * @param {readonly string[]} requiredKeys
 * @param {string} payloadLabel
 * @returns {Record<string, unknown>}
 */
function assertObjectPayloadWithRequiredKeys(payload, requiredKeys, payloadLabel) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`Invalid ${payloadLabel} payload: expected object payload`);
  }

  const objectPayload = /** @type {Record<string, unknown>} */ (payload);

  for (const key of requiredKeys) {
    if (!(key in objectPayload)) {
      throw new Error(`Invalid ${payloadLabel} payload: missing required key "${key}"`);
    }
  }

  return objectPayload;
}

/**
 * @param {unknown} stories
 * @param {number} maxStories
 */
function assertValidPlannerStories(stories, maxStories) {
  if (!Array.isArray(stories)) {
    throw new Error('Invalid planner payload: "STORIES_JSON" must be an array');
  }

  if (stories.length > maxStories) {
    throw new Error(`Invalid planner payload: "STORIES_JSON" must include at most ${maxStories} stories`);
  }

  const seenIds = new Set();
  for (let index = 0; index < stories.length; index += 1) {
    const story = stories[index];

    if (!story || typeof story !== 'object' || Array.isArray(story)) {
      throw new Error(`Invalid planner payload: story at index ${index} must be an object`);
    }

    const objectStory = /** @type {Record<string, unknown>} */ (story);
    if (typeof objectStory.id !== 'string' || objectStory.id.trim() === '') {
      throw new Error(`Invalid planner payload: story at index ${index} must include a non-empty string id`);
    }

    if (seenIds.has(objectStory.id)) {
      throw new Error(`Invalid planner payload: duplicate story id "${objectStory.id}"`);
    }

    seenIds.add(objectStory.id);
  }
}

/**
 * @param {unknown} payload
 * @returns {PlannerPayload}
 */
function assertValidPlannerPayload(payload) {
  const contract = loadPr262BaselineContract();
  const objectPayload = assertObjectPayloadWithRequiredKeys(payload, contract.planner.requiredKeys, 'planner');

  if (objectPayload.REPO !== contract.canonicalRepo) {
    throw new Error(`Invalid planner payload: "REPO" must be "${contract.canonicalRepo}"`);
  }

  assertValidPlannerStories(objectPayload.STORIES_JSON, contract.maxStories);

  return /** @type {PlannerPayload} */ (objectPayload);
}

/**
 * @param {unknown} payload
 * @returns {SetupPayload}
 */
function assertValidSetupPayload(payload) {
  const contract = loadPr262BaselineContract();
  const objectPayload = assertObjectPayloadWithRequiredKeys(payload, contract.setup.requiredKeys, 'setup');

  return objectPayload;
}

module.exports = {
  assertValidPlannerPayload,
  assertValidSetupPayload
};
