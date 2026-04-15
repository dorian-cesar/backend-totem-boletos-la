const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
    console.log('--- Iniciando Auditoría de Base de Datos ---');
    console.log(`Intentando conectar a: ${process.env.DB_HOST}:${process.env.DB_PORT} usuario: ${process.env.DB_USER}`);
    
    let connection;
    try {
        // 1. Intentar conexión básica
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        console.log('✅ Conexión básica exitosa.');

        // 2. Verificar/Crear Base de Datos
        console.log(`Verificando base de datos: ${process.env.DB_NAME}...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        console.log(`✅ Base de datos "${process.env.DB_NAME}" lista.`);

        // 3. Crear tabla si no existe (para estar seguros)
        await connection.query(`USE ${process.env.DB_NAME}`);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                monto DOUBLE,
                ticket VARCHAR(255),
                estado_pos VARCHAR(255),
                sync_status INT DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabla "transactions" verificada.');

        await connection.end();
        console.log('--- Auditoría Finalizada Exitosamente ---');
    } catch (err) {
        console.error('❌ ERROR FATAL en la conexión:');
        console.error(`Código: ${err.code}`);
        console.error(`Mensaje: ${err.message}`);
        if (connection) await connection.end();
        process.exit(1);
    }
}

testConnection();
