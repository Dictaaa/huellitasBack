// src/controllers/admin.controller.js
const { Op }        = require('sequelize');
const { sequelize } = require('../config/db');
const {
  PetTag, Pet, User, TagStatus,
  Species, Breed, Subscription, Plan,
} = require('../models');
const { v4: uuidv4 } = require('uuid');

/* ── Generar public_code único ──────────────────────────── */
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = () =>
  Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

/* ── POST /admin/tags/batch ── generar lote ─────────────── */
exports.generateBatch = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { quantity = 10, batch_code } = req.body;

    if (quantity < 1 || quantity > 500) {
      await t.rollback();
      return res.status(400).json({ message: 'Cantidad debe ser entre 1 y 500' });
    }

    const batchCode = batch_code || `BATCH-${Date.now()}`;
    const tags      = [];
    const usedCodes = new Set();

    // Obtener códigos ya usados en BD
    const existing = await PetTag.findAll({ attributes: ['public_code'] });
    existing.forEach(t => usedCodes.add(t.public_code));

    let attempts = 0;
    while (tags.length < quantity && attempts < quantity * 10) {
      attempts++;
      const code = genCode();
      if (usedCodes.has(code)) continue;
      usedCodes.add(code);
      tags.push({
        public_code: code,
        qr_token:    uuidv4(),
        status_id:   1,   // available
        batch_code:  batchCode,
      });
    }

    if (tags.length < quantity) {
      await t.rollback();
      return res.status(500).json({ message: 'No se pudieron generar todos los códigos únicos' });
    }

    const created = await PetTag.bulkCreate(tags, { transaction: t });
    await t.commit();

    return res.status(201).json({
      message: `${created.length} placas generadas en lote "${batchCode}"`,
      data:    created,
    });
  } catch (err) {
    if (t && !t.finished) await t.rollback().catch(() => {});
    next(err);
  }
};

/* ── GET /admin/tags ── listar placas con filtros ───────── */
exports.listTags = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status_id, batch_code, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status_id)  where.status_id  = status_id;
    if (batch_code) where.batch_code = batch_code;
    if (search)     where.public_code = { [Op.iLike]: `%${search}%` };

    const { count, rows } = await PetTag.findAndCountAll({
      where,
      include: [
        { model: TagStatus, as: 'status' },
        {
          model:    Pet,
          as:       'pet',
          required: false,
          include:  [
            {
              model:      User,
              as:         'owner',
              attributes: ['id','first_name','last_name','email','phone','city'],
            },
          ],
        },
      ],
      limit:  Number(limit),
      offset,
      order:  [['created_at', 'DESC']],
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

/* ── GET /admin/tags/batches ── lista de lotes únicos ───── */
exports.listBatches = async (req, res, next) => {
  try {
    const batches = await PetTag.findAll({
      attributes: [
        'batch_code',
        [sequelize.fn('COUNT', sequelize.col('id')),          'total'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status_id = 1 THEN 1 END")), 'available'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status_id = 2 THEN 1 END")), 'assigned'],
        [sequelize.fn('MIN',   sequelize.col('created_at')),  'created_at'],
      ],
      group:  ['batch_code'],
      order:  [[sequelize.fn('MIN', sequelize.col('created_at')), 'DESC']],
    });
    return res.json({ data: batches });
  } catch (err) {
    next(err);
  }
};

/* ── GET /admin/pets/without-tag ── mascotas sin placa ──── */
exports.getPetsWithoutTag = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Pet.findAndCountAll({
      where: {
        active:     true,
        deleted_at: null,
      },
      include: [
        {
          model:    PetTag,
          as:       'tag',
          required: false,
        },
        { model: Species, as: 'species' },
        { model: Breed,   as: 'breed', required: false },
        {
          model:      User,
          as:         'owner',
          attributes: ['id','first_name','last_name','email','phone','city'],
          include: [{
            model:    Subscription,
            as:       'subscriptions',
            where:    { status_id: 1 },
            required: false,
            include:  [{ model: Plan, as: 'plan' }],
          }],
        },
      ],
      order: [['created_at', 'DESC']],
      limit:  Number(limit),
      offset,
    });

    // Filtrar las que NO tienen placa
    const withoutTag = rows.filter(pet => !pet.tag);
    const total      = withoutTag.length;

    return res.json({
      total,
      page:  Number(page),
      pages: Math.ceil(count / Number(limit)),
      data:  withoutTag,
    });
  } catch (err) {
    next(err);
  }
};

