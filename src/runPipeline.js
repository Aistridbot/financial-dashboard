function createStoryRecords(storiesJson) {
  return storiesJson.map((story, index) => ({
    ...story,
    order: index,
    status: 'pending',
  }));
}

function buildExecutionPlan(normalizedPlannerOutput, options = {}) {
  if (!normalizedPlannerOutput || normalizedPlannerOutput.ok !== true || !normalizedPlannerOutput.value) {
    throw new Error('Planner output must be normalized before orchestration');
  }

  const maxStories = Number.isInteger(options.maxStories) ? options.maxStories : 3;
  const { repo, branch, stories_json: storiesJson } = normalizedPlannerOutput.value;

  if (!Array.isArray(storiesJson)) {
    throw new Error('Invalid normalized planner output: stories_json must be an array');
  }

  if (storiesJson.length > maxStories) {
    throw new Error(
      `Planner returned ${storiesJson.length} stories, which exceeds configured max of ${maxStories}. Aborting before developer execution.`
    );
  }

  return {
    repo,
    branch,
    stories: createStoryRecords(storiesJson),
  };
}

module.exports = {
  buildExecutionPlan,
  createStoryRecords,
};
