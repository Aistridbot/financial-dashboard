const express = require('express');

const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (_req, res) => {
  res.send('Financial Dashboard API');
});

module.exports = app;