/* ── GET /admin/stats ── estadísticas generales ─────────── */
exports.getStats = async (req, res, next) => {
  try {
    const [
      totalTags,
      availableTags,
      assignedTags,
      totalPets,
      petsWithoutTag,
      totalUsers,
      activeSubs,
    ] = await Promise.all([
      PetTag.count(),
      PetTag.count({ where: { status_id: 1 } }),
      PetTag.count({ where: { status_id: 2 } }),
      Pet.count({ where: { active: true, deleted_at: null } }),
      Pet.count({
        where:   { active: true, deleted_at: null },
        include: [{ model: PetTag, as: 'tag', required: false }],
      }),
      User.count({ where: { active: true, deleted_at: null } }),
      require('../models').Subscription.count({ where: { status_id: 1 } }),
    ]);

    return res.json({
      data: {
        tags: {
          total:     totalTags,
          available: availableTags,
          assigned:  assignedTags,
        },
        pets: {
          total:       totalPets,
          without_tag: totalPets - assignedTags,
        },
        users:            totalUsers,
        active_subs:      activeSubs,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ── POST /admin/pets/:petId/generate-tag ───────────────── */
exports.generateTagForPet = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { petId } = req.params;
 
    const pet = await Pet.findOne({
      where:       { id: petId, active: true, deleted_at: null },
      transaction: t,
    });
    if (!pet) {
      await t.rollback();
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }
 
    // Verificar que no tenga ya una placa asignada
    const existing = await PetTag.findOne({
      where:       { pet_id: petId, status_id: 2 },
      transaction: t,
    });
    if (existing) {
      await t.rollback();
      return res.status(409).json({
        message: `Esta mascota ya tiene la placa ${existing.public_code} asignada`,
      });
    }
 
    // Generar código único
    let public_code, exists;
    do {
      public_code = Array.from(
        { length: 6 },
        () => CHARS[Math.floor(Math.random() * CHARS.length)]
      ).join('');
      exists = await PetTag.findOne({ where: { public_code }, transaction: t });
    } while (exists);
 
    const tag = await PetTag.create(
      {
        public_code,
        qr_token:    uuidv4(),
        pet_id:      pet.id,
        status_id:   2,         // assigned
        batch_code:  'ADMIN',
        activated_at:new Date(),
      },
      { transaction: t }
    );
 
    await t.commit();
 
    return res.status(201).json({
      message: `QR ${public_code} generado y asignado a ${pet.name}`,
      data:    tag,
    });
  } catch (err) {
    if (t && !t.finished) await t.rollback().catch(() => {});
    next(err);
  }
};

// En src/controllers/admin.controller.js

exports.listAllPets = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status_id, species_id, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const where  = { deleted_at: null };

    if (status_id)  where.status_id  = status_id;
    if (species_id) where.species_id = species_id;
    if (search)     where.name = { [Op.iLike]: `%${search}%` };

    const { count, rows } = await Pet.findAndCountAll({
      where,
      include: [
        { model: Species, as: 'species'              },
        { model: Breed,   as: 'breed',  required: false },
        { model: PetTag,  as: 'tag',    required: false },
        {
          model:      User,
          as:         'owner',
          attributes: ['id','first_name','last_name','email'],
        },
      ],
      limit:  Number(limit),
      offset,
      order:  [['created_at', 'DESC']],
    });

    return res.json({
      total: count,
      page:  Number(page),
      pages: Math.ceil(count / Number(limit)),
      data:  rows,
    });
  } catch (err) { next(err); }
};

exports.updatePetAdmin = async (req, res, next) => {
  try {
    const pet = await Pet.findOne({ where: { id: req.params.id, deleted_at: null } });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });
    await pet.update(req.body);
    return res.json({ message: 'Mascota actualizada', data: pet });
  } catch (err) { next(err); }
};