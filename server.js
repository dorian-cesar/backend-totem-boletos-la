require('dotenv').config();
const app = require('./app');
const salesService = require('./src/services/SalesService');

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);

    /* 
    try {
        console.log('[Sistema] Esperando 3s para estabilidad del hardware...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('[Sistema] Iniciando inicialización mandatoria del dispositivo...');
        await salesService.initialization();
        console.log('[Sistema] Inicialización completada.');

        console.log('[Sistema] Iniciando carga automática de llaves del POS (Prueba de conectividad IP)...');
        await salesService.loadKeys();
        console.log('[Sistema] Carga de llaves completada. POS listo.');
    } catch (error) {
        console.error('[Sistema] Error en la inicialización del POS:', error.message);
        console.log('[Sistema] El servidor seguirá corriendo. El POS intentará reconectarse automáticamente si es necesario.');
    }
    */
    console.log('[Sistema] Inicialización automática desactivada temporalmente por estabilidad del sistema.');
});

// Manejo de cierre elegante (Graceful Shutdown) para liberar el puerto COM
const gracefulShutdown = async () => {
    console.log('\n[Sistema] Apagando servidor... liberando recursos.');
    try {
        await salesService.posStrategy.disconnect();
        console.log('[Sistema] Puerto del POS desconectado correctamente.');
    } catch (err) {
        console.error('[Sistema] Ocurrió un error inesperado al desconectar el POS:', err.message);
    }
    process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);