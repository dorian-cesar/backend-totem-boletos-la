const IPOSStrategy = require('../interfaces/IPOSStrategy');
const toml = require('toml');
const fs = require('fs');

// Imports diferidos para evitar que los módulos nativos escaneen el sistema al cargar
let POSAutoservicio, POSIntegrado, SerialPort;

class TransbankAdapter extends IPOSStrategy {
  constructor() {
    super();

    // Leer config
    const configPath = './config.toml';
    let posType = 'POSAutoservicio';
    let posPort = null;
    let baudRate = null;

    if (fs.existsSync(configPath)) {
      try {
        const config = toml.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.pos && config.pos.type) posType = config.pos.type;
        if (config.pos && config.pos.port) posPort = config.pos.port;
        if (config.pos && config.pos.baudRate) baudRate = parseInt(config.pos.baudRate);
        if (config.pos && config.pos.ackTimeout) this.ackTimeout = parseInt(config.pos.ackTimeout);
      } catch (e) {
        console.error('[POS] Error al leer config.toml:', e.message);
      }
    }

    // Priorizar variables de entorno sobre el toml si existen
    if (process.env.POS_TYPE) posType = process.env.POS_TYPE;
    if (process.env.POS_PORT) posPort = process.env.POS_PORT.trim();
    if (process.env.POS_BAUDRATE) baudRate = parseInt(process.env.POS_BAUDRATE.trim());

    // Carga diferida de dependencias solo si no es mock
    if (process.env.POS_MOCK !== 'true') {
      try {
        const sdk = require('transbank-pos-sdk');
        const sp = require('serialport');
        POSAutoservicio = sdk.POSAutoservicio;
        POSIntegrado = sdk.POSIntegrado;
        SerialPort = sp.SerialPort;

        // Instanciar según configuración
        if (posType === 'POSAutoservicio') {
          this.pos = new POSAutoservicio();
        } else {
          this.pos = new POSIntegrado();
        }

        // Configurar timeout de ACK
        this.pos.ackTimeout = this.ackTimeout || 10000;
        if (process.env.POS_ACK_TIMEOUT) this.pos.ackTimeout = parseInt(process.env.POS_ACK_TIMEOUT.trim());
        
        this.pos.on('port_closed', () => {
          console.warn('[POS] Puerto cerrado.');
        });
        this.pos.setDebug(true);
      } catch (err) {
        console.error('[POS] Error cargando módulos nativos:', err.message);
      }
    }

    this.cancellationRequested = false;
    this.currentOperation = null;
    this.posType = posType;
    this.posPort = posPort;
    this.baudRate = baudRate;

    // Cola de operaciones
    this._queue = Promise.resolve();
    this._interCommandDelay = 1200; 
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _enqueue(fn) {
    this._queue = this._queue
      .then(async () => {
        await this._delay(this._interCommandDelay);
        return fn();
      })
      .catch((err) => {
        throw err;
      });
    return this._queue;
  }

  _isPosConnected() {
    return this.pos && typeof this.pos.isConnected === 'function' && this.pos.isConnected();
  }

  async _findPaxPorts() {
    if (process.env.POS_MOCK === 'true') return [];
    try {
      if (!SerialPort) SerialPort = require('serialport').SerialPort;
      const ports = await SerialPort.list();
      
      const paxPorts = ports.filter(p =>
        (p.manufacturer && p.manufacturer.toLowerCase().includes('pax')) ||
        (p.friendlyName && p.friendlyName.toLowerCase().includes('pax')) ||
        (p.pnpId && p.pnpId.toLowerCase().includes('vid_2fb8'))
      );

      return paxPorts.sort((a, b) => {
        const aName = (a.friendlyName || "").toLowerCase();
        const bName = (b.friendlyName || "").toLowerCase();
        const aIsDaemon = aName.includes('daemon') || aName.includes('sdt');
        const bIsDaemon = bName.includes('daemon') || bName.includes('sdt');
        if (aIsDaemon && !bIsDaemon) return 1;
        if (!aIsDaemon && bIsDaemon) return -1;
        return 0;
      }).map(p => p.path);
    } catch (e) {
      console.error('[POS] Error al listar puertos:', e.message);
      return [];
    }
  }

