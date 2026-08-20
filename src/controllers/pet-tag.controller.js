// src/controllers/pet-tag.controller.js
const { sequelize }  = require('../config/db');
const { PetTag, Pet, PetTagHistory, TagStatus, AuditLog } = require('../models');
const { v4: uuidv4 } = require('uuid');

/* ── GET /pets/:petId/tag ── obtener placa de una mascota ─── */
exports.getTag = async (req, res) => {
  try {
    const pet = await Pet.findOne({
      where: { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });

    const tag = await PetTag.findOne({
      where:   { pet_id: pet.id },
      include: [{ model: TagStatus, as: 'status' }],
    });

    if (!tag) return res.status(404).json({ message: 'Esta mascota no tiene placa asignada aún' });

    return res.json({
      data: {
        ...tag.toJSON(),
        public_url: tag.getPublicUrl(),
      },
    });
  } catch (err) {
    console.error('getTag error:', err);
    return res.status(500).json({ message: 'Error al obtener placa' });
  }
};

/* ── POST /pets/:petId/tag/assign ── asignar placa al dueño ─ */
exports.assignTag = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { public_code } = req.body;
    if (!public_code) {
      await t.rollback();
      return res.status(400).json({ message: 'public_code requerido' });
    }

    const pet = await Pet.findOne({
      where: { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
      transaction: t,
    });
    if (!pet) { await t.rollback(); return res.status(404).json({ message: 'Mascota no encontrada' }); }

    // Verificar que la mascota no tenga ya una placa activa
    const existing = await PetTag.findOne({ where: { pet_id: pet.id, status_id: 2 }, transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(409).json({ message: 'Esta mascota ya tiene una placa asignada' });
    }

    // Buscar la placa disponible
    const tag = await PetTag.findOne({
      where: { public_code: public_code.toUpperCase(), status_id: 1 },   // 1 = available
      transaction: t,
    });
    if (!tag) {
      await t.rollback();
      return res.status(404).json({ message: 'Placa no encontrada o ya está en uso' });
    }

    // Asignar
    await tag.update(
      { pet_id: pet.id, status_id: 2, activated_at: new Date() },
      { transaction: t }
    );

    // Registrar en historial
    await PetTagHistory.create(
      { pet_tag_id: tag.id, pet_id: pet.id, assigned_at: new Date(), created_by: req.user.id },
      { transaction: t }
    );

    await AuditLog.log({
      userId:     req.user.id,
      action:     'tag.assigned',
      entityType: 'pet_tags',
      entityId:   tag.id,
      newValues:  { pet_id: pet.id, public_code: tag.public_code },
    });

    await t.commit();

    return res.json({
      message: `Placa ${tag.public_code} activada para ${pet.name}`,
      data: { ...tag.toJSON(), public_url: tag.getPublicUrl() },
    });
  } catch (err) {
    await t.rollback();
    console.error('assignTag error:', err);
    return res.status(500).json({ message: 'Error al asignar placa' });
  }
};

/* ── DELETE /pets/:petId/tag ── liberar placa ─────────────── */
exports.releaseTag = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const pet = await Pet.findOne({
      where: { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
      transaction: t,
    });
    if (!pet) { await t.rollback(); return res.status(404).json({ message: 'Mascota no encontrada' }); }

    const tag = await PetTag.findOne({ where: { pet_id: pet.id, status_id: 2 }, transaction: t });
    if (!tag) { await t.rollback(); return res.status(404).json({ message: 'No hay placa asignada' }); }

    // Cerrar historial
    await PetTagHistory.update(
      { removed_at: new Date(), reason: req.body.reason || 'released' },
      { where: { pet_tag_id: tag.id, pet_id: pet.id, removed_at: null }, transaction: t }
    );

    // Liberar placa
    await tag.update(
      { pet_id: null, status_id: 1, deactivated_at: new Date() },
      { transaction: t }
    );

    await AuditLog.log({
      userId:     req.user.id,
      action:     'tag.released',
      entityType: 'pet_tags',
      entityId:   tag.id,
      oldValues:  { pet_id: pet.id },
    });

    await t.commit();
    return res.json({ message: 'Placa liberada' });
  } catch (err) {
    await t.rollback();
    console.error('releaseTag error:', err);
    return res.status(500).json({ message: 'Error al liberar placa' });
  }
};

/* ── GET /pets/:petId/tag/scans ─── estadísticas de escaneos  */
exports.getScans = async (req, res) => {
  try {
    const { PetTagScan } = require('../models');
    const pet = await Pet.findOne({
      where: { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });

    const tag = await PetTag.findOne({ where: { pet_id: pet.id } });
    if (!tag)  return res.status(404).json({ message: 'Sin placa asignada' });

    const { Op } = require('sequelize');
    const since  = new Date();
    since.setDate(since.getDate() - 30);

    const scans = await PetTagScan.findAll({
      where:  { pet_tag_id: tag.id, scanned_at: { [Op.gte]: since } },
      order:  [['scanned_at', 'DESC']],
      limit:  100,
    });

    return res.json({
      data: {
        total_30_days: scans.length,
        scans,
      },
    });
  } catch (err) {
    console.error('getScans error:', err);
    return res.status(500).json({ message: 'Error al obtener escaneos' });
  }
};

/* ── POST /admin/tags/batch ── generar lote de placas (admin) */
exports.generateBatch = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { quantity = 10, batch_code } = req.body;
    if (quantity > 500) {
      await t.rollback();
      return res.status(400).json({ message: 'Máximo 500 placas por lote' });
    }

    const tags = [];
    for (let i = 0; i < quantity; i++) {
      tags.push({
        public_code: generatePublicCode(),
        qr_token:    uuidv4(),
        status_id:   1,   // available
        batch_code:  batch_code || `BATCH-${Date.now()}`,
      });
    }

    const created = await PetTag.bulkCreate(tags, {
      transaction: t,
      ignoreDuplicates: true,
    });

    await AuditLog.log({
      userId:     req.user.id,
      action:     'tag.batch_created',
      entityType: 'pet_tags',
      entityId:   0,
      newValues:  { quantity: created.length, batch_code },
    });

    await t.commit();
    return res.status(201).json({ message: `${created.length} placas generadas`, data: created });
  } catch (err) {
    await t.rollback();
    console.error('generateBatch error:', err);
    return res.status(500).json({ message: 'Error al generar placas' });
  }
};

/* ── Helper: generar public_code alfanumérico de 6 chars ──── */
const generatePublicCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O, 0, I, 1 (confusos)
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};