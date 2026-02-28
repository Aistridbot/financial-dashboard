const express = require('express');
const app = express();
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/', (_req, res) => res.send('Financial Dashboard API'));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server on ${port}`));
