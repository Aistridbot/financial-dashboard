const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SMOKE_STORIES_PATH = path.resolve(__dirname, '../../db/smoke-stories.json');

/**
 * @typedef {{
 *   id: string,
 *   sequence: number,
 *   title: string
 * }} SmokeStory
 */

/**
 * @param {unknown} value
 * @returns {asserts value is SmokeStory[]}
 */
function assertValidSmokeStories(value) {
  if (!Array.isArray(value)) {
    throw new Error('Invalid smoke stories: expected array payload');
  }

  const seenIds = new Set();

  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    const expectedSequence = index + 1;

    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid smoke stories: story at index ${index} must be an object`);
    }

    const objectItem = /** @type {Record<string, unknown>} */ (item);

    if (typeof objectItem.id !== 'string' || objectItem.id.trim() === '') {
      throw new Error(`Invalid smoke stories: story at index ${index} must include a non-empty string id`);
    }

    if (seenIds.has(objectItem.id)) {
      throw new Error(`Invalid smoke stories: duplicate story id "${objectItem.id}"`);
    }
    seenIds.add(objectItem.id);

    if (typeof objectItem.sequence !== 'number' || !Number.isInteger(objectItem.sequence)) {
      throw new Error(`Invalid smoke stories: story "${objectItem.id}" must include an integer sequence`);
    }

    if (objectItem.sequence !== expectedSequence) {
      throw new Error(
        `Invalid smoke stories: expected sequence ${expectedSequence} for story "${objectItem.id}", got ${objectItem.sequence}`
      );
    }
  }
}

/**
 * @param {string} [dataPath]
 * @returns {SmokeStory[]}
 */
function loadSmokeStories(dataPath = DEFAULT_SMOKE_STORIES_PATH) {
  const raw = fs.readFileSync(dataPath, 'utf8');
  /** @type {unknown} */
  const parsed = JSON.parse(raw);

  assertValidSmokeStories(parsed);

  return parsed.map((story) => ({
    id: story.id,
    sequence: story.sequence,
    title: story.title
  }));
}

module.exports = {
  DEFAULT_SMOKE_STORIES_PATH,
  assertValidSmokeStories,
  loadSmokeStories
};
