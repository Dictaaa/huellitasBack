// src/routes/admin.routes.js
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/admin.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

// Todas las rutas admin requieren token + rol admin
router.use(verifyToken);
router.use(isAdmin);

// ── Stats generales ──────────────────────────────────────
router.get('/stats', controller.getStats);

// ── Placas QR ────────────────────────────────────────────
router.post('/tags/batch',    controller.generateBatch);
router.get ('/tags',          controller.listTags);
router.get ('/tags/batches',  controller.listBatches);

// ── Mascotas sin placa ───────────────────────────────────
router.get ('/pets/without-tag', controller.getPetsWithoutTag);
router.post('/pets/:petId/generate-tag', controller.generateTagForPet);

router.get  ('/pets',                    controller.listAllPets);

const usersCtrl = require('../controllers/admin-users.controller');
 
// ── Usuarios ─────────────────────────────────────────────
router.get   ('/users',           usersCtrl.listUsers);
router.get   ('/users/:id',       usersCtrl.getUser);
router.post  ('/users',           usersCtrl.createUser);
router.patch ('/users/:id',       usersCtrl.updateUser);
router.patch ('/users/:id/status',usersCtrl.updateUserStatus);
router.delete('/users/:id',       usersCtrl.deleteUser);

module.exports = router;