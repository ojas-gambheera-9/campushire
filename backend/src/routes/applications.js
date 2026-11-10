const express = require('express');
const crypto = require('crypto');
const archiver = require('archiver');
const { z } = require('zod');
const config = require('../config');
const { Job, Application, APPLICATION_STATUSES } = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');
const aws = require('../services/aws');
const { notifyStatusChange } = require('../services/notifications');
const { canTransition } = require('../utils/status');

const router = express.Router();

// Step 1 for students: get a pre-signed S3 URL, then PUT the PDF straight from the browser.
router.post('/uploads/resume-url', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const body = z.object({ contentType: z.literal('application/pdf'), size: z.number().int().positive().max(config.maxResumeBytes) }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: 'Resume must be a PDF up to 5 MB' });
    const key = `resumes/${req.user.sub}/${crypto.randomUUID()}.pdf`;
    res.json({ key, uploadUrl: await aws.presignUpload(key, 'application/pdf') });
  } catch (e) { next(e); }
});

// Step 2: apply with the uploaded key.
router.post('/jobs/:id/apply', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const body = z.object({ resumeKey: z.string().startsWith(`resumes/${req.user.sub}/`), coverNote: z.string().max(2000).default('') }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: 'Invalid application' });
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.deadline < new Date()) return res.status(410).json({ error: 'Applications are closed' });
    const app = await Application.create({
      job: job._id,
      studentSub: req.user.sub,
      studentEmail: req.user.email,
      studentName: req.user.name,
      resumeKey: body.data.resumeKey,
      coverNote: body.data.coverNote,
    });
    res.status(201).json(app);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'You have already applied to this posting' });
    next(e);
  }
});

router.get('/applications/mine', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    res.json(await Application.find({ studentSub: req.user.sub }).populate('job', 'title company type location deadline').sort({ createdAt: -1 }).lean());
  } catch (e) { next(e); }
});

async function ownedJob(req, res) {
  const job = await Job.findOne({ _id: req.params.id, recruiterSub: req.user.sub }).lean();
  if (!job) res.status(404).json({ error: 'Job not found' });
  return job;
}

router.get('/jobs/:id/applications', authenticate, requireRole('recruiter'), async (req, res, next) => {
  try {
    const job = await ownedJob(req, res);
    if (!job) return;
    const apps = await Application.find({ job: job._id }).sort({ createdAt: -1 }).lean();
    const withUrls = await Promise.all(apps.map(async (a) => ({ ...a, resumeUrl: await aws.presignDownload(a.resumeKey) })));
    res.json(withUrls);
  } catch (e) { next(e); }
});

// Bulk resume export: streams a ZIP built from S3 objects.
router.get('/jobs/:id/resumes.zip', authenticate, requireRole('recruiter'), async (req, res, next) => {
  try {
    const job = await ownedJob(req, res);
    if (!job) return;
    const apps = await Application.find({ job: job._id }).lean();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="resumes-${job._id}.zip"`);
    const zip = archiver('zip');
    zip.on('error', next);
    zip.pipe(res);
    for (const a of apps) {
      const name = `${(a.studentName || a.studentEmail).replace(/[^a-z0-9._-]+/gi, '_')}-${String(a._id).slice(-6)}.pdf`;
      zip.append(await aws.getObjectStream(a.resumeKey), { name });
    }
    await zip.finalize();
  } catch (e) { next(e); }
});

router.patch('/applications/:id/status', authenticate, requireRole('recruiter'), async (req, res, next) => {
  try {
    const body = z.object({ status: z.enum(APPLICATION_STATUSES) }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: 'Invalid status' });
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    const job = await Job.findOne({ _id: app.job, recruiterSub: req.user.sub });
    if (!job) return res.status(404).json({ error: 'Application not found' });
    if (!canTransition(app.status, body.data.status)) {
      return res.status(409).json({ error: `Cannot move from ${app.status} to ${body.data.status}` });
    }
    app.status = body.data.status;
    await app.save();
    // Fire-and-forget — email failure must not fail the status update.
    notifyStatusChange({ to: app.studentEmail, studentName: app.studentName, jobTitle: job.title, company: job.company, status: app.status });
    res.json(app);
  } catch (e) { next(e); }
});

module.exports = router;
