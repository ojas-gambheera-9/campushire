const { buildJobFilter } = require('../src/utils/jobFilters');
const { canTransition } = require('../src/utils/status');
const { buildStatusEmail } = require('../src/services/notifications');

describe('buildJobFilter', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  test('defaults to open postings only', () => {
    expect(buildJobFilter({}, now)).toEqual({ deadline: { $gte: now } });
  });
  test('applies type, location, ctc', () => {
    const f = buildJobFilter({ type: 'internship', location: 'hyd', minCtc: '10' }, now);
    expect(f.type).toBe('internship');
    expect(f.location.test('Hyderabad')).toBe(true);
    expect(f.ctcLpa).toEqual({ $gte: 10 });
  });
  test('ignores bad type and bad numbers', () => {
    const f = buildJobFilter({ type: 'hax', minCtc: 'abc' }, now);
    expect(f.type).toBeUndefined();
    expect(f.ctcLpa).toBeUndefined();
  });
  test('escapes regex metacharacters in search text', () => {
    const f = buildJobFilter({ q: '.*' }, now);
    expect(f.$or[0].title.test('abc')).toBe(false);
    expect(f.$or[0].title.test('.*')).toBe(true);
  });
  test('deadlineBefore bounds the window', () => {
    const f = buildJobFilter({ deadlineBefore: '2026-02-01' }, now);
    expect(f.deadline.$lte).toEqual(new Date('2026-02-01'));
  });
});

describe('status transitions', () => {
  test.each([
    ['applied', 'shortlisted', true],
    ['shortlisted', 'selected', true],
    ['applied', 'selected', false],
    ['selected', 'rejected', false],
    ['rejected', 'applied', false],
  ])('%s -> %s = %s', (a, b, ok) => expect(canTransition(a, b)).toBe(ok));
});

describe('status email', () => {
  test('mentions job, company and status', () => {
    const e = buildStatusEmail({ studentName: 'Asha', jobTitle: 'SDE', company: 'Acme', status: 'shortlisted' });
    expect(e.subject).toMatch(/SDE/);
    expect(e.subject).toMatch(/Shortlisted/);
    expect(e.text).toMatch(/Acme/);
  });
});
