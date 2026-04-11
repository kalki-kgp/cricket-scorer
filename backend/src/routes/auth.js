const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken, verifyToken } = require('../auth');

const router = express.Router();

// Lightweight token validation — called by the umpire page on load
router.get('/auth/check', verifyToken, (req, res) => {
  res.json({ ok: true, username: req.user.username });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({ token: generateToken(user), username: user.username });
});

module.exports = router;
