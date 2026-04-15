import { TransactionRepository } from '../infrastructure/repositories/TransactionRepository';
import logger from '../utils/logger';

export class SyncService {
    private repository: TransactionRepository;
    private isSyncing: boolean = false;

    constructor() {
        this.repository = new TransactionRepository();
    }

    /**
     * Inicia el proceso de sincronización en segundo plano con intervalos.
     * @param intervalMs Intervalo de tiempo en milisegundos (por defecto 10 segundos)
     */
    public startBackgroundWorker(intervalMs: number = 10000) {
        logger.info(`[SyncService] Iniciando worker de sincronización en background cada ${intervalMs}ms...`);
        
        setInterval(() => {
            if (!this.isSyncing) {
                this.syncPendingTransactions();
            }
        }, intervalMs);
    }

    private async syncPendingTransactions() {
        this.isSyncing = true;
        
        try {
            const pendingList = await this.repository.getPendingSyncTransactions();
            
            if (pendingList.length > 0) {
                logger.info(`[SyncService] Sincronizando ${pendingList.length} transacciones con MySQL remoto...`);
                
                for (const trx of pendingList) {
                    try {
                        // Envia a MySQL
                        await this.repository.pushToRemote(trx);
                        
                        // Si no tiró error, marcala como limpia en SQLite
                        const finalStatus = trx.status === 'PENDING_SYNC' ? 'SYNCED' : 'FAILED_SYNCED';
                        await this.repository.markAsSyncedInLocal(trx.id, finalStatus);
                        
                    } catch (pushError: any) {
                        logger.error(`[SyncService] Falló el push de la orden ${trx.order_id} a MySQL`, { error: pushError.message });
                        // Al fallar un registro abortamos el batch activo o seguimos con los demás? 
                        // Seguimos con los demás, pero este se volverá a intentar en el prox ciclo.
                    }
                }
            }
        } catch (error) {
            logger.error('[SyncService] Error crítico general en ciclo de sincronización', { error });
        } finally {
            this.isSyncing = false;
        }
    }
}
