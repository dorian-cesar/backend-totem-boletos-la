const express = require('express');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const path = require('path');
require('dotenv').config();

const salesController = require('./src/controllers/SalesController');
const authMiddleware = require('./src/middlewares/authMiddleware');

const app = express();
app.use(express.json());

// Documentación Swagger
const swaggerDocument = yaml.load(path.join(__dirname, './docs/openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rutas de API
const router = express.Router();
router.post('/sale', authMiddleware, salesController.createSale);

app.use('/api/v1', router);

// Ruta base
app.get('/', (req, res) => {
  res.send('Backend Tótem POS MultiMarca up. Revisa /api-docs para la documentación.');
});

module.exports = app;