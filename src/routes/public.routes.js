// src/routes/public.routes.js
// Sin autenticación — accesibles desde el QR del collar
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/public.controller');

// Perfil público al escanear el QR: GET /p/H8F32K
router.get ('/:code',       controller.getPublicProfile);

// "Encontré esta mascota"
router.post('/:code/found', controller.reportFound);

module.exports = router;