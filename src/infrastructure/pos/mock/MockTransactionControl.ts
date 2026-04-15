import { TransactionControl, TransactionControlResponse } from '../interfaces';

export class MockTransactionControl implements TransactionControl {
    async cancel(orderId?: string): Promise<TransactionControlResponse> {
        console.log(`[MockTransactionControl] Cancelando la transacción ${orderId || 'ACTUAL'}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            success: true,
            message: 'Transacción cancelada exitosamente vía mock de hardware'
        };
    }

    async closeDay(): Promise<TransactionControlResponse> {
        console.log(`[MockTransactionControl] Cerrando el día...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
            success: true,
            message: 'Día cerrado exitosamente vía mock de hardware'
        };
    }
}
