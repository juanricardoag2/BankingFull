const express = require('express');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/transfer -> Transferir dinero entre cuentas
router.post('/', verifyToken, (req, res) => {
  const { fromUsername, toUsername, amount } = req.body;
  const transferAmount = Number(amount);

  if (!fromUsername || !toUsername) {
    return res.status(400).json({ error: 'fromUsername y toUsername son obligatorios' });
  }

  if (!transferAmount || Number.isNaN(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({ error: 'amount debe ser un número positivo' });
  }

  if (fromUsername === toUsername) {
    return res.status(400).json({ error: 'No puedes transferir dinero a la misma cuenta' });
  }

  // Un usuario normal solo puede transferir desde su propia cuenta; el admin puede operar por cualquiera
  if (req.user.role !== 'admin' && req.user.username !== fromUsername) {
    return res.status(403).json({ error: 'Solo puedes transferir dinero desde tu propia cuenta' });
  }

  const runTransfer = db.transaction(() => {
    const sender = db.prepare('SELECT * FROM users WHERE username = ?').get(fromUsername);
    if (!sender) {
      throw { status: 404, message: `El usuario origen "${fromUsername}" no existe` };
    }

    const receiver = db.prepare('SELECT * FROM users WHERE username = ?').get(toUsername);
    if (!receiver) {
      throw { status: 404, message: `El usuario destino "${toUsername}" no existe` };
    }

    if (sender.balance < transferAmount) {
      throw { status: 400, message: 'Fondos insuficientes para realizar la transferencia' };
    }

    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(transferAmount, sender.id);
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(transferAmount, receiver.id);

    return {
      from: { username: sender.username, newBalance: sender.balance - transferAmount },
      to: { username: receiver.username, newBalance: receiver.balance + transferAmount }
    };
  });

  try {
    const result = runTransfer();
    res.json({ message: 'Transferencia realizada exitosamente', ...result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Error al procesar la transferencia' });
  }
});

module.exports = router;
