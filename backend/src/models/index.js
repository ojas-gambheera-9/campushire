const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    sub: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    name: { type: String, default: '' },
    role: { type: String, enum: ['student', 'recruiter'], required: true },
    company: { type: String, default: '' },
  },
  { timestamps: true }
);

const jobSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    company: { type: String, required: true, trim: true, maxlength: 140 },
    type: { type: String, enum: ['job', 'internship'], required: true },
    location: { type: String, required: true, trim: true },
    ctcLpa: { type: Number, min: 0, default: 0 }, // CTC in LPA (or stipend/month for internships, see stipend)
    stipendPerMonth: { type: Number, min: 0, default: 0 },
    eligibility: { type: String, default: '' },
    minCgpa: { type: Number, min: 0, max: 10, default: 0 },
    description: { type: String, default: '' },
    deadline: { type: Date, required: true, index: true },
    recruiterSub: { type: String, required: true, index: true },
  },
  { timestamps: true }
);
jobSchema.index({ title: 'text', company: 'text', description: 'text' });

const APPLICATION_STATUSES = ['applied', 'shortlisted', 'selected', 'rejected'];

const applicationSchema = new Schema(
  {
    job: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    studentSub: { type: String, required: true, index: true },
    studentEmail: { type: String, required: true },
    studentName: { type: String, default: '' },
    resumeKey: { type: String, required: true },
    coverNote: { type: String, default: '', maxlength: 2000 },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'applied' },
  },
  { timestamps: true }
);
applicationSchema.index({ job: 1, studentSub: 1 }, { unique: true });

module.exports = {
  User: mongoose.models.User || mongoose.model('User', userSchema),
  Job: mongoose.models.Job || mongoose.model('Job', jobSchema),
  Application: mongoose.models.Application || mongoose.model('Application', applicationSchema),
  APPLICATION_STATUSES,
};
