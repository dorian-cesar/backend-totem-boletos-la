import TransbankConnectionManager from './src/infrastructure/pos/transbank/ConnectionManager';

async function main() {
    console.log("Iniciando Herramientas de Mantenimiento Transbank...");
    const manager = TransbankConnectionManager.getInstance();
    
    const connected = await manager.connect();
    if (!connected) {
        console.error("No se pudo conectar al POS para mantenimiento.");
        process.exit(1);
    }

    const pos = manager.getPOS();

    try {
        console.log("1. Ejecutando Carga de Llaves (loadKeys)...");
        const keysRes = await pos.loadKeys();
        console.log("Respuesta Carga Llaves:", keysRes);

        console.log("\n2. Ejecutando Cierre de Lote (closeDay)...");
        // A veces el POS tiene transacciones "pegadas" en su memoria que provocan que el host
        // rechace las nuevas transacciones por seguridad. Hacer un cierre limpia esa memoria.
        const closeRes = await pos.closeDay();
        console.log("Respuesta Cierre de Lote:", closeRes);

        console.log("\n¡Mantenimiento del terminal completado exitosamente!");
    } catch (e: any) {
        console.error("Error durante el mantenimiento:", e.message);
    } finally {
        pos.disconnect();
        process.exit(0);
    }
}

main();
