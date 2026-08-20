// src/routes/config.routes.js
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/config.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

// Pública — precio de placa visible antes de registrarse
router.get('/', controller.getPublicConfig);

// Admin
router.get  ('/admin/config', verifyToken, isAdmin, controller.getAllConfig);
router.patch('/admin/config', verifyToken, isAdmin, controller.updateConfig);

module.exports = router;