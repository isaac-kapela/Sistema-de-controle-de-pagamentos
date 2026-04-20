const express = require('express');
const jwt = require('jsonwebtoken');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Login com PIN
router.post('/login', (req, res) => {
  const { pin } = req.body;

  if (!pin || pin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: 'PIN incorreto.' });
  }

  const token = jwt.sign({ isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// Valida token
router.get('/me', requireAuth, (req, res) => {
  res.json({ isAdmin: true });
});

module.exports = router;
