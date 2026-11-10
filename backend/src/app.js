const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const { authenticate } = require('./middleware/auth');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '100kb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('combined'));

  // Used by the ALB target group + Kubernetes probes.
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // /api/me — the role comes from the verified Cognito token, never from the client.
  app.get('/api/me', authenticate, (req, res) => res.json(req.user));
  app.use('/api/jobs', require('./routes/jobs'));
  app.use('/api', require('./routes/applications'));

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid id' });
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

module.exports = { createApp };
