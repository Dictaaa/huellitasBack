// src/controllers/pet.controller.js
// MÉTODO createPet ACTUALIZADO — verifica pago de placa antes de crear
const { Op }        = require('sequelize');
const { sequelize } = require('../config/db');
const {
  Pet, Species, Breed, PetStatus, Subscription, Plan,
  PetTag, PetPrivacySetting, MedicalAlert, AuditLog,
  Payment, AppConfig,
} = require('../models');
const { uploadImage, deleteImage } = require('../services/storage.service');
const { v4: uuidv4 } = require('uuid');

/* ── checkSubscriptionQuota (sin cambios) ─────────────────── */
const checkSubscriptionQuota = async (userId, transaction) => {
  const sub = await Subscription.findOne({
    where:   { user_id: userId, status_id: 1 },
    include: [{ model: Plan, as: 'plan' }],
    order:   [['created_at', 'DESC']],
    transaction,
  });

  if (!sub) {
    const err = new Error('No tienes una suscripción activa. Adquiere un plan para registrar mascotas.');
    err.status = 402;
    throw err;
  }

  if (sub.ends_at && new Date(sub.ends_at) < new Date()) {
    const err = new Error('Tu suscripción ha vencido. Renueva para continuar.');
    err.status = 402;
    throw err;
  }

  const petCount = await Pet.count({
    where: { owner_user_id: userId, active: true, deleted_at: null },
    transaction,
  });

  if (petCount >= sub.plan.max_pets) {
    const err = new Error(
      `Tu plan "${sub.plan.name}" permite hasta ${sub.plan.max_pets} mascota(s). Actualiza tu plan para agregar más.`
    );
    err.status = 402;
    throw err;
  }

  return sub;
};

/* ── Generar código de placa único ───────────────────────── */
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateUniqueCode = async (transaction) => {
  let code, exists;
  do {
    code   = Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
    exists = await PetTag.findOne({ where: { public_code: code }, transaction });
  } while (exists);
  return code;
};

