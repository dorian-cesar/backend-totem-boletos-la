import { Status, StatusResponse } from '../interfaces';
import TransbankConnectionManager from './ConnectionManager';

export class TransbankStatus implements Status {
    private manager: TransbankConnectionManager;

    constructor() {
        this.manager = TransbankConnectionManager.getInstance();
    }

    async getLastTransaction(): Promise<StatusResponse> {
        const isReady = await this.manager.checkConnection();
        if (!isReady) {
            return {
                success: false,
                errorType: 'dispositivo_no_disponible'
            };
        }

        try {
            const pos = this.manager.getPOS();
            const response = await pos.getLastSale(); // or equivalent in their SDK
            
            return {
                success: true,
                lastTransaction: response
            };
        } catch (error: any) {
             return {
                success: false,
                 errorType: 'error_desconocido'
            };
        }
    }
}
