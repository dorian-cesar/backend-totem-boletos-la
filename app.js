const express = require('express');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// Servir frontend
app.use(express.static(path.join(__dirname, 'public')));

// Documentación Swagger
const swaggerDocument = yaml.load(path.join(__dirname, './docs/openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Importar rutas
const salesRoutes = require('./src/routes/salesRoutes');
const testRoutes = require('./src/routes/testRoutes');

// Rutas de API
app.use('/api/v1', salesRoutes);
app.use('/api/v1', testRoutes);

// Ruta base
app.get('/', (req, res) => {
  res.send('Backend Tótem POS MultiMarca up. Revisa /api-docs para la documentación.');
});

module.exports = app;