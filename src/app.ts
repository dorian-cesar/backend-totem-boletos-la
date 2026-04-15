import express from 'express';
import path from 'path';
import { PaymentController } from './controllers/PaymentController';

const app = express();
app.use(express.json());

// Sirviendo carpeta public para la UI visual
app.use(express.static(path.join(__dirname, '../public')));

const paymentController = new PaymentController();

// Routes
app.post('/pay', paymentController.pay);

export default app;
