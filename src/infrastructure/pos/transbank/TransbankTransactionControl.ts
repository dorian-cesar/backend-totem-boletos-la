import { TransactionControl, TransactionControlResponse } from '../interfaces';
import TransbankConnectionManager from './ConnectionManager';

export class TransbankTransactionControl implements TransactionControl {
    private manager: TransbankConnectionManager;

    constructor() {
        this.manager = TransbankConnectionManager.getInstance();
    }

    async cancel(orderId?: string): Promise<TransactionControlResponse> {
        // Soft fail if not reachable, meaning it's likely already cancelled or dead
        const isReady = await this.manager.checkConnection();
        if (!isReady) {
            return {
                success: false,
                errorType: 'dispositivo_no_disponible'
            };
        }

        try {
            // En Transbank POS, si una venta se cuelga (ej: el usuario no insertó la tarjeta), 
            // no hay comando 'cancel' explícito en el SDK para abortarla a la mitad de forma pura.
            // Para "destrabar" nuestro backend localmente, lo más seguro es reiniciar la conexión serial
            // desconectando el puerto. `ConnectionManager` la restablecerá en la siguiente petición.
            console.log(`[TransbankTransactionControl] Forzando desconexión de hardware debido a timeout en orden ${orderId || 'ACTUAL'}...`);
            
            const pos = this.manager.getPOS();
            await pos.disconnect();

            return {
                success: true,
                message: 'Conexión serial reiniciada para destrabar hardware'
            };
        } catch (error: any) {
            return {
               success: false,
               errorType: 'error_desconocido',
               message: error?.message 
            };
        }
    }

    async closeDay(): Promise<TransactionControlResponse> {
        const isReady = await this.manager.checkConnection();
        if (!isReady) {
            return { success: false, errorType: 'dispositivo_no_disponible' };
        }

        try {
            const pos = this.manager.getPOS();
            await pos.closeDay(); // Standard feature usually available on POS
            return { success: true, message: 'Día cerrado' };
        } catch (error) {
            return { success: false, errorType: 'error_desconocido' };
        }
    }
}
