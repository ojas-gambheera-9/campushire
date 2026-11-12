process.env.NODE_ENV = 'test';
const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();
app.set('verifier', { verify: async () => { throw new Error('bad'); } });

describe('Prometheus metrics', () => {
  test('/metrics exposes Prometheus text format with default metrics', async () => {
    const r = await request(app).get('/metrics');
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toMatch(/text\/plain/);
    expect(r.text).toMatch(/process_cpu_user_seconds_total/);
  });

  test('request counter and latency histogram record a request by route pattern', async () => {
    await request(app).get('/api/me'); // 401, but still a counted request
    const r = await request(app).get('/metrics');
    expect(r.text).toMatch(/http_requests_total\{[^}]*status="401"/);
    expect(r.text).toMatch(/http_request_duration_seconds_bucket/);
  });

  test('/health is not counted (keeps probe traffic out of the numbers)', async () => {
    await request(app).get('/health');
    const r = await request(app).get('/metrics');
    expect(r.text).not.toMatch(/route="\/health"/);
  });
});
