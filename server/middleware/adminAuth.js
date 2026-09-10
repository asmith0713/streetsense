const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Constant-time comparison so a wrong password cannot be discovered
 * character by character from response timing.
 */
function passwordMatches(candidate) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof candidate !== 'string' || candidate.length === 0) return false;

  // Hash both sides first so the buffers always have equal length.
  const a = crypto.createHash('sha256').update(candidate).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Issue a short-lived admin token. The admin password itself is sent once,
 * at login, instead of riding along on every moderation request.
 */
function issueAdminToken() {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
}

/**
 * Require a valid admin token. Reports 401 for anything else.
 */
function adminAuth(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Admin sign-in required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.admin = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Admin session expired. Please sign in again.' });
  }
}

/**
 * Marks req.isAdmin without rejecting the request, for routes that behave
 * differently for moderators but are still open to everyone else.
 */
function optionalAdmin(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  req.isAdmin = false;
  if (token) {
    try {
      req.isAdmin = jwt.verify(token, JWT_SECRET).role === 'admin';
    } catch (err) {
      req.isAdmin = false;
    }
  }
  next();
}

module.exports = { adminAuth, optionalAdmin, passwordMatches, issueAdminToken };
