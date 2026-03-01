const { normalizePlannerOutput } = require('./plannerOutput');
const { buildExecutionPlan } = require('./runPipeline');

function executeStoryStubs(stories) {
  return stories.map((story) => ({
    ...story,
    status: 'completed',
    execution: {
      mode: 'stub',
      result: 'ok',
    },
  }));
}

function verifyRunArtifacts(executedStories) {
  const allCompleted = executedStories.every((story) => story.status === 'completed');

  return {
    status: allCompleted ? 'passed' : 'failed',
    completedStories: executedStories.length,
  };
}

function preparePrHandoff(plan, verification) {
  return {
    status: verification.status === 'passed' ? 'pr-ready' : 'blocked',
    repo: plan.repo,
    branch: plan.branch,
    targetBranch: 'main',
  };
}

function runAutoRepairPipeline(rawPlannerOutput, options = {}) {
  const normalized = normalizePlannerOutput(rawPlannerOutput, {
    canonicalRepo: options.canonicalRepo,
    defaultBranch: options.defaultBranch,
    repairedStoriesJson: options.repairedStoriesJson,
  });

  if (!normalized.ok) {
    return {
      ok: false,
      stage: 'normalize',
      error: normalized.error,
    };
  }

  const plan = buildExecutionPlan(normalized, {
    maxStories: options.maxStories,
  });

  const executedStories = executeStoryStubs(plan.stories);
  const verification = verifyRunArtifacts(executedStories);
  const prPreparation = preparePrHandoff(plan, verification);

  return {
    ok: true,
    stage: 'pr-preparation',
    artifacts: {
      repo: plan.repo,
      branch: plan.branch,
      stories: executedStories,
      verification,
      prPreparation,
    },
  };
}

module.exports = {
  runAutoRepairPipeline,
};
