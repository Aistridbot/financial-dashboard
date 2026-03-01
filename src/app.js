const express = require('express');
const {
  assertValidPlannerPayload,
  assertValidSetupPayload
} = require('./data/contractGuardValidator');

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/contracts/planner/validate', (req, res) => {
  try {
    assertValidPlannerPayload(req.body);
    res.status(200).json({ valid: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown validation error';
    res.status(400).json({ valid: false, error: message });
  }
});

app.post('/contracts/setup/validate', (req, res) => {
  try {
    assertValidSetupPayload(req.body);
    res.status(200).json({ valid: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown validation error';
    res.status(400).json({ valid: false, error: message });
  }
});

app.get('/', (_req, res) => {
  res.send('Financial Dashboard API');
});

module.exports = app;
