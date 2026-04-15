import { Status, StatusResponse } from '../interfaces';

export class MockStatus implements Status {
    async getLastTransaction(): Promise<StatusResponse> {
        console.log(`[MockStatus] Obteniendo el estado de la última transacción...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
            success: true,
            lastTransaction: {
                status: 'APPROVED',
                amount: 1500,
                timestamp: new Date().toISOString()
            }
        };
    }
}
