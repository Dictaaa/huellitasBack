// src/routes/user.routes.js
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/user.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

// Todas requieren auth
router.use(verifyToken);

// Perfil propio
router.get   ('/profile', controller.getProfile);
router.patch ('/profile', controller.updateProfile);
router.delete('/profile', controller.deleteAccount);

// Admin — gestión de usuarios
router.get  ('/admin/users',          isAdmin, controller.listUsers);
router.get  ('/admin/users/:id',      isAdmin, controller.getUser);
router.patch('/admin/users/:id/status', isAdmin, controller.updateUserStatus);

module.exports = router;