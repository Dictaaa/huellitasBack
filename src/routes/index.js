// src/routes/index.js
const { Router } = require('express');

const authRoutes         = require('./auth.routes');
const userRoutes         = require('./user.routes');
const petRoutes          = require('./pet.routes');
const petTagRoutes       = require('./pet-tag.routes');
const subscriptionRoutes = require('./subscription.routes');
const lostPetRoutes      = require('./lost-pet.routes');
const medicalRoutes      = require('./medical.routes');
const adoptionRoutes     = require('./adoption.routes');
const reminderRoutes     = require('./reminder.routes');
const organizationRoutes = require('./organization.routes');
const publicRoutes       = require('./public.routes');
const adminRoutes        = require('./admin.routes');
const configRoutes       = require('./config.routes');

const { Plan } = require('../models');   // ← para el endpoint público de planes

const router = Router();

// ── QR público ───────────────────────────────────────────
router.use('/p', publicRoutes);

// ── Auth ─────────────────────────────────────────────────
router.use('/auth', authRoutes);

// ── PÚBLICOS — sin token ──────────────────────────────────
router.get('/plans', async (_req, res, next) => {
  try {
    const plans = await Plan.findAll({
      where: { active: true },
      order: [['max_pets', 'ASC'], ['billing_period', 'ASC']],
    });
    return res.json({ data: plans });
  } catch (err) { next(err); }
});

router.get('/lost-pets', require('../controllers/lost-pet.controller').listLostPets);
router.get('/species',   require('../controllers/pet.controller').listSpecies);
router.get('/config',    require('../controllers/config.controller').getPublicConfig);

// ── Admin ─────────────────────────────────────────────────
router.use('/admin', adminRoutes);

// ── Recursos ─────────────────────────────────────────────
router.use('/', userRoutes);
router.use('/', petRoutes);
router.use('/', petTagRoutes);
router.use('/', subscriptionRoutes);
router.use('/', lostPetRoutes);
router.use('/', medicalRoutes);
router.use('/', organizationRoutes);

// ── Módulos con prefijo ───────────────────────────────────
router.use('/adoptions', adoptionRoutes);
router.use('/reminders', reminderRoutes);

// ── Configuración ───────────────────────────────────────
router.use('/config', configRoutes);

// ── 404 ──────────────────────────────────────────────────
router.use((_req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

module.exports = router;