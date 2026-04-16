import logger from '../utils/logger';
import { POSFactory } from '../infrastructure/pos/interfaces';
import { MockFactory } from '../infrastructure/pos/mock/MockFactory';
import { TransbankFactory } from '../infrastructure/pos/transbank/TransbankFactory';
import PaymentQueue from '../infrastructure/queue/PaymentQueue';
import { AppError } from '../utils/errors';
import { TransactionRepository, LocalTransaction } from '../infrastructure/repositories/TransactionRepository';
import { PrinterService } from '../infrastructure/printer/PrinterService';

export class PaymentService {
    private queue: PaymentQueue;
    private repository: TransactionRepository;

    constructor() {
        this.queue = PaymentQueue.getInstance();
        this.repository = new TransactionRepository();
    }

    private getFactory(posType: string): POSFactory {
        if (posType === 'mock') {
            return new MockFactory();
        } else if (posType === 'transbank') {
            return new TransbankFactory();
        }
        throw new AppError(400, 'pos_invalido', `El tipo de POS '${posType}' no está soportado`);
    }

    public async processSale(amount: number, orderId: string, posType: string) {
        logger.info(`Procesando solicitud de venta`, { orderId, amount, posType });
        const startTime = Date.now();

        try {
            const factory = this.getFactory(posType);
            const paymentProduct = factory.createPayment();

            // Job a encolar: envuelve la lógica del hardware
            const job = async () => {
                logger.info(`Iniciando transacción física de venta`, { orderId, posType });
                return await paymentProduct.sale(amount, orderId);
            };

            // Tiempo máximo para que el CLIENTE interactúe con el POS:
            // insertar tarjeta + seleccionar cuotas + ingresar PIN.
            // El SDK tiene 150s internamente (posTimeout), ponemos 120s aquí
            // para que nuestro backend siempre corte antes que el SDK y pueda
            // emitir una cancelación limpia.
            const TIMEOUT_MS = 120000;
            let timeoutHandle: NodeJS.Timeout;

            // Timeout wrapper
            const timeoutPromise = new Promise((_, reject) => {
                timeoutHandle = setTimeout(async () => {
                    logger.error(`Tiempo de espera de interacción del cliente excedido para ${orderId}`, { posType });
                    
                    // Desconectar el puerto serial para destrabar el hardware
                    const transactionControl = factory.createTransactionControl();
                    transactionControl.cancel(orderId).catch(err => {
                        logger.error(`Error al intentar cancelar por seguridad orden ${orderId}`, { error: err.message });
                    });

                    reject(new AppError(504, 'error_tiempo_espera', 'El cliente no completó la transacción en el tiempo esperado (120s)'));
                }, TIMEOUT_MS);
            });

            // Encole task
            const jobPromise = this.queue.enqueue(job);

            // Execute race
            const result: any = await Promise.race([jobPromise, timeoutPromise]);
            clearTimeout(timeoutHandle!);

            const duration = Date.now() - startTime;
            logger.info(`Resultado de venta recibido`, { orderId, success: result.success, duration });

            if (!result.success) {
                // Return mapped inner error
                await this.repository.saveLocal({
                    orderId,
                    amount,
                    posType,
                    status: 'FAILED',
                    errorType: result.errorType || 'error_desconocido',
                    errorMessage: result.errorMessage || 'La transacción falló'
                });

                throw new AppError(422, result.errorType || 'error_desconocido', result.errorMessage || 'La transacción falló');
            }

            await this.repository.saveLocal({
                orderId,
                amount,
                posType,
                status: 'PENDING_SYNC', // As if it's waiting for remote MySQL push
                authorizationCode: result.authorizationCode
            });

            // Disparar la impresión física del recibo (Asíncrono/Fire-and-forget)
            // No usamos await aquí para que el usuario en el Tótem vea "Aprobado" 
            // de inmediato mientras el papel sale de la máquina.
            PrinterService.getInstance().printReceipt(orderId, amount, result.authorizationCode)
                .catch(pErr => logger.error(`[Printer] Falló impresión crítica de orden ${orderId}`, { error: pErr.message }));

            return result;

        } catch (error: any) {
            const duration = Date.now() - startTime;
            logger.error(`Fallo al procesar la venta`, { orderId, posType, error: error.message, duration });
            
            // Guardamos localmente el fallo repentino
            await this.repository.saveLocal({
                orderId,
                amount,
                posType,
                status: 'FAILED',
                errorType: 'error_interno_servidor',
                errorMessage: error.message
            }).catch(e => logger.error('Fallo al respaldar error localmente', {e}));

            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(500, 'error_interno_servidor', error.message || 'Ha ocurrido un error inesperado');
        }
    }
}