  async _connectInternal() {
    // Si estamos en MOCK, nunca intentar conectar
    if (process.env.POS_MOCK === 'true') return { path: 'COM_MOCK' };

    if (this._isPosConnected()) {
      return { path: this.posPort || 'Autoconectado' };
    }

    // Limpieza profunda
    try {
      if (this.pos && this.pos.port) {
        this.pos.port.removeAllListeners();
        if (this.pos.port.isOpen) {
          await new Promise(resolve => this.pos.port.close(() => resolve()));
        }
        if (typeof this.pos.port.destroy === 'function') {
          this.pos.port.destroy();
        }
        this.pos.port = null;
        await this._delay(1000);
      }
    } catch (e) {
      console.warn('[POS] Aviso durante limpieza:', e.message);
    }

    let candidatePorts = [];
    if (this.posPort) candidatePorts.push(this.posPort);
    if (process.env.POS_PORT && !candidatePorts.includes(process.env.POS_PORT.trim())) {
      candidatePorts.push(process.env.POS_PORT.trim());
    }

    const discovered = await this._findPaxPorts();
    discovered.forEach(p => {
      if (!candidatePorts.includes(p)) candidatePorts.push(p);
    });

    if (candidatePorts.length === 0) {
      throw new Error('No se detectó ningún dispositivo POS.');
    }

    const sortedSpeeds = [115200, 57600, 38400, 19200, 9600];
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      attempt++;
      for (const targetPort of candidatePorts) {
        for (const speed of sortedSpeeds) {
          let busyRetries = 0;
          const maxBusyRetries = 2;
          while (busyRetries <= maxBusyRetries) {
            try {
              console.log(`[POS] Intentando ${targetPort} @ ${speed} (Reintento ${busyRetries})...`);
              
              if (this.pos.port && this.pos.port.isOpen) {
                await new Promise(resolve => this.pos.port.close(() => resolve()));
                await this._delay(500);
              }

              await this.pos.connect(targetPort, speed);
              await this._delay(1000);

              if (this.pos.port && this.pos.port.isOpen) {
                this.pos.port.write(Buffer.from([0x06]));
                await this._delay(500);
                this.pos.port.flush();
              }

              const originalTimeout = this.pos.ackTimeout;
              this.pos.ackTimeout = 2500;
              try {
                await this.pos.poll();
                this.pos.ackTimeout = originalTimeout;
                this.posPort = targetPort;
                this.baudRate = speed;
                return { path: targetPort, speed };
              } catch (pollErr) {
                this.pos.ackTimeout = originalTimeout;
                await this.pos.disconnect().catch(() => { });
                await this._delay(600);
                break; 
              }
            } catch (connErr) {
              if (connErr.message.includes('170') || connErr.message.includes('busy')) {
                busyRetries++;
                if (busyRetries <= maxBusyRetries) {
                  await this._delay(1500);
                  continue;
                }
              }
              await this._delay(600);
              break;
            }
          }
        }
        await this._delay(1000);
      }
      if (attempt < maxAttempts) await this._delay(3000);
    }
    throw new Error('No se pudo establecer comunicación con el POS.');
  }

  async connect() {
    if (process.env.POS_MOCK === 'true') return { path: 'COM_MOCK' };
    return this._enqueue(() => this._connectInternal());
  }

  async loadKeys() {
    if (process.env.POS_MOCK === 'true') return { success: true, responseCode: 0, message: 'Mock llaves cargadas' };
    return this._enqueue(async () => {
      await this._connectInternal();
      return await this.pos.loadKeys();
    });
  }

  async abort() {
    if (process.env.POS_MOCK === 'true') return { success: true };
    this.cancellationRequested = true;
    try {
      if (this.pos && this.pos.port && this.pos.port.isOpen) {
        await this.pos.disconnect().catch(() => { });
      }
    } catch (e) { }
    return { success: true, message: 'Cancelado' };
  }

  async sale(amount, ticket) {
    if (process.env.POS_MOCK === 'true') return { success: true, responseCode: 0, amount, ticket };
    this.cancellationRequested = false;
    return this._enqueue(async () => {
      await this._connectInternal();
      const ticketId = ticket.toString().replace(/\D/g, '').padStart(6, '0').substring(0, 6);
      const rawPayload = `0200|${amount.toString().padStart(9, '0')}|${ticketId}`;
      let response = await this.pos.send(rawPayload, false);
      return this.pos.saleResponse(response);
    });
  }

  async disconnect() {
    if (process.env.POS_MOCK === 'true') return true;
    return this._enqueue(async () => {
      if (this.pos) return await this.pos.disconnect();
      return true;
    });
  }

  async initialization() {
    if (process.env.POS_MOCK === 'true') return true;
    return this._enqueue(async () => {
      await this._connectInternal();
      if (typeof this.pos.initialization === 'function') return await this.pos.initialization();
      return { success: true };
    });
  }

  async initializationResponse() {
    if (process.env.POS_MOCK === 'true') return { successful: true, responseCode: 0 };
    return this._enqueue(async () => {
      await this._connectInternal();
      return await this.pos.initializationResponse();
    });
  }

  async poll() {
    if (process.env.POS_MOCK === 'true') return true;
    return this._enqueue(async () => {
      await this._connectInternal();
      return await this.pos.poll();
    });
  }

  async closeDay(sendVoucher = false) {
    if (process.env.POS_MOCK === 'true') return { successful: true, responseCode: 0 };
    return this._enqueue(async () => {
      await this._connectInternal();
      return await this.pos.closeDay(sendVoucher);
    });
  }

  async getLastSale(sendVoucher = false) {
    if (process.env.POS_MOCK === 'true') return { successful: true, responseCode: 0 };
    return this._enqueue(async () => {
      await this._connectInternal();
      return await this.pos.getLastSale(sendVoucher);
    });
  }

  async getStatus() {
    return this._isPosConnected() || process.env.POS_MOCK === 'true';
  }
}

module.exports = TransbankAdapter;
