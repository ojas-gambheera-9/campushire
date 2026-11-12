const client = require('prom-client');

const register = new client.Registry();
register.setDefaultLabels({ app: 'campushire-api' });
client.collectDefaultMetrics({ register }); // process CPU, memory, event-loop lag, GC

const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

/** Records count + latency per request. Uses the route pattern (not the raw URL) to keep label cardinality low. */
function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics' || req.path === '/health') return next();
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched';
    const labels = { method: req.method, route, status: String(res.statusCode) };
    httpRequests.inc(labels);
    end(labels);
  });
  next();
}

async function metricsHandler(_req, res) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

module.exports = { metricsMiddleware, metricsHandler, register };
