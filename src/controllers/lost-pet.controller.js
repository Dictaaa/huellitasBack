// src/controllers/lost-pet.controller.js
const { Op }        = require('sequelize');
const { sequelize } = require('../config/db');
const { Pet, LostPetReport, FoundPetReport, PetStatus, AuditLog } = require('../models');

/* ── POST /pets/:petId/lost ── activar mascota perdida ─────── */
exports.reportLost = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const pet = await Pet.findOne({
      where:       { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
      transaction: t,
    });
    if (!pet) { await t.rollback(); return res.status(404).json({ message: 'Mascota no encontrada' }); }

    if (pet.status_id === 2) {
      await t.rollback();
      return res.status(409).json({ message: 'Esta mascota ya está reportada como perdida' });
    }

    const {
      lost_at, last_seen_location, last_seen_lat,
      last_seen_lng, description, contact_phone, contact_name,
    } = req.body;

    // Cambiar estado de la mascota a "lost"
    await pet.update({ status_id: 2, updated_by: req.user.id }, { transaction: t });

    // Crear reporte
    const report = await LostPetReport.create(
      {
        pet_id:              pet.id,
        reported_by_user_id: req.user.id,
        lost_at:             lost_at || new Date(),
        last_seen_location:  last_seen_location || null,
        last_seen_lat:       last_seen_lat || null,
        last_seen_lng:       last_seen_lng || null,
        description:         description || null,
        contact_phone:       contact_phone || null,
        contact_name:        contact_name || null,
        status:              'active',
      },
      { transaction: t }
    );

    await AuditLog.log({
      userId:     req.user.id,
      action:     'pet.lost_reported',
      entityType: 'lost_pet_reports',
      entityId:   report.id,
      newValues:  { pet_id: pet.id, lost_at },
    });

    await t.commit();

    // TODO: notificar a usuarios Huellita en la ciudad del dueño

    return res.status(201).json({
      message: `${pet.name} fue marcado como perdido. El QR del collar ahora muestra la alerta.`,
      data:    report,
    });
  } catch (err) {
    await t.rollback();
    console.error('reportLost error:', err);
    return res.status(500).json({ message: 'Error al reportar pérdida' });
  }
};

/* ── POST /pets/:petId/found ── marcar como recuperado ─────── */
exports.markFound = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const pet = await Pet.findOne({
      where:       { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
      transaction: t,
    });
    if (!pet) { await t.rollback(); return res.status(404).json({ message: 'Mascota no encontrada' }); }

    if (pet.status_id !== 2) {
      await t.rollback();
      return res.status(409).json({ message: 'Esta mascota no está reportada como perdida' });
    }

    // Cerrar reporte activo
    await LostPetReport.update(
      { status: 'found', found_at: new Date() },
      { where: { pet_id: pet.id, status: 'active' }, transaction: t }
    );

    // Volver a estado activo
    await pet.update({ status_id: 1, updated_by: req.user.id }, { transaction: t });

    await AuditLog.log({
      userId:     req.user.id,
      action:     'pet.found',
      entityType: 'pets',
      entityId:   pet.id,
    });

    await t.commit();
    return res.json({ message: `¡Qué alegría! ${pet.name} fue marcado como recuperado 🎉` });
  } catch (err) {
    await t.rollback();
    console.error('markFound error:', err);
    return res.status(500).json({ message: 'Error al marcar como recuperado' });
  }
};

/* ── GET /pets/:petId/lost-reports ── historial de pérdidas ── */
exports.getLostReports = async (req, res) => {
  try {
    const pet = await Pet.findOne({
      where: { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });

    const reports = await LostPetReport.findAll({
      where:   { pet_id: pet.id },
      include: [{ model: FoundPetReport, as: 'foundReports' }],
      order:   [['created_at', 'DESC']],
    });

    return res.json({ data: reports });
  } catch (err) {
    console.error('getLostReports error:', err);
    return res.status(500).json({ message: 'Error al obtener reportes' });
  }
};

/* ── GET /lost-pets ── lista pública de mascotas perdidas ──── */
exports.listLostPets = async (req, res) => {
  try {
    const { city, species_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const petWhere = { status_id: 2, active: true, deleted_at: null };
    if (species_id) petWhere.species_id = species_id;

    const { count, rows } = await LostPetReport.findAndCountAll({
      where:   { status: 'active' },
      include: [{
        model:    Pet,
        as:       'pet',
        where:    petWhere,
        required: true,
        include:  [
          { model: require('../models').Species, as: 'species' },
          { model: require('../models').Breed,   as: 'breed', required: false },
        ],
      }],
      limit:  Number(limit),
      offset,
      order:  [['created_at', 'DESC']],
    });

    return res.json({ total: count, page: Number(page), pages: Math.ceil(count / Number(limit)), data: rows });
  } catch (err) {
    console.error('listLostPets error:', err);
    return res.status(500).json({ message: 'Error al listar mascotas perdidas' });
  }
};