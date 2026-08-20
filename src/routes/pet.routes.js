// src/routes/pet.routes.js
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/pet.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { upload }      = require('../middlewares/upload.middleware');

// Catálogos públicos (sin auth)
router.get('/species', controller.listSpecies);

// Todo lo demás requiere auth
router.use(verifyToken);

// CRUD mascotas del usuario
router.get ('/pets',              controller.listMyPets);
router.post('/pets', upload.single('photo'), controller.createPet);

router.get   ('/pets/:id', controller.getPet);
router.patch ('/pets/:id', upload.single('photo'), controller.updatePet);
router.delete('/pets/:id', controller.deletePet);

// Privacidad del perfil público
router.patch('/pets/:id/privacy', controller.updatePrivacy);

module.exports = router;