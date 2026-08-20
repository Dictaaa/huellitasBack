// src/routes/organization.routes.js
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/organization.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.use(verifyToken);

// Organizaciones
router.post('/organizations',              controller.createOrganization);
router.get ('/organizations/me',           controller.getMyOrganizations);
router.post('/organizations/:orgId/members', controller.addMember);

// Acceso de clínicas al historial de mascotas
router.get   ('/pets/:petId/clinic-access',        controller.listClinicAccess);
router.post  ('/pets/:petId/clinic-access',        controller.grantClinicAccess);
router.delete('/pets/:petId/clinic-access/:orgId', controller.revokeClinicAccess);

module.exports = router;