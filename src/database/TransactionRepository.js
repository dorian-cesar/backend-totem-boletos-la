const getLocalDb = require('./localDb');
const getRemoteDb = require('./remoteDb');

class TransactionRepository {
  constructor() {
    this.localDb = getLocalDb();
  }

  async saveTransaction(monto, ticket, estado_pos) {
    // 1. Guardar siempre en local inmediatamente (sync_status = 0)
    const insertStmt = this.localDb.prepare(
      'INSERT INTO transactions (monto, ticket, estado_pos, sync_status) VALUES (?, ?, ?, 0)'
    );
    const info = insertStmt.run(monto, ticket, estado_pos);
    const localId = info.lastInsertRowid;
    
    // 2. Intentar replicar asíncronamente en MySQL
    this.syncToRemote(localId, monto, ticket, estado_pos)
      .catch(err => {
         console.error(`[DbSync] Error sincro transaccion ${localId}: ${err.message}`);
         // Fallo se ignora a nivel de usuario, queda en sync_status = 0 localmente.
      });

    return { localId, sync_status: 0 };
  }

  async syncToRemote(localId, monto, ticket, estado_pos) {
    let remoteDb;
    try {
      remoteDb = await getRemoteDb();
      // Asegurarse de que exista la tabla en MySQL también (idealmente ya existe)
      await remoteDb.execute(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          monto DOUBLE,
          ticket VARCHAR(255),
          estado_pos VARCHAR(255),
          sync_status INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      const [result] = await remoteDb.execute(
        'INSERT INTO transactions (monto, ticket, estado_pos, sync_status) VALUES (?, ?, ?, 1)',
        [monto, ticket, estado_pos]
      );
      
      // Si fue exitoso, actualizar local a sync_status = 1
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
