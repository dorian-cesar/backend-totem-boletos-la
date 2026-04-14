const TransbankAdapter = require('../strategies/TransbankAdapter');
const transactionRepository = require('../database/TransactionRepository');

class SalesService {
  constructor() {
    this.posStrategy = new TransbankAdapter();
  }

  async processSale(amount, ticket) {
    try {
      await this.posStrategy.connect();
      
      const response = await this.posStrategy.sale(amount, ticket);
      
      let status = 'SUCCESS';
      // La respuesta del SDK de Transbank suele contener responseCode
      if(response && response.responseCode !== undefined && response.responseCode !== 0) {
        status = 'REJECTED';
      }

      const dbResult = await transactionRepository.saveTransaction(amount, ticket, status);
      
      return {
        success: status === 'SUCCESS',
        posResponse: response,
        transactionId: dbResult.localId
      };
    } catch (error) {
      await transactionRepository.saveTransaction(amount, ticket, 'ERROR: ' + error.message);
      throw error;
    } finally {
      try {
        await this.posStrategy.disconnect();
      } catch (e) {
        console.error('[POS] Error al desconectar:', e.message);
      }
    }
  }
}

module.exports = new SalesService();
