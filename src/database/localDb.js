const sqlite = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_LOCAL_PATH || path.join(__dirname, '../../transactions.sqlite');

const getLocalDb = () => {
    const db = sqlite(dbPath);
    // Inicializar tabla si no existe
    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        monto REAL,
        ticket TEXT,
        estado_pos TEXT,
        sync_status INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    return db;
};

module.exports = getLocalDb;
