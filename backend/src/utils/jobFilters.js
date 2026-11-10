const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Build a Mongo filter for the public job board from query-string params. */
function buildJobFilter(q = {}, now = new Date()) {
  const f = { deadline: { $gte: now } };
  if (q.type === 'job' || q.type === 'internship') f.type = q.type;
  if (q.location) f.location = new RegExp(escapeRegex(String(q.location)), 'i');
  if (q.q) {
    const rx = new RegExp(escapeRegex(String(q.q)), 'i');
    f.$or = [{ title: rx }, { company: rx }, { description: rx }];
  }
  if (q.minCtc !== undefined && q.minCtc !== '' && !Number.isNaN(Number(q.minCtc))) {
    f.ctcLpa = { $gte: Number(q.minCtc) };
  }
  if (q.deadlineBefore) {
    const d = new Date(q.deadlineBefore);
    if (!Number.isNaN(d.getTime())) f.deadline = { $gte: now, $lte: d };
  }
  return f;
}

module.exports = { buildJobFilter, escapeRegex };
