// src/app.js  — versión Huellita
// Adapta tu app.js existente con las líneas marcadas con ★
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');

const { connectDB }  = require('./src/config/db');
const routes         = require('./src/routes');
const errorHandler   = require('./src/middlewares/error.handler');

connectDB();

const app = express();

app.use(cors({
  origin:      process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));
// app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ★ Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ★ Todo el API bajo /api/v1 — incluyendo /api/v1/p/:code para el QR
app.use('/api/v1', routes);

app.use(errorHandler);

module.exports = app;