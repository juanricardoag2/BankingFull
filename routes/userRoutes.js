const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/users  -> Solo el admin puede crear usuarios con saldo inicial personalizado
router.post('/', verifyToken, requireAdmin, (req, res) => {
  const { username, password, initialBalance } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username y password son obligatorios' });
  }

  const balance = initialBalance === undefined ? 0 : Number(initialBalance);

  if (Number.isNaN(balance) || balance < 0) {
    return res.status(400).json({ error: 'initialBalance debe ser un número mayor o igual a 0' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'El usuario ya existe' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const result = db.prepare(
    'INSERT INTO users (username, password, role, balance) VALUES (?, ?, ?, ?)'
  ).run(username, hashedPassword, 'user', balance);

  res.status(201).json({
    message: 'Usuario creado exitosamente',
    user: { id: result.lastInsertRowid, username, role: 'user', balance }
  });
});

// GET /api/users -> Solo admin, lista todos los usuarios
router.get('/', verifyToken, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, role, balance, createdAt FROM users').all();
  res.json(users);
});

// GET /api/users/me -> Perfil del usuario autenticado
router.get('/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id, username, role, balance, createdAt FROM users WHERE id = ?')
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json(user);
});

// GET /api/users/:username/balance -> Consultar saldo
// El admin puede consultar cualquier saldo; un usuario normal solo el propio.
router.get('/:username/balance', verifyToken, (req, res) => {
  const { username } = req.params;

  if (req.user.role !== 'admin' && req.user.username !== username) {
    return res.status(403).json({ error: 'Solo puedes consultar tu propio saldo' });
  }

  const user = db.prepare('SELECT username, balance FROM users WHERE username = ?').get(username);

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json({ username: user.username, balance: user.balance });
});

module.exports = router;
