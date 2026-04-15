const express = require('express');
const router = express.Router();
const salesController = require('../controllers/SalesController');
const authMiddleware = require('../middlewares/authMiddleware');

// POS Endpoints
router.post('/pos/load-keys', authMiddleware, salesController.loadKeys);
router.post('/pos/initialization', authMiddleware, salesController.initialization.bind(salesController));
router.get('/pos/initialization-response', authMiddleware, salesController.initializationResponse.bind(salesController));
router.get('/pos/poll', authMiddleware, salesController.poll.bind(salesController));
router.post('/pos/close-day', authMiddleware, salesController.closeDay.bind(salesController));
router.get('/pos/last-sale', authMiddleware, salesController.getLastSale.bind(salesController));
router.post('/pos/cancel', authMiddleware, salesController.cancelSale.bind(salesController));

// Transaction Endpoints
router.post('/sale', authMiddleware, salesController.createSale);

module.exports = router;
