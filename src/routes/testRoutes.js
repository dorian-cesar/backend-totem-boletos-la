const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Endpoint de test para obtener un JWT válido (sólo para desarrollo/prueba)
router.get('/test-token', (req, res) => {
  const payload = { totemId: 'T-001', location: 'Sucursal Central' };
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'super_secret_jwt_key', { expiresIn: '1h' });
  res.json({ token });
});

module.exports = router;
