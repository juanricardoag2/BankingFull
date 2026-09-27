const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username y password son obligatorios' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const passwordMatches = bcrypt.compareSync(password, user.password);

  if (!passwordMatches) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  res.json({
    message: 'Login exitoso',
    token,
    user: { id: user.id, username: user.username, role: user.role, balance: user.balance }
  });
});

module.exports = router;
