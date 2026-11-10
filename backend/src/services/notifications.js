const aws = require('./aws');

const LABELS = { applied: 'Applied', shortlisted: 'Shortlisted', selected: 'Selected', rejected: 'Not selected' };

function buildStatusEmail({ studentName, jobTitle, company, status }) {
  const label = LABELS[status] || status;
  return {
    subject: `CampusHire: your application for ${jobTitle} is now "${label}"`,
    text: `Hi ${studentName || 'there'},\n\nYour application for ${jobTitle} at ${company} has been updated to: ${label}.\n\nLog in to CampusHire to see details.\n\n— CampusHire`,
  };
}

/** Best-effort: email failures must never fail the API request. */
async function notifyStatusChange(args) {
  try {
    await aws.sendEmail({ to: args.to, ...buildStatusEmail(args) });
    return true;
  } catch (err) {
    console.error('SES send failed:', err.message);
    return false;
  }
}

module.exports = { buildStatusEmail, notifyStatusChange };
