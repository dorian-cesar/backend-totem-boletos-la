/// <reference path="../../../types/transbank-pos-sdk.d.ts" />
import { POSAutoservicio } from 'transbank-pos-sdk';

/**
 * Singleton Connection Manager for the Physical Transbank Terminal
 */
class TransbankConnectionManager {
    private static instance: TransbankConnectionManager;
    private pos: POSAutoservicio;
    private isConnected: boolean = false;
    private port: string;
    
    private readonly MAX_RETRIES = 3;
    private readonly BASE_RETRY_DELAY = 1000;
    // El PAX IM30 corre Android y necesita más tiempo para responder el byte ACK de protocolo serial.
    // El SDK tiene 2000ms por defecto, que es demasiado agresivo para este equipo.
    private readonly ACK_TIMEOUT_MS = 10000;

    private constructor() {
        this.pos = new POSAutoservicio();
        this.port = process.env.TRANSBANK_PORT || 'COM4';
        this.pos.setDebug(process.env.NODE_ENV !== 'production');
        
        // CLAVE: Sobreescribir el timeout de ACK del SDK.
        // El SDK tiene 2s por defecto, que es insuficiente para el PAX IM30 (Android).
        // Accedemos a la propiedad directamente ya que es pública en el código fuente del SDK.
        (this.pos as any).ackTimeout = this.ACK_TIMEOUT_MS;
        console.log(`[TransbankConnectionManager] ackTimeout configurado a ${this.ACK_TIMEOUT_MS}ms`);
    }

    public static getInstance(): TransbankConnectionManager {
        if (!TransbankConnectionManager.instance) {
            TransbankConnectionManager.instance = new TransbankConnectionManager();
        }
        return TransbankConnectionManager.instance;
    }

    public getPOS(): POSAutoservicio {
        return this.pos;
    }

    public async connect(): Promise<boolean> {
        if (this.pos.isConnected()) return true;

        let retries = 0;
        while (retries < this.MAX_RETRIES) {
            try {
                // In actual SDK, connect(port)
                console.log(`[TransbankConnectionManager] Intentando conectar a ${this.port}...`);
                
                try {
                    await this.pos.connect(this.port);
                } catch (connectError) {
                    console.log(`[TransbankConnectionManager] Falló puerto ${this.port}. Iniciando escaneo de puertos (autoconnect)...`);
                    // Asegurarnos de limpiar cualquier intento fallido antes de escanear
                    await this.pos.disconnect().catch(() => {}); 
                    
                    const autoPort = await this.pos.autoconnect();
                    if (autoPort) {
                        this.port = autoPort; // Guardamos el nuevo puerto asignado por Windows
                    } else {
                        throw new Error("No se encontró ningún equipo POS de Transbank en los puertos disponibles");
                    }
                }
                
                if (this.pos.isConnected()) {
                    console.log(`[TransbankConnectionManager] Conectado exitosamente al POS en ${this.port}`);
                    // loadKeys() NO se llama aquí para no ralentizar la conexión inicial.
                    // El poll() ya fue ejecutado internamente por connect() dentro del SDK,
                    // lo que confirma que el equipo está vivo. loadKeys se puede llamar
                    // explícitamente si el terminal lo requiere (responseCode 26 = "Debe Cargar Llaves").
                    return true;
                }
                
                throw new Error("El SDK retornó false o no se conectó");

            } catch (error: any) {
                retries++;
                const delay = this.BASE_RETRY_DELAY * Math.pow(2, retries);
                console.warn(`[TransbankConnectionManager] Falló la conexión (Intento ${retries}/${this.MAX_RETRIES}): ${error.message}`);
                
                if (retries >= this.MAX_RETRIES) {
                    console.error('[TransbankConnectionManager] Límite de reintentos alcanzado. Dispositivo no disponible.');
                    return false;
                }

                await new Promise(res => setTimeout(res, delay));
            }
        }
        return false;
    }

    public async checkConnection(): Promise<boolean> {
        if (!this.pos.isConnected()) {
            return this.connect();
        }
        
        try {
           // Efectuar un 'poll' (comando 0100) al equipo físico para verificar presencia.
           // Esto tiene un efecto secundario deseado: destraba o "despierta" al procesador 
           // interno del PAX IM30 si había quedado colgado por una venta cancelada o corte USB.
           console.log("[TransbankConnectionManager] Enviando POLL para limpiar estado del POS...");
           const response = await this.pos.poll();
           
           if (!response) {
               console.log("[TransbankConnectionManager] El POS no respondió al poll. Destrabando conexión...");
               await this.pos.disconnect().catch(() => {}); // Liberar el cable virtual COM
               return this.connect();
           }
           console.log("[TransbankConnectionManager] Poll exitoso, POS limpio y listo.");
           return true;
        } catch (e: any) {
           console.log(`[TransbankConnectionManager] POS colgado o desconectado (${e.message}). Reconectando desde cero...`);
           await this.pos.disconnect().catch(() => {}); // Limpieza forzada de cola y puerto
           return this.connect();
        }
    }
}

export default TransbankConnectionManager;
