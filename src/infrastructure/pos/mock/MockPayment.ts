import { Payment, PaymentResponse } from '../interfaces';

export class MockPayment implements Payment {
    async sale(amount: number, orderId: string): Promise<PaymentResponse> {
        console.log(`[MockPayment] Iniciando venta de $${amount} para la orden: ${orderId}`);
        // Simulate hardware delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simular un timeout falso si el amount es mágico (ej, 999999)
        if (amount === 999999) {
            console.log(`[MockPayment] Simulando tiempo de espera (timeout) en el hardware...`);
            await new Promise(resolve => setTimeout(resolve, 35000)); // Will trigger our external timeout
        }

        if (amount === 555) {
            console.log(`[MockPayment] Simulando transacción rechazada`);
            return {
                success: false,
                orderId,
                amount,
                errorType: 'transaccion_rechazada',
                errorMessage: 'Fondos insuficientes',
            };
        }

        console.log(`[MockPayment] Venta exitosa`);
        return {
            success: true,
            orderId,
            amount,
            authorizationCode: 'MOCK' + Math.floor(Math.random() * 10000),
            receipt: '=== RECIBO MOCK ===\nAPROBADO\n=================='
        };
    }
}
