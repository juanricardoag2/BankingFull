require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'bank.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// --- Esquema ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    balance REAL NOT NULL DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// --- Seed del super usuario (admin) ---
function seedAdmin() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const adminBalance = Number(process.env.ADMIN_INITIAL_BALANCE) || 1000000;

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername);

  if (!existing) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    db.prepare(
      'INSERT INTO users (username, password, role, balance) VALUES (?, ?, ?, ?)'
    ).run(adminUsername, hashedPassword, 'admin', adminBalance);

    console.log('----------------------------------------------------');
    console.log('✔ Super usuario (admin) creado automáticamente:');
    console.log(`  usuario:  ${adminUsername}`);
    console.log(`  password: ${adminPassword}`);
    console.log('  (cámbialo en el archivo .env)');
    console.log('----------------------------------------------------');
  }
}

seedAdmin();

module.exports = db;
