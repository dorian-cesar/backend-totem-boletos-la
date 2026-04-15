import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import logger from './utils/logger';
import { SyncService } from './services/SyncService';
import TransbankConnectionManager from './infrastructure/pos/transbank/ConnectionManager';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    logger.info(`POS Backend ejecutándose en el puerto ${PORT}`);
    logger.info(`Listo para aceptar peticiones. Mock factory activado por defecto vía posType.`);
    
    // Iniciar background worker (sincronizar Local SQLite a MySQL)
    const syncWorker = new SyncService();
    syncWorker.startBackgroundWorker(); // Defaults to 10s intervals
    
    // Warm-up explícito: Inicializar hardware físico en segundo plano para eliminar latencia en la 1ra venta.
    // Esto se ejecuta asíncronamente para no bloquear que el Frontend cargue su UI.
    logger.info(`[Warm-up] Iniciando auto-escaneo de puertos USB para POS físico...`);
    const posManager = TransbankConnectionManager.getInstance();
    posManager.checkConnection().then((isConnected: boolean) => {
        if (isConnected) {
            logger.info(`[Hardware] POS detectado y enganchado con éxito en el arranque. Listo para cobros instantáneos.`);
        } else {
            logger.warn(`[Hardware] No se detectó POS en el arranque. El escaneo se aplaza hasta la primera venta real.`);
        }
    }).catch((err: any) => {
         logger.warn(`[Hardware] Falló el Warm-up (${err.message}). Escaneo diferido activo.`);
    });
});