/* ── GET /pets ────────────────────────────────────────────── */
exports.listMyPets = async (req, res, next) => {
  try {
    const pets = await Pet.findAll({
      where:   { owner_user_id: req.user.id, active: true, deleted_at: null },
      include: [
        { model: Species,   as: 'species'               },
        { model: Breed,     as: 'breed'                  },
        { model: PetStatus, as: 'status'                 },
        { model: PetTag,    as: 'tag',    required: false },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ data: pets });
  } catch (err) {
    next(err);
  }
};

/* ── GET /pets/:id ────────────────────────────────────────── */
exports.getPet = async (req, res, next) => {
  try {
    const pet = await Pet.findOne({
      where:   { id: req.params.id, owner_user_id: req.user.id, deleted_at: null },
      include: [
        { model: Species,           as: 'species'                                          },
        { model: Breed,             as: 'breed'                                            },
        { model: PetStatus,         as: 'status'                                           },
        { model: PetTag,            as: 'tag',            required: false                  },
        { model: PetPrivacySetting, as: 'privacySettings', required: false                 },
        { model: MedicalAlert,      as: 'medicalAlerts',  where: { active: true }, required: false },
      ],
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });
    return res.json({ data: pet });
  } catch (err) {
    next(err);
  }
};

/* ── POST /pets ───────────────────────────────────────────── */
exports.createPet = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      name, species_id, breed_id, sex, birth_date,
      color, weight, weight_unit, microchip_number,
      identification_number, notes,
      // Pago de placa
      placa_payment_provider,
      placa_transaction_id,
      placa_payment_metadata,
    } = req.body;

    // 1. Verificar cupo de suscripción
    const sub = await checkSubscriptionQuota(req.user.id, t);

    // 2. Verificar config de precio de placa
    const placaConfig = await AppConfig.getPlatformConfig();
    const placaPrice  = placaConfig.placa.price;
    const placaEnabled = placaConfig.placa.enabled;

    // Si la placa tiene precio y está habilitada, verificar que venga el pago
    if (placaEnabled && placaPrice > 0) {
      if (!placa_transaction_id) {
        await t.rollback();
        return res.status(402).json({
          message:     `La placa física tiene un costo adicional de ${new Intl.NumberFormat('es-CO',{ style:'currency', currency:'COP', maximumFractionDigits:0 }).format(placaPrice)} (pago único).`,
          code:        'PLACA_PAYMENT_REQUIRED',
          placa_price: placaPrice,
          currency:    placaConfig.placa.currency,
        });
      }
    }

    // 3. Subir foto si viene
    let photo_url = null;
    if (req.file) {
      photo_url = await uploadImage(req.file, `pets/${req.user.id}`);
    }

    // 4. Crear mascota
    const pet = await Pet.create(
      {
        owner_user_id:         req.user.id,
        subscription_id:       sub.id,
        species_id,
        breed_id:              breed_id              || null,
        status_id:             1,
        name,
        sex:                   sex                   || 'unknown',
        birth_date:            birth_date            || null,
        color:                 color                 || null,
        weight:                weight                || null,
        weight_unit:           weight_unit           || 'kg',
        microchip_number:      microchip_number      || null,
        identification_number: identification_number || null,
        photo_url,
        notes:                 notes                 || null,
        created_by:            req.user.id,
      },
      { transaction: t }
    );

    // 5. Crear configuración de privacidad
    await PetPrivacySetting.create({ pet_id: pet.id }, { transaction: t });

    // 6. Registrar pago de placa (si aplica)
    if (placaEnabled && placaPrice > 0 && placa_transaction_id) {
      await Payment.create(
        {
          user_id:                 req.user.id,
          subscription_id:         null,
          amount:                  placaPrice,
          currency:                placaConfig.placa.currency,
          payment_provider:        placa_payment_provider || 'wompi',
          external_transaction_id: placa_transaction_id,
          status_id:               2,  // approved
          paid_at:                 new Date(),
          metadata:                {
            ...(placa_payment_metadata || {}),
            type:   'placa',
            pet_id: pet.id,
          },
        },
        { transaction: t }
      );
    }

    // 7. Generar QR automático
    const public_code = await generateUniqueCode(t);

    const tag = await PetTag.create(
      {
        public_code,
        qr_token:     uuidv4(),
        pet_id:       pet.id,
        status_id:    2,          // assigned
        batch_code:   'AUTO',
        activated_at: new Date(),
      },
      { transaction: t }
    );

    await t.commit();

    // 8. Fire-and-forget: auditlog + notificación admin
    AuditLog.log({
      userId:     req.user.id,
      action:     'pet.created',
      entityType: 'pets',
      entityId:   pet.id,
      newValues:  { name, species_id, public_code, placa_paid: !!placa_transaction_id },
    }).catch(e => console.error('AuditLog error:', e));

    const appUrl = process.env.APP_URL || 'https://huellita.co';
    console.log(`📬 Nueva mascota pendiente de placa física:`);
    console.log(`   Mascota : ${pet.name} (ID: ${pet.id})`);
    console.log(`   Código  : ${public_code}`);
    console.log(`   QR URL  : ${appUrl}/p/${public_code}`);
    console.log(`   Placa   : ${placa_transaction_id ? '✅ PAGADA' : '⏳ PENDIENTE'}`);

    return res.status(201).json({
      message: `¡${pet.name} fue registrado! Su QR ya está activo. ${placaEnabled && placaPrice > 0 ? 'La placa física llegará en los próximos días.' : ''}`.trim(),
      data: {
        ...pet.toJSON(),
        tag: tag.toJSON(),
      },
    });

  } catch (err) {
    if (t && !t.finished) await t.rollback().catch(() => {});
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

/* ── PATCH /pets/:id ──────────────────────────────────────── */
exports.updatePet = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const pet = await Pet.findOne({
      where: { id: req.params.id, owner_user_id: req.user.id, deleted_at: null },
      transaction: t,
    });
    if (!pet) { await t.rollback(); return res.status(404).json({ message: 'Mascota no encontrada' }); }

    const {
      name, species_id, breed_id, sex, birth_date,
      color, weight, weight_unit, microchip_number,
      identification_number, notes,
    } = req.body;

    const old = pet.toJSON();

    let photo_url = pet.photo_url;
    if (req.file) {
      if (pet.photo_url) await deleteImage(pet.photo_url);
      photo_url = await uploadImage(req.file, `pets/${req.user.id}`);
    }

    await pet.update(
      {
        name:                  name         || pet.name,
        species_id:            species_id   || pet.species_id,
        breed_id:              breed_id     !== undefined ? breed_id     : pet.breed_id,
        sex:                   sex          || pet.sex,
        birth_date:            birth_date   !== undefined ? birth_date   : pet.birth_date,
        color:                 color        !== undefined ? color        : pet.color,
        weight:                weight       !== undefined ? weight       : pet.weight,
        weight_unit:           weight_unit  || pet.weight_unit,
        microchip_number:      microchip_number      !== undefined ? microchip_number      : pet.microchip_number,
        identification_number: identification_number !== undefined ? identification_number : pet.identification_number,
        photo_url,
        notes:                 notes !== undefined ? notes : pet.notes,
        updated_by:            req.user.id,
      },
      { transaction: t }
    );

    await t.commit();

    AuditLog.log({
      userId:     req.user.id,
      action:     'pet.updated',
      entityType: 'pets',
      entityId:   pet.id,
      oldValues:  old,
      newValues:  pet.toJSON(),
    }).catch(e => console.error('AuditLog error:', e));

    return res.json({ message: 'Mascota actualizada', data: pet });
  } catch (err) {
    if (t && !t.finished) await t.rollback().catch(() => {});
    next(err);
  }
};

