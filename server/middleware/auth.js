const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // No token provided - set user to null but continue
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // decoded contains { id, iat, exp }
    next();
  } catch (err) {
    // Invalid or expired token
    console.error('Auth middleware error:', err.message);
    req.user = null;
    next();
  }
};

module.exports = authMiddleware;