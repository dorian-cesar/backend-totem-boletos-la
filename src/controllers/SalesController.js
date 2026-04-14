const salesService = require('../services/SalesService');

class SalesController {
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
}

module.exports = new SalesController();
