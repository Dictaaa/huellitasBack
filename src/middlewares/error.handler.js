// src/middlewares/error.handler.js

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.error(err);

  // ── Multer ──────────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'El archivo supera el límite de 5 MB' });
  }
  if (err.message?.includes('Formato no permitido')) {
    return res.status(400).json({ message: err.message });
  }

  // ── Sequelize ────────────────────────────────────────────
  if (err.name === 'SequelizeValidationError') {
    return res.status(422).json({
      message: 'Error de validación',
      errors:  err.errors.map(e => ({ field: e.path, message: e.message })),
    });
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'campo';
    return res.status(409).json({ message: `El valor de "${field}" ya existe` });
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({ message: 'Referencia inválida entre registros' });
  }
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({ message: 'Error en la base de datos' });
  }

  // ── JWT ──────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError')  return res.status(401).json({ message: 'Token inválido' });
  if (err.name === 'TokenExpiredError')  return res.status(401).json({ message: 'Token expirado' });

  // ── Error con status explícito (lanzados desde controllers) ─
  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }

  // ── Fallback 500 ─────────────────────────────────────────
  return res.status(500).json({ message: 'Error interno del servidor' });
};