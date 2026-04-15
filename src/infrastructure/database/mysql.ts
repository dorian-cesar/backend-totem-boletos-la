import mysql from 'mysql2/promise';
import logger from '../../utils/logger';
import dotenv from 'dotenv';
dotenv.config();

let pool: mysql.Pool | null = null;

export async function getRemoteDatabase(): Promise<mysql.Pool> {
    if (pool) {
        return pool;
    }

    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306', 10),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '123456',
            database: process.env.DB_NAME || 'testdb',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Test connection
        const connection = await pool.getConnection();
        
        // Auto-create required table if not exists for quick setup
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(255) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                pos_type VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL,
                authorization_code VARCHAR(255),
                error_type VARCHAR(255),
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        connection.release();
        logger.info('Conexión a MySQL remoto establecida correctamente.');

        return pool;
    } catch (error) {
        logger.error('Error al inicializar MySQL remoto. Se utilizará SQLite como fallback.', { error });
        throw error;
    }
}
