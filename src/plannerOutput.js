const DEFAULT_CANONICAL_REPO = '/Users/aistridbot/.openclaw/workspace/financial-dashboard';
const DEFAULT_BRANCH = 'feature-dev';

function parseKeyValueOutput(raw) {
  const parsed = {};

  if (typeof raw !== 'string') {
    return parsed;
  }

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1].toLowerCase();
    const value = match[2].trim();
    parsed[key] = value;
  }

  return parsed;
}

function normalizePlannerOutput(raw, options = {}) {
  const canonicalRepo = options.canonicalRepo || DEFAULT_CANONICAL_REPO;
  const defaultBranch =
    options.defaultBranch || process.env.WORKFLOW_BRANCH || process.env.GIT_BRANCH || DEFAULT_BRANCH;

  const parsed = parseKeyValueOutput(raw);

  const repo = parsed.repo === canonicalRepo ? parsed.repo : canonicalRepo;
  const branch = parsed.branch && parsed.branch.trim() ? parsed.branch.trim() : defaultBranch;

  if (!parsed.stories_json || !parsed.stories_json.trim()) {
    return {
      ok: false,
      error: {
        code: 'INVALID_PLANNER_OUTPUT',
        field: 'stories_json',
        reason: 'Missing required stories_json field',
      },
    };
  }

  let stories;
  try {
    stories = JSON.parse(parsed.stories_json);
  } catch (_error) {
    return {
      ok: false,
      error: {
        code: 'INVALID_PLANNER_OUTPUT',
        field: 'stories_json',
        reason: 'stories_json must be valid JSON',
      },
    };
  }

  if (!Array.isArray(stories)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_PLANNER_OUTPUT',
        field: 'stories_json',
        reason: 'stories_json must decode to an array',
      },
    };
  }

  return {
    ok: true,
    value: {
      repo,
      branch,
      stories_json: stories,
    },
  };
}

module.exports = {
  DEFAULT_BRANCH,
  DEFAULT_CANONICAL_REPO,
  parseKeyValueOutput,
  normalizePlannerOutput,
};
