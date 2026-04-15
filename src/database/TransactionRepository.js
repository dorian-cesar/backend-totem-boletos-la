const getLocalDb = require('./localDb');
const getRemoteDb = require('./remoteDb');

class TransactionRepository {
  constructor() {
    this.localDb = getLocalDb();
  }

  async saveTransaction(monto, ticket, estado_pos, full_response = null) {
    const responseJson = full_response ? JSON.stringify(full_response) : null;
    
    // 1. Guardar siempre en local inmediatamente (sync_status = 0)
    const insertStmt = this.localDb.prepare(
      'INSERT INTO transactions (monto, ticket, estado_pos, full_response, sync_status) VALUES (?, ?, ?, ?, 0)'
    );
    const info = insertStmt.run(monto, ticket, estado_pos, responseJson);
    const localId = info.lastInsertRowid;
    
    // 2. Intentar replicar asíncronamente en MySQL
    this.syncToRemote(localId, monto, ticket, estado_pos, responseJson)
      .catch(err => {
         console.error(`[DbSync] Error sincro transaccion ${localId}: ${err.message}`);
      });

    return { localId, sync_status: 0 };
  }

  async syncToRemote(localId, monto, ticket, estado_pos, full_response) {
    let remoteDb;
    try {
      remoteDb = await getRemoteDb();
      await remoteDb.execute(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          monto DOUBLE,
          ticket VARCHAR(255),
          estado_pos VARCHAR(255),
          full_response LONGTEXT,
          sync_status INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Intentar agregar columna si falta en remoto
      try {
        await remoteDb.execute('ALTER TABLE transactions ADD COLUMN full_response LONGTEXT');
      } catch (e) {}

      const [result] = await remoteDb.execute(
        'INSERT INTO transactions (monto, ticket, estado_pos, full_response, sync_status) VALUES (?, ?, ?, ?, 1)',
        [monto, ticket, estado_pos, full_response]
      );
      
      const updateStmt = this.localDb.prepare('UPDATE transactions SET sync_status = 1 WHERE id = ?');
      updateStmt.run(localId);

      await remoteDb.end();
    } catch (error) {
      if (remoteDb) {
         try { await remoteDb.end(); } catch (e) {}
      }
      throw error;
    }
  }
}

module.exports = new TransactionRepository();
