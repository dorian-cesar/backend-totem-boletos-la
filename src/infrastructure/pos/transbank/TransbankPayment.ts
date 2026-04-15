import { Payment, PaymentResponse } from '../interfaces';
import TransbankConnectionManager from './ConnectionManager';

export class TransbankPayment implements Payment {
    private manager: TransbankConnectionManager;

    constructor() {
        this.manager = TransbankConnectionManager.getInstance();
    }

    async sale(amount: number, orderId: string): Promise<PaymentResponse> {
        console.log(`[TransbankPayment] Iniciando venta física por $${amount}...`);
        
        const isReady = await this.manager.checkConnection();
        if (!isReady) {
            return {
                success: false,
                orderId,
                amount,
                errorType: 'dispositivo_no_disponible',
                errorMessage: 'El POS de Transbank no está conectado o no responde'
            };
        }

        const pos = this.manager.getPOS();
        const numericTicket = Date.now().toString().slice(-6);

        // --- LÓGICA DE PROTECCIÓN CONTRA BUG DEL SDK ---
        // El IM30 envía ACK + Data en el mismo paquete, lo que engaña al SDK y hace que resuelva prematuramente.
        // Implementamos una promesa manual que escuchará directamente el puerto hasta ver un mensaje 0210 (Sale Response).
        
        return new Promise(async (resolve) => {
            let finalized = false;

            // 1. Escuchar manualmente los eventos del parser del SDK
            const parser = pos.raw_parser();
            const onData = (data: Buffer) => {
                const dataStr = data.toString();
                // Si vemos una trama de respuesta de venta FINAL (0210), la procesamos.
                if (dataStr.includes('0210|')) {
                    console.log(`[TransbankPayment] Capturada respuesta FINAL manual: ${dataStr}`);
                    const cleanData = dataStr.substring(dataStr.indexOf('0210|')).split(String.fromCharCode(3))[0];
                    const processed = (pos as any).saleResponse(cleanData);
                    finish(processed);
                }
            };

            const finish = (response: any) => {
                if (finalized) return;
                finalized = true;
                parser.removeListener('data', onData);
                
                if (response && response.responseCode === 0) {
                    resolve({
                        success: true,
                        orderId,
                        amount,
                        authorizationCode: response.authorizationCode,
                        receipt: response.authorizationCode
                    });
                } else {
                    resolve({
                        success: false,
                        orderId,
                        amount,
                        errorType: 'transaccion_rechazada',
                        errorMessage: response?.responseMessage || 'Rechazada por el POS'
                    });
                }
            };

            parser.on('data', onData);

            try {
                // 2. Ejecutar la llamada original del SDK
                // Revertimos useId a false (por defecto) ya que no solucionó el rechazo 38.
                // Mantenemos sendVoucher: true para asegurar el cierre de ciclo en el IM30.
                let response = await pos.sale(amount, numericTicket, true);
                
                if (response && response.functionCode === 210) {
                     finish(response);
                } else if (response && response.responseCode === 26) {
                    console.log(`[TransbankPayment] Forzando carga de llaves y reintentando venta...`);
                    await pos.loadKeys();
                    await pos.sale(amount, numericTicket, true);
                } else {
                    console.log(`[TransbankPayment] El SDK resolvió prematuramente con estado: ${response?.responseMessage}. Esperando respuesta final del hardware...`);
                }

                // 3. Fail-safe: si pasan 150s sin respuesta final, cerramos por timeout
                setTimeout(() => {
                    if (!finalized) {
                        console.error(`[TransbankPayment] Timeout esperando respuesta final del IM30`);
                        finish({ responseCode: 22, responseMessage: 'Timeout de Hardware' });
                    }
                }, 150000);

            } catch (error: any) {
                console.error('[TransbankPayment] Error crítico:', error);
                finish({ responseCode: 99, responseMessage: error.message });
            }
        });
    }
}
