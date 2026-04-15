import { getLocalDatabase } from '../database/sqlite';
import { getRemoteDatabase } from '../database/mysql';
import logger from '../../utils/logger';

export interface LocalTransaction {
    orderId: string;
    amount: number;
    posType: string;
    status: 'SYNCED' | 'PENDING_SYNC' | 'FAILED';
    authorizationCode?: string;
    errorType?: string;
    errorMessage?: string;
}

export class TransactionRepository {
    
    /**
     * Guarda el resultado de un paso por POS en la BD Local (SQLite) 
     * previniendo que se pierda la información en caso de fallo de red.
     */
    async saveLocal(trx: LocalTransaction): Promise<void> {
        try {
            const db = await getLocalDatabase();
            
            await db.run(
                `INSERT INTO transactions (order_id, amount, pos_type, status, authorization_code, error_type, error_message) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    trx.orderId,
                    trx.amount,
                    trx.posType,
                    trx.status,
                    trx.authorizationCode || null,
                    trx.errorType || null,
                    trx.errorMessage || null
                ]
            );
            
            logger.info('[TransactionRepository] Guardado en SQLite local', { orderId: trx.orderId, status: trx.status });
        } catch (error) {
            logger.error('[TransactionRepository] Error crítico al guardar en SQLite local', { error });
        }
    }

    /**
     * Obtiene todas las transacciones locales que aún no se han sincronizado (exitosas o fallidas)
     */
    async getPendingSyncTransactions(): Promise<any[]> {
        try {
            const db = await getLocalDatabase();
            const transactions = await db.all('SELECT * FROM transactions WHERE status = ? OR status = ?', ['PENDING_SYNC', 'FAILED']);
            return transactions;
        } catch (error) {
            logger.error('[TransactionRepository] Error leyendo transacciones pendientes de SQLite', { error });
            return [];
        }
    }

    /**
     * Intenta enviar la transacción a la base de datos MySQL remota.
     */
    async pushToRemote(trx: any): Promise<boolean> {
        try {
            const pool = await getRemoteDatabase();
            const payloadStatus = trx.status === 'PENDING_SYNC' ? 'SYNCED' : 'FAILED_SYNCED';

            await pool.execute(
                `INSERT INTO transactions (order_id, amount, pos_type, status, authorization_code, error_type, error_message) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    trx.order_id,
                    trx.amount,
                    trx.pos_type,
                    payloadStatus,
                    trx.authorization_code || null,
                    trx.error_type || null,
                    trx.error_message || null
                ]
            );

            return true;
        } catch (error) {
            // Lanza el error para que el worker no lo marque como completado
            throw error; 
        }
    }

    /**
     * Marca una fila de SQLite como ya sincronizada para sacarla de la cola.
     */
    async markAsSyncedInLocal(id: number, finalStatus: string): Promise<void> {
        try {
            const db = await getLocalDatabase();
            await db.run('UPDATE transactions SET status = ? WHERE id = ?', [finalStatus, id]);
        } catch (error) {
            logger.error('[TransactionRepository] Error actualizando estado en SQLite', { id, error });
        }
    }
}
