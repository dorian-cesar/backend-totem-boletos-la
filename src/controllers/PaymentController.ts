import { Request, Response } from 'express';
import { PaymentService } from '../services/PaymentService';
import { AppError } from '../utils/errors';

export class PaymentController {
    private paymentService: PaymentService;

    constructor() {
        this.paymentService = new PaymentService();
    }

    public pay = async (req: Request, res: Response) => {
        try {
            const { amount, orderId, posType } = req.body;

            if (!amount || typeof amount !== 'number') {
                return res.status(400).json({ success: false, errorType: 'error_validacion', message: 'El monto es requerido y debe ser un número' });
            }
            if (!orderId || typeof orderId !== 'string') {
                return res.status(400).json({ success: false, errorType: 'error_validacion', message: 'El ID de orden es requerido y debe ser texto' });
            }
            if (!posType) {
                return res.status(400).json({ success: false, errorType: 'error_validacion', message: 'El posType (mock o transbank) es requerido' });
            }

            const result = await this.paymentService.processSale(amount, orderId, posType);

            return res.status(200).json(result);

        } catch (error: any) {
            if (error instanceof AppError) {
                return res.status(error.code).json({
                    success: false,
                    errorType: error.type,
                    message: error.message
                });
            }
            
            return res.status(500).json({
                success: false,
                errorType: 'error_servidor_interno',
                message: error.message || 'Error desconocido en el servidor'
            });
        }
    }
}
