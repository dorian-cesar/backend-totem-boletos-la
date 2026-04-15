import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import logger from './utils/logger';
import { SyncService } from './services/SyncService';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    logger.info(`POS Backend ejecutándose en el puerto ${PORT}`);
    logger.info(`Listo para aceptar peticiones. Mock factory activado por defecto vía posType.`);
    
    // Iniciar background worker (sincronizar Local SQLite a MySQL)
    const syncWorker = new SyncService();
    syncWorker.startBackgroundWorker(); // Defaults to 10s intervals
});
