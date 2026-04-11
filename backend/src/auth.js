const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cricket_jwt_secret_change_me';

function generateToken(user) {
  return jwt.sign(
    { user_id: user.user_id, username: user.username },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(authHeader.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { generateToken, verifyToken };
