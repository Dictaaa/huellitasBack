// src/routes/pet-tag.routes.js
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/pet-tag.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

router.use(verifyToken);

// Placa de una mascota
router.get   ('/pets/:petId/tag',         controller.getTag);
router.post  ('/pets/:petId/tag/assign',  controller.assignTag);
router.delete('/pets/:petId/tag',         controller.releaseTag);

// Estadísticas de escaneos
router.get('/pets/:petId/tag/scans', controller.getScans);

// Admin — generar lote de placas
router.post('/admin/tags/batch', isAdmin, controller.generateBatch);

module.exports = router;