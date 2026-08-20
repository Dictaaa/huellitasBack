// src/controllers/config.controller.js
const { AppConfig } = require('../models');

/* ── GET /config ── config pública (precio placa, etc.) ── */
exports.getPublicConfig = async (_req, res, next) => {
  try {
    const config = await AppConfig.getPlatformConfig();
    return res.json({ data: config });
  } catch (err) {
    next(err);
  }
};

/* ── GET /admin/config ── config completa (admin) ────────  */
exports.getAllConfig = async (_req, res, next) => {
  try {
    const rows = await AppConfig.findAll({ order: [['key', 'ASC']] });
    return res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

/* ── PATCH /admin/config ── editar un valor ─────────────── */
exports.updateConfig = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ message: 'key y value son requeridos' });
    }
    const row = await AppConfig.set(key, value);
    return res.json({ message: 'Configuración actualizada', data: row });
  } catch (err) {
    next(err);
  }
};