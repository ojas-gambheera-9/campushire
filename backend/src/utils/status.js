// Allowed application status transitions: Applied -> Shortlisted -> Selected (or Rejected at any stage)
const TRANSITIONS = {
  applied: ['shortlisted', 'rejected'],
  shortlisted: ['selected', 'rejected'],
  selected: [],
  rejected: [],
};

const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

module.exports = { TRANSITIONS, canTransition };
