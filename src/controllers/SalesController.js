const salesService = require('../services/SalesService');

class SalesController {
  async loadKeys(req, res) {
    try {
      const result = await salesService.loadKeys();
      return res.status(200).json(result);
    } catch (error) {
      console.error('[SalesController] Error cargando llaves:', error.message);
      return res.status(500).json({ error: 'Error cargando las llaves del POS', details: error.message });
    }
  }

  async initialization(req, res) {
    try {
      const result = await salesService.initialization();
      return res.status(200).json(result);
    } catch (error) {
      console.error('[SalesController] Error en initialization:', error.message);
      return res.status(500).json({ error: 'Error al iniciar inicialización del POS', details: error.message });
    }
  }

  async initializationResponse(req, res) {
    try {
      const result = await salesService.initializationResponse();
      return res.status(200).json(result);
    } catch (error) {
      console.error('[SalesController] Error en initializationResponse:', error.message);
      return res.status(500).json({ error: 'Error obteniendo respuesta de inicialización del POS', details: error.message });
    }
  }

  async createSale(req, res) {
    const { monto, ticket } = req.body;

    if (!monto || !ticket) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos: monto y ticket' });
    }

    try {
      const result = await salesService.processSale(monto, ticket);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[SalesController] Error procesando venta:', error.message);
      return res.status(500).json({ error: 'Error procesando la venta', details: error.message });
    }
  }

  async poll(req, res) {
    try {
      const result = await salesService.poll();
      return res.status(200).json(result);
    } catch (error) {
      console.error('[SalesController] Error en poll:', error.message);
      return res.status(500).json({ error: 'Error al consultar estado del POS', details: error.message });
    }
  }

  async closeDay(req, res) {
    const sendVoucher = req.query.voucher === 'true';
    try {
      const result = await salesService.closeDay(sendVoucher);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[SalesController] Error en cierre:', error.message);
      return res.status(500).json({ error: 'Error al ejecutar cierre del día', details: error.message });
    }
  }

  async getLastSale(req, res) {
    const sendVoucher = req.query.voucher === 'true';
    try {
      const result = await salesService.getLastSale(sendVoucher);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[SalesController] Error en getLastSale:', error.message);
      return res.status(500).json({ error: 'Error al obtener última venta', details: error.message });
    }
  }

  async cancelSale(req, res) {
    try {
      const result = await salesService.cancelOperation();
      return res.status(200).json(result);
    } catch (error) {
      console.error('[SalesController] Error cancelando operación:', error.message);
      return res.status(500).json({ error: 'Error al cancelar la operación', details: error.message });
    }
  }
}

module.exports = new SalesController();
