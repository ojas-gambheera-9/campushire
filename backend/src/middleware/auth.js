const { CognitoJwtVerifier } = require('aws-jwt-verify');
const config = require('../config');

let verifier;
const getVerifier = () => {
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: config.cognito.userPoolId,
      tokenUse: 'id',
      clientId: config.cognito.clientId,
    });
  }
  return verifier;
};

/** Verifies the Cognito ID token and attaches req.user = { sub, email, name, role }. */
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });
  try {
    const p = await (req.app.get('verifier') || getVerifier()).verify(token);
    const role = p['custom:role'];
    if (!['student', 'recruiter'].includes(role)) {
      return res.status(403).json({ error: 'Account has no valid role' });
    }
    req.user = { sub: p.sub, email: p.email, name: p.name || p['cognito:username'] || '', role, company: p['custom:company'] || '' };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const requireRole = (role) => (req, res, next) =>
  req.user && req.user.role === role
    ? next()
    : res.status(403).json({ error: `Requires ${role} role` });

module.exports = { authenticate, requireRole };
