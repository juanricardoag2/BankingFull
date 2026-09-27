require('dotenv').config();
const path = require('path');
const express = require('express');

require('./database'); // Inicializa SQLite y crea el super usuario si no existe

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const transferRoutes = require('./routes/transferRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Frontend estático (public/index.html, styles.css, app.js).
// Al entrar a "/" se sirve automáticamente public/index.html
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'API Bancaria de prueba activa 🚀' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transfer', transferRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores genérico
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
