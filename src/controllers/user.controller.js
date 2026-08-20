// src/controllers/user.controller.js
const { Op }        = require('sequelize');
const { sequelize } = require('../config/db');
const { User, Role, Subscription, Pet, AuditLog } = require('../models');
const { uploadImage, deleteImage } = require('../services/storage.service');

/* ── GET /users/profile ───────────────────────────────────── */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Role, as: 'role' }],
    });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.json({ user });
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ message: 'Error al obtener perfil' });
  }
};

/* ── PATCH /users/profile ─────────────────────────────────── */
exports.updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, phone, city } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const old = { first_name: user.first_name, last_name: user.last_name, phone: user.phone, city: user.city };

    await user.update({ first_name, last_name, phone, city });

    await AuditLog.log({
      userId:     user.id,
      action:     'user.updated',
      entityType: 'users',
      entityId:   user.id,
      oldValues:  old,
      newValues:  { first_name, last_name, phone, city },
    });

    return res.json({ message: 'Perfil actualizado', user });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ message: 'Error al actualizar perfil' });
  }
};

/* ── DELETE /users/profile ── soft delete ─────────────────── */
exports.deleteAccount = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(req.user.id, { transaction: t });
    if (!user) { await t.rollback(); return res.status(404).json({ message: 'Usuario no encontrado' }); }

    await user.update({ active: false, deleted_at: new Date() }, { transaction: t });

    await AuditLog.log({
      userId:     user.id,
      action:     'user.deleted',
      entityType: 'users',
      entityId:   user.id,
    });

    await t.commit();
    return res.json({ message: 'Cuenta eliminada' });
  } catch (err) {
    await t.rollback();
    console.error('deleteAccount error:', err);
    return res.status(500).json({ message: 'Error al eliminar cuenta' });
  }
};

/* ── GET /admin/users ─── solo admin ──────────────────────── */
exports.listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role_id, status_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where = { deleted_at: null };
    if (role_id)   where.role_id   = role_id;
    if (status_id) where.status_id = status_id;
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name:  { [Op.iLike]: `%${search}%` } },
        { email:      { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{ model: Role, as: 'role' }],
      limit:   Number(limit),
      offset,
      order:   [['created_at', 'DESC']],
    });

    return res.json({
      total: count,
      page:  Number(page),
      pages: Math.ceil(count / Number(limit)),
      data:  rows,
    });
  } catch (err) {
    console.error('listUsers error:', err);
    return res.status(500).json({ message: 'Error al listar usuarios' });
  }
};

/* ── GET /admin/users/:id ─────────────────────────────────── */
exports.getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        { model: Role, as: 'role' },
        { model: Subscription, as: 'subscriptions' },
        { model: Pet, as: 'pets', where: { active: true }, required: false },
      ],
    });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.json({ user });
  } catch (err) {
    console.error('getUser error:', err);
    return res.status(500).json({ message: 'Error al obtener usuario' });
  }
};

/* ── PATCH /admin/users/:id/status ───────────────────────── */
exports.updateUserStatus = async (req, res) => {
  try {
    const { status_id, active } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const old = { status_id: user.status_id, active: user.active };
    await user.update({ status_id, active });

    await AuditLog.log({
      userId:     req.user.id,
      action:     'user.status_changed',
      entityType: 'users',
      entityId:   user.id,
      oldValues:  old,
      newValues:  { status_id, active },
    });

    return res.json({ message: 'Estado actualizado', user });
  } catch (err) {
    console.error('updateUserStatus error:', err);
    return res.status(500).json({ message: 'Error al actualizar estado' });
  }
};