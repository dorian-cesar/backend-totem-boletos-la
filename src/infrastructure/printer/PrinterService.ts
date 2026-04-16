import { SerialPort } from 'serialport';
import logger from '../../utils/logger';

/**
 * Service to handle the Samsung Thermal Kiosk Printer (ESC/POS)
 */
export class PrinterService {
    private static instance: PrinterService;
    private portName: string;

    private constructor() {
        this.portName = process.env.PRINTER_PORT || 'COM4';
    }

    public static getInstance(): PrinterService {
        if (!PrinterService.instance) {
            PrinterService.instance = new PrinterService();
        }
        return PrinterService.instance;
    }

    /**
     * Prints a standard receipt for a successful transaction
     */
    public async printReceipt(orderId: string, amount: number, authCode: string): Promise<void> {
        return new Promise((resolve, reject) => {
            logger.info(`[Printer] Abriendo puerto ${this.portName} para imprimir recibo...`);
            
            const port = new SerialPort({
                path: this.portName,
                baudRate: 9600, // Standard for many thermal printers, check manual if 115200 is needed
                autoOpen: false,
            });

            port.open((err) => {
                if (err) {
                    logger.error(`[Printer] Error al abrir puerto: ${err.message}`);
                    return reject(err);
                }

                logger.info(`[Printer] Puerto abierto. Enviando datos...`);

                // ESC/POS Commands
                const init = Buffer.from('\x1B\x40');        // Initialize
                const center = Buffer.from('\x1B\x61\x01');  // Center
                const left = Buffer.from('\x1B\x61\x00');    // Left
                const boldOn = Buffer.from('\x1B\x45\x01');  // Bold on
                const boldOff = Buffer.from('\x1B\x45\x00'); // Bold off
                const lineFeed = Buffer.from('\x0A');        // Line feed
                const cut = Buffer.from('\x1D\x56\x41\x03'); // Feed and Partial Cut (Standard)

                const now = new Date().toLocaleString();

                port.write(init);
                port.write(center);
                port.write(boldOn);
                port.write('--- RECIBO DE PAGO ---\n');
                port.write(boldOff);
                port.write(lineFeed);
                
                port.write(left);
                port.write(`Fecha: ${now}\n`);
                port.write(`Pedido: ${orderId}\n`);
                port.write(`Monto: $${amount}\n`);
                port.write(`Autorizacion: ${authCode}\n`);
                
                port.write(lineFeed);
                port.write(center);
                port.write('¡Gracias por su compra!\n');
                port.write(lineFeed);
                port.write(lineFeed);
                port.write(lineFeed);
                port.write(lineFeed);
                
                // Cut command
                port.write(cut, (writeErr) => {
                    if (writeErr) {
                        logger.error(`[Printer] Error escribiendo en puerto: ${writeErr.message}`);
                    }
                    
                    // Close port after a small delay to ensure buffer is flushed
                    setTimeout(() => {
                        port.close();
                        logger.info(`[Printer] Impresion completada y puerto cerrado.`);
                        resolve();
                    }, 500);
                });
            });

            port.on('error', (err) => {
                logger.error(`[Printer] Error de hardware: ${err.message}`);
                reject(err);
            });
        });
    }
}
