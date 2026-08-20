// src/controllers/reminder.controller.js
const { Op }        = require('sequelize');
const { sequelize } = require('../config/db');
const { Reminder, Pet } = require('../models');

/* ── GET /reminders ── todos los recordatorios del usuario ── */
exports.listReminders = async (req, res) => {
  try {
    const { status, pet_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // IDs de mascotas del usuario
    const petWhere = { owner_user_id: req.user.id, active: true, deleted_at: null };
    if (pet_id) petWhere.id = pet_id;
    const pets = await Pet.findAll({ where: petWhere, attributes: ['id'] });
    const petIds = pets.map(p => p.id);

    const where = { pet_id: { [Op.in]: petIds } };
    if (status) where.status = status;

    const { count, rows } = await Reminder.findAndCountAll({
      where,
      include: [{ model: Pet, as: 'pet', attributes: ['id','name','photo_url'] }],
      limit:   Number(limit),
      offset,
      order:   [['due_at', 'ASC']],
    });

    return res.json({ total: count, data: rows });
  } catch (err) {
    console.error('listReminders error:', err);
    return res.status(500).json({ message: 'Error al obtener recordatorios' });
  }
};

/* ── POST /reminders ── crear recordatorio ────────────────── */
exports.createReminder = async (req, res) => {
  try {
    const {
      pet_id, reminder_type, title, description,
      due_at, recurrence, notify_email, notify_sms,
      notify_push, notify_days_before, vaccination_id, appointment_id,
    } = req.body;

    const pet = await Pet.findOne({
      where: { id: pet_id, owner_user_id: req.user.id, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });

    const reminder = await Reminder.create({
      pet_id,
      user_id:           req.user.id,
      reminder_type,
      title,
      description:       description       || null,
      due_at,
      recurrence:        recurrence        || 'none',
      notify_email:      notify_email      ?? true,
      notify_sms:        notify_sms        ?? false,
      notify_push:       notify_push       ?? true,
      notify_days_before:notify_days_before ?? 3,
      vaccination_id:    vaccination_id    || null,
      appointment_id:    appointment_id    || null,
    });
    return res.status(201).json({ data: reminder });
  } catch (err) {
    console.error('createReminder error:', err);
    return res.status(500).json({ message: 'Error al crear recordatorio' });
  }
};

/* ── PATCH /reminders/:id ── actualizar recordatorio ──────── */
exports.updateReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      where:   { id: req.params.id, user_id: req.user.id },
    });
    if (!reminder) return res.status(404).json({ message: 'Recordatorio no encontrado' });

    const allowed = ['title','description','due_at','recurrence','status',
                     'notify_email','notify_sms','notify_push','notify_days_before'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    await reminder.update(updates);
    return res.json({ data: reminder });
  } catch (err) {
    return res.status(500).json({ message: 'Error al actualizar recordatorio' });
  }
};

/* ── DELETE /reminders/:id ────────────────────────────────── */
exports.deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!reminder) return res.status(404).json({ message: 'Recordatorio no encontrado' });
    await reminder.destroy();
    return res.json({ message: 'Recordatorio eliminado' });
  } catch (err) {
    return res.status(500).json({ message: 'Error al eliminar recordatorio' });
  }
};

/* ── PATCH /reminders/:id/dismiss ── descartar ────────────── */
exports.dismissReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!reminder) return res.status(404).json({ message: 'Recordatorio no encontrado' });
    await reminder.update({ status: 'dismissed' });
    return res.json({ message: 'Recordatorio descartado' });
  } catch (err) {
    return res.status(500).json({ message: 'Error' });
  }
};