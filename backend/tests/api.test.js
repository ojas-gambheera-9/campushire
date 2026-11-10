process.env.NODE_ENV = 'test';
const request = require('supertest');
const { createApp } = require('../src/app');

const fakeVerifier = {
  verify: async (token) => {
    if (token === 'student') return { sub: 's1', email: 's@x.com', 'custom:role': 'student' };
    if (token === 'recruiter') return { sub: 'r1', email: 'r@x.com', 'custom:role': 'recruiter' };
    if (token === 'norole') return { sub: 'n1', email: 'n@x.com' };
    throw new Error('bad token');
  },
};
const app = createApp();
app.set('verifier', fakeVerifier);

describe('API guards', () => {
  test('GET /health is public', async () => {
    const r = await request(app).get('/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ok');
  });
  test('rejects missing token', async () => {
    expect((await request(app).get('/api/me')).status).toBe(401);
  });
  test('rejects invalid token', async () => {
    expect((await request(app).get('/api/me').set('Authorization', 'Bearer nope')).status).toBe(401);
  });
  test('rejects tokens without a role', async () => {
    expect((await request(app).get('/api/me').set('Authorization', 'Bearer norole')).status).toBe(403);
  });
  test('returns role from token', async () => {
    const r = await request(app).get('/api/me').set('Authorization', 'Bearer student');
    expect(r.body).toMatchObject({ sub: 's1', role: 'student' });
  });
  test('students cannot post jobs', async () => {
    const r = await request(app).post('/api/jobs').set('Authorization', 'Bearer student').send({});
    expect(r.status).toBe(403);
  });
  test('recruiters cannot apply', async () => {
    const r = await request(app).post('/api/jobs/abc/apply').set('Authorization', 'Bearer recruiter').send({});
    expect(r.status).toBe(403);
  });
  test('recruiter job validation returns 400', async () => {
    const r = await request(app).post('/api/jobs').set('Authorization', 'Bearer recruiter').send({ title: 'x' });
    expect(r.status).toBe(400);
  });
  test('resume upload rejects non-PDF', async () => {
    const r = await request(app).post('/api/uploads/resume-url').set('Authorization', 'Bearer student').send({ contentType: 'image/png', size: 10 });
    expect(r.status).toBe(400);
  });
  test('unknown route 404', async () => {
    expect((await request(app).get('/nope')).status).toBe(404);
  });
});
