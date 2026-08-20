// src/routes/lost-pet.routes.js
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/lost-pet.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Lista pública de mascotas perdidas
router.get('/lost-pets', controller.listLostPets);

// Acciones protegidas
router.use(verifyToken);

router.post('/pets/:petId/lost',         controller.reportLost);
router.post('/pets/:petId/found',        controller.markFound);
router.get ('/pets/:petId/lost-reports', controller.getLostReports);

module.exports = router;