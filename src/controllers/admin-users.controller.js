// src/controllers/admin-users.controller.js
// Agrega estos métodos al admin.controller.js existente o crea este archivo aparte

const { Op }    = require('sequelize');
const bcrypt    = require('bcryptjs');
const { User, Role, Subscription, Plan, Pet } = require('../models');

/* ── GET /admin/users ────────────────────────────────────── */
exports.listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status_id, role, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where = { deleted_at: null };
    if (status_id) where.status_id = status_id;
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name:  { [Op.iLike]: `%${search}%` } },
        { email:      { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Filtro por rol
    const roleInclude = {
      model:      Role,
      as:         'role',
      attributes: ['id', 'name'],
    };
    if (role) roleInclude.where = { name: role };

    const { count, rows } = await User.findAndCountAll({
      where,
      include:    [roleInclude],
      attributes: { exclude: ['password_hash'] },
      limit:      Number(limit),
      offset,
      order:      [['created_at', 'DESC']],
    });

    return res.json({
      total: count,
      page:  Number(page),
      pages: Math.ceil(count / Number(limit)),
      data:  rows,
    });
  } catch (err) {
    next(err);
  }
};

/* ── GET /admin/users/:id ────────────────────────────────── */
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      where:      { id: req.params.id, deleted_at: null },
      include:    [{ model: Role, as: 'role' }],
      attributes: { exclude: ['password_hash'] },
    });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const [petsCount, activeSub] = await Promise.all([
      Pet.count({ where: { owner_user_id: user.id, active: true, deleted_at: null } }),
      Subscription.findOne({
        where:   { user_id: user.id, status_id: 1 },
        include: [{ model: Plan, as: 'plan' }],
        order:   [['created_at', 'DESC']],
      }),
    ]);

    return res.json({
      data: {
        ...user.toJSON(),
        pets_count:   petsCount,
        subscription: activeSub,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ── POST /admin/users ── crear usuario ─────────────────── */
exports.createUser = async (req, res, next) => {
  try {
    const {
      first_name, last_name, email, phone,
      city, role_name, status_id, password,
    } = req.body;

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ message: 'El email ya está registrado' });

    const role = await Role.findOne({ where: { name: role_name || 'owner' } });
    if (!role) return res.status(400).json({ message: 'Rol no encontrado' });

    const user = await User.create({
      role_id:       role.id,
      status_id:     status_id || 1,
      first_name,
      last_name,
      email,
      phone:         phone || null,
      city:          city  || null,
      password_hash: password,   // hook beforeCreate hace el hash
    });

    return res.status(201).json({
      message: 'Usuario creado',
      data:    { ...user.toJSON(), password_hash: undefined },
    });
  } catch (err) {
    next(err);
  }
};

/* ── PATCH /admin/users/:id ── editar usuario ───────────── */
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.id, deleted_at: null },
    });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const {
      first_name, last_name, phone, city,
      role_name, status_id, password,
    } = req.body;

    const updates = {};
    if (first_name) updates.first_name = first_name;
    if (last_name)  updates.last_name  = last_name;
    if (phone  !== undefined) updates.phone = phone || null;
    if (city   !== undefined) updates.city  = city  || null;
    if (status_id)  updates.status_id = status_id;

    // Cambiar rol si se especifica
    if (role_name) {
      const role = await Role.findOne({ where: { name: role_name } });
      if (!role) return res.status(400).json({ message: 'Rol no encontrado' });
      updates.role_id = role.id;
    }

    // Cambiar contraseña si se especifica
    if (password && password.length >= 8) {
      updates.password_hash = password; // hook beforeUpdate hace el hash
    }

    await user.update(updates);

    return res.json({
      message: 'Usuario actualizado',
      data:    { ...user.toJSON(), password_hash: undefined },
    });
  } catch (err) {
    next(err);
  }
};

/* ── PATCH /admin/users/:id/status ── cambiar estado ────── */
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status_id } = req.body;

    if (![1, 2, 3, 4].includes(Number(status_id))) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    const user = await User.findOne({
      where: { id: req.params.id, deleted_at: null },
    });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // No puede cambiar su propio estado
    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'No puedes cambiar tu propio estado' });
    }

    await user.update({
      status_id: Number(status_id),
      active:    Number(status_id) === 1,
    });

    return res.json({ message: 'Estado actualizado', data: { status_id: user.status_id } });
  } catch (err) {
    next(err);
  }
};

/* ── DELETE /admin/users/:id ── soft delete ─────────────── */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.id, deleted_at: null },
    });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });
    }

    await user.update({
      active:     false,
      deleted_at: new Date(),
      status_id:  2,
    });

    return res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    next(err);
  }
};