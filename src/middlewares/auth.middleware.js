// src/middlewares/auth.middleware.js
const jwt  = require('jsonwebtoken');
const { User, Role } = require('../models');

/* ── verifyToken ──────────────────────────────────────────── */
exports.verifyToken = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token requerido' });
    }

    const token   = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(payload.sub, {
      include: [{ model: Role, as: 'role' }],
    });

    if (!user || !user.active || user.deleted_at) {
      return res.status(401).json({ message: 'Usuario no autorizado' });
    }

    req.user = user;   // disponible en todos los controllers
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    return res.status(401).json({ message: 'Token inválido' });
  }
};

/* ── isAdmin ─────────────────────────────────────────────── */
exports.isAdmin = (req, res, next) => {
  const role = req.user?.role?.name;
  if (role === 'admin' || role === 'super_admin') return next();
  return res.status(403).json({ message: 'Acceso restringido a administradores' });
};

/* ── isSuperAdmin ────────────────────────────────────────── */
exports.isSuperAdmin = (req, res, next) => {
  if (req.user?.role?.name === 'super_admin') return next();
  return res.status(403).json({ message: 'Acceso restringido' });
};

/* ── isOwner (dueño de mascota) ──────────────────────────── */
exports.isOwner = (req, res, next) => {
  const role = req.user?.role?.name;
  if (role === 'owner' || role === 'admin' || role === 'super_admin') return next();
  return res.status(403).json({ message: 'Acceso solo para dueños de mascotas' });
};

/* ── hasRole(roles[]) ── factory para roles específicos ────── */
exports.hasRole = (...roles) => (req, res, next) => {
  if (roles.includes(req.user?.role?.name)) return next();
  return res.status(403).json({ message: `Acceso restringido a: ${roles.join(', ')}` });
};