/* ── DELETE /pets/:id ─── soft delete ────────────────────── */
exports.deletePet = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const pet = await Pet.findOne({
      where: { id: req.params.id, owner_user_id: req.user.id, deleted_at: null },
      transaction: t,
    });
    if (!pet) { await t.rollback(); return res.status(404).json({ message: 'Mascota no encontrada' }); }

    await pet.update(
      { active: false, deleted_at: new Date(), updated_by: req.user.id },
      { transaction: t }
    );

    // La placa queda en BD pero desactivada
    await PetTag.update(
      { status_id: 3, deactivated_at: new Date() },
      { where: { pet_id: pet.id }, transaction: t }
    );

    await t.commit();

    AuditLog.log({
      userId:     req.user.id,
      action:     'pet.deleted',
      entityType: 'pets',
      entityId:   pet.id,
    }).catch(e => console.error('AuditLog error:', e));

    return res.json({ message: 'Mascota eliminada' });
  } catch (err) {
    if (t && !t.finished) await t.rollback().catch(() => {});
    next(err);
  }
};

/* ── PATCH /pets/:id/privacy ──────────────────────────────── */
exports.updatePrivacy = async (req, res, next) => {
  try {
    const pet = await Pet.findOne({
      where: { id: req.params.id, owner_user_id: req.user.id, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });

    const [settings] = await PetPrivacySetting.findOrCreate({
      where:    { pet_id: pet.id },
      defaults: { pet_id: pet.id },
    });

    const allowed = [
      'show_pet_name','show_photo','show_breed','show_age','show_weight',
      'show_medical_alerts','show_owner_name','show_phone','show_city',
      'allow_whatsapp','allow_call','allow_location_report',
    ];

    const updates = {};
    allowed.forEach(key => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    await settings.update(updates);
    return res.json({ message: 'Privacidad actualizada', data: settings });
  } catch (err) {
    next(err);
  }
};

/* ── GET /species ── catálogos públicos ───────────────────── */
exports.listSpecies = async (_req, res, next) => {
  try {
    const species = await Species.findAll({
      where:   { active: true },
      include: [{ model: Breed, as: 'breeds', where: { active: true }, required: false }],
      order:   [['name', 'ASC']],
    });
    return res.json({ data: species });
  } catch (err) {
    next(err);
  }
};