const IPOSStrategy = require('../interfaces/IPOSStrategy');
const { POSAutoservicio, POSIntegrado } = require('transbank-pos-sdk');
const toml = require('toml');
const fs = require('fs');

class TransbankAdapter extends IPOSStrategy {
  constructor() {
    super();
    // Leer config
    const configPath = './config.toml';
    let posType = 'POSAutoservicio';
    if (fs.existsSync(configPath)) {
      const config = toml.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.pos && config.pos.type) {
        posType = config.pos.type;
      }
    }
    
    // Instanciar según configuración
    if (posType === 'POSAutoservicio') {
      this.pos = new POSAutoservicio(); 
    } else {
      this.pos = new POSIntegrado();
    }
    this.posType = posType;
  }

  async connect() {
    try {
        console.log(`[POS] Intentando autoconectar a ${this.posType}...`);
        const portInfo = await this.pos.autoconnect();
        
        if (portInfo === false) {
            throw new Error('No se encontró ningún POS conectado a los puertos.');
        }

        console.log(`[POS] Conectado en puerto: ${portInfo.path || portInfo}. Cargando llaves...`);
        // Según la documentación oficial es buena práctica cargar las llaves al inicializar
        await this.pos.loadKeys();
        
        return portInfo;
    } catch (error) {
        throw new Error('Fallo al conectar con el POS o cargar llaves: ' + error.message);
    }
  }

  async disconnect() {
    try {
      return await this.pos.disconnect();
    } catch (error) {
      throw new Error('Fallo al desconectar del POS: ' + error.message);
    }
  }

  async sale(amount, ticket) {
    try {
      const ticketId = ticket.toString();
      const response = await this.pos.sale(amount, ticketId);
      return response;
    } catch (error) {
      throw new Error('Error al procesar la venta en POS: ' + error.message);
    }
  }

  async getStatus() {
    try {
      // Simulado o se puede invocar ping al pos dependiendo de la compatibilidad
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = TransbankAdapter;
