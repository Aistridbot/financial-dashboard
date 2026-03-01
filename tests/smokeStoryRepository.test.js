const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  DEFAULT_SMOKE_STORIES_PATH,
  loadSmokeStories
} = require('../src/data/smokeStoryRepository');

describe('smokeStoryRepository', () => {
  it('loads canonical smoke stories with unique ordered ids', () => {
    const result = loadSmokeStories();

    expect(result).toEqual([
      { id: 'US-001', sequence: 1, title: 'Load dashboard seed' },
      { id: 'US-002', sequence: 2, title: 'Run smoke build' },
      { id: 'US-003', sequence: 3, title: 'Run smoke tests' }
    ]);
    expect(DEFAULT_SMOKE_STORIES_PATH.endsWith(path.join('db', 'smoke-stories.json'))).toBe(true);
  });

  it('throws deterministic error when duplicate story ids are present', () => {
    const tempFile = path.join(os.tmpdir(), `smoke-stories-duplicate-${Date.now()}.json`);
    fs.writeFileSync(
      tempFile,
      JSON.stringify([
        { id: 'US-001', sequence: 1, title: 'first' },
        { id: 'US-001', sequence: 2, title: 'duplicate' },
        { id: 'US-003', sequence: 3, title: 'third' }
      ]),
      'utf8'
    );

    expect(() => loadSmokeStories(tempFile)).toThrow(
      'Invalid smoke stories: duplicate story id "US-001"'
    );
  });

  it('throws deterministic error when sequence values are non-sequential', () => {
    const tempFile = path.join(os.tmpdir(), `smoke-stories-nonsequential-${Date.now()}.json`);
    fs.writeFileSync(
      tempFile,
      JSON.stringify([
        { id: 'US-001', sequence: 1, title: 'first' },
        { id: 'US-002', sequence: 4, title: 'bad order' },
        { id: 'US-003', sequence: 3, title: 'third' }
      ]),
      'utf8'
    );

    expect(() => loadSmokeStories(tempFile)).toThrow(
      'Invalid smoke stories: expected sequence 2 for story "US-002", got 4'
    );
  });

  it('throws deterministic error when sequence is missing', () => {
    const tempFile = path.join(os.tmpdir(), `smoke-stories-missing-sequence-${Date.now()}.json`);
    fs.writeFileSync(
      tempFile,
      JSON.stringify([
        { id: 'US-001', sequence: 1, title: 'first' },
        { id: 'US-002', title: 'missing sequence' },
        { id: 'US-003', sequence: 3, title: 'third' }
      ]),
      'utf8'
    );

    expect(() => loadSmokeStories(tempFile)).toThrow(
      'Invalid smoke stories: story "US-002" must include an integer sequence'
    );
  });
});
