const express = require('express');
const { z } = require('zod');
const { Job, Application } = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');
const { buildJobFilter } = require('../utils/jobFilters');

const router = express.Router();

const jobSchema = z.object({
  title: z.string().min(2).max(140),
  company: z.string().min(2).max(140),
  type: z.enum(['job', 'internship']),
  location: z.string().min(2).max(140),
  ctcLpa: z.coerce.number().min(0).default(0),
  stipendPerMonth: z.coerce.number().min(0).default(0),
  eligibility: z.string().max(2000).default(''),
  minCgpa: z.coerce.number().min(0).max(10).default(0),
  description: z.string().max(10000).default(''),
  deadline: z.coerce.date(),
});

// Public-to-authenticated: search & filter open postings
router.get('/', authenticate, async (req, res, next) => {
  try {
    const jobs = await Job.find(buildJobFilter(req.query)).sort({ deadline: 1 }).limit(100).lean();
    res.json(jobs);
  } catch (e) { next(e); }
});

// Recruiter: own postings with applicant counts (registered before '/:id')
router.get('/mine/list', authenticate, requireRole('recruiter'), async (req, res, next) => {
  try {
    const jobs = await Job.find({ recruiterSub: req.user.sub }).sort({ createdAt: -1 }).lean();
    const counts = await Application.aggregate([
      { $match: { job: { $in: jobs.map((j) => j._id) } } },
      { $group: { _id: '$job', n: { $sum: 1 } } },
    ]);
    const map = new Map(counts.map((c) => [String(c._id), c.n]));
    res.json(jobs.map((j) => ({ ...j, applicants: map.get(String(j._id)) || 0 })));
  } catch (e) { next(e); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (e) { next(e); }
});

router.post('/', authenticate, requireRole('recruiter'), async (req, res, next) => {
  try {
    const parsed = jobSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    const job = await Job.create({ ...parsed.data, recruiterSub: req.user.sub });
    res.status(201).json(job);
  } catch (e) { next(e); }
});

router.put('/:id', authenticate, requireRole('recruiter'), async (req, res, next) => {
  try {
    const parsed = jobSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, recruiterSub: req.user.sub },
      parsed.data,
      { new: true }
    );
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (e) { next(e); }
});

router.delete('/:id', authenticate, requireRole('recruiter'), async (req, res, next) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, recruiterSub: req.user.sub });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    await Application.deleteMany({ job: job._id });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
