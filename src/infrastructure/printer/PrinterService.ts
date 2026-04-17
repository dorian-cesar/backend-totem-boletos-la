import logger from '../../utils/logger';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class PrinterService {
    private static instance: PrinterService;
    private printerName: string;

    private constructor() {
        this.printerName = process.env.PRINTER_NAME || 'BIXOLON BK3-3(#1)';
        logger.info(`[Printer] Inicializado mediante Windows Spooler para: ${this.printerName}`);
    }

    public static getInstance(): PrinterService {
        if (!PrinterService.instance) {
            PrinterService.instance = new PrinterService();
        }
        return PrinterService.instance;
    }

    public async printReceipt(orderId: string, amount: number, authCode?: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                logger.info(`[Printer] Generando ticket a través del Spooler de Windows para la orden ${orderId}...`);

                const now = new Date().toLocaleString();
                const code = authCode || '123456';

                // Generamos un formato de texto crudo alineado
                const receiptContent = `
================================
          MI COMERCIO
    Plaza Central, Local 1
     Tel: +56 9 0000 0000
================================
      --- RECIBO DE PAGO ---
================================
Fecha: ${now}
Pedido: ${orderId}
Autorizacion: ${code}

TOTAL: $${amount}
================================
    ¡Gracias por su compra!

        


`; // Espacios al final para feed de papel

                // Creamos un archivo temporal
                const tempFilePath = path.join(__dirname, `ticket_${orderId}.txt`);
                fs.writeFileSync(tempFilePath, receiptContent, 'utf8');

                // Comando de PowerShell que envia el archivo crudo al driver de la impresora
                const psCommand = `powershell -Command "Get-Content -Path '${tempFilePath}' | Out-Printer -Name '${this.printerName}'"`;

                exec(psCommand, (error, stdout, stderr) => {
                    // Borramos el archivo temporal
                    try {
                        if (fs.existsSync(tempFilePath)) {
                            fs.unlinkSync(tempFilePath);
                        }
                    } catch (e) {
                        logger.warn(`[Printer] No se pudo borrar el archivo temporal ${tempFilePath}`);
                    }

                    if (error) {
                        logger.error(`[Printer] Fallo powershell Out-Printer`, { error: error.message });
                        return reject(error);
                    }

                    logger.info(`[Printer] Impresion silenciosa exitosa en ${this.printerName}`);
                    resolve(true);
                });
            } catch (err: any) {
                logger.error('[Printer] Excepcion al procesar impresion cruda:', err);
                reject(err);
            }
        });
    }
}
