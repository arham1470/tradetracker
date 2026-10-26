import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import tradeRoutes from './routes/tradeRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import strategyRoutes from './routes/strategyRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Global middleware.
const allowedOrigins =
  process.env.CLIENT_URL && process.env.CLIENT_URL !== '*'
    ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/+$/, ''))
    : '*';

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', time: new Date().toISOString() });
});

// API routes.
app.use('/api/trades', tradeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/strategies', strategyRoutes);

// 404 + centralised error handling.
app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`✔ API listening on http://localhost:${PORT}`);
  });
}

start();

export default app;