import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import logger from '../../utils/logger';

let dbInstance: Database | null = null;

export async function getLocalDatabase(): Promise<Database> {
    if (dbInstance) {
        return dbInstance;
    }

    try {
        dbInstance = await open({
            filename: './local.sqlite',
            driver: sqlite3.Database
        });

        logger.info('Conexión a SQLite local establecida.');

        // Crear la tabla unificada para todas las transacciones locales
        await dbInstance.exec(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id TEXT NOT NULL,
                amount REAL NOT NULL,
                pos_type TEXT NOT NULL,
                status TEXT NOT NULL, 
                authorization_code TEXT,
                error_type TEXT,
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        return dbInstance;
    } catch (error) {
        logger.error('Error al inicializar SQLite local', { error });
        throw error;
    }
}
