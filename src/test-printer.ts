import dotenv from 'dotenv';
dotenv.config();

import { PrinterService } from './infrastructure/printer/PrinterService';
import logger from './utils/logger';

async function testPrinter() {
    logger.info('=== INICIANDO PRUEBA MOCK DE IMPRESORA ===');
    const printer = PrinterService.getInstance();
    
    const dummyOrder = `TEST-${Math.floor(Math.random() * 10000)}`;
    const dummyAmount = 1990;
    const dummyAuth = '123456';

    try {
        await printer.printReceipt(dummyOrder, dummyAmount, dummyAuth);
        logger.info('=== PRUEBA DE IMPRESION COMPLETADA EXITOSAMENTE ===');
    } catch (error: any) {
        logger.error(`=== FALLO LA PRUEBA DE IMPRESION ===`, { error: error.message });
    }
}

testPrinter();
