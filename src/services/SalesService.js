const TransbankAdapter = require('../strategies/TransbankAdapter');
const transactionRepository = require('../database/TransactionRepository');

class SalesService {
  constructor() {
    this.posStrategy = new TransbankAdapter();
    this.responseMessages = {
      0: "Aprobado",
      1: "Rechazado",
      2: "Host no responde",
      3: "Fallo conexión",
      4: "Error en envío/recepción",
      5: "Timeout",
      12: "Error PIN",
      13: "Tarjeta inválida",
      51: "Fondos insuficientes",
      86: "Ingreso de cuotas (Esperando en POS)",
      91: "Emisor no disponible"
    };
  }

  getResponseMessage(code) {
    return this.responseMessages[code] || "Rechazado (Error desconocido)";
  }
  async loadKeys() {
    try {
      const response = await this.posStrategy.loadKeys();
      const isSuccessful = response.successful || response.responseCode === 0;
      return { success: isSuccessful, posResponse: response };
    } catch (error) {
      throw error;
    }
  }

  async processSale(amount, ticket) {
    try {
      const response = await this.posStrategy.sale(amount, ticket);
      
      // Caso 1: Transacción finalizada (con código de función)
      if (response && response.functionCode) {
        let status = 'SUCCESS';
        if (response.responseCode !== 0) {
          status = 'REJECTED';
          if (!response.responseMessage || response.responseMessage === 'Rechazado') {
              response.detailedMessage = this.getResponseMessage(response.responseCode);
          }
        }
        
        const dbResult = await transactionRepository.saveTransaction(amount, ticket, status, response);
        return {
          success: status === 'SUCCESS',
          posResponse: response,
          transactionId: dbResult.localId
        };
      }

      // Caso 2: Mensaje de estado intermedio (ej. pedir cuotas)
      // Si llegamos aquí sin functionCode, es que el POS aún no termina pero el SDK resolvió.
      return { 
        success: false, 
        message: this.getResponseMessage(response.responseCode || 88), 
        intermediate: true, 
        posResponse: response 
      };

    } catch (error) {
      const status = error.message.includes('cancelada') ? 'CANCELLED' : 'ERROR';
      await transactionRepository.saveTransaction(amount, ticket, status + ': ' + error.message);
      throw error;
    }
  }

  async cancelOperation() {
    return await this.posStrategy.abort();
  }

  async initialization() {
    try {
      const result = await this.posStrategy.initialization();
      return { success: result };
    } catch (error) {
      throw error;
    }
  }

  async initializationResponse() {
    try {
      const response = await this.posStrategy.initializationResponse();
      const isSuccessful = response.successful || response.responseCode === 0;
      return { success: isSuccessful, posResponse: response };
    } catch (error) {
      throw error;
    }
  }

  async poll() {
    try {
      const connected = await this.posStrategy.poll();
      return { connected };
    } catch (error) {
      throw error;
    }
  }

  async closeDay(sendVoucher = false) {
    try {
      const response = await this.posStrategy.closeDay(sendVoucher);
      return { success: response.successful || response.responseCode === 0, posResponse: response };
    } catch (error) {
      throw error;
    }
  }

  async getLastSale(sendVoucher = false) {
    try {
      const response = await this.posStrategy.getLastSale(sendVoucher);
      const isSuccessful = response.successful || response.responseCode === 0;
      return { success: isSuccessful, posResponse: response };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new SalesService();
