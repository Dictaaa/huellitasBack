// src/routes/medical.routes.js
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/medical.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { upload }      = require('../middlewares/upload.middleware');

router.use(verifyToken);

// ── Historial clínico ──────────────────────────────────────
router.get ('/pets/:petId/medical-records', controller.listRecords);
router.post('/pets/:petId/medical-records', controller.createRecord);

// ── Vacunas ───────────────────────────────────────────────
router.get   ('/pets/:petId/vaccinations',      controller.listVaccinations);
router.post  ('/pets/:petId/vaccinations',      controller.addVaccination);
router.delete('/pets/:petId/vaccinations/:vaccId', controller.deleteVaccination);

// ── Alertas médicas ───────────────────────────────────────
router.get   ('/pets/:petId/medical-alerts',          controller.listAlerts);
router.post  ('/pets/:petId/medical-alerts',          controller.addAlert);
router.delete('/pets/:petId/medical-alerts/:alertId', controller.deleteAlert);

// ── Historial de peso ─────────────────────────────────────
router.get ('/pets/:petId/weights', controller.listWeights);
router.post('/pets/:petId/weights', controller.addWeight);

// ── Documentos médicos ────────────────────────────────────
router.get   ('/pets/:petId/medical-documents',        controller.listDocuments);
router.post  ('/pets/:petId/medical-documents', upload.single('file'), controller.uploadDocument);
router.delete('/pets/:petId/medical-documents/:docId', controller.deleteDocument);

module.exports = router;