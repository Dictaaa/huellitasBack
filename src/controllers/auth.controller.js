// src/controllers/auth.controller.js
const jwt           = require('jsonwebtoken');
const { sequelize } = require('../config/db');
const { User, Role, Permission, AuditLog } = require('../models');

/* ── Helpers ──────────────────────────────────────────────── */
const signToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const signRefresh = (userId) =>
  jwt.sign({ sub: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '30d',
  });

const sanitizeUser = (user) => {
  const u = user.toJSON ? user.toJSON() : { ...user };
  delete u.password_hash;
  return u;
};

/* ── POST /api/v1/auth/register ───────────────────────────── */
exports.register = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { first_name, last_name, email, phone, city, password } = req.body;

    // Email duplicado
    const exists = await User.findOne({ where: { email }, transaction: t });
    if (exists) {
      await t.rollback();
      return res.status(409).json({ message: 'El correo ya está registrado' });
    }

    // Rol owner por defecto
    const ownerRole = await Role.findOne({ where: { name: 'owner' }, transaction: t });
    if (!ownerRole) {
      await t.rollback();
      return res.status(500).json({ message: 'Rol no encontrado. Ejecuta el seed.' });
    }

    // Crear usuario
    const user = await User.create(
      {
        role_id:       ownerRole.id,
        status_id:     1,           // active — cambia a 4 si quieres verificación de email
        first_name,
        last_name,
        email,
        phone:         phone || null,
        city:          city  || null,
        password_hash: password,    // hook beforeCreate hace el hash
      },
      { transaction: t }
    );

    await t.commit();

    // AuditLog fuera de la transacción (fire-and-forget)
    AuditLog.log({
      userId:     user.id,
      action:     'user.created',
      entityType: 'users',
      entityId:   user.id,
      newValues:  { email, role: 'owner' },
    }).catch(e => console.error('AuditLog error:', e));

    const token   = signToken(user.id);
    const refresh = signRefresh(user.id);

    return res.status(201).json({
      message:       'Cuenta creada exitosamente.',
      token,
      refresh_token: refresh,
      user:          sanitizeUser(user),
    });

  } catch (err) {
    // Solo hace rollback si la transacción NO fue commiteada
    if (t && !t.finished) {
      await t.rollback().catch(() => {});
    }
    next(err);
  }
};

/* ── POST /api/v1/auth/login ──────────────────────────────── */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.scope('withPassword').findOne({
      where:   { email, deleted_at: null },
      include: [{ model: Role, as: 'role' }],
    });

    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    if (!user.active) {
      return res.status(403).json({ message: 'Cuenta desactivada. Contacta soporte.' });
    }

    await user.update({ last_login_at: new Date() });

    return res.json({
      token:         signToken(user.id),
      refresh_token: signRefresh(user.id),
      user:          sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

/* ── POST /api/v1/auth/refresh ────────────────────────────── */
exports.refresh = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ message: 'refresh_token requerido' });

    let payload;
    try {
      payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }

    if (payload.type !== 'refresh') return res.status(401).json({ message: 'Token inválido' });

    const user = await User.findByPk(payload.sub);
    if (!user || !user.active || user.deleted_at) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    return res.json({
      token:         signToken(user.id),
      refresh_token: signRefresh(user.id),
    });
  } catch (err) {
    next(err);
  }
};

/* ── GET /api/v1/auth/me ──────────────────────────────────── */
exports.me = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Role, as: 'role', include: [{ model: Permission, as: 'permissions' }] }],
    });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

/* ── POST /api/v1/auth/logout ─────────────────────────────── */
exports.logout = (_req, res) => {
  return res.json({ message: 'Sesión cerrada' });
};

/* ── PATCH /api/v1/auth/change-password ───────────────────── */
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.scope('withPassword').findByPk(req.user.id);

    if (!(await user.checkPassword(current_password))) {
      return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
    }

    await user.update({ password_hash: new_password });

    AuditLog.log({
      userId:     user.id,
      action:     'user.password_changed',
      entityType: 'users',
      entityId:   user.id,
    }).catch(e => console.error('AuditLog error:', e));

    return res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    next(err);
  }
};